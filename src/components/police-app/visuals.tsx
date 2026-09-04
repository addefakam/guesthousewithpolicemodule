"use client";

// ── Shared visuals for the standalone Police App ──
// Aurora light redesign: the interface is intentionally free of artwork
// and decorative imagery. Only semantic helpers live here.

import { ROOM_STATUS_STYLES, type RoomStatus } from "@/lib/police-app-status";

/** Colored dot for a room status. */
export function StatusDot({ status, className = "h-2 w-2" }: { status: RoomStatus; className?: string }) {
  return <span aria-hidden="true" className={`inline-block rounded-full ${ROOM_STATUS_STYLES[status].dot} ${className}`} />;
}
