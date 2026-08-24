import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, getProviderFilter, AuthError } from "@/lib/tenant";
import { calcSubscriptionStatus, TRIAL_DAYS } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    const filter = getProviderFilter(auth);

    const where = filter.isPolice ? {} : { providerId: filter.providerId };

    // Today & month boundaries
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Last 7 days boundary (start of day 6 days ago)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // ── All queries in a single Promise.all ──
    const [
      roomStatusCounts,
      activeReservations,
      todayCheckins,
      todayCheckouts,
      revenueResult,
      activityLogs,
      revenueLast7DaysRaw,
      // Subscription + provider (combined for OPERATOR/STAFF, null otherwise)
      subResult,
    ] = await Promise.all([
      // 1. Room counts by status
      db.room.groupBy({ by: ["status"], where, _count: { status: true } }),

      // 2. Active reservations
      db.reservation.count({ where: { ...where, status: "ACTIVE" } }),

      // 3. Today check-ins
      db.reservation.count({ where: { ...where, status: "UPCOMING", checkIn: today } }),

      // 4. Today check-outs
      db.reservation.count({ where: { ...where, status: "ACTIVE", checkOut: today } }),

      // 5. Revenue aggregate (monthly)
      db.reservation.aggregate({
        _sum: { paidAmount: true },
        where: { ...where, status: "COMPLETED", actualCheckOut: { gte: monthStart, lte: monthEnd } },
      }),

      // 6. Recent activity logs
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 15,
      }),

      // 7. Revenue last 7 days — actual payments from Payment table
      filter.isPolice
        ? db.$queryRawUnsafe<{ date: string; amount: number }[]>(
            `SELECT DATE("createdAt")::text AS date, COALESCE(SUM("amount"), 0)::float AS amount FROM "Payment" WHERE "createdAt" >= $1 GROUP BY DATE("createdAt") ORDER BY date ASC`,
            sevenDaysAgo.toISOString()
          )
        : filter.providerId
          ? db.$queryRawUnsafe<{ date: string; amount: number }[]>(
              `SELECT DATE("createdAt")::text AS date, COALESCE(SUM("amount"), 0)::float AS amount FROM "Payment" WHERE "providerId" = $1 AND "createdAt" >= $2 GROUP BY DATE("createdAt") ORDER BY date ASC`,
              filter.providerId, sevenDaysAgo.toISOString()
            )
          : Promise.resolve([] as { date: string; amount: number }[]),

      // 8+9. Subscription + Provider info (OPERATOR/STAFF only)
      (auth.role !== "SUPERUSER" && auth.role !== "POLICE" && auth.providerId)
        ? (async () => {
            const [sub, prov] = await Promise.all([
              db.subscription.findFirst({ where: { providerId: auth.providerId } }),
              db.provider.findFirst({
                where: { id: auth.providerId },
                select: { name: true, ownerName: true, phone: true, status: true },
              }),
            ]);
            let finalSub = sub;
            if (!sub && prov?.status === "APPROVED") {
              const trialEnd = new Date();
              trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
              try {
                finalSub = await db.subscription.create({
                  data: { providerId: auth.providerId, startDate: new Date(), endDate: trialEnd, cycle: "MONTHLY", price: 0 },
                });
              } catch {
                finalSub = await db.subscription.findFirst({ where: { providerId: auth.providerId } });
              }
            }
            return { subscription: finalSub, provider: prov };
          })()
        : Promise.resolve(null),
    ]);

    // Process room status
    const roomsByStatus: Record<string, number> = {
      AVAILABLE: 0, OCCUPIED: 0, MAINTENANCE: 0, RESERVED: 0,
    };
    for (const item of roomStatusCounts) {
      roomsByStatus[item.status] = item._count.status;
    }
    const totalRooms = Object.values(roomsByStatus).reduce((a, b) => a + b, 0);
    const occupancyRate = totalRooms > 0
      ? Math.round((roomsByStatus.OCCUPIED / totalRooms) * 100) : 0;

    // Build last 7 days revenue array — fill missing days with 0
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const revenueByDate: Record<string, number> = {};
    for (const row of revenueLast7DaysRaw) {
      revenueByDate[row.date] = row.amount;
    }
    const revenueLast7Days: { day: string; date: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      revenueLast7Days.push({
        day: DAY_NAMES[d.getDay()],
        date: dateStr,
        amount: revenueByDate[dateStr] || 0,
      });
    }

    // Build subscription response
    let subscriptionData = null as Record<string, unknown> | null;
    const subscription = subResult?.subscription;
    const providerInfo = subResult?.provider;
    if (subscription && providerInfo) {
      const { status, daysRemaining } = calcSubscriptionStatus(subscription.endDate);
      subscriptionData = {
        status,
        daysRemaining,
        endDate: subscription.endDate.toISOString(),
        cycle: subscription.cycle,
        price: subscription.price,
        providerName: providerInfo.name || "",
        ownerName: providerInfo.ownerName || "",
        phone: providerInfo.phone || "",
      };
    } else if (auth.role === "SUPERUSER" || auth.role === "POLICE") {
      subscriptionData = { exempt: true };
    }

    return NextResponse.json({
      roomsByStatus,
      totalRooms,
      activeReservations,
      todayCheckins,
      todayCheckouts,
      totalRevenue: revenueResult._sum.paidAmount || 0,
      occupancyRate,
      activity: activityLogs,
      subscription: subscriptionData,
      revenueLast7Days,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[dashboard] Error:", msg, error);
    return NextResponse.json(
      { error: "Internal server error", debug: msg },
      { status: 500 }
    );
  }
}
