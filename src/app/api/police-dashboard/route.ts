import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requirePolice, AuthError } from "@/lib/tenant";
import { runReservationMaintenance } from "@/lib/reservation-maintenance";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    requirePolice(auth);

    // ── Lazy maintenance (global scope, throttled + idempotent) ──
    // Police endpoints were previously reading raw SQL without running
    // this, so they showed stale data — past-checkout reservations that
    // the operator side had already auto-cancelled still appeared as
    // ACTIVE on the police dashboard. Running this here (with no scope
    // = city-wide) ensures police see the SAME fresh state the operator
    // sees after they open their app.
    //
    // Throttled to max-once-per-30s in the lib — repeated reads are
    // cheap no-ops. Never blocks reads on maintenance failures.
    try {
      await runReservationMaintenance({});
    } catch {
      // Maintenance must never break police dashboard reads.
    }

    // Single $queryRaw for all city-wide stats — 1 round-trip instead of 6
    const stats = await db.$queryRawUnsafe<Array<{ count?: bigint; total?: number | null }>>(`
      SELECT COUNT(*)::bigint AS count FROM "Provider"
      UNION ALL
      SELECT COUNT(*)::bigint AS count FROM "Room"
      UNION ALL
      SELECT COUNT(*)::bigint AS count FROM "Guest"
      UNION ALL
      SELECT COUNT(*)::bigint AS count FROM "Reservation" WHERE "status" IN ('UPCOMING','ACTIVE')
      UNION ALL
      SELECT COALESCE(SUM("paidAmount"), 0)::float AS total FROM "Reservation"
      UNION ALL
      SELECT COALESCE(SUM("paidAmount"), 0)::float AS total FROM "DaytimeBooking"
    `);

    const totalProviders = Number(stats[0].count);
    const totalRooms = Number(stats[1].count);
    const totalGuests = Number(stats[2].count);
    const activeReservations = Number(stats[3].count);
    const reservationRevenue = stats[4].total || 0;
    const daytimeRevenue = stats[5].total || 0;
    const revenue = reservationRevenue + daytimeRevenue;

    // Per-provider breakdown — single $queryRaw instead of 3 groupBy round-trips
    const providerBreakdown = await db.$queryRawUnsafe<{
      id: string; name: string; status: string;
      rooms: number; guests: number; totalReservations: number;
      activeReservations: number; revenue: number;
    }[]>(`
      SELECT
        p."id", p."name", p."status",
        COALESCE(r.c, 0)::int AS "rooms",
        COALESCE(g.c, 0)::int AS "guests",
        COALESCE(rv.c, 0)::int AS "totalReservations",
        COALESCE(ar.c, 0)::int AS "activeReservations",
        COALESCE(rr.total, 0)::float + COALESCE(dr.total, 0)::float AS "revenue"
      FROM "Provider" p
      LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Room" GROUP BY "providerId") r ON r."providerId" = p."id"
      LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Guest" GROUP BY "providerId") g ON g."providerId" = p."id"
      LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Reservation" GROUP BY "providerId") rv ON rv."providerId" = p."id"
      LEFT JOIN (SELECT "providerId", COUNT(*) AS c FROM "Reservation" WHERE "status" IN ('UPCOMING','ACTIVE') GROUP BY "providerId") ar ON ar."providerId" = p."id"
      LEFT JOIN (SELECT "providerId", SUM("paidAmount") AS total FROM "Reservation" GROUP BY "providerId") rr ON rr."providerId" = p."id"
      LEFT JOIN (SELECT "providerId", SUM("paidAmount") AS total FROM "DaytimeBooking" GROUP BY "providerId") dr ON dr."providerId" = p."id"
      ORDER BY
        CASE p."status"
          WHEN 'PENDING' THEN 0
          WHEN 'REJECTED' THEN 1
          WHEN 'SUSPENDED' THEN 2
          WHEN 'APPROVED' THEN 3
          ELSE 4
        END ASC,
        p."createdAt" DESC
    `);

    return NextResponse.json({
      totalProviders,
      totalRooms,
      totalGuests,
      activeReservations,
      revenue,
      providers: providerBreakdown,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch police dashboard";
    const status = message.includes("Police") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
