import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, AuthError } from "@/lib/tenant";
import { resetInitFlag, ensureDatabase } from "@/lib/init-db";

// ── Bishoftu sub-cities and woredas ──
const SUB_CITIES: Record<string, string[]> = {
  Debaayyuu: ["Dhakaa Boora", "Dirree", "Horaa", "Biiftuu"],
  Chalaleka: ["Erere", "Arsedee", "Kilolee"],
  Dukem: ["Odaa Nabee", "Xaddachaa", "Malkaa", "Abbuu Seeraa"],
};

const SUB_CITY_ALIASES: Record<string, string> = {
  cheleleka: "Chalaleka",
  chalaleka: "Chalaleka",
  debaayyuu: "Debaayyuu",
  dhibaayyuu: "Debaayyuu",
  dhibaayyu: "Debaayyuu",
  dukem: "Dukem",
  dukam: "Dukem",
};

// Woreda aliases — old spelling → canonical spelling
const WOREDA_ALIASES: Record<string, string> = {
  "dhaka booraa": "Dhakaa Boora",
  "dhakaa boora": "Dhakaa Boora",
  "er": "Erere",
  "erer": "Erere",
  "erere": "Erere",
  "arsadee": "Arsedee",
  "arsedee": "Arsedee",
  "arsade": "Arsedee",
};

function parseAddress(address: string): { subCity: string; woreda: string } {
  if (!address) return { subCity: "", woreda: "" };
  const parts = address.split(",").map((p) => p.trim());
  let subCity = "";
  let woreda = "";

  for (const part of parts) {
    if (!part || part.toLowerCase() === "bishoftu") continue;
    const partLower = part.toLowerCase().replace(/\s+/g, " ");

    // Match sub-city (with aliases)
    for (const [alias, canonical] of Object.entries(SUB_CITY_ALIASES)) {
      if (partLower === alias || partLower.includes(alias)) {
        subCity = canonical;
        break;
      }
    }

    // Match woreda (if sub-city found) — check canonical names + aliases
    if (subCity && !woreda) {
      // Try canonical woreda names first
      for (const w of SUB_CITIES[subCity] || []) {
        if (partLower === w.toLowerCase() || partLower.includes(w.toLowerCase())) {
          woreda = w;
          break;
        }
      }
      // Try woreda aliases (old spelling → canonical)
      if (!woreda) {
        for (const [alias, canonical] of Object.entries(WOREDA_ALIASES)) {
          if (partLower === alias || partLower.includes(alias)) {
            woreda = canonical;
            break;
          }
        }
      }
    }
  }

  // Fallback: search entire address for woreda names + aliases
  if (subCity && !woreda) {
    const addrLower = address.toLowerCase();
    for (const w of SUB_CITIES[subCity] || []) {
      if (addrLower.includes(w.toLowerCase())) {
        woreda = w;
        break;
      }
    }
    if (!woreda) {
      for (const [alias, canonical] of Object.entries(WOREDA_ALIASES)) {
        if (addrLower.includes(alias)) {
          woreda = canonical;
          break;
        }
      }
    }
  }

  return { subCity, woreda };
}

/**
 * POST /api/admin/backfill-jurisdiction
 *
 * SUPERUSER only. Uses raw SQL to:
 * 1. Ensure Provider.subCity and Provider.woreda columns exist
 * 2. Parse existing Provider address strings
 * 3. Update the subCity + woreda fields
 *
 * Uses raw SQL ($executeRawUnsafe) instead of Prisma's generated client
 * because the Prisma client may not match the actual DB schema if
 * migrations haven't run yet.
 */
export async function POST(req: NextRequest) {
  try {
    resetInitFlag();
    await ensureDatabase();

    const auth = await getAuthContext(req);
    if (auth.role !== "SUPERUSER") {
      return NextResponse.json(
        { error: "Superuser access required" },
        { status: 403 }
      );
    }

    // ── Step 1: Ensure columns exist via raw SQL ──
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "subCity" TEXT NOT NULL DEFAULT ''`);
      await db.$executeRawUnsafe(`ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "woreda" TEXT NOT NULL DEFAULT ''`);
      await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "jurisdictionType" TEXT NOT NULL DEFAULT 'CITY'`);
      await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subCity" TEXT`);
      await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "woreda" TEXT`);
    } catch (colErr) {
      console.error("[backfill] Column creation error:", colErr);
      // Continue anyway — columns might already exist
    }

    // ── Step 2: Fetch all providers with empty subCity ──
    const providers = await db.$queryRawUnsafe<{
      id: string; name: string; address: string; subCity: string;
    }[]>(`SELECT "id", "name", "address", "subCity" FROM "Provider" WHERE "subCity" = '' OR "subCity" IS NULL`);

    const details: { name: string; address: string; subCity: string; woreda: string; status: string }[] = [];
    let updated = 0;
    let skipped = 0;

    // ── Step 3: Parse + update each provider ──
    for (const provider of providers) {
      const { subCity, woreda } = parseAddress(provider.address || "");

      if (subCity) {
        // Use raw SQL to update — avoids Prisma client type issues
        const escapedSubCity = subCity.replace(/'/g, "''");
        const escapedWoreda = (woreda || "").replace(/'/g, "''");
        await db.$executeRawUnsafe(
          `UPDATE "Provider" SET "subCity" = '${escapedSubCity}', "woreda" = '${escapedWoreda}' WHERE "id" = '${provider.id}'`
        );
        updated++;
        details.push({
          name: provider.name,
          address: provider.address || "",
          subCity,
          woreda: woreda || "",
          status: "updated",
        });
      } else {
        skipped++;
        details.push({
          name: provider.name,
          address: provider.address || "",
          subCity: "",
          woreda: "",
          status: "skipped (couldn't parse)",
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: providers.length,
      updated,
      skipped,
      details,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("[backfill-jurisdiction]", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to backfill jurisdiction data: " + msg },
      { status: 500 }
    );
  }
}
