import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkWritePermission } from "@/lib/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = checkWritePermission(request, "POST", { staffOnlyWrite: true });
    if (denied) return denied;
    const { id } = await params;

    const reservation = await db.reservation.findUnique({
      where: { id },
      include: { guest: true, room: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    const updated = await db.reservation.update({
      where: { id },
      data: {
        status: "COMPLETED",
        actualCheckOut: new Date(),
      },
      include: { guest: true, room: true },
    });

    await db.room.update({
      where: { id: reservation.roomId },
      data: { status: "AVAILABLE" },
    });

    await db.guest.update({
      where: { id: reservation.guestId },
      data: {
        totalSpent: { increment: reservation.totalCost },
        totalStays: { increment: 1 },
      },
    });

    await db.activityLog.create({
      data: {
        message: `Check-out: ${reservation.guest.name} from Room ${reservation.room.number}`,
        type: "SUCCESS",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Check-out error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}