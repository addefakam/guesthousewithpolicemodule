import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Occupancy
    const totalRooms = await db.room.count();
    const occupiedRooms = await db.room.count({ where: { status: "OCCUPIED" } });
    const availableRooms = await db.room.count({ where: { status: "AVAILABLE" } });
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Today's revenue from check-ins today or active reservations
    const todayReservations = await db.reservation.findMany({
      where: {
        status: { in: ["ACTIVE", "COMPLETED"] },
        checkIn: { lte: today },
        checkOut: { gt: today },
      },
    });

    const todayServiceBookings = await db.daytimeBooking.findMany({
      where: { date: today },
    });

    const todayRevenue =
      todayReservations.reduce((s, r) => s + r.totalCost, 0) +
      todayServiceBookings.reduce((s, b) => s + b.totalCost, 0);

    // Active guests
    const activeGuests = await db.reservation.count({
      where: { status: "ACTIVE" },
    });

    // Pending payments
    const pendingPayments = await db.reservation.findMany({
      where: {
        paymentStatus: { in: ["PENDING", "PARTIAL"] },
        status: { not: "CANCELLED" },
      },
    });

    const pendingPaymentsAmount = pendingPayments.reduce((s, r) => s + r.balance, 0);

    // Today's expenses
    const todayExpenses = await db.expense.findMany({ where: { date: today } });
    const todayExpensesTotal = todayExpenses.reduce((s, e) => s + e.amount + e.taxAmount, 0);

    // Today's check-ins
    const todayCheckins = await db.reservation.count({
      where: { checkIn: today },
    });

    // Last 7 days revenue
    const last7DaysRevenue: Array<{ date: string; revenue: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      const dayReservations = await db.reservation.findMany({
        where: {
          status: { in: ["ACTIVE", "COMPLETED"] },
          checkIn: { lte: dateStr },
          checkOut: { gt: dateStr },
        },
      });

      const dayServices = await db.daytimeBooking.findMany({
        where: { date: dateStr },
      });

      const dayRevenue =
        dayReservations.reduce((s, r) => s + r.totalCost, 0) +
        dayServices.reduce((s, b) => s + b.totalCost, 0);

      last7DaysRevenue.push({ date: dateStr, revenue: dayRevenue });
    }

    // Recent activity
    const recentActivity = await db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    return NextResponse.json({
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      totalRooms,
      occupiedRooms,
      availableRooms,
      todayRevenue,
      activeGuests,
      pendingPaymentsAmount,
      pendingPaymentsCount: pendingPayments.length,
      todayExpenses: todayExpensesTotal,
      todayCheckins,
      last7DaysRevenue,
      recentActivity,
    });
  } catch (error) {
    console.error("Dashboard GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}