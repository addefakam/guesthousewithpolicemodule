import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getAuthContext, requirePolice, AuthError } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    requirePolice(auth);

    const sp = req.nextUrl.searchParams;
    const period = sp.get("period") || "monthly"; // daily | monthly | yearly
    const date = sp.get("date") || new Date().toISOString().slice(0, 10);
    const providerId = sp.get("providerId") || "";

    // Build date range based on period
    const now = new Date(date + "T00:00:00.000Z");
    let startDate: Date;
    let endDate: Date;
    let label: string;

    if (period === "daily") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      label = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } else if (period === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      label = String(now.getFullYear());
    } else {
      // monthly
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = now.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    }

    const providerFilter = providerId ? { providerId } : {};

    // ── 1. Summary KPIs ──
    const [totalGuests, totalReservations, totalCheckIns, totalCheckOuts, totalMatches, totalProviders, totalRooms] =
      await Promise.all([
        db.guest.count({
          where: { ...providerFilter, createdAt: { lte: endDate } },
        }),
        db.reservation.count({
          where: { ...providerFilter, createdAt: { gte: startDate, lte: endDate } },
        }),
        db.reservation.count({
          where: { ...providerFilter, actualCheckIn: { gte: startDate, lte: endDate } },
        }),
        db.reservation.count({
          where: { ...providerFilter, actualCheckOut: { gte: startDate, lte: endDate } },
        }),
        db.suspectMatch.count({
          where: { ...providerFilter, createdAt: { gte: startDate, lte: endDate } },
        }),
        providerId ? Promise.resolve(0) : db.provider.count({ where: { status: "APPROVED" } }),
        providerId ? db.room.count({ where: { providerId } }) : db.room.count(),
      ]);

    // Active guests (checked in and not checked out during this period)
    const activeGuests = await db.reservation.count({
      where: {
        ...providerFilter,
        status: "ACTIVE",
      },
    });

    // ── 2. Guest registration trend (time series) ──
    let guestTrend: { date: string; count: number }[] = [];
    if (period === "daily") {
      // Hourly for daily view
      guestTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT
          TO_CHAR("createdAt", 'HH24:00') AS date,
          COUNT(*)::int AS count
        FROM "Guest"
        WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("createdAt", 'HH24:00')
        ORDER BY date
      `);
    } else if (period === "monthly") {
      guestTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT
          TO_CHAR("createdAt", 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS count
        FROM "Guest"
        WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
        ORDER BY date
      `);
    } else {
      // yearly: monthly breakdown
      guestTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT
          TO_CHAR("createdAt", 'YYYY-MM') AS date,
          COUNT(*)::int AS count
        FROM "Guest"
        WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY date
      `);
    }

    // ── 3. Check-in / Check-out trend ──
    let checkInTrend: { date: string; count: number }[] = [];
    let checkOutTrend: { date: string; count: number }[] = [];
    if (period === "daily") {
      checkInTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT TO_CHAR("actualCheckIn", 'HH24:00') AS date, COUNT(*)::int AS count
        FROM "Reservation" WHERE "actualCheckIn" >= ${startDate} AND "actualCheckIn" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("actualCheckIn", 'HH24:00') ORDER BY date
      `);
      checkOutTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT TO_CHAR("actualCheckOut", 'HH24:00') AS date, COUNT(*)::int AS count
        FROM "Reservation" WHERE "actualCheckOut" >= ${startDate} AND "actualCheckOut" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("actualCheckOut", 'HH24:00') ORDER BY date
      `);
    } else if (period === "monthly") {
      checkInTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT TO_CHAR("actualCheckIn", 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
        FROM "Reservation" WHERE "actualCheckIn" >= ${startDate} AND "actualCheckIn" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("actualCheckIn", 'YYYY-MM-DD') ORDER BY date
      `);
      checkOutTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT TO_CHAR("actualCheckOut", 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
        FROM "Reservation" WHERE "actualCheckOut" >= ${startDate} AND "actualCheckOut" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("actualCheckOut", 'YYYY-MM-DD') ORDER BY date
      `);
    } else {
      checkInTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT TO_CHAR("actualCheckIn", 'YYYY-MM') AS date, COUNT(*)::int AS count
        FROM "Reservation" WHERE "actualCheckIn" >= ${startDate} AND "actualCheckIn" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("actualCheckIn", 'YYYY-MM') ORDER BY date
      `);
      checkOutTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT TO_CHAR("actualCheckOut", 'YYYY-MM') AS date, COUNT(*)::int AS count
        FROM "Reservation" WHERE "actualCheckOut" >= ${startDate} AND "actualCheckOut" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("actualCheckOut", 'YYYY-MM') ORDER BY date
      `);
    }

    // ── 4. Nationality breakdown ──
    const nationalities = await db.$queryRaw<{ name: string; count: number }[]>(Prisma.sql`
      SELECT
        CASE WHEN "nationality" IS NULL OR TRIM("nationality") = '' THEN 'Unknown'
             ELSE TRIM("nationality") END AS name,
        COUNT(*)::int AS count
      FROM "Guest"
      WHERE 1=1
        ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        ${period !== "yearly" ? Prisma.sql`AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}` : Prisma.sql``}
      GROUP BY CASE WHEN "nationality" IS NULL OR TRIM("nationality") = '' THEN 'Unknown' ELSE TRIM("nationality") END
      ORDER BY count DESC
      LIMIT 15
    `);

    // ── 5. Provider-level guest distribution ──
    const providerBreakdown = providerId
      ? []
      : await db.$queryRaw<{ name: string; guests: number; checkIns: number; checkOuts: number; matches: number; rooms: number }[]>(Prisma.sql`
        SELECT
          p."name",
          COALESCE(g.c, 0)::int AS "guests",
          COALESCE(ci.c, 0)::int AS "checkIns",
          COALESCE(co.c, 0)::int AS "checkOuts",
          COALESCE(sm.c, 0)::int AS "matches",
          COALESCE(r.c, 0)::int AS "rooms"
        FROM "Provider" p
        LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Guest" ${period !== "yearly" ? Prisma.sql`WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}` : Prisma.sql``} GROUP BY "providerId") g ON g."providerId" = p."id"
        LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Reservation" WHERE "actualCheckIn" >= ${startDate} AND "actualCheckIn" <= ${endDate} GROUP BY "providerId") ci ON ci."providerId" = p."id"
        LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Reservation" WHERE "actualCheckOut" >= ${startDate} AND "actualCheckOut" <= ${endDate} GROUP BY "providerId") co ON co."providerId" = p."id"
        LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "SuspectMatch" WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate} GROUP BY "providerId") sm ON sm."providerId" = p."id"
        LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Room" GROUP BY "providerId") r ON r."providerId" = p."id"
        WHERE p."status" = 'APPROVED'
        ORDER BY "guests" DESC
      `);

    // ── 6. Suspect match severity breakdown ──
    const suspectSeverities = await db.$queryRaw<{ severity: string; count: number }[]>(Prisma.sql`
      SELECT sp."severity", COUNT(sm."id")::int AS count
      FROM "SuspectMatch" sm
      JOIN "SuspectedPerson" sp ON sp."id" = sm."suspectedPersonId"
      WHERE sm."createdAt" >= ${startDate} AND sm."createdAt" <= ${endDate}
        ${providerId ? Prisma.sql`AND sm."providerId" = ${providerId}` : Prisma.sql``}
      GROUP BY sp."severity"
      ORDER BY count DESC
    `);

    // ── 7. Room occupancy by provider ──
    const occupancyByProvider = providerId
      ? []
      : await db.$queryRaw<{ name: string; total: number; occupied: number; available: number; reserved: number; maintenance: number; rate: number }[]>(Prisma.sql`
        SELECT
          p."name",
          COALESCE(r_total.c, 0)::int AS "total",
          COALESCE(r_occ.c, 0)::int AS "occupied",
          COALESCE(r_avail.c, 0)::int AS "available",
          COALESCE(r_res.c, 0)::int AS "reserved",
          COALESCE(r_maint.c, 0)::int AS "maintenance",
          CASE WHEN r_total.c > 0 THEN ROUND((COALESCE(r_occ.c, 0)::numeric / r_total.c) * 100, 1) ELSE 0 END AS rate
        FROM "Provider" p
        LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Room" GROUP BY "providerId") r_total ON r_total."providerId" = p."id"
        LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Room" WHERE "status" = 'OCCUPIED' GROUP BY "providerId") r_occ ON r_occ."providerId" = p."id"
        LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Room" WHERE "status" = 'AVAILABLE' GROUP BY "providerId") r_avail ON r_avail."providerId" = p."id"
        LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Room" WHERE "status" = 'RESERVED' GROUP BY "providerId") r_res ON r_res."providerId" = p."id"
        LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Room" WHERE "status" = 'MAINTENANCE' GROUP BY "providerId") r_maint ON r_maint."providerId" = p."id"
        WHERE p."status" = 'APPROVED'
        ORDER BY rate DESC
      `);

    // ── 8. Peak check-in hours (for daily/monthly: aggregate all check-ins by hour) ──
    const peakHours = period === "yearly"
      ? []
      : await db.$queryRaw<{ hour: string; count: number }[]>(Prisma.sql`
        SELECT
          TO_CHAR("actualCheckIn", 'HH24:00') AS "hour",
          COUNT(*)::int AS count
        FROM "Reservation"
        WHERE "actualCheckIn" >= ${startDate} AND "actualCheckIn" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("actualCheckIn", 'HH24:00')
        ORDER BY "hour"
      `);

    // ── 9. ID type distribution ──
    const idTypes = await db.$queryRaw<{ name: string; count: number }[]>(Prisma.sql`
      SELECT
        CASE WHEN "idType" IS NULL OR TRIM("idType") = '' THEN 'Not Provided'
             ELSE TRIM("idType") END AS name,
        COUNT(*)::int AS count
      FROM "Guest"
      WHERE 1=1
        ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        ${period !== "yearly" ? Prisma.sql`AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}` : Prisma.sql``}
      GROUP BY CASE WHEN "idType" IS NULL OR TRIM("idType") = '' THEN 'Not Provided' ELSE TRIM("idType") END
      ORDER BY count DESC
    `);

    // ── 10. Frequent stay alerts in period ──
    const frequentStayAlerts = await db.frequentStayAlert.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      orderBy: { stayCount: "desc" },
      take: 20,
    });

    // ── 11. Reservation status distribution ──
    const reservationStatuses = await db.$queryRaw<{ status: string; count: number }[]>(Prisma.sql`
      SELECT "status", COUNT(*)::int AS count
      FROM "Reservation"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
      GROUP BY "status"
      ORDER BY count DESC
    `);

    // ── 12. Suspect match trend (time series, same grain as check-in trend) ──
    let suspectTrend: { date: string; count: number }[] = [];
    if (period === "daily") {
      suspectTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT TO_CHAR("createdAt", 'HH24:00') AS date, COUNT(*)::int AS count
        FROM "SuspectMatch" WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("createdAt", 'HH24:00') ORDER BY date
      `);
    } else if (period === "monthly") {
      suspectTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
        FROM "SuspectMatch" WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD') ORDER BY date
      `);
    } else {
      suspectTrend = await db.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') AS date, COUNT(*)::int AS count
        FROM "SuspectMatch" WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
          ${providerId ? Prisma.sql`AND "providerId" = ${providerId}` : Prisma.sql``}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM') ORDER BY date
      `);
    }

    // ── 13. Provider list for filter dropdown ──
    const providers = await db.provider.findMany({
      where: { status: "APPROVED" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // Log audit
    logAudit(req, {
      action: "VIEW_REPORT",
      details: `${period} report for ${label}${providerId ? ` (provider: ${providerId})` : ""}`,
    });

    return NextResponse.json({
      period,
      date: date,
      label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalGuests,
        totalReservations,
        totalCheckIns,
        totalCheckOuts,
        activeGuests,
        totalMatches,
        totalProviders,
        totalRooms,
      },
      guestTrend,
      checkInTrend,
      checkOutTrend,
      suspectTrend,
      nationalities,
      idTypes,
      providerBreakdown,
      suspectSeverities,
      occupancyByProvider,
      peakHours,
      frequentStayAlerts,
      reservationStatuses,
      providers,
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    const msg = e instanceof Error ? e.message : "Failed to fetch police reports";
    const status = msg.includes("Police") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
