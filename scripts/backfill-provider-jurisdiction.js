#!/usr/bin/env node
/**
 * backfill-provider-jurisdiction.js
 *
 * Parses existing Provider address strings and populates the new
 * structured subCity and woreda fields so jurisdiction-based filtering
 * works for existing guesthouses immediately.
 *
 * Example address: "Bishoftu, Debaayyuu, Dirree"
 *   → subCity = "Debaayyuu"
 *   → woreda = "Dirree"
 *
 * Also handles old naming variants:
 *   "Cheleleka" → "Chalaleka"
 *   "Dhibaayyuu" → "Debaayyuu"
 *   "Dukam" → "Dukem"
 *
 * RUN:
 *   node scripts/backfill-provider-jurisdiction.js
 *
 * Safe to re-run — only updates providers where subCity is empty.
 */

const { PrismaClient } = require("@prisma/client");

// ── Bishoftu sub-cities and woredas (canonical names) ──
const SUB_CITIES = {
  "Debaayyuu": ["Dhakaa Boora", "Dirree", "Horaa", "Biiftuu"],
  "Chalaleka": ["Erere", "Arsedee", "Kilolee"],
  "Dukem": ["Odaa Nabee", "Xaddachaa", "Malkaa", "Abbuu Seeraa"],
};

// ── Old name variants → canonical names ──
const SUB_CITY_ALIASES = {
  "Cheleleka": "Chalaleka",
  "Chalaleka": "Chalaleka",
  "Debaayyuu": "Debaayyuu",
  "Dhibaayyuu": "Debaayyuu",
  "Dhibaayyu": "Debaayyuu",
  "Dukem": "Dukem",
  "Dukam": "Dukem",
};

// Build woreda aliases (case-insensitive matching)
const WOREDA_ALIASES = {};
for (const [subCity, woredas] of Object.entries(SUB_CITIES)) {
  for (const woreda of woredas) {
    // Exact match
    WOREDA_ALIASES[woreda.toLowerCase()] = woreda;
    // Also try without spaces
    WOREDA_ALIASES[woreda.toLowerCase().replace(/\s+/g, "")] = woreda;
  }
}

function parseAddress(address) {
  if (!address) return { subCity: "", woreda: "" };

  // Split by comma, trim each part
  const parts = address.split(",").map((p) => p.trim());

  let subCity = "";
  let woreda = "";

  for (const part of parts) {
    if (!part) continue;

    // Skip "Bishoftu" — that's the city, not a sub-city
    if (part.toLowerCase() === "bishoftu") continue;

    // Try to match sub-city (case-insensitive)
    const partLower = part.toLowerCase();
    for (const [alias, canonical] of Object.entries(SUB_CITY_ALIASES)) {
      if (partLower === alias.toLowerCase() || partLower.includes(alias.toLowerCase())) {
        subCity = canonical;
        break;
      }
    }

    // If we already found a sub-city, try to match woreda
    if (subCity && !woreda) {
      const woredaKey = partLower.replace(/\s+/g, "");
      if (WOREDA_ALIASES[partLower] || WOREDA_ALIASES[woredaKey]) {
        woreda = WOREDA_ALIASES[partLower] || WOREDA_ALIASES[woredaKey];
      }
    }
  }

  // If we found a sub-city but no woreda, check if any woreda name
  // appears as a substring in the address
  if (subCity && !woreda) {
    const addrLower = address.toLowerCase();
    for (const woreda of SUB_CITIES[subCity] || []) {
      if (addrLower.includes(woreda.toLowerCase())) {
        woreda = woreda;
        break;
      }
    }
  }

  return { subCity, woreda };
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Backfill Provider Jurisdiction (subCity + woreda)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── Load .env ──
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    });
    console.log("✓ Loaded .env file");
  }

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set.");
    process.exit(1);
  }

  const prisma = new PrismaClient({ log: ["warn", "error"] });

  try {
    await prisma.$connect();
    console.log("✓ Connected to database\n");

    // ── Get all providers with empty subCity ──
    const providers = await prisma.provider.findMany({
      where: {
        OR: [
          { subCity: "" },
          { subCity: null },
        ],
      },
      select: { id: true, name: true, address: true, subCity: true, woreda: true },
    });

    console.log(`Found ${providers.length} provider(s) with empty subCity\n`);

    if (providers.length === 0) {
      console.log("✅ All providers already have subCity populated. Nothing to do.");
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const provider of providers) {
      const { subCity, woreda } = parseAddress(provider.address);

      if (subCity) {
        console.log(`  ✓ ${provider.name}`);
        console.log(`    Address: ${provider.address}`);
        console.log(`    → subCity: ${subCity}, woreda: ${woreda || "(none)"}`);

        await prisma.provider.update({
          where: { id: provider.id },
          data: {
            subCity,
            woreda: woreda || "",
          },
        });
        updated++;
      } else {
        console.log(`  ⚠ ${provider.name}`);
        console.log(`    Address: ${provider.address}`);
        console.log(`    → Could not parse sub-city from address. Skipping.`);
        skipped++;
      }
      console.log("");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  ✅ Backfill complete!`);
    console.log(`  Updated: ${updated} provider(s)`);
    console.log(`  Skipped: ${skipped} provider(s) (couldn't parse address)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
