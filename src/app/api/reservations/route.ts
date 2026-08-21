import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, checkWritePermission, AuthError } from "@/lib/tenant";
import { checkSuspectMatch } from "@/lib/suspect-check";
import { runAnomalyDetection } from "@/lib/anomaly-engine";
import { isValidPhone } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    const { isPolice, providerId } = getProviderFilter(auth);

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const roomId = searchParams.get("roomId") || "";

    const where: Record<string, unknown> = {};
    if (!isPolice) {
      where.providerId = providerId;
    }
    if (status) {
      where.status = status;
    }
    if (roomId) {
      where.roomId = roomId;
    }
    if (dateFrom || dateTo) {
      const checkInFilter: Record<string, unknown> = {};
      if (dateFrom) checkInFilter.gte = dateFrom;
      if (dateTo) checkInFilter.lte = dateTo;
      where.checkIn = checkInFilter;
    }

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const [reservations, total] = await Promise.all([
      db.reservation.findMany({
        where,
        select: {
          id: true, guestId: true, roomId: true, checkIn: true, checkOut: true,
          nights: true, roomRate: true, totalCost: true, paidAmount: true,
          balance: true, paymentStatus: true, paymentMethod: true,
          status: true, taxAmount: true, discountAmount: true,
          providerId: true, actualCheckIn: true, actualCheckOut: true, createdAt: true, updatedAt: true,
          secondGuestName: true, secondGuestPhone: true, secondGuestIdNumber: true,
          exceptionallyReserved: true, exceptionReason: true,
          guest: { select: { id: true, name: true, phone: true } },
          room: { select: { id: true, number: true, name: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.reservation.count({ where }),
    ]);

    return NextResponse.json({ data: reservations, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch reservations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    const { providerId } = getProviderFilter(auth);
    checkWritePermission(auth, { staffOnlyWrite: true, staffPermissionKey: "reservations" });

    const body = await req.json();
    const { guestId, roomId, checkIn, checkOut, roomRate, taxAmount, discountAmount, paymentMethod, notes, groupBookingId, secondGuestName, secondGuestPhone, secondGuestIdNumber, exceptionallyReserved, exceptionReason } = body;

    if (!guestId || !roomId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "guestId, roomId, checkIn, and checkOut are required" }, { status: 400 });
    }

    // Get room to check type
    const room = await db.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // DOUBLE/TWIN rooms require second guest data unless exceptionally reserved
    const requiresTwoGuests = room.type === "DOUBLE" || room.type === "TWIN";
    if (requiresTwoGuests && !exceptionallyReserved) {
      if (!secondGuestName || !secondGuestName.trim()) {
        return NextResponse.json({ error: "DOUBLE_ROOM_SECOND_GUEST_REQUIRED", code: "DOUBLE_ROOM_SECOND_GUEST_REQUIRED", message: "Second guest name is required for double/twin rooms. Select 'Exceptionally Reserved' if only one guest." }, { status: 400 });
      }
      if (!secondGuestPhone || !secondGuestPhone.trim()) {
        return NextResponse.json({ error: "DOUBLE_ROOM_SECOND_GUEST_REQUIRED", code: "DOUBLE_ROOM_SECOND_GUEST_REQUIRED", message: "Second guest phone is required for double/twin rooms. Select 'Exceptionally Reserved' if only one guest." }, { status: 400 });
      }
      if (!isValidPhone(secondGuestPhone.trim())) {
        return NextResponse.json({ error: "Invalid second guest phone number format. Use 7-15 digits with optional + prefix." }, { status: 400 });
      }
    }

    // Calculate nights
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const diffMs = endDate.getTime() - startDate.getTime();
    const nights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Get room rate if not provided
    let rate = roomRate;
    if (!rate) {
      rate = room.pricePerNight;
    }

    const tax = taxAmount || 0;
    const discount = discountAmount || 0;
    const subtotal = rate * nights;
    const totalCost = subtotal + tax - discount;
    const paidAmount = 0;
    const balance = totalCost - paidAmount;

    // Check for overlapping reservations on this room (double-booking prevention)
    const overlapping = await db.reservation.findFirst({
      where: {
        roomId,
        status: { in: ["UPCOMING", "ACTIVE"] },
        checkIn: { lte: checkOut },
        checkOut: { gte: checkIn },
      },
      include: {
        guest: { select: { name: true, phone: true } },
        room: { select: { number: true, name: true } },
      },
    });

    if (overlapping) {
      const roomLabel = overlapping.room.number + (overlapping.room.name ? ` (${overlapping.room.name})` : "");
      return NextResponse.json({
        error: "ROOM_CONFLICT",
        code: "ROOM_CONFLICT",
        conflict: { roomId, checkIn: overlapping.checkIn, checkOut: overlapping.checkOut, roomNumber: overlapping.room.number, roomName: overlapping.room.name },
      }, { status: 409 });
    }

    const reservation = await db.reservation.create({
      data: {
        guestId,
        roomId,
        checkIn,
        checkOut,
        nights,
        roomRate: rate,
        totalCost,
        paidAmount,
        balance,
        paymentStatus: "PENDING" as const,
        paymentMethod: paymentMethod || null,
        status: "UPCOMING" as const,
        notes: notes || "",
        taxAmount: tax,
        discountAmount: discount,
        secondGuestName: secondGuestName || "",
        secondGuestPhone: secondGuestPhone || "",
        secondGuestIdNumber: secondGuestIdNumber || "",
        exceptionallyReserved: exceptionallyReserved === true,
        exceptionReason: exceptionReason || "",
        providerId: providerId!,
        ...(groupBookingId ? { groupBookingId } : {}),
      },
      include: {
        guest: { select: { id: true, name: true, phone: true, idNumber: true, idType: true } },
        room: { select: { id: true, number: true, name: true, type: true } },
      },
    });

    // Room stays AVAILABLE until check-in date — status will be updated by checkin API

    // Background: check if guest matches any suspected person (fire-and-forget)
    checkSuspectMatch({
      name: reservation.guest?.name ?? "",
      phone: reservation.guest?.phone ?? "",
      idNumber: reservation.guest?.idNumber ?? "",
      idType: reservation.guest?.idType ?? "",
      matchType: "RESERVATION",
      providerId,
      reservationId: reservation.id,
      extraDetails: {
        checkIn,
        checkOut,
        nights,
        roomNumber: reservation.room?.number ?? "",
        roomName: reservation.room?.name ?? "",
        totalCost,
      },
    }).catch(() => {});

    // Background: run anomaly detection (fire-and-forget)
    runAnomalyDetection({
      guestName: reservation.guest?.name ?? "",
      guestPhone: reservation.guest?.phone ?? "",
      providerId,
      reservationId: reservation.id,
      trigger: "RESERVATION",
    }).catch(() => {});

    return NextResponse.json(reservation, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to create reservation";
    let status = 500;
    if (message.includes("required") || message.includes("not found")) status = 400;
    else if (message.includes("permission") || message.includes("cannot") || message.includes("Staff")) status = 403;
    else if (message.includes("ROOM_CONFLICT")) status = 409;
    return NextResponse.json({ error: message }, { status });
  }
}