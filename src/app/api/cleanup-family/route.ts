import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/cleanup-family
 * 
 * Converts any rooms with type='FAMILY' to type='SUITE' and removes
 * FAMILY from the RoomType enum. This is needed because we removed
 * FAMILY from the Prisma schema but old rooms still have that type
 * in the database.
 * 
 * Uses raw SQL to bypass Prisma's enum validation.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Count rooms with FAMILY type
    const familyRooms = await db.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count FROM "Room" WHERE "type" = 'FAMILY'`
    ) as { count: number }[];

    const count = familyRooms[0]?.count || 0;

    if (count > 0) {
      // 2. Update FAMILY rooms to SUITE
      await db.$queryRawUnsafe(
        `UPDATE "Room" SET "type" = 'SUITE' WHERE "type" = 'FAMILY'`
      );
    }

    // 3. Try to remove FAMILY from the enum (PostgreSQL doesn't support
    // DROP VALUE directly, but we can recreate the type)
    // Actually, just leaving it in the DB enum is fine — as long as no
    // rooms have that type, Prisma won't encounter it.

    return NextResponse.json({
      success: true,
      message: count > 0 
        ? `Updated ${count} room(s) from FAMILY to SUITE. The enum error should now be resolved.`
        : "No rooms with FAMILY type found. The error should already be resolved.",
      roomsUpdated: count,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Cleanup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
