import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Phone validation ──
// Accepts international formats: +251912345678, +1 555-123-4567, etc.
// Allows spaces, dashes, dots, parentheses as visual separators.
// Minimum 7 digits, maximum 15 digits (E.164 standard).
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

export function isValidPhone(phone: string): boolean {
  if (!phone || !phone.trim()) return false;
  const cleaned = phone.replace(/[\s\-().]/g, "");
  // Must start with + or digit, 7-15 digits total
  if (!PHONE_REGEX.test(phone.trim())) return false;
  const digits = cleaned.replace(/^\+/, "");
  return digits.length >= 7 && digits.length <= 15;
}

// ── Email validation (RFC 5322 simplified) ──
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return true; // email is optional — only validate if provided
  return EMAIL_REGEX.test(email.trim());
}

// ── Room name helper ──
// The API auto-generates room.name as "Room {number}" when the operator
// doesn't provide a custom name. This causes duplicate labels like
// "Room 105 — Room 105" in the UI. This helper detects whether the
// stored name is just the auto-generated default (so the UI can fall
// back to showing just the room number).
//
// Cases detected:
//   - name is empty/null
//   - name === number (e.g. name="105", number="105")
//   - name === `Room ${number}` (case-insensitive, trimmed)
//   - name === `Room${number}` (no space variant)
export function isDefaultRoomName(name: string | null | undefined, number: string): boolean {
  if (!name || !name.trim()) return true;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const num = (number || "").trim();
  return (
    trimmed === num ||
    lower === `room ${num}` ||
    lower === `room${num}` ||
    lower === `room ${num.toLowerCase()}` ||
    lower === `room${num.toLowerCase()}`
  );
}

// ── Checkout-due helper ──
// Determines whether a reservation's scheduled checkout date has arrived
// or passed. Used to decide which button to show on ACTIVE reservations:
//
//   - isCheckoutDue === true  → "Check Out" button (normal end-of-stay)
//   - isCheckoutDue === false → "Early Checkout" button (cutting stay short)
//
// checkOut is stored as "YYYY-MM-DD" so plain lexicographic comparison
// against today's date (in the same format) is correct and timezone-safe.
//
// Returns false for falsy/invalid input rather than throwing — callers
// can use it inline without try/catch, and a missing date should never
// block the user from checking out (the API still validates server-side).
export function isCheckoutDue(checkOut: string | null | undefined): boolean {
  if (!checkOut) return false;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  return todayStr >= checkOut;
}

// ── Check-in-due helper ──
// Determines whether a reservation's scheduled check-in date has arrived
// or passed. Used to sort the Reservations list so guests who are supposed
// to arrive today (or were supposed to arrive earlier but haven't yet —
// "no-shows") appear at the TOP, above ACTIVE in-house guests and above
// future UPCOMING reservations.
//
//   - isCheckInDue === true  → guest is due/overdue for check-in
//   - isCheckInDue === false → check-in is still in the future
//
// checkIn is stored as "YYYY-MM-DD" so plain lexicographic comparison
// against today's date (in the same format) is correct and timezone-safe.
//
// Returns false for falsy/invalid input rather than throwing — callers
// can use it inline without try/catch, and a missing date should never
// block the user from acting (the API still validates server-side).
export function isCheckInDue(checkIn: string | null | undefined): boolean {
  if (!checkIn) return false;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  return todayStr >= checkIn;
}

