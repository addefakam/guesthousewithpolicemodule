import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};

    if (date) {
      where.date = date;
    } else if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) dateFilter.gte = from;
      if (to) dateFilter.lte = to;
      where.date = dateFilter;
    }

    const bookings = await db.daytimeBooking.findMany({
      where,
      include: { service: true, payments: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Daytime bookings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceId, guestName, guestPhone, date, time, quantity, paymentMethod, notes } = body;

    if (!serviceId || !guestName || !date) {
      return NextResponse.json({ error: "Service, guest name, and date are required" }, { status: 400 });
    }

    const service = await db.daytimeService.findUnique({ where: { id: serviceId } });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const qty = parseInt(quantity) || 1;
    const totalCost = service.price * qty;
    const paymentStatus: string = totalCost <= 0 ? "PAID" : "PENDING";

    const booking = await db.daytimeBooking.create({
      data: {
        serviceId,
        guestName,
        guestPhone: guestPhone || "",
        date,
        time: time || "",
        quantity: qty,
        unitPrice: service.price,
        totalCost,
        paidAmount: 0,
        paymentStatus,
        paymentMethod: paymentMethod || null,
        notes: notes || "",
      },
      include: { service: true },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Daytime bookings POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, serviceId, quantity, paidAmount, balance, paymentStatus, paymentMethod, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...rest };

    if (serviceId !== undefined) data.serviceId = serviceId;
    if (quantity !== undefined) data.quantity = parseInt(quantity);
    if (paidAmount !== undefined) data.paidAmount = parseFloat(paidAmount);
    if (balance !== undefined) data.balance = parseFloat(balance);
    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;

    const booking = await db.daytimeBooking.update({
      where: { id },
      data,
      include: { service: true },
    });

    return NextResponse.json(booking);
  } catch (error: unknown) {
    console.error("Daytime bookings PUT error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    await db.daytimeBooking.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Daytime bookings DELETE error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}