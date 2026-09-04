// ── Room status presentation helpers for the standalone Police App ──
// Aligned with the /m operator app: same four statuses, same pastel-badge
// language (bg-*-100 / text-*-800), same solid dots (bg-*-500), and the same
// solid-color active filter chips (bg-*-600).

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";

export const ROOM_STATUSES: RoomStatus[] = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"];

interface StatusStyle {
  /** solid dot color (bg-*-500 family) */
  dot: string;
  /** pastel badge background (bg-*-100) */
  chipBg: string;
  /** pastel badge text (text-*-800) */
  chipText: string;
  /** pastel badge border (border-*-200) */
  chipBorder: string;
  /** active filter chip — solid color + white text, like /m */
  chipActive: string;
  /** inactive filter chip — white bg + tinted text/border, like /m */
  chipIdle: string;
  /** top strip on cards (h-1.5 status bar), like /m room cards */
  strip: string;
}

export const ROOM_STATUS_STYLES: Record<RoomStatus, StatusStyle> = {
  AVAILABLE: {
    dot: "bg-emerald-500",
    chipBg: "bg-emerald-100",
    chipText: "text-emerald-800",
    chipBorder: "border-emerald-200",
    chipActive: "bg-emerald-600 text-white border-emerald-600",
    chipIdle: "bg-white text-emerald-700 border-emerald-200",
    strip: "bg-emerald-500",
  },
  OCCUPIED: {
    dot: "bg-rose-500",
    chipBg: "bg-rose-100",
    chipText: "text-rose-800",
    chipBorder: "border-rose-200",
    chipActive: "bg-rose-600 text-white border-rose-600",
    chipIdle: "bg-white text-rose-700 border-rose-200",
    strip: "bg-rose-500",
  },
  RESERVED: {
    dot: "bg-sky-500",
    chipBg: "bg-sky-100",
    chipText: "text-sky-800",
    chipBorder: "border-sky-200",
    chipActive: "bg-sky-600 text-white border-sky-600",
    chipIdle: "bg-white text-sky-700 border-sky-200",
    strip: "bg-sky-500",
  },
  MAINTENANCE: {
    dot: "bg-amber-500",
    chipBg: "bg-amber-100",
    chipText: "text-amber-800",
    chipBorder: "border-amber-200",
    chipActive: "bg-amber-600 text-white border-amber-600",
    chipIdle: "bg-white text-amber-700 border-amber-200",
    strip: "bg-amber-500",
  },
};

/** ETB currency formatter matching the desktop police dashboard. */
export function formatEtb(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}
