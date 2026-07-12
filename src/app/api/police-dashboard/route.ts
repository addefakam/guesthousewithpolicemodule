import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePolice } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const denied = requirePolice(request);
    if (denied) return denied;
    const today = new Date().toISOString().split("T")[0];

    // Provider stats
    const totalProviders = await db.provider.count({ where: { status: "APPROVED" } });
    const pendingRequests = await db.provider.count({ where: { status: "PENDING" } });
    const suspendedProviders = await db.provider.count({ where: { status: "SUSPENDED" } });

    // City-wide guest stats
    const totalGuests = await db.guest.count();
    const guestsCheckedInToday = await db.reservation.count({ where: { checkIn: today } });
    const activeReservations = await db.reservation.count({ where: { status: "ACTIVE" } });
    const upcomingReservations = await db.reservation.count({ where: { status: "UPCOMING" } });

    // City-wide room stats
    const totalRooms = await db.room.count();
    const occupiedRooms = await db.room.count({ where: { status: "OCCUPIED" } });
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100 * 10) / 10 : 0;

    // Revenue (all providers)
    const allReservations = await db.reservation.findMany({
      where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    });
    const totalRevenue = allReservations.reduce((s, r) => s + r.paidAmount, 0);
    const pendingBalance = allReservations.reduce((s, r) => s + r.balance, 0);

    // Per-provider stats
    const providerStats = await db.provider.findMany({
      where: { status: "APPROVED" },
      include: {
        _count: { select: { rooms: true, guests: true, reservations: true } },
        rooms: { where: { status: "OCCUPIED" }, select: { id: true } },
        reservations: { where: { status: "ACTIVE" }, select: { paidAmount: true, totalCost: true } },
      },
    });

    const providerOverview = providerStats.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      ownerName: p.ownerName,
      phone: p.phone,
      address: p.address,
      totalRooms: p._count.rooms,
      occupiedRooms: p.rooms.length,
      totalGuests: p._count.guests,
      activeReservations: p._count.reservations,
      revenue: p.reservations.reduce((s, r) => s + r.paidAmount, 0),
    }));

    // Recent activity across all providers
    const recentActivity = await db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Currently checked-in guests (active reservations with guest + room + provider info)
    const currentGuests = await db.reservation.findMany({
      where: { status: "ACTIVE" },
      include: {
        guest: { select: { name: true, phone: true, idNumber: true, nationality: true } },
        room: { select: { number: true, name: true } },
        provider: { select: { name: true } },
      },
      orderBy: { checkIn: "desc" },
      take: 20,
    });

    return NextResponse.json({
      totalProviders,
      pendingRequests,
      suspendedProviders,
      totalGuests,
      guestsCheckedInToday,
      activeReservations,
      upcomingReservations,
      totalRooms,
      occupiedRooms,
      occupancyRate,
      totalRevenue,
      pendingBalance,
      providerOverview,
      recentActivity,
      currentGuests,
    });
  } catch (error) {
    console.error("Police Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}