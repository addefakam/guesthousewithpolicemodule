import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Runtime enum migration guard
 * ────────────────────────────
 * Schema enum additions are applied to local dev via `prisma db push`,
 * but the Vercel build only runs `prisma generate` — it never touches the
 * production database. Writing a new enum value before the database knows
 * it crashes with SQLSTATE 22P02 ("invalid input value for enum ...").
 *
 * ensureReservationStatusEnum() closes that gap: it checks the database
 * enum once per server instance and adds any missing values with
 * idempotent DDL (ADD VALUE IF NOT EXISTS). Values are compile-time
 * constants from the allowlist below — never user input.
 *
 * Call it before writes that use possibly-new enum values (e.g. the
 * reservation soft-delete) and from the maintenance run so that every
 * server instance self-heals, including via the daily cron.
 */

const REQUIRED_VALUES = ["COMPLETED", "DELETED"] as const;

let ensured = false;

export async function ensureReservationStatusEnum(): Promise<void> {
  if (ensured) return;
  try {
    const rows = await db.$queryRaw<{ present: string[] }[]>(
      Prisma.sql`SELECT ARRAY(SELECT enum_range(NULL::"ReservationStatus")) AS present`
    );
    const present: string[] = rows[0]?.present ?? [];
    const missing = REQUIRED_VALUES.filter((v) => !present.includes(v));
    for (const value of missing) {
      // Sanitized allowlist constant interpolated as an enum label literal.
      const label = Prisma.raw(`'${value.replace(/[^A-Z_]/g, "")}'`);
      await db.$executeRaw(
        Prisma.sql`ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS ${label}`
      );
    }
    ensured = true;
  } catch (error) {
    // Never block the caller: worst case the original 22P02 write error
    // surfaces and the next invocation retries.
    console.error("[ensureReservationStatusEnum] failed:", error);
  }
}
