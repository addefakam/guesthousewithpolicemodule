import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, checkWritePermission, AuthError } from "@/lib/tenant";
import { ensureReservationStatusEnum } from "@/lib/ensure-enum-values";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    const { providerId } = getProviderFilter(auth);
    checkWritePermission(auth, { staffOnlyWrite: true, staffPermissionKey: "reservations" });

    const { id } = await params;
    const body = await req.json();

    const existing = await db.reservation.findFirst({
      where: { id, providerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    const { guestId, roomId, checkIn, checkOut, roomRate, taxAmount, discountAmount, paymentMethod, notes, status, groupBookingId } = body;

    const newCheckIn = checkIn || existing.checkIn;
    const newCheckOut = checkOut || existing.checkOut;

    // ── Overlap guard (true per-day overlap on [checkIn, checkOut)) ──
    // Runs when dates or room change — e.g. extending a stay into another
    // booking must be rejected. The checkout day of another reservation stays
    // bookable as an arrival, so equal dates on either boundary are allowed.
    if (checkIn || checkOut || roomId !== undefined) {
      const inDay = String(newCheckIn).slice(0, 10);
      const outDay = String(newCheckOut).slice(0, 10);
      if (outDay <= inDay) {
        return NextResponse.json(
          { error: "Check-out date must be after the check-in date" },
          { status: 400 }
        );
      }
      const targetRoomId = roomId || existing.roomId;
      const overlapping = await db.reservation.findFirst({
        where: {
          id: { not: id },
          roomId: targetRoomId,
          status: { in: ["UPCOMING", "ACTIVE"] },
          checkIn: { lt: outDay },
          checkOut: { gt: inDay },
        },
        include: { room: { select: { number: true, name: true } } },
      });
      if (overlapping) {
        return NextResponse.json(
          {
            error: "ROOM_CONFLICT",
            code: "ROOM_CONFLICT",
            message: `Room ${overlapping.room?.number ?? ""} already has a reservation from ${overlapping.checkIn} to ${overlapping.checkOut}`,
            conflict: {
              roomId: targetRoomId,
              checkIn: overlapping.checkIn,
              checkOut: overlapping.checkOut,
              roomNumber: overlapping.room?.number ?? "",
              roomName: overlapping.room?.name ?? "",
            },
          },
          { status: 409 }
        );
      }
    }

    // Recalculate if dates or rates changed
    let nights = existing.nights;
    let totalCost = existing.totalCost;
    let balance = existing.balance;

    const newRate = roomRate !== undefined ? roomRate : existing.roomRate;
    const newTax = taxAmount !== undefined ? taxAmount : existing.taxAmount;
    const newDiscount = discountAmount !== undefined ? discountAmount : existing.discountAmount;

    if (checkIn || checkOut || roomRate !== undefined) {
      const startDate = new Date(newCheckIn);
      const endDate = new Date(newCheckOut);
      const diffMs = endDate.getTime() - startDate.getTime();
      nights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const subtotal = newRate * nights;
      totalCost = subtotal + newTax - newDiscount;
      balance = totalCost - existing.paidAmount;
    }

    const reservation = await db.reservation.update({
      where: { id },
      data: {
        ...(guestId !== undefined && { guestId }),
        ...(roomId !== undefined && { roomId }),
        ...(checkIn !== undefined && { checkIn }),
        ...(checkOut !== undefined && { checkOut }),
        nights,
        roomRate: newRate,
        totalCost,
        balance,
        ...(taxAmount !== undefined && { taxAmount }),
        ...(discountAmount !== undefined && { discountAmount }),
        ...(paymentMethod !== undefined && { paymentMethod: paymentMethod || null }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
        ...(groupBookingId !== undefined && { groupBookingId: groupBookingId || null }),
      },
      include: {
        guest: { select: { id: true, name: true, phone: true } },
        room: { select: { id: true, number: true, name: true, type: true } },
      },
    });

    return NextResponse.json(reservation);
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    const message = error instanceof Error ? error.message : "Failed to update reservation";
    const status = message.includes("not found") ? 404 : message.includes("permission") || message.includes("cannot") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    checkWritePermission(auth, { requireSuperuserOrOperator: true });

    const { id } = await params;
    const { providerId } = getProviderFilter(auth);

    const existing = await db.reservation.findFirst({
      where: { id, providerId },
      include: { room: { select: { id: true, status: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED" || existing.status === "DELETED") {
      return NextResponse.json(
        { error: `Cannot delete a reservation with status '${existing.status}'` },
        { status: 409 }
      );
    }

    // Soft-delete: update status to DELETED instead of removing the record.
    // The DELETED enum value may not exist in the database yet (Vercel builds
    // never run prisma db push), so make sure it does before writing it.
    await ensureReservationStatusEnum();
    const updated = await db.reservation.update({
      where: { id },
      data: { status: "DELETED" },
      include: {
        guest: { select: { id: true, name: true, phone: true } },
        room: { select: { id: true, number: true, name: true, type: true } },
      },
    });

    // Release room back to AVAILABLE if it was RESERVED or OCCUPIED
    if (
      existing.room.status === "RESERVED" ||
      existing.room.status === "OCCUPIED"
    ) {
      await db.room.update({
        where: { id: existing.roomId },
        data: { status: "AVAILABLE" },
      });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    const message = error instanceof Error ? error.message : "Failed to delete reservation";
    const status = message.includes("not found") ? 404 : message.includes("permission") || message.includes("cannot") || message.includes("required") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}