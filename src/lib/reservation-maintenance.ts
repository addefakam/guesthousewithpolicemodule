import { db } from "@/lib/db";

/**
 * Reservation lifecycle maintenance
 * ─────────────────────────────────
 * (a) No-show reminder: when a reservation's check-in date has passed
 *     without an actual check-in, create a WARNING notification (deduped).
 * (b) Auto-release: once a reservation's checkout day has fully passed
 *     (checkOut < today) the reservation is marked CANCELLED and the room
 *     is returned to AVAILABLE (if no other active reservation holds it).
 *
 * (c) Room reconciliation: a room flagged OCCUPIED/RESERVED while NO guest is
 *     physically checked in (no ACTIVE reservation) is stale — it is flipped
 *     back to AVAILABLE. Date-level availability is driven by reservations,
 *     so the room flag must never permanently block new bookings.
 *
 * Triggered from:
 *   - the Vercel cron endpoint /api/cron/reservation-maintenance
 *   - lazily on GET /api/reservations, GET /api/rooms and
 *     GET /api/rooms/[id]/availability reads
 *
 * All operations are idempotent: notifications are deduped by link key and
 * status transitions are guarded inside the UPDATE itself, so running this
 * twice concurrently cannot double-cancel or double-notify.
 *
 * NOTE: checkIn / checkOut are stored as "YYYY-MM-DD" strings, so plain
 * lexicographic string comparison is used everywhere.
 */

/** "Today" in the app's home timezone as YYYY-MM-DD. */
export function todayStr(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export interface MaintenanceScope {
  /** Limit work to one provider. Omit for a global (cron) run. */
  providerId?: string | null;
}

export interface MaintenanceSummary {
  ok: boolean;
  ranAt: string;
  today: string;
  scope: string;
  remindersCreated: number;
  releasedReservations: number;
  roomsReleased: number;
  skipped?: boolean;
}

// ─── Throttle: lazy reads can be frequent; cron always forces ──────────────
const MIN_INTERVAL_MS = 30_000;
const lastRunAt = new Map<string, number>();
const inFlight = new Map<string, Promise<MaintenanceSummary>>();

export async function runReservationMaintenance(
  scope: MaintenanceScope = {},
  opts: { force?: boolean } = {}
): Promise<MaintenanceSummary> {
  const key = scope.providerId || "global";
  if (!opts.force) {
    const last = lastRunAt.get(key);
    if (last && Date.now() - last < MIN_INTERVAL_MS) {
      return emptySummary(key, true);
    }
    const running = inFlight.get(key);
    if (running) return running;
  }

  const task = performMaintenance(scope)
    .finally(() => {
      inFlight.delete(key);
      lastRunAt.set(key, Date.now());
    });

  if (!opts.force) inFlight.set(key, task);
  return task;
}

function emptySummary(scope: string, skipped: boolean): MaintenanceSummary {
  return {
    ok: true,
    ranAt: new Date().toISOString(),
    today: todayStr(),
    scope,
    remindersCreated: 0,
    releasedReservations: 0,
    roomsReleased: 0,
    skipped,
  };
}

async function performMaintenance(
  scope: MaintenanceScope
): Promise<MaintenanceSummary> {
  const today = todayStr();
  const key = scope.providerId || "global";
  const scopeWhere = scope.providerId
    ? { providerId: scope.providerId }
    : {};

  let remindersCreated = 0;
  let releasedReservations = 0;
  let roomsReleased = 0;

  // ── (a) Check-in date passed without check-in → reminder notification ────
  const noShows = await db.reservation.findMany({
    where: {
      ...scopeWhere,
      status: "UPCOMING",
      actualCheckIn: null,
      checkIn: { lt: today },
    },
    select: {
      id: true,
      providerId: true,
      checkIn: true,
      guest: { select: { name: true, phone: true } },
      room: { select: { number: true, name: true } },
    },
    take: 200,
    orderBy: { checkIn: "asc" },
  });

  if (noShows.length > 0) {
    remindersCreated = await createDedupedNotifications(
      noShows.map((r) => ({
        link: `/reservations?noshow=${r.id}`,
        providerId: r.providerId,
        title: `Check-in overdue — Room ${r.room?.number ?? "?"}`,
        message:
          `Reservation for ${r.guest?.name || "guest"}` +
          (r.guest?.phone ? ` (${r.guest.phone})` : "") +
          ` had a check-in date of ${r.checkIn} but the guest has not checked in. ` +
          `Please follow up with the guest, check them in, or cancel the reservation.`,
      }))
    );
  }

  // ── (b) Checkout day passed → cancel reservation + release room ─────────
  const stale = await db.reservation.findMany({
    where: {
      ...scopeWhere,
      status: { in: ["UPCOMING", "ACTIVE"] },
      checkOut: { lt: today },
    },
    select: {
      id: true,
      roomId: true,
      providerId: true,
      checkIn: true,
      checkOut: true,
      guest: { select: { name: true, phone: true } },
      room: { select: { number: true, name: true } },
    },
    take: 500,
    orderBy: { checkOut: "asc" },
  });

  if (stale.length > 0) {
    const ids = stale.map((r) => r.id);

    // Guarded transition — re-checks status so a concurrent check-in/checkout
    // (or a parallel maintenance run) cannot double-apply.
    const cancelled = await db.reservation.updateMany({
      where: { id: { in: ids }, status: { in: ["UPCOMING", "ACTIVE"] } },
      data: { status: "CANCELLED" },
    });
    releasedReservations = cancelled.count;

    // Release each affected room that no checked-in guest holds.
    // IMPORTANT: only an ACTIVE reservation (guest physically in the room)
    // keeps a room flagged OCCUPIED/RESERVED. Future UPCOMING reservations
    // hold their date ranges only — they must never keep a released room
    // stuck in a non-bookable flag (the Room 102 bug).
    const roomIds = Array.from(new Set(stale.map((r) => r.roomId)));
    for (const roomId of roomIds) {
      const holding = await db.reservation.count({
        where: { roomId, status: "ACTIVE" },
      });
      if (holding === 0) {
        const upd = await db.room.updateMany({
          where: { id: roomId, status: { in: ["OCCUPIED", "RESERVED"] } },
          data: { status: "AVAILABLE" },
        });
        roomsReleased += upd.count;
      }
    }

    await createDedupedNotifications(
      stale.map((r) => ({
        link: `/reservations?released=${r.id}`,
        providerId: r.providerId,
        title: `Room ${r.room?.number ?? "?"} auto-released`,
        message:
          `The reservation for ${r.guest?.name || "guest"}` +
          (r.guest?.phone ? ` (${r.guest.phone})` : "") +
          ` (check-in ${r.checkIn}, check-out ${r.checkOut}) passed its checkout ` +
          `day without a checkout being recorded and was auto-cancelled. ` +
          `The room is available again.`,
      }))
    );
  }

  // ── (c) Reconcile stale room flags ──────────────────────────────────────
  // Heal any room still flagged OCCUPIED/RESERVED with no ACTIVE (checked-in)
  // reservation. This covers rooms left behind by manually cancelled
  // reservations, data imports, or any missed transition — whatever the case,
  // a room without an in-house guest must be bookable again.
  const stuckRooms = await db.room.findMany({
    where: { ...scopeWhere, status: { in: ["OCCUPIED", "RESERVED"] } },
    select: { id: true },
    take: 500,
  });
  if (stuckRooms.length > 0) {
    const activeRoomIds = new Set(
      (
        await db.reservation.findMany({
          where: {
            roomId: { in: stuckRooms.map((r) => r.id) },
            status: "ACTIVE",
          },
          select: { roomId: true },
        })
      ).map((r) => r.roomId)
    );
    const toRelease = stuckRooms
      .map((r) => r.id)
      .filter((id) => !activeRoomIds.has(id));
    if (toRelease.length > 0) {
      const upd = await db.room.updateMany({
        where: { id: { in: toRelease } },
        data: { status: "AVAILABLE" },
      });
      roomsReleased += upd.count;
    }
  }

  return {
    ok: true,
    ranAt: new Date().toISOString(),
    today,
    scope: key,
    remindersCreated,
    releasedReservations,
    roomsReleased,
  };
}

/**
 * Create notifications, skipping any whose dedup link already exists.
 * The link doubles as both a stable dedup key and a clickable target.
 */
async function createDedupedNotifications(
  items: { link: string; providerId: string; title: string; message: string }[]
): Promise<number> {
  if (items.length === 0) return 0;
  const links = items.map((i) => i.link);
  const existing = await db.notification.findMany({
    where: { link: { in: links } },
    select: { link: true },
  });
  const seen = new Set(existing.map((n) => n.link));
  const fresh = items.filter((i) => !seen.has(i.link));
  if (fresh.length === 0) return 0;

  await db.notification.createMany({
    data: fresh.map((i) => ({
      title: i.title,
      message: i.message,
      type: "WARNING" as const,
      link: i.link,
      providerId: i.providerId,
    })),
  });
  return fresh.length;
}
