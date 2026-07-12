import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkWritePermission } from "@/lib/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = checkWritePermission(request, "POST", { blockSuperuser: true, staffCanCreate: true });
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
      data: { status: "CANCELLED" },
      include: { guest: true, room: true },
    });

    // If room was RESERVED for this reservation, free it
    if (reservation.room.status === "RESERVED") {
      await db.room.update({
        where: { id: reservation.roomId },
        data: { status: "AVAILABLE" },
      });
    }

    await db.activityLog.create({
      data: {
        message: `Reservation cancelled: ${reservation.guest.name} - Room ${reservation.room.number}`,
        type: "WARNING",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Cancel reservation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}