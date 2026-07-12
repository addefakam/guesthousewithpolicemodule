import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProviderFilter, checkWritePermission } from "@/lib/tenant";

function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;
    if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) dateFilter.gte = from;
      if (to) dateFilter.lte = to;
      where.checkIn = dateFilter;
    }

    const reservations = await db.reservation.findMany({
      where,
      include: { guest: true, room: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reservations);
  } catch (error) {
    console.error("Reservations GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "POST", { staffCanCreate: true });
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { guestId, roomId, checkIn, checkOut, notes, paymentMethod, discountAmount, taxAmount } = body;

    if (!guestId || !roomId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Guest, room, check-in, and check-out are required" }, { status: 400 });
    }

    const room = await db.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const nights = calculateNights(checkIn, checkOut);
    const roomRate = room.pricePerNight;
    const discount = parseFloat(discountAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    const totalCost = roomRate * nights - discount + tax;
    const paymentStatus: string = totalCost <= 0 ? "PAID" : "PENDING";

    const today = todayStr();
    let status: string = "UPCOMING";
    if (checkIn <= today && checkOut > today) {
      status = "ACTIVE";
    }

    const reservation = await db.reservation.create({
      data: {
        guestId,
        roomId,
        checkIn,
        checkOut,
        nights,
        roomRate,
        totalCost,
        paidAmount: 0,
        balance: totalCost,
        paymentStatus,
        paymentMethod: paymentMethod || null,
        status,
        notes: notes || "",
        discountAmount: discount,
        taxAmount: tax,
        providerId: providerId || "",
      },
      include: { guest: true, room: true },
    });

    // If auto-checkin, update room status
    if (status === "ACTIVE") {
      await db.room.update({
        where: { id: roomId },
        data: { status: "OCCUPIED" },
      });
      await db.activityLog.create({
        data: {
          message: `Reservation #${reservation.id.slice(-6)} auto-checked in for ${reservation.guest.name} in Room ${room.number}`,
          type: "INFO",
        },
      });
    }

    await db.activityLog.create({
      data: {
        message: `New reservation created for ${reservation.guest.name} in Room ${room.number} (${nights} nights)`,
        type: "INFO",
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Reservations POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "PUT");
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { id, guestId, roomId, checkIn, checkOut, notes, paymentMethod, discountAmount, taxAmount, paidAmount, balance, paymentStatus, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Reservation ID is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (guestId !== undefined) data.guestId = guestId;
    if (roomId !== undefined) data.roomId = roomId;
    if (checkIn !== undefined) data.checkIn = checkIn;
    if (checkOut !== undefined) data.checkOut = checkOut;
    if (notes !== undefined) data.notes = notes;
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
    if (discountAmount !== undefined) data.discountAmount = parseFloat(discountAmount);
    if (taxAmount !== undefined) data.taxAmount = parseFloat(taxAmount);
    if (paidAmount !== undefined) data.paidAmount = parseFloat(paidAmount);
    if (balance !== undefined) data.balance = parseFloat(balance);
    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;
    if (status !== undefined) data.status = status;

    // Recalculate nights if dates changed
    if (checkIn && checkOut) {
      data.nights = calculateNights(checkIn, checkOut);
    }

    const reservation = await db.reservation.update({
      where: { id, ...(providerId ? { providerId } : {}) },
      data,
      include: { guest: true, room: true },
    });

    return NextResponse.json(reservation);
  } catch (error: unknown) {
    console.error("Reservations PUT error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "DELETE");
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Reservation ID is required" }, { status: 400 });
    }

    await db.reservation.delete({ where: { id, ...(providerId ? { providerId } : {}) } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Reservations DELETE error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}