#!/usr/bin/env node
/**
 * One-time data-cleanup script:
 *   (a) Normalize nationality values in existing DB records
 *   (b) Find the phone number 25874174572 and report which records use it
 *       (use --delete flag to remove those records)
 *
 * Run with:
 *   node scripts/normalize_nationalities.js            # report + normalize
 *   node scripts/normalize_nationalities.js --delete    # also delete the phone record(s)
 *
 * Background
 * ──────────
 * The system accumulated multiple string variants for the same nationality:
 *   - 'Ethiopian', 'ethi', 'Ethiopia', 'eth', 'Eth', 'ethio', 'ETH'
 *   - 'Pakistan', 'Pakistani'
 *   - 'Kenya', 'KENYAN'
 *   - 'India', 'Indian'
 *
 * normalizeNationality() in src/lib/nationalities.ts maps every known
 * variant to a canonical form. This script applies the same mapping to:
 *   - "Guest"."nationality"
 *   - "SuspectedPerson"."nationality"
 *
 * Idempotent: running it twice is a no-op since canonical values map to
 * themselves.
 *
 * Phone number cleanup (25874174572):
 *   Searches Guest.phone, SuspectedPerson.phone, Reservation."secondGuestPhone"
 *   for the exact string. Default mode just REPORTS what was found (no
 *   deletion). With --delete flag, the script will:
 *     - For Guest matches: set phone = '' (empty) — we don't delete the
 *       guest record because it likely has reservations/payments/history
 *       that we want to keep. The operator can manually delete via the UI.
 *     - For SuspectedPerson matches: same — set phone = ''.
 *     - For Reservation secondGuestPhone matches: set "secondGuestPhone" = ''.
 *   This way the phone number is removed from the database (no record has
 *   that phone anymore) without losing the historical data tied to the
 *   guest/reservation/suspect record.
 */

const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

const TARGET_PHONE = "25874174572";
const SHOULD_DELETE = process.argv.includes("--delete");

// ── Variant → canonical nationality mapping ──
// Mirror of src/lib/nationalities.ts. Kept inline so this script doesn't
// depend on the TS source file.
const NATIONALITY_VARIANTS = {
  // Ethiopian (was: Ethiopian / Ethiopia / ethi / eth / ethio / ETH)
  "ETHIOPIAN": "Ethiopian",
  "ETHIOPIA": "Ethiopian",
  "ETHI": "Ethiopian",
  "ETH": "Ethiopian",
  "ETHIO": "Ethiopian",
  // Pakistani (was: Pakistan / Pakistani)
  "PAKISTANI": "Pakistani",
  "PAKISTAN": "Pakistani",
  // Kenyan (was: Kenya / KENYAN / Kenyan)
  "KENYAN": "Kenyan",
  "KENYA": "Kenyan",
  // Indian (was: India / Indian)
  "INDIAN": "Indian",
  "INDIA": "Indian",
};

// ── Helper: normalize a single nationality value ──
function normalizeNationality(raw) {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  // Reject purely numeric values (likely phone numbers mistakenly
  // entered in the nationality field). Returns empty so the cleanup
  // script blanks them out in the DB.
  if (/^\d+$/.test(trimmed)) return "";
  const upperKey = trimmed.toUpperCase();
  if (NATIONALITY_VARIANTS[upperKey]) return NATIONALITY_VARIANTS[upperKey];
  const squashed = upperKey.replace(/[\s_-]+/g, "");
  if (NATIONALITY_VARIANTS[squashed]) return NATIONALITY_VARIANTS[squashed];
  return trimmed;
}

// ── Step 1: normalize nationality columns ──
async function normalizeColumn(tableName, columnName) {
  console.log(`\n── Normalizing ${tableName}.${columnName} ──`);

  // Snapshot distinct values before.
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

  // Run one UPDATE per known variant → canonical mapping. Skip if the
  // raw value already equals the canonical (no-op).
  let totalUpdated = 0;
  for (const [raw, canonical] of Object.entries(NATIONALITY_VARIANTS)) {
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

  // Also blank out any purely numeric nationality values (e.g.
  // '25874174572' entered in the nationality field by mistake).
  // Matches values that are entirely digits (after trimming).
  const numericResult = await db.$executeRawUnsafe(
    `UPDATE "${tableName}" SET "${columnName}" = ''
     WHERE "${columnName}" ~ '^[[:space:]]*[0-9]+[[:space:]]*$'`
  );
  if (numericResult > 0) {
    console.log(`    ✓ Numeric (junk) values blanked: ${numericResult} row(s) updated`);
    totalUpdated += numericResult;
  }

  // Snapshot distinct values after.
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

// ── Step 2: find + optionally remove phone number 25874174572 ──
async function handlePhoneCleanup() {
  console.log(`\n── Searching for phone number "${TARGET_PHONE}" ──`);

  // 1. Guest.phone
  const guestMatches = await db.$queryRawUnsafe(
    `SELECT "id", "name", "phone", "createdAt"
     FROM "Guest"
     WHERE "phone" = $1 OR "phone" LIKE '%' || $1 || '%'`,
    TARGET_PHONE
  );
  console.log(`  Guest matches: ${guestMatches.length}`);
  for (const g of guestMatches) {
    console.log(`    • id=${g.id} name="${g.name}" phone="${g.phone}" createdAt=${g.createdAt instanceof Date ? g.createdAt.toISOString() : g.createdAt}`);
  }

  // 2. SuspectedPerson.phone
  const suspectMatches = await db.$queryRawUnsafe(
    `SELECT "id", "name", "phone", "createdAt"
     FROM "SuspectedPerson"
     WHERE "phone" = $1 OR "phone" LIKE '%' || $1 || '%'`,
    TARGET_PHONE
  );
  console.log(`  SuspectedPerson matches: ${suspectMatches.length}`);
  for (const s of suspectMatches) {
    console.log(`    • id=${s.id} name="${s.name}" phone="${s.phone}" createdAt=${s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt}`);
  }

  // 3. Reservation.secondGuestPhone
  const resMatches = await db.$queryRawUnsafe(
    `SELECT "id", "secondGuestName", "secondGuestPhone", "createdAt"
     FROM "Reservation"
     WHERE "secondGuestPhone" = $1 OR "secondGuestPhone" LIKE '%' || $1 || '%'`,
    TARGET_PHONE
  );
  console.log(`  Reservation.secondGuestPhone matches: ${resMatches.length}`);
  for (const r of resMatches) {
    console.log(`    • id=${r.id} secondGuest="${r.secondGuestName}" phone="${r.secondGuestPhone}" createdAt=${r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt}`);
  }

  const totalMatches = guestMatches.length + suspectMatches.length + resMatches.length;
  if (totalMatches === 0) {
    console.log(`  ✓ No records found with phone "${TARGET_PHONE}" — nothing to do.`);
    return;
  }

  if (!SHOULD_DELETE) {
    console.log(`\n  Found ${totalMatches} record(s). Re-run with --delete flag to blank out the phone fields:`);
    console.log(`    node scripts/normalize_nationalities.js --delete`);
    console.log(`  (Will NOT delete the guest/suspect/reservation record itself — only sets the phone field to empty,`);
    console.log(`   so historical data tied to the record stays intact.)`);
    return;
  }

  // Delete mode — blank out the phone fields.
  console.log(`\n  --delete flag detected. Blanking out phone fields...`);
  const guestUpdate = await db.$executeRawUnsafe(
    `UPDATE "Guest" SET "phone" = '' WHERE "phone" = $1 OR "phone" LIKE '%' || $1 || '%'`,
    TARGET_PHONE
  );
  console.log(`    ✓ Guest.phone blanked: ${guestUpdate} row(s)`);
  const suspectUpdate = await db.$executeRawUnsafe(
    `UPDATE "SuspectedPerson" SET "phone" = '' WHERE "phone" = $1 OR "phone" LIKE '%' || $1 || '%'`,
    TARGET_PHONE
  );
  console.log(`    ✓ SuspectedPerson.phone blanked: ${suspectUpdate} row(s)`);
  const resUpdate = await db.$executeRawUnsafe(
    `UPDATE "Reservation" SET "secondGuestPhone" = '' WHERE "secondGuestPhone" = $1 OR "secondGuestPhone" LIKE '%' || $1 || '%'`,
    TARGET_PHONE
  );
  console.log(`    ✓ Reservation.secondGuestPhone blanked: ${resUpdate} row(s)`);
  console.log(`  ✓ Phone "${TARGET_PHONE}" removed from ${guestUpdate + suspectUpdate + resUpdate} record(s).`);
}

async function main() {
  console.log("════════════════════════════════════════════════════════");
  console.log("  Normalize nationalities + remove phone 25874174572");
  console.log("  Mode: " + (SHOULD_DELETE ? "DELETE (will blank phone fields)" : "REPORT-ONLY (no deletions)"));
  console.log("════════════════════════════════════════════════════════");

  let grandTotal = 0;

  // ── Nationality normalization ──
  grandTotal += await normalizeColumn("Guest", "nationality");
  grandTotal += await normalizeColumn("SuspectedPerson", "nationality");

  // ── Phone number removal ──
  await handlePhoneCleanup();

  console.log("\n════════════════════════════════════════════════════════");
  console.log(`  Done. Total nationality rows updated: ${grandTotal}`);
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
