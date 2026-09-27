#!/usr/bin/env node
/**
 * One-time data-cleanup script: normalize idType values in existing DB records.
 *
 * Run with:  node scripts/normalize_id_types.js
 *
 * Background
 * ──────────
 * The system accumulated multiple string variants for what is really the same
 * ID type — e.g. NATIONAL, NATIONAL_ID, "National ID", "national id", and
 * "NationalID" all refer to the same thing. This caused the ID Type
 * Distribution chart on the police dashboard to show 8+ slices instead of 5,
 * and broke search/filtering since "NATIONAL" !== "National ID" lexically.
 *
 * The normalizeIdType() helper in src/lib/national-id.ts already maps every
 * known variant to one of these canonical forms:
 *   - "National ID"
 *   - "Kebele ID"
 *   - "Passport"
 *   - "Driver's License"
 *   - "Other"
 *
 * This script applies the same mapping to the DB columns:
 *   - "Guest"."idType"
 *   - "SuspectedPerson"."idType"
 *   - "SuspectId"."idType"
 *
 * Idempotent: running it twice is a no-op since the second run sees already-
 * canonical values and they map to themselves.
 *
 * Output: prints a summary of how many rows were updated per table.
 *
 * NOTE: This script does NOT touch Reservation records — the Reservation
 * table has no idType column. Guest idType is set when the guest record is
 * created/updated, and SuspectId/SuspectedPerson are police-side.
 */

const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

// Mirror of normalizeIdType() — kept inline so this script doesn't depend
// on the TS source file. If you add a new variant to the TS helper, also
// add it here so the script catches it.
function normalizeIdType(raw) {
  if (!raw) return "";
  const normalized = String(raw).trim().toUpperCase().replace(/[\s_]+/g, "");
  if (normalized === "NATIONALID" || normalized === "NATIONAL") return "National ID";
  if (normalized === "KEBELEID" || normalized === "KEBELE") return "Kebele ID";
  if (normalized === "PASSPORT") return "Passport";
  if (normalized === "DRIVERSLICENSE" || normalized === "DRIVERLICENSE" || normalized === "DRIVER") return "Driver's License";
  if (normalized === "OTHER") return "Other";
  // Unknown values are returned as-is so custom types aren't wiped.
  return String(raw).trim();
}

// Build a flat list of { raw → canonical } mappings for the variants we
// know about. Unknown values (not in this list) are left alone.
const VARIANT_TO_CANONICAL = {
  // National ID variants
  "NATIONAL": "National ID",
  "NATIONAL_ID": "National ID",
  "NATIONALID": "National ID",
  "national id": "National ID",
  "national_id": "National ID",
  "nationalid": "National ID",
  "National_Id": "National ID",
  "NationalID": "National ID",
  // Kebele ID variants
  "KEBELE": "Kebele ID",
  "KEBELE_ID": "Kebele ID",
  "KEBELEID": "Kebele ID",
  "kebele id": "Kebele ID",
  "kebele_id": "Kebele ID",
  "kebeleid": "Kebele ID",
  "Kebele_Id": "Kebele ID",
  "KebeleID": "Kebele ID",
  // Passport variants
  "PASSPORT": "Passport",
  "passport": "Passport",
  "Passport_ID": "Passport",
  "passport_id": "Passport",
  // Driver's License variants
  "DRIVER": "Driver's License",
  "DRIVERS_LICENSE": "Driver's License",
  "DRIVERSLICENSE": "Driver's License",
  "DRIVER_LICENSE": "Driver's License",
  "DRIVERLICENSE": "Driver's License",
  "driver": "Driver's License",
  "drivers license": "Driver's License",
  "drivers_license": "Driver's License",
  "Driver_License": "Driver's License",
  "Drivers_License": "Driver's License",
  // Other variants
  "OTHER": "Other",
  "other": "Other",
};

async function normalizeColumn(tableName, columnName) {
  console.log(`\n── Normalizing ${tableName}.${columnName} ──`);

  // 1. Snapshot distinct values + counts before.
  const beforeRows = await db.$queryRawUnsafe(
    `SELECT "${columnName}" AS "val", COUNT(*)::int AS "count"
     FROM "${tableName}"
     GROUP BY "${columnName}"
     ORDER BY "count" DESC`
  );
  console.log(`  Distinct values before: ${beforeRows.length}`);
  for (const r of beforeRows) {
    const val = r.val === null ? "(NULL)" : r.val === "" ? "(empty)" : String(r.val);
    console.log(`    "${val}" → ${r.count}`);
  }

  // 2. Run one UPDATE per known variant. Using parameterized raw SQL so
  //    apostrophes in "Driver's License" don't break the query.
  let totalUpdated = 0;
  for (const [raw, canonical] of Object.entries(VARIANT_TO_CANONICAL)) {
    // Skip if the raw value equals the canonical (no-op).
    if (raw === canonical) continue;
    const result = await db.$executeRawUnsafe(
      `UPDATE "${tableName}" SET "${columnName}" = $1 WHERE "${columnName}" = $2`,
      canonical,
      raw
    );
    if (result > 0) {
      console.log(`    ✓ "${raw}" → "${canonical}" : ${result} row(s) updated`);
      totalUpdated += result;
    }
  }

  // 3. Snapshot distinct values after.
  const afterRows = await db.$queryRawUnsafe(
    `SELECT "${columnName}" AS "val", COUNT(*)::int AS "count"
     FROM "${tableName}"
     GROUP BY "${columnName}"
     ORDER BY "count" DESC`
  );
  console.log(`  Distinct values after: ${afterRows.length}`);
  for (const r of afterRows) {
    const val = r.val === null ? "(NULL)" : r.val === "" ? "(empty)" : String(r.val);
    console.log(`    "${val}" → ${r.count}`);
  }

  console.log(`  Total rows updated in ${tableName}: ${totalUpdated}`);
  return totalUpdated;
}

async function main() {
  console.log("════════════════════════════════════════════════════════");
  console.log("  Normalize idType values — one-time data cleanup");
  console.log("════════════════════════════════════════════════════════");

  let grandTotal = 0;

  // Guest.idType — the most-affected column (used by the dashboard chart)
  grandTotal += await normalizeColumn("Guest", "idType");

  // SuspectedPerson.idType — police-side, same problem
  grandTotal += await normalizeColumn("SuspectedPerson", "idType");

  // SuspectId.idType — multi-ID records (one suspect can have many IDs)
  grandTotal += await normalizeColumn("SuspectId", "idType");

  console.log("\n════════════════════════════════════════════════════════");
  console.log(`  Done. Total rows updated across all tables: ${grandTotal}`);
  console.log("════════════════════════════════════════════════════════\n");
}

main()
  .catch((err) => {
    console.error("FATAL:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
