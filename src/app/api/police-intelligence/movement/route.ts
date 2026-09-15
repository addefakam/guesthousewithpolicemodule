import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requirePolice, AuthError } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    requirePolice(auth);

    const { searchParams } = new URL(req.url);
    const guestId = searchParams.get("guestId") || "";
    const phone = searchParams.get("phone") || "";
    const idNumber = searchParams.get("idNumber") || "";
    const name = searchParams.get("name") || "";

    // Search across all providers for matching guest reservations
    // Use raw SQL for room type to avoid Prisma enum cache issue 
    const guests = await db.$queryRaw<{
      id: string; name: string; phone: string; idNumber: string; nationality: string;
      providerId: string | null; providerName: string | null; providerAddress: string | null;
      reservationId: string | null; reservationStatus: string | null;
      checkIn: string | null; checkOut: string | null; createdAt: Date | null;
      roomNumber: string | null; roomName: string | null; roomType: string | null;
    }[]>`
      SELECT DISTINCT
        g."id", g."name", g."phone", g."idNumber", g."nationality",
        g."providerId",
        p."name" AS "providerName", p."address" AS "providerAddress",
        res."id" AS "reservationId", res."status" AS "reservationStatus",
        res."checkIn", res."checkOut", res."createdAt",
        rm."number" AS "roomNumber", rm."name" AS "roomName",
        rm."type"::text AS "roomType"
      FROM "Guest" g
      LEFT JOIN "Provider" p ON p."id" = g."providerId"
      LEFT JOIN "Reservation" res ON res."guestId" = g."id"
      LEFT JOIN "Room" rm ON rm."id" = res."roomId"
      WHERE
        ${guestId ? db.$queryRaw`g."id" = ${guestId}` : db.$queryRaw`TRUE`}
        ${phone ? db.$queryRaw`AND g."phone" ILIKE ${'%' + phone + '%'}` : db.$queryRaw``}
        ${idNumber ? db.$queryRaw`AND g."idNumber" ILIKE ${'%' + idNumber + '%'}` : db.$queryRaw``}
        ${name ? db.$queryRaw`AND g."name" ILIKE ${'%' + name + '%'}` : db.$queryRaw``}
      ORDER BY res."createdAt" DESC NULLS LAST
      LIMIT 100
    `;

    // Group by guest
    const guestMap = new Map<string, {
      id: string; name: string; phone: string; idNumber: string; nationality: string;
      provider: { id: string; name: string; address: string } | null;
      reservations: { id: string; status: string; checkIn: string; checkOut: string; createdAt: string; room: { number: string; name: string; type: string } | null }[];
    }>();

    for (const row of guests) {
      if (!guestMap.has(row.id)) {
        guestMap.set(row.id, {
          id: row.id, name: row.name, phone: row.phone, idNumber: row.idNumber, nationality: row.nationality,
          provider: row.providerId ? { id: row.providerId, name: row.providerName || "", address: row.providerAddress || "" } : null,
          reservations: [],
        });
      }
      if (row.reservationId) {
        guestMap.get(row.id)!.reservations.push({
          id: row.reservationId, status: row.reservationStatus || "",
          checkIn: row.checkIn || "", checkOut: row.checkOut || "",
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : "",
          room: row.roomNumber ? { number: row.roomNumber, name: row.roomName || "", type: row.roomType || "" } : null,
        });
      }
    }

    const guestList = Array.from(guestMap.values());

    // Also check suspect matches for this guest
    const suspectMatches = await db.suspectMatch.findMany({
      where: {
        ...(phone ? { guestPhone: { contains: phone } } : {}),
        ...(idNumber ? { guestIdNumber: { contains: idNumber } } : {}),
        ...(name ? { guestName: { contains: name } } : {}),
      },
      select: {
        id: true, guestName: true, guestPhone: true, guestIdNumber: true,
        providerName: true, providerId: true, matchType: true,
        reservationId: true, daytimeBookingId: true, isRead: true, createdAt: true,
        suspectedPerson: { select: { name: true, severity: true, description: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ guests: guestList, suspectMatches });
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    const message = error instanceof Error ? error.message : "Failed to fetch movement data";
    const status = message.includes("Police") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
