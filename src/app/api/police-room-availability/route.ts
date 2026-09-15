import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requirePolice, AuthError } from "@/lib/tenant";
import { ensureRoomTypeFAMILY } from "@/lib/ensure-room-type-enum";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    requirePolice(auth);

    // Ensure FAMILY exists in the RoomType enum before any query.
    // This is needed because Prisma's connection pool may have cached
    // the old enum values from before FAMILY was added.
    await ensureRoomTypeFAMILY();

    // ── City-wide room statistics ──
    const totalRooms = await db.room.count();
    const availableRooms = await db.room.count({ where: { status: "AVAILABLE" } });
    const occupiedRooms = await db.room.count({ where: { status: "OCCUPIED" } });
    const reservedRooms = await db.room.count({ where: { status: "RESERVED" } });
    const maintenanceRooms = await db.room.count({ where: { status: "MAINTENANCE" } });

    // ── Room type breakdown ──
    // Use raw SQL instead of Prisma's groupBy to avoid the prepared-statement
    // cache that may not know about the FAMILY enum value yet.
    const roomTypesRaw = await db.$queryRaw<{ type: string; count: bigint }[]>`
      SELECT type, COUNT(*)::bigint as count FROM "Room" GROUP BY type
    `;
    const roomTypes = roomTypesRaw.map(r => ({ type: r.type, _count: { id: Number(r.count) } }));

    // ── Per-provider room breakdown ──
    // Use raw SQL to avoid Prisma's prepared-statement cache issue with
    // the RoomType enum (FAMILY value was added after Prisma cached its
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
        totalProviders: providers.length,
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
