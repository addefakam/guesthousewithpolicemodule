import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
        status: "ACTIVE",
        actualCheckIn: new Date(),
      },
      include: { guest: true, room: true },
    });

    await db.room.update({
      where: { id: reservation.roomId },
      data: { status: "OCCUPIED" },
    });

    await db.activityLog.create({
      data: {
        message: `Check-in: ${reservation.guest.name} to Room ${reservation.room.number}`,
        type: "SUCCESS",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}