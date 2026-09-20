import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, checkWritePermission, AuthError } from "@/lib/tenant";
import { isValidPhone } from "@/lib/utils";

/** PUT /api/daytime-room-bookings/[id] — update a daytime room booking */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    const { providerId } = getProviderFilter(auth);
    checkWritePermission(auth, { staffOnlyWrite: true, staffPermissionKey: "daytime" });

    const { id } = await params;
    const body = await req.json();

    const existing = await db.daytimeRoomBooking.findFirst({
      where: { id, providerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { roomId, guestName, guestPhone, date, startTime, endTime, roomRate, notes, paymentMethod, paymentStatus, paidAmount, status } = body;

    // ── Recompute totalHours + totalCost if times changed ──
    let totalHours = existing.totalHours;
    let totalCost = existing.totalCost;
    let hourlyRate = existing.roomRate;

    const sTime = startTime || existing.startTime;
    const eTime = endTime || existing.endTime;

    if (startTime || endTime) {
      const [sh, sm] = sTime.split(":").map(Number);
      const [eh, em] = eTime.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (endMin <= startMin) {
        return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
      }

      totalHours = (endMin - startMin) / 60;
      if (totalHours > 12) {
        return NextResponse.json(
          { error: "Maximum booking duration is 12 hours", code: "MAX_HOURS_EXCEEDED" },
          { status: 400 }
        );
      }
    }

    if (roomRate !== undefined) {
      hourlyRate = Number(roomRate);
    }
    if (startTime || endTime || roomRate !== undefined) {
      totalCost = Math.round(totalHours * hourlyRate * 100) / 100;
    }

    if (guestPhone && guestPhone.trim() && !isValidPhone(guestPhone.trim())) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
    }

    const updated = await db.daytimeRoomBooking.update({
      where: { id },
      data: {
        ...(roomId !== undefined && { roomId }),
        ...(guestName !== undefined && { guestName: String(guestName).trim() }),
        ...(guestPhone !== undefined && { guestPhone: String(guestPhone).trim() }),
        ...(date !== undefined && { date: String(date).slice(0, 10) }),
        ...(startTime !== undefined && { startTime: String(startTime).slice(0, 5) }),
        ...(endTime !== undefined && { endTime: String(endTime).slice(0, 5) }),
        totalHours,
        roomRate: hourlyRate,
        totalCost,
        ...(paidAmount !== undefined && { paidAmount: Number(paidAmount) }),
        ...(paymentStatus !== undefined && { paymentStatus }),
        ...(paymentMethod !== undefined && { paymentMethod: paymentMethod || null }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
      },
      include: {
        room: { select: { id: true, number: true, name: true, type: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to update booking";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** DELETE /api/daytime-room-bookings/[id] — hard delete a daytime room booking */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    const { providerId } = getProviderFilter(auth);
    checkWritePermission(auth, { staffOnlyWrite: true, staffPermissionKey: "daytime" });

    const { id } = await params;

    const existing = await db.daytimeRoomBooking.findFirst({
      where: { id, providerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    await db.daytimeRoomBooking.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to delete booking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
