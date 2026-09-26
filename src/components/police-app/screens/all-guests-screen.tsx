"use client";

// ── All Guests — full guest registry city-wide (standalone Police App) ──
// Reached from the Active Stays screen's "Total Guests" button.
// Shows ALL registered guests across every guesthouse, paginated and
// searchable — matching the main system's Police → Guests page.
//
// Tapping a guest card opens a full-screen detail sheet showing:
//   - Contact info (phone, email, ID type/number)
//   - Nationality
//   - Stats (total stays, total spent, VIP status)
//   - Provider (guesthouse) name
//   - Registration date
//   - Lifecycle timeline (every check-in, check-out, early exit,
//     cancellation, extension, room shift, payment — chronological)
//
// Aurora light design: matches the rest of the police app.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeIdType } from "@/lib/national-id";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  Clock,
  CreditCard,
  Globe,
  IdCard,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Star,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { apiPoliceGuests, apiGetGuestLifecycle } from "@/lib/api";
import { ErrorBox, EmptyState } from "@/components/police-app/screens/rooms-screen";
import { BRAND } from "@/lib/police-app-status";
import { useAppStore } from "@/lib/store";
import GuestLifecycleBadges, { type GuestLifecycleSummary } from "@/components/shared/guest-lifecycle-badges";

interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  idNumber: string;
  idType: string;
  nationality: string;
  totalSpent: number;
  totalStays: number;
  vip: boolean;
  createdAt: string;
  provider: { id: string; name: string } | null;
}

// Lifecycle event type — mirrors the shape returned by
// GET /api/guests/[id]/lifecycle
interface LifecycleEvent {
  type: string;
  timestamp: string;
  label: string;
  details: Record<string, unknown>;
  source: "STAFF_LOG" | "RESERVATION";
  reservationId: string;
  roomNumber?: string;
  actorName?: string;
}

interface LifecycleResponse {
  guest: { id: string; name: string; phone: string; idNumber: string };
  events: LifecycleEvent[];
  summary: GuestLifecycleSummary;
}

interface Props {
  onBack: () => void;
}

const PAGE_SIZE = 20;

function formatEtb(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function AllGuestsScreen({ onBack }: Props) {
  const { t } = useTranslation("policeApp");
  // Subscribe to the global refreshKey so the header's refresh button
  // triggers a re-fetch on this screen.
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lifecycleMap, setLifecycleMap] = useState<Record<string, GuestLifecycleSummary>>({});

  // ── Guest detail sheet state ──
  // When a guest card is tapped, we set selectedGuest + fetch the full
  // lifecycle (events array, not just the summary) for the timeline.
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [lifecycleEvents, setLifecycleEvents] = useState<LifecycleEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1); // reset to first page on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPoliceGuests({
        q: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      const list: Guest[] = Array.isArray(data?.guests) ? data.guests : [];
      setGuests(list);
      setTotal(data?.total || 0);
      setTotalPages(data?.totalPages || 1);

      // Fetch lifecycle summaries for the current page of guests
      // (non-blocking — badges just won't show on failure)
      try {
        const summaries: Record<string, GuestLifecycleSummary> = {};
        const BATCH = 8;
        for (let i = 0; i < list.length; i += BATCH) {
          const batch = list.slice(i, i + BATCH);
          const results = await Promise.allSettled(
            batch.map((g) => apiGetGuestLifecycle(g.id))
          );
          results.forEach((r, idx) => {
            if (r.status === "fulfilled" && r.value?.summary) {
              summaries[batch[idx].id] = r.value.summary as GuestLifecycleSummary;
            }
          });
        }
        setLifecycleMap(summaries);
      } catch {
        setLifecycleMap({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, t]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // ── Open guest detail ──
  // Fetches the full lifecycle (events array) for the tapped guest so
  // we can render the chronological timeline. The summary badges shown
  // inline on each card come from the pre-fetched lifecycleMap, but
  // the detail sheet needs the full events list for the timeline.
  const openDetail = useCallback(async (guest: Guest) => {
    setSelectedGuest(guest);
    setLifecycleEvents([]);
    setDetailLoading(true);
    try {
      const res = await apiGetGuestLifecycle(guest.id) as LifecycleResponse | undefined;
      if (res?.events) {
        setLifecycleEvents(res.events);
      }
    } catch {
      // Non-blocking — timeline just shows empty state
      setLifecycleEvents([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedGuest(null);
    setLifecycleEvents([]);
  }, []);

  const rangeFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(page * PAGE_SIZE, total);

  if (loading && guests.length === 0) {
    return (
      <div className="space-y-3 px-4 pt-4" aria-hidden="true">
        <div className="h-6 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pt-6">
        <ErrorBox message={error} onRetry={load} retryLabel={t("common.retry")} />
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pt-4">
      {/* ── Header with back button ── */}
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("allGuests.back")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors active:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            {t("allGuests.title")}
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {t("allGuests.subtitle", { count: total })}
          </p>
        </div>
      </header>

      {/* ── Search box ── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name="police-all-guests-search"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("allGuests.searchPlaceholder")}
          aria-label={t("allGuests.searchPlaceholder")}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
        />
      </div>

      {/* ── Result count + pagination info ── */}
      {!loading && (
        <p className="px-1 text-[10px] text-slate-400">
          {t("allGuests.showing", { from: rangeFrom, to: rangeTo, total })}
        </p>
      )}

      {/* ── Guest list ── */}
      {guests.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title={t("allGuests.empty")}
        />
      ) : (
        <ul className="space-y-2">
          {guests.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => openDetail(g)}
                className="w-full rounded-2xl border border-slate-100 bg-white p-3.5 text-left shadow-sm transition-all hover:shadow-md hover:border-indigo-100 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Name + VIP */}
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-bold text-slate-900">{g.name}</h3>
                      {g.vip && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-semibold text-amber-700 border border-amber-200">
                          <Star className="h-2 w-2 fill-amber-400 text-amber-400" />
                          VIP
                        </span>
                      )}
                    </div>
                    {/* Provider (guesthouse) */}
                    {g.provider?.name && (
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">
                        {g.provider.name}
                      </p>
                    )}
                    {/* Contact details */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      {g.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {g.phone}
                        </span>
                      )}
                      {g.idNumber && (
                        <span className="flex items-center gap-1">
                          <IdCard className="h-3 w-3" />
                          <span className="font-mono">{g.idNumber}</span>
                        </span>
                      )}
                      {g.nationality && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {g.nationality}
                        </span>
                      )}
                    </div>
                    {/* Stats */}
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                      <span>
                        {t("allGuests.stays", { count: g.totalStays })}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-slate-600">
                        {formatEtb(g.totalSpent)}
                      </span>
                      <span>·</span>
                      <span>{formatDate(g.createdAt)}</span>
                    </div>
                    {/* Status-change badges */}
                    {lifecycleMap[g.id] && (
                      <div className="mt-2">
                        <GuestLifecycleBadges
                          summary={lifecycleMap[g.id]}
                          compact
                        />
                      </div>
                    )}
                  </div>
                  {/* Chevron indicates tappable */}
                  <ChevronRight className="h-4 w-4 shrink-0 self-center text-slate-300" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Pagination controls ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors active:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={t("allGuests.prevPage")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-xs font-medium text-slate-500">
            {t("allGuests.pageOf", { page, total: totalPages })}
          </p>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors active:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={t("allGuests.nextPage")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Refresh button ── */}
      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="mx-auto flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 transition-colors active:bg-slate-50 disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {t("common.refresh") || "Refresh"}
      </button>

      {/* ── Guest Detail Sheet (full-screen overlay) ──
          Opens when a guest card is tapped. Shows the full guest record
          + chronological lifecycle timeline (every check-in, check-out,
          early exit, cancellation, extension, room shift, payment). */}
      {selectedGuest && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#F6F7FB]"
          role="dialog"
          aria-modal="true"
          aria-label={t("detail.title")}
        >
          {/* ── Sticky header with back button ── */}
          <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
              <button
                type="button"
                onClick={closeDetail}
                aria-label={t("detail.close")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors active:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold tracking-tight text-slate-900">
                  {selectedGuest.name}
                </h2>
                {selectedGuest.provider?.name && (
                  <p className="truncate text-[11px] text-slate-400">
                    {selectedGuest.provider.name}
                  </p>
                )}
              </div>
              {selectedGuest.vip && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 border border-amber-200">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  VIP
                </span>
              )}
            </div>
          </header>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* ── Stats cards ── */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  {t("detail.totalStays")}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {selectedGuest.totalStays}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  {t("detail.totalSpent")}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatEtb(selectedGuest.totalSpent)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  {t("detail.registered")}
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-900 leading-tight">
                  {formatDate(selectedGuest.createdAt)}
                </p>
              </div>
            </div>

            {/* ── Contact + ID section ── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                {t("detail.contactSection")}
              </h3>
              <div className="space-y-2.5">
                {selectedGuest.phone && (
                  <a
                    href={`tel:${selectedGuest.phone}`}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="font-medium text-indigo-600">{selectedGuest.phone}</span>
                  </a>
                )}
                {selectedGuest.email && (
                  <a
                    href={`mailto:${selectedGuest.email}`}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="font-medium text-indigo-600 truncate">{selectedGuest.email}</span>
                  </a>
                )}
                {selectedGuest.idNumber && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <IdCard className="h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      {selectedGuest.idType && (
                        <span className="text-[10px] text-slate-400 mr-1.5">
                          {normalizeIdType(selectedGuest.idType)}
                        </span>
                      )}
                      <span className="font-mono font-medium text-slate-800">
                        {selectedGuest.idNumber}
                      </span>
                    </div>
                  </div>
                )}
                {selectedGuest.nationality && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-800">{selectedGuest.nationality}</span>
                  </div>
                )}
                {selectedGuest.provider?.name && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-800">{selectedGuest.provider.name}</span>
                  </div>
                )}
              </div>
            </section>

            {/* ── Lifecycle timeline ── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t("detail.timeline")}
                </h3>
                {lifecycleMap[selectedGuest.id] && (
                  <GuestLifecycleBadges
                    summary={lifecycleMap[selectedGuest.id]}
                  />
                )}
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("detail.loading")}
                </div>
              ) : lifecycleEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Clock className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">{t("detail.noEvents")}</p>
                </div>
              ) : (
                <ol className="relative space-y-3">
                  {/* Vertical timeline line */}
                  <div
                    aria-hidden="true"
                    className="absolute left-2 top-1 bottom-1 w-px bg-slate-200"
                  />
                  {lifecycleEvents.map((evt, idx) => {
                    const icon = getEventIcon(evt.type);
                    const color = getEventColor(evt.type);
                    return (
                      <li key={idx} className="relative flex gap-3 pl-0">
                        {/* Dot on the timeline */}
                        <div className={`relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${color.dot} mt-0.5`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${color.dotInner}`} />
                        </div>
                        {/* Event content */}
                        <div className="min-w-0 flex-1 pb-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-800 leading-tight">
                              {evt.label}
                            </p>
                            <time className="shrink-0 text-[10px] text-slate-400">
                              {formatDateTime(evt.timestamp)}
                            </time>
                          </div>
                          {evt.actorName && (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {t("detail.by", { name: evt.actorName })}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {/* Bottom padding for safe area */}
            <div className="h-4" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers for the lifecycle timeline ──

function getEventIcon(type: string) {
  // Returns a lucide icon element — kept simple for the inline timeline.
  // We don't actually render the icon (the dot is enough), but the
  // function is here for future use if we want richer visuals.
  return null;
}

function getEventColor(type: string): { dot: string; dotInner: string } {
  switch (type) {
    case "CHECKED_IN":
      return { dot: "bg-emerald-100", dotInner: "bg-emerald-500" };
    case "CHECKED_OUT":
      return { dot: "bg-sky-100", dotInner: "bg-sky-500" };
    case "EARLY_CHECKOUT":
      return { dot: "bg-amber-100", dotInner: "bg-amber-500" };
    case "CANCELLED":
      return { dot: "bg-rose-100", dotInner: "bg-rose-500" };
    case "EXTENDED":
      return { dot: "bg-indigo-100", dotInner: "bg-indigo-500" };
    case "ROOM_SHIFTED":
      return { dot: "bg-violet-100", dotInner: "bg-violet-500" };
    case "PAYMENT":
      return { dot: "bg-teal-100", dotInner: "bg-teal-500" };
    case "RESERVATION_CREATED":
      return { dot: "bg-slate-100", dotInner: "bg-slate-400" };
    default:
      return { dot: "bg-slate-100", dotInner: "bg-slate-400" };
  }
}

function formatDateTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}
