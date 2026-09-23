import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requirePolice, AuthError } from "@/lib/tenant";
import { runReservationMaintenance } from "@/lib/reservation-maintenance";

// ── Force dynamic rendering ──
// Prevents Vercel from caching stale room availability data at the edge.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    requirePolice(auth);

    // ── Lazy maintenance (global scope, throttled + idempotent) ──
    // Critical for room status parity with the operator side: this is
    // what heals stale OCCUPIED/RESERVED room flags back to AVAILABLE
    // when the guest has already checked out (or the reservation was
    // auto-cancelled). Without this, police would see rooms stuck in
    // OCCUPIED that the operator side has already released.
    //
    // Throttled to max-once-per-30s in the lib — repeated reads are
    // cheap no-ops. Never blocks reads on maintenance failures.
    try {
      await runReservationMaintenance({});
    } catch {
      // Maintenance must never break police room availability reads.
    }

    // This is needed because Prisma's connection pool may have cached
    // the old enum values .

    // ── Count ALL providers (regardless of status) ──
    // The rooms breakdown below filters by APPROVED (since PENDING /
    // REJECTED / SUSPENDED providers have no operational rooms to show),
    // but the "totalProviders" KPI on the police rooms screen must match
    // the count shown on the main system's providers page (which lists
    // ALL providers regardless of status). Without this separate count,
    // the police app showed 22 (APPROVED only) while the main system
    // showed 31 (all providers) — a confusing discrepancy.
    const allProvidersCountRaw = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Provider"
    `;
    const allProvidersCount = Number(allProvidersCountRaw[0].count);

    // ── City-wide room statistics ──
    // Use raw SQL for ALL room queries to avoid Prisma's prepared-statement
    // cache issue with the RoomType enum .
    const statsRaw = await db.$queryRaw<{ status: string; count: bigint }[]>`
      SELECT "status", COUNT(*)::bigint as count FROM "Room" GROUP BY "status"
    `;
    const statsMap: Record<string, number> = {};
    for (const s of statsRaw) {
      statsMap[s.status] = Number(s.count);
    }
    const totalRooms = Object.values(statsMap).reduce((a, b) => a + b, 0);
    const availableRooms = statsMap["AVAILABLE"] || 0;
    const occupiedRooms = statsMap["OCCUPIED"] || 0;
    const reservedRooms = statsMap["RESERVED"] || 0;
    const maintenanceRooms = statsMap["MAINTENANCE"] || 0;

    // ── Room type breakdown ──
    const roomTypesRaw = await db.$queryRaw<{ type: string; count: bigint }[]>`
      SELECT type, COUNT(*)::bigint as count FROM "Room" GROUP BY type
    `;
    const roomTypes = roomTypesRaw.map(r => ({ type: r.type, _count: { id: Number(r.count) } }));

    // ── Per-provider room breakdown ──
    // Use raw SQL to avoid Prisma's prepared-statement cache issue with
    // the RoomType enum 
    // query plans). Casting type::text avoids enum validation entirely.
    const providersRaw = await db.$queryRaw<{
      id: string; name: string; ownerName: string; phone: string;
      address: string; licenseNo: string; latitude: number; longitude: number;
      roomId: string; roomNumber: string; roomName: string; roomType: string;
      roomStatus: string; roomFloor: number; roomCapacity: number; roomPrice: number;
    }[]>`
      SELECT
        p."id", p."name", p."ownerName", p."phone",
        p."address", p."licenseNo", p."latitude", p."longitude",
        r."id" AS "roomId", r."number" AS "roomNumber", r."name" AS "roomName",
        r."type"::text AS "roomType", r."status" AS "roomStatus",
        r."floor" AS "roomFloor", r."capacity" AS "roomCapacity",
        r."pricePerNight" AS "roomPrice"
      FROM "Provider" p
      LEFT JOIN "Room" r ON r."providerId" = p."id"
      WHERE p."status" = 'APPROVED'
      ORDER BY p."name" ASC, r."number" ASC
    `;

    // Group rooms by provider
    const providerMap = new Map<string, {
      id: string; name: string; ownerName: string; phone: string;
      address: string; licenseNo: string; latitude: number; longitude: number;
      rooms: { id: string; number: string; name: string; type: string; status: string; floor: number; capacity: number; pricePerNight: number; }[];
    }>();

    for (const row of providersRaw) {
      if (!providerMap.has(row.id)) {
        providerMap.set(row.id, {
          id: row.id, name: row.name, ownerName: row.ownerName, phone: row.phone,
          address: row.address, licenseNo: row.licenseNo, latitude: row.latitude, longitude: row.longitude,
          rooms: [],
        });
      }
      if (row.roomId) {
        providerMap.get(row.id)!.rooms.push({
          id: row.roomId, number: row.roomNumber, name: row.roomName,
          type: row.roomType, status: row.roomStatus, floor: row.roomFloor,
          capacity: row.roomCapacity, pricePerNight: row.roomPrice,
        });
      }
    }

    const providers = Array.from(providerMap.values());

    // Build per-provider stats with room counts by status
    const providerStats = providers.map((p) => {
      const rooms = p.rooms;
      const total = rooms.length;
      const available = rooms.filter((r) => r.status === "AVAILABLE").length;
      const occupied = rooms.filter((r) => r.status === "OCCUPIED").length;
      const reserved = rooms.filter((r) => r.status === "RESERVED").length;
      const maintenance = rooms.filter((r) => r.status === "MAINTENANCE").length;
      const utilizationRate = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;
      const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
      const avgPrice = total > 0 ? Math.round(rooms.reduce((sum, r) => sum + r.pricePerNight, 0) / total) : 0;

      return {
        id: p.id,
        name: p.name,
        ownerName: p.ownerName,
        phone: p.phone,
        address: p.address,
        licenseNo: p.licenseNo,
        latitude: p.latitude,
        longitude: p.longitude,
        total,
        available,
        occupied,
        reserved,
        maintenance,
        utilizationRate,
        totalCapacity,
        avgPrice,
        rooms,
      };
    });

    // ── Capacity stats ──
    const totalCapacity = providerStats.reduce((sum, p) => sum + p.totalCapacity, 0);
    const totalOccupied = providerStats.reduce((sum, p) => sum + p.occupied, 0);
    const totalReserved = providerStats.reduce((sum, p) => sum + p.reserved, 0);
    const totalUtilizationRate = totalRooms > 0 ? Math.round(((totalOccupied + totalReserved) / totalRooms) * 100) : 0;

    return NextResponse.json({
      // City-wide summary
      summary: {
        // totalProviders = ALL providers (regardless of status), so the
        // police app's "Guesthouses" KPI matches the main system's
        // providers page total. The per-provider rooms breakdown below
        // is filtered to APPROVED only (PENDING/REJECTED providers have
        // no operational rooms to show), but the count shown to the user
        // includes every registered guesthouse in the city.
        totalProviders: allProvidersCount,
        // approvedProviders = the count of APPROVED providers only, kept
        // for reference so the police app can show "22 of 31 approved"
        // if needed.
        approvedProviders: providers.length,
        totalRooms,
        totalCapacity,
        availableRooms,
        occupiedRooms,
        reservedRooms,
        maintenanceRooms,
        utilizationRate: totalUtilizationRate,
      },
      // Room type distribution
      roomTypes: roomTypes.map((rt) => ({
        type: rt.type,
        count: rt._count.id,
      })),
      // Per-provider breakdown
      providers: providerStats,
    });
  } catch (error: unknown) {
        if (error instanceof AuthError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
    const message = error instanceof Error ? error.message : "Failed to fetch room availability";
    const status = message.includes("Police") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
