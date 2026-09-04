// ── Room status presentation helpers for the standalone Police App ──
// Aurora light design system: ONE uniform brand (indigo) drives every
// interactive state (active chips/tiles/tabs — set inline by screens);
// these per-status styles are purely semantic identifiers (dots, pastel
// badges, card strips) kept in one soft pastel family.

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";

export const ROOM_STATUSES: RoomStatus[] = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"];

interface StatusStyle {
  /** solid dot color */
  dot: string;
  /** pastel badge background */
  chipBg: string;
  /** pastel badge text */
  chipText: string;
  /** pastel badge border */
  chipBorder: string;
  /** thin status strip on room cards */
  strip: string;
}

export const ROOM_STATUS_STYLES: Record<RoomStatus, StatusStyle> = {
  AVAILABLE: {
    dot: "bg-emerald-500",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    chipBorder: "border-emerald-100",
    strip: "bg-emerald-400",
  },
  OCCUPIED: {
    dot: "bg-rose-500",
    chipBg: "bg-rose-50",
    chipText: "text-rose-700",
    chipBorder: "border-rose-100",
    strip: "bg-rose-400",
  },
  RESERVED: {
    dot: "bg-sky-500",
    chipBg: "bg-sky-50",
    chipText: "text-sky-700",
    chipBorder: "border-sky-100",
    strip: "bg-sky-400",
  },
  MAINTENANCE: {
    dot: "bg-amber-500",
    chipBg: "bg-amber-50",
    chipText: "text-amber-700",
    chipBorder: "border-amber-100",
    strip: "bg-amber-400",
  },
};

/** i18n key per room status (shared by rooms + home screens). */
export const ROOM_STATUS_I18N: Record<RoomStatus, string> = {
  AVAILABLE: "rooms.available",
  OCCUPIED: "rooms.occupied",
  RESERVED: "rooms.reserved",
  MAINTENANCE: "rooms.maintenance",
};

/** Provider stat fields are lowercase while room status values are uppercase. */
export const PROVIDER_COUNT_KEY: Record<RoomStatus, "available" | "occupied" | "reserved" | "maintenance"> = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  RESERVED: "reserved",
  MAINTENANCE: "maintenance",
};

/** Normalize an arbitrary status string to a RoomStatus. */
export function asRoomStatus(status: string): RoomStatus {
  return (ROOM_STATUSES as string[]).includes(status) ? (status as RoomStatus) : "MAINTENANCE";
}

/** Shared uniform interaction colors (the "color flow" of the app). */
export const BRAND = {
  /** solid active state — chips, tiles, segmented controls */
  active: "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/25",
  /** soft active surface — language buttons, info tiles */
  activeSoft: "border-indigo-200 bg-indigo-50 text-indigo-700",
  /** idle chip / button surface */
  idle: "bg-white text-slate-600 border-slate-200",
  /** the signature gradient bar (used in tiny doses) */
  gradientBar: "bg-gradient-to-r from-indigo-500 to-violet-400",
  /** gradient text for hero numbers */
  gradientText: "bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent",
} as const;

/** ETB currency formatter matching the desktop police dashboard. */
export function formatEtb(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}
