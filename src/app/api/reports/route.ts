import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProviderFilter } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { providerId, isPolice } = getProviderFilter(request);

    // Police users have their own reports API - return empty data
    if (isPolice) {
      return NextResponse.json({
        period: { from: "", to: "" },
        roomRevenue: 0,
        serviceRevenue: 0,
        grossRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        occupancyRate: 0,
        reservationCount: 0,
        uniqueGuests: 0,
        totalNights: 0,
        revenueByRoomType: {},
        expensesByCategory: {},
        dailyBreakdown: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Default to current month if not specified
    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

    const startDate = from || defaultFrom;
    const endDate = to || defaultTo;

    const where = providerId ? { providerId } : {};

    // Room revenue from completed/active reservations
    const reservations = await db.reservation.findMany({
      where: {
        ...where,
        checkIn: { lte: endDate },
        checkOut: { gte: startDate },
        status: { in: ["COMPLETED", "ACTIVE"] },
      },
      include: { room: true, guest: true, payments: true },
    });

    // Service revenue from daytime bookings
    const serviceBookings = await db.daytimeBooking.findMany({
      where: {
        ...where,
        date: { gte: startDate, lte: endDate },
      },
      include: { service: true, payments: true },
    });

    // Expenses
    const expenses = await db.expense.findMany({
      where: {
        ...where,
        date: { gte: startDate, lte: endDate },
      },
    });

    // All reservations in period for stats
    const allReservations = await db.reservation.findMany({
      where: {
        ...where,
        createdAt: { gte: new Date(startDate), lte: new Date(endDate + "T23:59:59") },
      },
    });

    // Revenue calculations
    const roomRevenue = reservations.reduce((sum, r) => sum + r.totalCost, 0);
    const serviceRevenue = serviceBookings.reduce((sum, b) => sum + b.totalCost, 0);
    const grossRevenue = roomRevenue + serviceRevenue;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount + e.taxAmount, 0);
    const netProfit = grossRevenue - totalExpenses;

    // Occupancy rate
    const totalRooms = await db.room.count({ where });
    const occupiedRooms = await db.room.count({ where: { ...where, status: "OCCUPIED" } });
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Reservation stats
    const uniqueGuestIds = new Set(allReservations.map((r) => r.guestId));
    const totalNights = reservations.reduce((sum, r) => sum + r.nights, 0);

    // Revenue by room type
    const revenueByRoomType: Record<string, number> = {};
    for (const r of reservations) {
      const type = r.room.type;
      revenueByRoomType[type] = (revenueByRoomType[type] || 0) + r.totalCost;
    }

    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount + e.taxAmount;
    }

    // Daily breakdown
    const dailyBreakdown: Array<{ date: string; revenue: number; expenses: number }> = [];
    const dateMap: Record<string, { revenue: number; expenses: number }> = {};

    for (const r of reservations) {
      const d = r.checkIn;
      if (d >= startDate && d <= endDate) {
        if (!dateMap[d]) dateMap[d] = { revenue: 0, expenses: 0 };
        dateMap[d].revenue += r.totalCost;
      }
    }

    for (const b of serviceBookings) {
      const d = b.date;
      if (d >= startDate && d <= endDate) {
        if (!dateMap[d]) dateMap[d] = { revenue: 0, expenses: 0 };
        dateMap[d].revenue += b.totalCost;
      }
    }

    for (const e of expenses) {
      const d = e.date;
      if (d >= startDate && d <= endDate) {
        if (!dateMap[d]) dateMap[d] = { revenue: 0, expenses: 0 };
        dateMap[d].expenses += e.amount + e.taxAmount;
      }
    }

    for (const [date, data] of Object.entries(dateMap)) {
      dailyBreakdown.push({ date, revenue: data.revenue, expenses: data.expenses });
    }
    dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      period: { from: startDate, to: endDate },
      roomRevenue,
      serviceRevenue,
      grossRevenue,
      totalExpenses,
      netProfit,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      reservationCount: allReservations.length,
      uniqueGuests: uniqueGuestIds.size,
      totalNights,
      revenueByRoomType,
      expensesByCategory,
      dailyBreakdown,
    });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
