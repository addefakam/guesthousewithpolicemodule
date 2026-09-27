/**
 * Nationality normalization
 * ──────────────────────────
 *
 * The system accumulated multiple string variants for the same nationality:
 *   - "Ethiopian", "ethi", "Ethiopia", "eth", "Eth", "ethio", "ETH"
 *   - "Pakistan", "Pakistani"
 *   - "Kenya", "KENYAN", "Kenyan"
 *   - "India", "Indian"
 *
 * normalizeNationality() maps every known variant to one canonical form,
 * mirroring the normalizeIdType() helper for ID types. Canonical forms:
 *   - "Ethiopian"
 *   - "Pakistani"
 *   - "Kenyan"
 *   - "Indian"
 *
 * Unknown values (custom nationalities the system hasn't seen before) are
 * returned as their trimmed original so we don't accidentally wipe them.
 *
 * The DEFAULT_NATIONALITY constant in src/lib/countries.ts is also updated
 * to "Ethiopian" (was "Ethiopia") so new guests default to the canonical
 * demonym form rather than the country name.
 *
 * Used by:
 *   - src/app/api/guests/route.ts (POST single create)
 *   - src/app/api/guests/[id]/route.ts (PUT update)
 *   - src/app/api/suspected-persons/route.ts (POST create)
 *   - One-time data-cleanup script: scripts/normalize_nationalities.js
 */

/**
 * Mapping table — keyed by the UPPER-CASED, SPACE/UNDERSCORE-stripped form
 * of the input value, value is the canonical demonym form.
 *
 * Adding a new variant: just add an entry here. The helper does the
 * upper-casing + stripping automatically.
 */
const NATIONALITY_VARIANTS: Record<string, string> = {
  // ── Ethiopian (was: Ethiopian / Ethiopia / ethi / eth / ethio / ETH) ──
  ETHIOPIAN: "Ethiopian",
  ETHIOPIA: "Ethiopian",
  ETHI: "Ethiopian",
  ETH: "Ethiopian",
  ETHIO: "Ethiopian",
  // Also catch the lower-case + mixed-case variants by upper-casing the key.
  // (No need to enumerate lowercase — the lookup upper-cases the input.)

  // ── Pakistani (was: Pakistan / Pakistani) ──
  PAKISTANI: "Pakistani",
  PAKISTAN: "Pakistani",

  // ── Kenyan (was: Kenya / KENYAN / Kenyan) ──
  KENYAN: "Kenyan",
  KENYA: "Kenyan",

  // ── Indian (was: India / Indian) ──
  INDIAN: "Indian",
  INDIA: "Indian",
};

/**
 * Normalize a nationality string to its canonical form.
 *
 * @example
 *   normalizeNationality("Ethiopia")      → "Ethiopian"
 *   normalizeNationality("ETH")          → "Ethiopian"
 *   normalizeNationality("ethi")         → "Ethiopian"
 *   normalizeNationality("Pakistan")     → "Pakistani"
 *   normalizeNationality("KENYAN")       → "Kenyan"
 *   normalizeNationality("India")        → "Indian"
 *   normalizeNationality("American")     → "American"  (unknown — returned as-is, trimmed)
 *   normalizeNationality("")             → ""
 *   normalizeNationality(null)           → ""
 *   normalizeNationality("  ethiopia ")  → "Ethiopian" (whitespace trimmed)
 */
export function normalizeNationality(nationality: string | undefined | null): string {
  if (!nationality) return "";
  const trimmed = String(nationality).trim();
  if (!trimmed) return "";
  // Try exact upper-case match first.
  const upperKey = trimmed.toUpperCase();
  if (NATIONALITY_VARIANTS[upperKey]) return NATIONALITY_VARIANTS[upperKey];
  // Try removing spaces, underscores, hyphens (so "South African" → "SOUTHAFRICAN").
  // Useful for multi-word nationalities the user may add later.
  const squashed = upperKey.replace(/[\s_-]+/g, "");
  if (NATIONALITY_VARIANTS[squashed]) return NATIONALITY_VARIANTS[squashed];
  // Unknown — return the trimmed original so custom nationalities aren't wiped.
  return trimmed;
}
