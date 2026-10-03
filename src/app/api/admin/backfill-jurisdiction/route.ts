import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, AuthError } from "@/lib/tenant";
import { ensureDatabase, resetInitFlag } from "@/lib/init-db";

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

function parseAddress(address: string): { subCity: string; woreda: string } {
  if (!address) return { subCity: "", woreda: "" };
  const parts = address.split(",").map((p) => p.trim());
  let subCity = "";
  let woreda = "";

  for (const part of parts) {
    if (!part || part.toLowerCase() === "bishoftu") continue;
    const partLower = part.toLowerCase();

    // Match sub-city
    for (const [alias, canonical] of Object.entries(SUB_CITY_ALIASES)) {
      if (partLower === alias || partLower.includes(alias)) {
        subCity = canonical;
        break;
      }
    }

    // Match woreda (if sub-city found)
    if (subCity && !woreda) {
      for (const w of SUB_CITIES[subCity] || []) {
        if (partLower === w.toLowerCase() || partLower.includes(w.toLowerCase())) {
          woreda = w;
          break;
        }
      }
    }
  }

  // Fallback: search entire address for woreda names
  if (subCity && !woreda) {
    const addrLower = address.toLowerCase();
    for (const w of SUB_CITIES[subCity] || []) {
      if (addrLower.includes(w.toLowerCase())) {
        woreda = w;
        break;
      }
    }
  }

  return { subCity, woreda };
}

/**
 * POST /api/admin/backfill-jurisdiction
 *
 * SUPERUSER only. Parses existing Provider address strings and
 * populates the structured subCity + woreda fields.
 *
 * Returns: { updated, skipped, total, details: [...] }
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

    // Get all providers with empty subCity
    const providers = await db.provider.findMany({
      where: {
        OR: [{ subCity: "" }, { subCity: null }],
      },
      select: { id: true, name: true, address: true },
    });

    const details: { name: string; address: string; subCity: string; woreda: string; status: string }[] = [];
    let updated = 0;
    let skipped = 0;

    for (const provider of providers) {
      const { subCity, woreda } = parseAddress(provider.address || "");

      if (subCity) {
        await db.provider.update({
          where: { id: provider.id },
          data: { subCity, woreda: woreda || "" },
        });
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
