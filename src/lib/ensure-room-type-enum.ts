import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Ensures the 'FAMILY' value exists in the PostgreSQL RoomType enum.
 *
 * Prisma's db push adds enum values locally, but the Vercel build only
 * runs `prisma generate` — it never touches the production database.
 * Without this, creating a FAMILY room crashes with SQLSTATE 22P02
 * ("invalid input value for enum 'RoomType': 'FAMILY'").
 *
 * ALTER TYPE ADD VALUE cannot run inside a DO $$ block or a transaction.
 * We use Prisma's $executeRaw with ALTER TYPE ... ADD VALUE IF NOT EXISTS
 * which is the only safe way to add enum values at runtime.
 *
 * Called from the rooms API POST route before any room creation.
 */

let ensured = false;

export async function ensureRoomTypeFAMILY(): Promise<void> {
  if (ensured) return;
  try {
    // Check if FAMILY already exists in the enum
    const rows = await db.$queryRaw<{ present: string[] }[]>(
      Prisma.sql`SELECT ARRAY(SELECT enum_range(NULL::"RoomType")) AS present`
    );
    const present: string[] = rows[0]?.present ?? [];

    if (!present.includes("FAMILY")) {
      // Add the FAMILY value to the RoomType enum
      // ALTER TYPE ... ADD VALUE IF NOT EXISTS is safe outside transactions
      await db.$executeRaw(
        Prisma.sql`ALTER TYPE "RoomType" ADD VALUE IF NOT EXISTS 'FAMILY'`
      );
      console.log("[ensureRoomTypeFAMILY] Added FAMILY to RoomType enum");
    }
    ensured = true;
  } catch (error) {
    // Log but don't block — the room creation will fail with a clear error
    // if the enum value is missing, and the next invocation will retry.
    console.error("[ensureRoomTypeFAMILY] failed:", error);
  }
}
