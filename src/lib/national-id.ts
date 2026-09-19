/**
 * National ID (FAN) validation + formatting utilities
 * ─────────────────────────────────────────────────
 *
 * Ethiopian Federal ID numbers use the "FAN" (Federal Administration
 * Number) format: a 3-letter prefix followed by 16 digits grouped
 * in pairs of 2, separated by spaces.
 *
 * Format:  FAN 00 00 00 00 00 00 00 00
 *          ^^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^
 *          prefix  └──── 16 digits ────┘
 *
 * Example: FAN 12 34 56 78 90 12 34 56
 */

/** The placeholder shown in ID number input fields. */
export const NATIONAL_ID_PLACEHOLDER = "FAN 00 00 00 00 00 00 00 00";

/** Total number of digits in a valid FAN ID (excluding the "FAN" prefix). */
export const NATIONAL_ID_DIGIT_COUNT = 16;

/** The mandatory prefix for Ethiopian national IDs. */
export const NATIONAL_ID_PREFIX = "FAN";

/**
 * Format a raw input string into the "FAN XX XX XX XX XX XX XX XX" format.
 *
 * Strips everything except digits, prepends "FAN " automatically, and
 * groups the digits in pairs of 2 separated by spaces. Stops at 16 digits.
 *
 * Designed to be called on every `onChange` of an `<Input>` — the user
 * types digits and the formatter auto-inserts the prefix + spaces.
 *
 * @example
 *   formatNationalId("")           → "FAN "
 *   formatNationalId("1")          → "FAN 1"
 *   formatNationalId("12")         → "FAN 12"
 *   formatNationalId("123")        → "FAN 12 3"
 *   formatNationalId("123456")     → "FAN 12 34 56"
 *   formatNationalId("1234567890123456") → "FAN 12 34 56 78 90 12 34 56"
 *   formatNationalId("FAN123456")  → "FAN 12 34 56" (strips prefix, re-formats)
 */
export function formatNationalId(input: string): string {
  if (!input) return "FAN ";

  // Strip everything except digits — removes any "FAN" prefix, spaces,
  // dashes, or other characters the user might have pasted.
  const digits = input.replace(/\D/g, "").slice(0, NATIONAL_ID_DIGIT_COUNT);

  if (digits.length === 0) return "FAN ";

  // Group digits in pairs of 2, separated by spaces.
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 2) {
    groups.push(digits.slice(i, i + 2));
  }

  return `FAN ${groups.join(" ")}`;
}

/**
 * Validate that an ID string is a properly-formatted Ethiopian national ID.
 *
 * Accepts both:
 *   - Formatted:  "FAN 12 34 56 78 90 12 34 56"
 *   - Raw digits:  "1234567890123456"
 *
 * Returns true only if there are exactly 16 digits (the "FAN" prefix
 * is optional in the input but the digit count must be exact).
 *
 * @example
 *   isValidNationalId("FAN 12 34 56 78 90 12 34 56")  → true
 *   isValidNationalId("1234567890123456")               → true
 *   isValidNationalId("FAN 12 34 56")                     → false (only 8 digits)
 *   isValidNationalId("")                                 → false
 */
export function isValidNationalId(id: string): boolean {
  if (!id) return false;
  const digits = id.replace(/\D/g, "");
  return digits.length === NATIONAL_ID_DIGIT_COUNT;
}

/**
 * Check if the given ID type corresponds to a national ID.
 * Handles both the mobile app's "NATIONAL" value and the main system's
 * "National ID" value.
 */
export function isNationalIdType(idType: string | undefined | null): boolean {
  if (!idType) return false;
  const normalized = idType.trim().toUpperCase().replace(/[\s_]+/g, "");
  return normalized === "NATIONALID" || normalized === "NATIONAL";
}
