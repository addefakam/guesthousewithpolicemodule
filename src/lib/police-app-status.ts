// ── Room status presentation helpers for the standalone Police App ──

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";

export const ROOM_STATUSES: RoomStatus[] = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"];

interface StatusStyle {
  /** solid dot color */
  dot: string;
  /** chip / room tile background */
  chipBg: string;
  /** chip / room tile text */
  chipText: string;
  /** chip border */
  chipBorder: string;
  /** status filter chip when active */
  chipActive: string;
}

export const ROOM_STATUS_STYLES: Record<RoomStatus, StatusStyle> = {
  AVAILABLE: {
    dot: "bg-emerald-400",
    chipBg: "bg-emerald-500/15",
    chipText: "text-emerald-300",
    chipBorder: "border-emerald-500/30",
    chipActive: "bg-emerald-500 text-white border-emerald-400",
  },
  OCCUPIED: {
    dot: "bg-rose-400",
    chipBg: "bg-rose-500/15",
    chipText: "text-rose-300",
    chipBorder: "border-rose-500/30",
    chipActive: "bg-rose-500 text-white border-rose-400",
  },
  RESERVED: {
    dot: "bg-amber-400",
    chipBg: "bg-amber-500/15",
    chipText: "text-amber-300",
    chipBorder: "border-amber-500/30",
    chipActive: "bg-amber-500 text-white border-amber-400",
  },
  MAINTENANCE: {
    dot: "bg-slate-400",
    chipBg: "bg-slate-500/15",
    chipText: "text-slate-300",
    chipBorder: "border-slate-500/30",
    chipActive: "bg-slate-500 text-white border-slate-400",
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
