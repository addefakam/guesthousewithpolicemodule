import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [
      users,
      rooms,
      guests,
      reservations,
      daytimeServices,
      daytimeBookings,
      expenses,
      expenseCategories,
      resources,
      payments,
      notifications,
      housekeepingTasks,
      reviews,
      activityLogs,
      settings,
    ] = await Promise.all([
      db.user.findMany({ select: { id: true, username: true, role: true, name: true, createdAt: true, updatedAt: true } }),
      db.room.findMany(),
      db.guest.findMany(),
      db.reservation.findMany({ include: { guest: true, room: true } }),
      db.daytimeService.findMany(),
      db.daytimeBooking.findMany({ include: { service: true } }),
      db.expense.findMany(),
      db.expenseCategory.findMany(),
      db.resource.findMany(),
      db.payment.findMany(),
      db.notification.findMany(),
      db.housekeepingTask.findMany({ include: { room: true } }),
      db.review.findMany({ include: { guest: true } }),
      db.activityLog.findMany(),
      db.settings.findMany(),
    ]);

    return NextResponse.json({
      users,
      rooms,
      guests,
      reservations,
      daytimeServices,
      daytimeBookings,
      expenses,
      expenseCategories,
      resources,
      payments,
      notifications,
      housekeepingTasks,
      reviews,
      activityLogs,
      settings,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    let imported = 0;

    // Import settings
    if (data.settings && Array.isArray(data.settings) && data.settings.length > 0) {
      const s = data.settings[0];
      const { id, createdAt, updatedAt, ...settingsData } = s;
      await db.settings.upsert({
        where: { id: "main" },
        update: settingsData,
        create: { id: "main", ...settingsData },
      });
      imported++;
    }

    // Import users
    if (data.users && Array.isArray(data.users)) {
      for (const u of data.users) {
        const { id, createdAt, updatedAt, ...userData } = u;
        await db.user.upsert({
          where: { username: u.username },
          update: { ...userData, password: userData.password || "password123" },
          create: { ...userData, password: userData.password || "password123" },
        });
        imported++;
      }
    }

    // Import rooms
    if (data.rooms && Array.isArray(data.rooms)) {
      for (const r of data.rooms) {
        const { id, createdAt, updatedAt, ...roomData } = r;
        await db.room.upsert({
          where: { number: r.number },
          update: roomData,
          create: roomData,
        });
        imported++;
      }
    }

    // Import guests
    if (data.guests && Array.isArray(data.guests)) {
      for (const g of data.guests) {
        const { id, createdAt, updatedAt, ...guestData } = g;
        await db.guest.create({ data: guestData });
        imported++;
      }
    }

    // Import expense categories
    if (data.expenseCategories && Array.isArray(data.expenseCategories)) {
      for (const ec of data.expenseCategories) {
        const { id, createdAt, ...ecData } = ec;
        await db.expenseCategory.create({ data: ecData });
        imported++;
      }
    }

    // Import daytime services
    if (data.daytimeServices && Array.isArray(data.daytimeServices)) {
      for (const ds of data.daytimeServices) {
        const { id, createdAt, updatedAt, ...dsData } = ds;
        await db.daytimeService.create({ data: dsData });
        imported++;
      }
    }

    await db.activityLog.create({
      data: {
        message: `Data imported: ${imported} records processed`,
        type: "INFO",
      },
    });

    return NextResponse.json({ success: true, imported });
  } catch (error) {
    console.error("Data import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}