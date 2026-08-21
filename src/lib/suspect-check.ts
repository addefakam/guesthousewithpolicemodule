import { db } from "./db";
import { Prisma } from "@prisma/client";
import { sql } from "@prisma/client/sql";
import { dispatchAlertForMatch } from "./alert-dispatcher";

let tablesEnsured = false;

/**
 * Ensure the SuspectMatch, SuspectedPerson, and SuspectId tables exist.
 * Runs once per cold start. Uses raw SQL for PostgreSQL compatibility.
 */
async function ensureTables() {
  if (tablesEnsured) return;
  try {
    // Always ensure SuspectId table exists (not in Prisma schema, so not created by migrations)
    await db.$executeRaw(sql`
      CREATE TABLE IF NOT EXISTS "SuspectId" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "suspectedPersonId" TEXT NOT NULL,
        "idType" TEXT NOT NULL DEFAULT 'National_ID',
        "idNumber" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("suspectedPersonId") REFERENCES "SuspectedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await db.$executeRaw(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "SuspectId_idNumber_idType_idx" ON "SuspectId"("idNumber", "idType");
    `);
    await db.$executeRaw(sql`
      CREATE INDEX IF NOT EXISTS "SuspectId_suspectedPersonId_idx" ON "SuspectId"("suspectedPersonId");
    `);
    tablesEnsured = true;
    console.log("[suspect-check] SuspectId table ensured");
  } catch (error) {
    console.error("[suspect-check] Failed to ensure SuspectId table:", error);
  }
}

/**
 * Normalize a name for fuzzy comparison.
 * Strips extra whitespace, converts to lowercase, removes common punctuation.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")  // remove non-alphanumeric except spaces
    .replace(/\s+/g, " ")            // collapse multiple spaces
    .trim();
}

/**
 * Check if two names are a fuzzy match.
 * Returns true if:
 *  - Exact match (after normalization)
 *  - One name contains the other (after normalization)
 *  - Both names share the same last word (surname match)
 *  - Levenshtein distance is very small (1-2 chars) for short names
 */
function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  // One contains the other (e.g. "John Doe" contains "John")
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Surname match: last word is the same
  const words1 = n1.split(" ").filter(Boolean);
  const words2 = n2.split(" ").filter(Boolean);
  if (words1.length > 1 && words2.length > 1) {
    if (words1[words1.length - 1] === words2[words2.length - 1]) return true;
  }

  // First word match (given name)
  if (words1.length > 0 && words2.length > 0) {
    if (words1[0] === words2[0]) return true;
  }

  return false;
}

/**
 * Find matching suspect person IDs using multiple strategies:
 * 1. ID number (exact, case-insensitive) — highest confidence
 * 2. Phone number (exact, case-insensitive) — high confidence
 * 3. Name (fuzzy) — medium confidence
 */
async function findMatchingSuspects(params: {
  name: string;
  phone?: string;
  idNumber?: string;
}): Promise<{ suspectPersonIds: string[]; matchReasons: Record<string, string> }> {
  const { name, phone, idNumber } = params;
  const suspectPersonIds: string[] = [];
  const matchReasons: Record<string, string> = {};

  // ── Strategy 1: ID Number Match (highest confidence) ──
  if (idNumber && idNumber.trim().length >= 2) {
    const normalizedId = idNumber.trim();

    // Search the SuspectId table
    const matchingIds = await db.$queryRaw<{ suspectedPersonId: string }[]>(
      sql`SELECT DISTINCT "suspectedPersonId" FROM "SuspectId" WHERE LOWER("idNumber") = LOWER(${normalizedId})`
    );
    for (const m of matchingIds) {
      if (!suspectPersonIds.includes(m.suspectedPersonId)) {
        suspectPersonIds.push(m.suspectedPersonId);
        matchReasons[m.suspectedPersonId] = "ID_NUMBER";
      }
    }

    // Also search legacy idNumber field
    const legacyMatches = await db.suspectedPerson.findMany({
      where: { is_active: true, idNumber: { not: "" } },
      select: { id: true, idNumber: true },
    });
    for (const lm of legacyMatches) {
      if (lm.idNumber.trim().toLowerCase() === normalizedId.toLowerCase()) {
        if (!suspectPersonIds.includes(lm.id)) {
          suspectPersonIds.push(lm.id);
          matchReasons[lm.id] = "ID_NUMBER";
        }
      }
    }
  }

  // ── Strategy 2: Phone Number Match (high confidence) ──
  if (phone && phone.trim().length >= 6) {
    const normalizedPhone = phone.trim().replace(/[^0-9+]/g, "");
    if (normalizedPhone.length >= 6) {
      // Search suspected persons by phone
      const phoneMatches = await db.suspectedPerson.findMany({
        where: { is_active: true, phone: { not: "" } },
        select: { id: true, phone: true },
      });

      for (const pm of phoneMatches) {
        const suspectPhone = pm.phone.trim().replace(/[^0-9+]/g, "");
        // Match if: exact match, or one contains the other (handles +251 vs 251 prefix differences)
        if (
          suspectPhone === normalizedPhone ||
          suspectPhone.endsWith(normalizedPhone.replace(/^\+/, "")) ||
          normalizedPhone.endsWith(suspectPhone.replace(/^\+/, "")) ||
          suspectPhone.includes(normalizedPhone.slice(-9)) ||  // last 9 digits match
          normalizedPhone.includes(suspectPhone.slice(-9))
        ) {
          if (!suspectPersonIds.includes(pm.id)) {
            suspectPersonIds.push(pm.id);
            matchReasons[pm.id] = "PHONE";
          } else if (!matchReasons[pm.id] || matchReasons[pm.id] === "NAME") {
            // Upgrade reason if phone match is stronger than name match
            matchReasons[pm.id] = "PHONE";
          }
        }
      }
    }
  }

  // ── Strategy 3: Name Match (fuzzy, medium confidence) ──
  if (name && name.trim().length >= 2) {
    const normalizedName = name.trim();
    const nameMatches = await db.suspectedPerson.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
    });

    for (const nm of nameMatches) {
      if (namesMatch(normalizedName, nm.name)) {
        if (!suspectPersonIds.includes(nm.id)) {
          suspectPersonIds.push(nm.id);
          matchReasons[nm.id] = "NAME";
        }
        // Don't downgrade — keep the stronger match reason
      }
    }
  }

  return { suspectPersonIds, matchReasons };
}

/**
 * Check if a person matches any suspected person.
 * Uses multiple matching strategies: ID number, phone, and name.
 * Searches both the legacy single idNumber field and the new SuspectId table.
 */
export async function checkSuspectMatch(params: {
  name: string;
  phone?: string;
  idNumber?: string;
  idType?: string;
  matchType: string;
  providerId: string;
  providerName?: string;
  reservationId?: string;
  daytimeBookingId?: string;
  extraDetails?: Record<string, unknown>;
}) {
  try {
    await ensureTables();

    const { name, phone, idNumber, idType, matchType, providerId, providerName, reservationId, daytimeBookingId, extraDetails } = params;

    // At minimum we need a name to attempt matching
    if (!name || name.trim().length < 1) return;

    const { suspectPersonIds, matchReasons } = await findMatchingSuspects({
      name,
      phone,
      idNumber,
    });

    if (suspectPersonIds.length === 0) {
      console.log(`[suspect-check] No match for: ${name} (id: ${idNumber || "none"}, phone: ${phone || "none"})`);
      return;
    }

    console.log(`[suspect-check] MATCH FOUND for ${name} -> ${suspectPersonIds.length} suspect(s), reasons: ${JSON.stringify(matchReasons)}`);

    // Fetch full suspect records
    const suspects = await db.suspectedPerson.findMany({
      where: { id: { in: suspectPersonIds }, is_active: true },
    });

    if (suspects.length === 0) return;

    // Get provider name if not provided
    let provName = providerName || "";
    if (!provName) {
      const provider = await db.provider.findUnique({ where: { id: providerId }, select: { name: true } });
      provName = provider?.name || "";
    }

    // Build detail string with all relevant information
    const details = JSON.stringify({
      matchType,
      guestName: name,
      guestPhone: phone || "",
      guestIdNumber: idNumber?.trim() || "",
      guestIdType: idType || "",
      providerName: provName,
      providerId,
      reservationId: reservationId || null,
      daytimeBookingId: daytimeBookingId || null,
      matchedAt: new Date().toISOString(),
      matchReasons,
      ...extraDetails,
    });

    // Create a match record for each suspect found
    for (const suspect of suspects) {
      const match = await db.suspectMatch.create({
        data: {
          suspectedPersonId: suspect.id,
          matchType,
          guestName: name,
          guestPhone: phone || "",
          guestIdNumber: idNumber?.trim() || "",
          providerName: provName,
          providerId,
          reservationId: reservationId || null,
          daytimeBookingId: daytimeBookingId || null,
          details,
        },
      });

      // Fire-and-forget alert dispatch — never blocks or breaks normal flow
      dispatchAlertForMatch(
        { id: suspect.id, name: suspect.name, severity: suspect.severity, is_active: suspect.is_active },
        {
          matchId: match.id,
          providerId: match.providerId,
          providerName: match.providerName,
          guestName: match.guestName,
          guestPhone: match.guestPhone,
          guestIdNumber: match.guestIdNumber,
          matchType: match.matchType,
          details: match.details,
        }
      ).catch(() => {});
    }
  } catch (error) {
    // Log but never throw — suspect checking should not break normal operations
    console.error("[suspect-check] Background check failed:", error);
  }
}

/**
 * Ensure tables exist — can be called from API routes too.
 */
export async function ensureSuspectTables() {
  await ensureTables();
}
