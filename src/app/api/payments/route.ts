import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProviderFilter, checkWritePermission } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { providerId } = getProviderFilter(request);
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get("reservationId");

    const where: Record<string, unknown> = {};
    if (providerId) where.providerId = providerId;
    if (reservationId) where.reservationId = reservationId;

    const payments = await db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error("Payments GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = checkWritePermission(request, "POST", { staffOnlyWrite: true, staffPermissionKey: "reservations" });
    if (denied) return denied;
    const { providerId } = getProviderFilter(request);
    const body = await request.json();
    const { reservationId, daytimeBookingId, amount, method, referenceNo, notes } = body;

    if (!amount || !method) {
      return NextResponse.json({ error: "Amount and method are required" }, { status: 400 });
    }

    if (!reservationId && !daytimeBookingId) {
      return NextResponse.json({ error: "Reservation or daytime booking ID is required" }, { status: 400 });
    }

    const payment = await db.payment.create({
      data: {
        reservationId: reservationId || null,
        daytimeBookingId: daytimeBookingId || null,
        amount: parseFloat(amount),
        method,
        referenceNo: referenceNo || "",
        notes: notes || "",
        providerId: providerId || "",
      },
    });

    // Update reservation paid amount if linked
    if (reservationId) {
      const allPayments = await db.payment.findMany({
        where: { reservationId },
      });
      const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);

      const reservation = await db.reservation.findUnique({ where: { id: reservationId } });
      if (reservation) {
        const balance = reservation.totalCost - totalPaid;
        let paymentStatus: string = "PENDING";
        if (totalPaid >= reservation.totalCost) paymentStatus = "PAID";
        else if (totalPaid > 0) paymentStatus = "PARTIAL";

        await db.reservation.update({
          where: { id: reservationId },
          data: { paidAmount: totalPaid, balance, paymentStatus },
        });
      }
    }

    // Update daytime booking paid amount if linked
    if (daytimeBookingId) {
      const allPayments = await db.payment.findMany({
        where: { daytimeBookingId },
      });
      const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);

      const booking = await db.daytimeBooking.findUnique({ where: { id: daytimeBookingId } });
      if (booking) {
        const balance = booking.totalCost - totalPaid;
        let paymentStatus: string = "PENDING";
        if (totalPaid >= booking.totalCost) paymentStatus = "PAID";
        else if (totalPaid > 0) paymentStatus = "PARTIAL";

        await db.daytimeBooking.update({
          where: { id: daytimeBookingId },
          data: { paidAmount: totalPaid, balance, paymentStatus },
        });
      }
    }

    await db.activityLog.create({
      data: {
        message: `Payment of ${amount} recorded (${method})`,
        type: "SUCCESS",
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Payments POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}