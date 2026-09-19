import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, checkWritePermission, AuthError } from "@/lib/tenant";
import { runAnomalyDetection } from "@/lib/anomaly-engine";
import { logStaffActivity, getLogUserInfo } from "@/lib/staff-log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    checkWritePermission(auth, { staffOnlyWrite: true, staffPermissionKey: "reservations", staffCanCreate: true });

    const { id } = await params;
    const { providerId } = getProviderFilter(auth);

    const reservation = await db.reservation.findFirst({ where: { id, providerId } });
    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (reservation.status !== "UPCOMING") {
      return NextResponse.json(
        { error: `Cannot check in a reservation with status '${reservation.status}'` },
        { status: 409 }
      );
    }

    // ── Check-in date window enforcement ──
    // The guesthouse only allows check-in to happen on or after the
    // scheduled arrival date, AND on or before the scheduled checkout
    // date. Operators cannot check a guest in:
    //   - before their scheduled arrival (e.g. tomorrow's booking today)
    //   - after their scheduled checkout (the booking has effectively lapsed)
    // `reservation.checkIn` / `checkOut` are stored as YYYY-MM-DD strings,
    // so a string comparison against today's local YYYY-MM-DD is correct.
    // Local date is used (not UTC) so the comparison matches the
    // operator's wall clock — e.g. a guest due to arrive on the 15th can
    // still be checked in at 23:00 local time on the 15th even though
    // UTC has already rolled over to the 16th.
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    if (todayStr < reservation.checkIn) {
      return NextResponse.json(
        {
          error: `Cannot check in before the scheduled arrival date (${reservation.checkIn}). Today is ${todayStr}.`,
          code: "CHECKIN_TOO_EARLY",
          details: { scheduledCheckIn: reservation.checkIn, today: todayStr },
        },
        { status: 409 }
      );
    }
    if (todayStr > reservation.checkOut) {
      return NextResponse.json(
        {
          error: `Cannot check in after the scheduled checkout date (${reservation.checkOut}). Today is ${todayStr}.`,
          code: "CHECKIN_TOO_LATE",
          details: { scheduledCheckOut: reservation.checkOut, today: todayStr },
        },
        { status: 409 }
      );
    }

    // ── Room not already OCCUPIED by another active reservation ──
    // Even though this reservation is UPCOMING, the room could already
    // be physically occupied by a different ACTIVE reservation (e.g. a
    // previous guest who hasn't checked out yet, or a same-day checkout
    // where the room hasn't been turned over). Refuse in that case so we
    // never silently overwrite one guest's stay with another's.
    const room = await db.room.findUnique({
      where: { id: reservation.roomId },
      select: { id: true, status: true, number: true, name: true },
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (room.status === "OCCUPIED") {
      // Confirm the occupation is caused by a DIFFERENT reservation
      // (defensive — should always be true since this one is UPCOMING).
      const otherActive = await db.reservation.findFirst({
        where: {
          roomId: reservation.roomId,
          status: "ACTIVE",
          id: { not: reservation.id },
        },
        select: { id: true, guest: { select: { name: true } } },
      });
      if (otherActive) {
        return NextResponse.json(
          {
            error: `Room ${room.number}${room.name ? ` (${room.name})` : ""} is already occupied by ${otherActive.guest?.name || "another guest"}. Check out the current guest first.`,
            code: "ROOM_OCCUPIED",
            details: { roomId: reservation.roomId, roomNumber: room.number, otherReservationId: otherActive.id },
          },
          { status: 409 }
        );
      }
    }

    // Update reservation status and actual check-in time
    const updated = await db.reservation.update({
      where: { id },
      data: {
        status: "ACTIVE",
        actualCheckIn: now,
      },
      include: {
        guest: { select: { id: true, name: true, phone: true } },
      },
    });

    // Update room status to OCCUPIED
    await db.room.update({ select: { id: true, number: true, status: true, providerId: true },
      where: { id: reservation.roomId },
      data: { status: "OCCUPIED" },
    });

    // Staff log
    const { userId, userName } = getLogUserInfo(req);
    logStaffActivity({
      req, userId, userName, action: "CHECKIN", targetType: "RESERVATION", targetId: id,
      details: { guestName: updated.guest?.name ?? "", roomNumber: updated.room?.number ?? "", checkIn: reservation.checkIn },
      providerId,
    });

    // Background: run anomaly detection on check-in (fire-and-forget)
    runAnomalyDetection({
      guestName: updated.guest?.name ?? "",
      guestPhone: updated.guest?.phone ?? "",
      providerId,
      reservationId: id,
      trigger: "CHECKIN",
    }).catch(() => {});

    // Note: Suspect matching now runs at RESERVATION CREATION time (not check-in)
    // so the alert appears in the suspect list as soon as the reservation is
    // confirmed. No need to re-check here — the alert already exists.

    // Update the SuspectMatch record to mark it as unread again (new activity)
    try {
      await db.suspectMatch.updateMany({
        where: { reservationId: id },
        data: { isRead: false },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    const message = error instanceof Error ? error.message : "Failed to check in";
    const status = message.includes("not found") ? 404 : message.includes("Cannot check in") ? 409 : message.includes("permission") || message.includes("cannot") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}