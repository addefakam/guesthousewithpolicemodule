/**
 * Shared weekend-aware price calculation.
 *
 * Used by:
 *   - api/reservations POST (server-side authoritative cost calculation)
 *   - api/reservations/[id] PUT (cost re-calc on date/room change)
 *   - api/group-bookings/* (group reservation totals)
 *   - reservations-page.tsx (client-side preview before submit)
 *   - mobile-app.tsx (same preview on mobile)
 *
 * Weekend definition: Friday (5) and Saturday (6) — Ethiopian weekend.
 * Sunday (0) is NOT charged the weekend rate (most Bishoftu guesthouses
 * treat Fri+Sat as premium, Sunday as a normal weekday rate).
 *
 * If pricePerNightWeekend is null, undefined, or 0, every night uses
 * the standard pricePerNight (no weekend premium).
 */

export interface RoomPriceInfo {
  pricePerNight: number;
  pricePerNightWeekend?: number | null;
}

/**
 * Compute the total cost for a stay from `checkIn` (inclusive) to
 * `checkOut` (exclusive) — same convention as Reservation.checkIn/checkOut.
 *
 * Both inputs are YYYY-MM-DD strings (the format used throughout the app).
 *
 * Returns the total cost as a number. Returns 0 if the date range is
 * invalid (zero or negative nights).
 *
 * The function iterates each night, picks the appropriate rate based on
 * the day of week, and sums. JavaScript Date.getUTCDay():
 *   0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 *
 * We use UTC to avoid DST/TZ surprises — the YYYY-MM-DD strings are
 * parsed as UTC midnight, so getUTCDay() returns the correct day regardless
 * of the server's local timezone.
 */
export function calculateStayCost(
  checkIn: string,
  checkOut: string,
  room: RoomPriceInfo,
): { total: number; weekdayNights: number; weekendNights: number; breakdown: Array<{ date: string; dayName: string; isWeekend: boolean; rate: number }> } {
  const weekdayRate = Number(room.pricePerNight) || 0;
  const weekendRate =
    room.pricePerNightWeekend != null && Number(room.pricePerNightWeekend) > 0
      ? Number(room.pricePerNightWeekend)
      : weekdayRate; // fall back to weekday rate when no weekend price set

  // Parse the YYYY-MM-DD strings as UTC dates.
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { total: 0, weekdayNights: 0, weekendNights: 0, breakdown: [] };
  }

  let total = 0;
  let weekdayNights = 0;
  let weekendNights = 0;
  const breakdown: Array<{ date: string; dayName: string; isWeekend: boolean; rate: number }> = [];

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Iterate night-by-night from start (inclusive) to end (exclusive).
  const msPerNight = 24 * 60 * 60 * 1000;
  for (let t = start.getTime(); t < end.getTime(); t += msPerNight) {
    const d = new Date(t);
    const dow = d.getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
    const isWeekend = dow === 5 || dow === 6; // Fri or Sat
    const rate = isWeekend ? weekendRate : weekdayRate;
    total += rate;
    if (isWeekend) {
      weekendNights++;
    } else {
      weekdayNights++;
    }
    breakdown.push({
      date: d.toISOString().slice(0, 10),
      dayName: DAY_NAMES[dow],
      isWeekend,
      rate,
    });
  }

  return { total, weekdayNights, weekendNights, breakdown };
}

/**
 * Convenience function — returns just the total cost as a number.
 * Use this when you don't need the breakdown (e.g. server-side reservation
 * creation where the total is the only stored value).
 */
export function calculateStayTotal(
  checkIn: string,
  checkOut: string,
  room: RoomPriceInfo,
): number {
  return calculateStayCost(checkIn, checkOut, room).total;
}

/**
 * Helper to format the cost breakdown as a single human-readable string.
 * Useful for the reservation form UI to show the operator why the total is X.
 *
 * Example output: "2 weekday × 500 + 1 weekend × 700 = 1,700"
 */
export function formatCostBreakdown(
  checkIn: string,
  checkOut: string,
  room: RoomPriceInfo,
  currencySymbol = "",
): string {
  const { total, weekdayNights, weekendNights, breakdown } = calculateStayCost(checkIn, checkOut, room);
  if (breakdown.length === 0) return `${currencySymbol}0`;

  const parts: string[] = [];
  const weekdayRate = Number(room.pricePerNight) || 0;
  const weekendRate =
    room.pricePerNightWeekend != null && Number(room.pricePerNightWeekend) > 0
      ? Number(room.pricePerNightWeekend)
      : weekdayRate;

  if (weekdayNights > 0) {
    parts.push(`${weekdayNights} weekday × ${currencySymbol}${weekdayRate.toLocaleString()}`);
  }
  if (weekendNights > 0 && weekendRate !== weekdayRate) {
    parts.push(`${weekendNights} weekend × ${currencySymbol}${weekendRate.toLocaleString()}`);
  }
  if (parts.length === 0) {
    // All nights at same rate (no weekend premium set or all weekdays)
    parts.push(`${breakdown.length} × ${currencySymbol}${weekdayRate.toLocaleString()}`);
  }
  return `${parts.join(" + ")} = ${currencySymbol}${total.toLocaleString()}`;
}
