import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // Create SuspectedPerson table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SuspectedPerson" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL DEFAULT '',
        "idNumber" TEXT NOT NULL DEFAULT '',
        "idType" TEXT NOT NULL DEFAULT '',
        "nationality" TEXT NOT NULL DEFAULT '',
        "address" TEXT NOT NULL DEFAULT '',
        "description" TEXT NOT NULL DEFAULT '',
        "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
        "is_active" BOOLEAN NOT NULL DEFAULT 1,
        "registeredBy" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);

    // Create SuspectMatch table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SuspectMatch" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "suspectedPersonId" TEXT NOT NULL,
        "matchType" TEXT NOT NULL,
        "guestName" TEXT NOT NULL,
        "guestPhone" TEXT NOT NULL DEFAULT '',
        "guestIdNumber" TEXT NOT NULL DEFAULT '',
        "providerName" TEXT NOT NULL DEFAULT '',
        "providerId" TEXT NOT NULL DEFAULT '',
        "reservationId" TEXT,
        "daytimeBookingId" TEXT,
        "details" TEXT NOT NULL DEFAULT '',
        "isRead" BOOLEAN NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("suspectedPersonId") REFERENCES "SuspectedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create index for performance
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SuspectMatch_suspectedPersonId_idx" ON "SuspectMatch"("suspectedPersonId");
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SuspectMatch_isRead_idx" ON "SuspectMatch"("isRead");
    `);

    // Migrate stale data: any SUPERUSER with a providerId should be OPERATOR
    const migrated = await db.user.updateMany({
      where: { role: 'SUPERUSER', providerId: { not: null } },
      data: { role: 'OPERATOR' },
    });

    const message = migrated.count > 0
      ? `Tables created. Migrated ${migrated.count} SUPERUSER users to OPERATOR.`
      : 'Tables created. No stale data to migrate.';

    return NextResponse.json({
      success: true,
      tablesCreated: true,
      migratedCount: migrated.count,
      message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[setup-db]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}