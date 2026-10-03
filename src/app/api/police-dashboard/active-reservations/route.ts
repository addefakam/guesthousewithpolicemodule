import { resetInitFlag, ensureDatabase } from "@/lib/init-db";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requirePolice, getJurisdictionFilter, AuthError } from "@/lib/tenant";
import { runReservationMaintenance } from "@/lib/reservation-maintenance";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    resetInitFlag();
    await ensureDatabase();
    const auth = await getAuthContext(req);
    requirePolice(auth);

    try {
      await runReservationMaintenance({});
    } catch {
      // Maintenance must never break police reads.
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 500, 500);

    // ── Jurisdiction filter ──
    const jFilter = getJurisdictionFilter(auth);
    const hasSubCity = !!jFilter.subCity;
    const hasWoreda = !!jFilter.woreda;
    const subCity = hasSubCity ? String(jFilter.subCity).replace(/'/g, "''") : "";
    const woreda = hasWoreda ? String(jFilter.woreda).replace(/'/g, "''") : "";

    // Build jurisdiction WHERE clause for the Provider join
    const jurisdictionClause = hasSubCity
      ? (hasWoreda
          ? `AND p."subCity" = '${subCity}' AND p."woreda" = '${woreda}'`
          : `AND p."subCity" = '${subCity}'`)
      : "";

    const sql = `
      SELECT
        r."id", r."status", r."checkIn", r."checkOut",
        r."nights", r."totalCost", r."paidAmount", r."balance",
        r."secondGuestName", r."secondGuestIdNumber",
        g."id" AS "guestId",
        g."name" AS "guestName", g."phone" AS "guestPhone",
        g."idNumber" AS "guestIdNumber", g."nationality" AS "guestNationality",
        rm."number" AS "roomNumber", rm."name" AS "roomName",
        rm."type"::text AS "roomType",
        p."id" AS "providerId", p."name" AS "providerName",
        p."phone" AS "providerPhone", p."address" AS "providerAddress"
      FROM "Reservation" r
      LEFT JOIN "Guest" g ON g."id" = r."guestId"
      LEFT JOIN "Room" rm ON rm."id" = r."roomId"
      LEFT JOIN "Provider" p ON p."id" = r."providerId"
      WHERE r."status" IN ('ACTIVE', 'UPCOMING') ${jurisdictionClause}
      ORDER BY r."status" ASC, r."checkIn" ASC
      LIMIT ${limit}
    `;

    const rows = await db.$queryRawUnsafe<{
      id: string; status: string; checkIn: string; checkOut: string;
      nights: number; totalCost: number; paidAmount: number; balance: number;
      secondGuestName: string | null; secondGuestIdNumber: string | null;
      guestId: string | null;
      guestName: string; guestPhone: string; guestIdNumber: string; guestNationality: string;
      roomNumber: string; roomName: string; roomType: string;
      providerId: string; providerName: string; providerPhone: string; providerAddress: string;
    }[]>(sql);

    const items = rows.map((r) => ({
      id: r.id,
      status: r.status,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      nights: r.nights,
      totalCost: r.totalCost,
      paidAmount: r.paidAmount,
      balance: r.balance,
      guestId: r.guestId || "",
      guestName: r.guestName || "—",
      guestPhone: r.guestPhone || "",
      guestIdNumber: r.guestIdNumber || "",
      guestNationality: r.guestNationality || "",
      secondGuestName: r.secondGuestName || "",
      secondGuestIdNumber: r.secondGuestIdNumber || "",
      roomNumber: r.roomNumber || "—",
      roomName: r.roomName || "",
      roomType: r.roomType || "",
      providerId: r.providerId || "",
      providerName: r.providerName || "—",
      providerPhone: r.providerPhone || "",
      providerAddress: r.providerAddress || "",
    }));

    return NextResponse.json({ items, count: items.length });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch active reservations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
