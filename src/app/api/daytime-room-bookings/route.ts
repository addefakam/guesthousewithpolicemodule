import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, checkWritePermission, AuthError } from "@/lib/tenant";
import { isValidPhone } from "@/lib/utils";

/**
 * GET /api/daytime-room-bookings
 *
 * Returns all daytime room bookings for the caller's provider.
 * Supports ?date=YYYY-MM-DD filter + ?limit= pagination.
 * Returns a paginated envelope { data, total, page, limit, totalPages }.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    const { providerId } = getProviderFilter(auth);

    const { searchParams } = req.nextUrl;
    const dateFilter = searchParams.get("date") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(999, Math.max(1, parseInt(searchParams.get("limit") || "999")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { providerId };
    if (dateFilter) where.date = dateFilter;

    const [bookings, total] = await Promise.all([
      db.daytimeRoomBooking.findMany({
        where,
        include: {
          room: { select: { id: true, number: true, name: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.daytimeRoomBooking.count({ where }),
    ]);

    return NextResponse.json({
      data: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch daytime room bookings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/daytime-room-bookings
 *
 * Creates a new daytime room booking (time-based, max 12 hours).
 *
 * Body: { roomId, guestName, guestPhone?, date, startTime, endTime,
 *         roomRate?, notes?, paymentMethod? }
 *
 * Server-side validation:
 *   - Required: roomId, guestName, date, startTime, endTime
 *   - Phone format if provided
 *   - Room must exist + belong to the same provider
 *   - totalHours = (endTime - startTime) in hours; reject if > 12 or <= 0
 *   - roomRate falls back to room.pricePerNight / 12 if not provided
 *   - totalCost = totalHours * roomRate
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    const { providerId } = getProviderFilter(auth);
    checkWritePermission(auth, { staffOnlyWrite: true, staffPermissionKey: "daytime" });

    const body = await req.json();
    const { roomId, guestName, guestPhone, date, startTime, endTime, roomRate, notes, paymentMethod } = body;

    // ── Required fields ──
    if (!roomId || !guestName || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields: roomId, guestName, date, startTime, endTime" },
        { status: 400 }
      );
    }

    // ── Phone validation (optional field) ──
    if (guestPhone && guestPhone.trim() && !isValidPhone(guestPhone.trim())) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use 7-15 digits with optional + prefix." },
        { status: 400 }
      );
    }

    // ── Room must exist + belong to the same provider ──
    const room = await db.room.findFirst({
      where: { id: roomId, providerId },
      select: { id: true, number: true, name: true, pricePerNight: true, status: true },
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found or does not belong to your guesthouse" }, { status: 404 });
    }

    // ── Compute total hours from start/end time ──
    // Times are "HH:mm" strings — parse to minutes, compute difference.
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        { error: "End time must be after start time", code: "END_TIME_BEFORE_START" },
        { status: 400 }
      );
    }

    const totalHours = (endMinutes - startMinutes) / 60;

    // ── Max 12 hours per booking ──
    const MAX_HOURS = 12;
    if (totalHours > MAX_HOURS) {
      return NextResponse.json(
        {
          error: `Maximum booking duration is ${MAX_HOURS} hours. Requested: ${totalHours.toFixed(1)} hours.`,
          code: "MAX_HOURS_EXCEEDED",
          details: { requestedHours: totalHours, maxHours: MAX_HOURS },
        },
        { status: 400 }
      );
    }

    // ── Hourly rate: use provided value, or fall back to pricePerNight / 12 ──
    const hourlyRate = roomRate !== undefined && roomRate !== null
      ? Number(roomRate)
      : Math.round((room.pricePerNight / 12) * 100) / 100; // round to 2 decimal places

    const totalCost = Math.round(totalHours * hourlyRate * 100) / 100;

    // ── Create the booking ──
    const booking = await db.daytimeRoomBooking.create({
      data: {
        roomId,
        guestName: String(guestName).trim(),
        guestPhone: guestPhone ? String(guestPhone).trim() : "",
        date: String(date).slice(0, 10),
        startTime: String(startTime).slice(0, 5),
        endTime: String(endTime).slice(0, 5),
        totalHours,
        roomRate: hourlyRate,
        totalCost,
        paidAmount: 0,
        paymentStatus: "PENDING",
        paymentMethod: paymentMethod || null,
        notes: notes || "",
        status: "UPCOMING",
        providerId: providerId!,
      },
      include: {
        room: { select: { id: true, number: true, name: true, type: true } },
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to create daytime room booking";
    const status = message.includes("required") ? 400 : message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
