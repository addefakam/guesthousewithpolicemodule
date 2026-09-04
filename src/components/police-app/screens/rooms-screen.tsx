"use client";

// ── Room Availability — the flagship screen of the standalone Police App ──
// Aurora light design system: simple text header, one flat summary card,
// uniform indigo interaction states, soft pastel status identifiers.
// No artwork, no imagery — just clean light surfaces.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ChevronDown,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  BedDouble,
} from "lucide-react";
import { apiPoliceRoomAvailability } from "@/lib/api";
import { StatusDot } from "@/components/police-app/visuals";
import {
  ROOM_STATUSES,
  ROOM_STATUS_STYLES,
  ROOM_STATUS_I18N,
  PROVIDER_COUNT_KEY,
  asRoomStatus,
  BRAND,
  type RoomStatus,
} from "@/lib/police-app-status";

interface Room {
  id: string;
  number: string;
  name: string;
  type: string;
  status: string;
  floor: number;
  capacity: number;
  pricePerNight: number;
}

interface ProviderStat {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  licenseNo: string;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  utilizationRate: number;
  totalCapacity: number;
  avgPrice: number;
  rooms: Room[];
}

interface AvailabilityData {
  summary: {
    totalProviders: number;
    totalRooms: number;
    totalCapacity: number;
    availableRooms: number;
    occupiedRooms: number;
    reservedRooms: number;
    maintenanceRooms: number;
    utilizationRate: number;
  };
  roomTypes: { type: string; count: number }[];
  providers: ProviderStat[];
}

type StatusFilter = "ALL" | RoomStatus;

export default function RoomsScreen() {
  const { t } = useTranslation("policeApp");
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiPoliceRoomAvailability();
      setData(d);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;

  const statusCounts: Record<RoomStatus, number> | null = summary
    ? {
        AVAILABLE: summary.availableRooms,
        OCCUPIED: summary.occupiedRooms,
        RESERVED: summary.reservedRooms,
        MAINTENANCE: summary.maintenanceRooms,
      }
    : null;

  const visibleProviders = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.providers
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.address || "").toLowerCase().includes(q) ||
          (p.phone || "").includes(q)
        );
      })
      .filter((p) => {
        if (filter === "ALL") return true;
        return p[PROVIDER_COUNT_KEY[filter]] > 0;
      })
      .map((p) => ({
        ...p,
        matchedRooms: filter === "ALL" ? p.rooms : p.rooms.filter((r) => asRoomStatus(r.status) === filter),
      }));
  }, [data, search, filter]);

  const totalMatched = useMemo(
    () => visibleProviders.reduce((sum, p) => sum + p.matchedRooms.length, 0),
    [visibleProviders]
  );

  const isFiltering = filter !== "ALL" || search.trim().length > 0;

  return (
    <div className="space-y-3 px-4 pt-4">
      {/* ── Flat city-wide summary card ── */}
      {summary && (
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" aria-label={t("rooms.title")}>
          <div className="flex items-end justify-between gap-3">
            <dl className="flex gap-5">
              {[
                { value: summary.totalRooms, label: t("rooms.totalRooms") },
                { value: summary.totalProviders, label: t("rooms.guesthouses") },
                { value: summary.totalCapacity, label: t("rooms.capacity") },
              ].map((x) => (
                <div key={x.label}>
                  <dd className="text-lg font-bold leading-none tracking-tight text-slate-900">{x.value}</dd>
                  <dt className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">{x.label}</dt>
                </div>
              ))}
            </dl>
            <div className="shrink-0 text-right">
              <p className={`text-lg font-bold leading-none tracking-tight ${BRAND.gradientText}`}>
                {summary.utilizationRate}%
              </p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                {t("rooms.utilization")}
              </p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${BRAND.gradientBar}`}
              style={{ width: `${Math.min(100, Math.max(2, summary.utilizationRate))}%` }}
            />
          </div>
        </section>
      )}

      {/* ── Status tiles (tap to filter) ── */}
      {statusCounts && (
        <section className="grid grid-cols-4 gap-2" aria-label={t("rooms.title")}>
          {ROOM_STATUSES.map((status) => {
            const s = ROOM_STATUS_STYLES[status];
            const active = filter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(active ? "ALL" : status)}
                aria-pressed={active}
                className={`rounded-xl border p-2 text-center transition-all active:scale-95 ${
                  active ? BRAND.active : "border-slate-100 bg-white shadow-sm"
                }`}
              >
                <span aria-hidden="true" className={`mx-auto mb-1 block h-1.5 w-1.5 rounded-full ${s.dot}`} />
                <p className={`text-lg font-bold leading-tight tracking-tight ${active ? "text-white" : "text-slate-900"}`}>
                  {statusCounts[status]}
                </p>
                <p className={`truncate text-[9px] ${active ? "text-indigo-100" : "text-slate-400"}`}>
                  {t(ROOM_STATUS_I18N[status])}
                </p>
              </button>
            );
          })}
        </section>
      )}

      {/* ── Search + filter chips ── */}
      <section className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="police-rooms-search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("rooms.searchPlaceholder")}
            aria-label={t("rooms.searchPlaceholder")}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            aria-pressed={filter === "ALL"}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "ALL" ? BRAND.active : BRAND.idle
            }`}
          >
            {t("rooms.filterAll")}
            {summary && <span className="ml-1 opacity-70">· {summary.totalRooms}</span>}
          </button>
          {statusCounts &&
            ROOM_STATUSES.map((status) => {
              const s = ROOM_STATUS_STYLES[status];
              const active = filter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(active ? "ALL" : status)}
                  aria-pressed={active}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active ? BRAND.active : BRAND.idle
                  }`}
                >
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white/90" : s.dot}`} />
                  {t(ROOM_STATUS_I18N[status])}
                  <span className="ml-0.5 opacity-70">· {statusCounts[status]}</span>
                </button>
              );
            })}
        </div>

        {/* Room type chips */}
        {data && data.roomTypes.length > 0 && filter === "ALL" && !search.trim() && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {data.roomTypes.map((rt) => (
              <span
                key={rt.type}
                className="flex h-7 shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-500"
              >
                {rt.type} · {rt.count}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Provider list ── */}
      {loading ? (
        <RoomsSkeleton />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} retryLabel={t("common.retry")} />
      ) : !data || data.providers.length === 0 ? (
        <EmptyState
          icon={<BedDouble className="h-6 w-6" />}
          title={t("rooms.noProviders")}
        />
      ) : visibleProviders.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={filter !== "ALL" ? t("rooms.noRoomsForFilter") : t("rooms.noProviders")}
          hint={isFiltering ? t("rooms.tryClearing") : undefined}
        />
      ) : (
        <>
          {isFiltering && (
            <p className="px-1 text-[11px] font-medium text-slate-400">
              {t("rooms.matchCount", { matched: totalMatched, total: summary?.totalRooms ?? 0 })}
              {" · "}
              {t("rooms.resultGuesthouses", { count: visibleProviders.length })}
            </p>
          )}
          <ul className="space-y-3">
            {visibleProviders.map((p) => {
              const expanded = expandedId === p.id;
              const busy = p.utilizationRate >= 80;
              return (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                >
                  {/* Provider header (toggle) */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : p.id)}
                    aria-expanded={expanded}
                    className="w-full p-4 text-left transition-colors active:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900">{p.name}</h3>
                        {p.address && (
                          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-400">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {p.address}
                          </p>
                        )}
                        {p.phone && (
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                            <Phone className="h-3 w-3 shrink-0" />
                            {p.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            busy
                              ? "border-rose-100 bg-rose-50 text-rose-700"
                              : "border-indigo-100 bg-indigo-50 text-indigo-700"
                          }`}
                        >
                          {p.utilizationRate}%
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-300 transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                    {/* mini status counts */}
                    <div className="mt-3 flex items-center gap-3">
                      {ROOM_STATUSES.map((status) => (
                        <span key={status} className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                          <StatusDot status={status} />
                          {p[PROVIDER_COUNT_KEY[status]]}
                        </span>
                      ))}
                      <span className="ml-auto text-[11px] text-slate-400">
                        {p.total} {t("rooms.roomsWord")}
                      </span>
                    </div>
                    {/* utilization bar — brand gradient flow */}
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${busy ? "bg-rose-400" : BRAND.gradientBar}`}
                        style={{ width: `${p.utilizationRate}%` }}
                      />
                    </div>
                  </button>

                  {/* Expanded room chips */}
                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-3">
                      <div className="mb-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        <span>{t("rooms.avgPrice")}: <span className="text-slate-600">{p.avgPrice}</span></span>
                        <span>{t("rooms.capacity")}: <span className="text-slate-600">{p.totalCapacity}</span></span>
                        {p.licenseNo && <span>{t("rooms.license")}: <span className="text-slate-600">{p.licenseNo}</span></span>}
                      </div>
                      {p.matchedRooms.length === 0 ? (
                        <p className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                          {t("rooms.noRoomsForFilter")}
                        </p>
                      ) : (
                        <ul className="grid grid-cols-2 gap-2">
                          {p.matchedRooms.map((r) => {
                            const st = asRoomStatus(r.status);
                            const s = ROOM_STATUS_STYLES[st];
                            return (
                              <li
                                key={r.id}
                                className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm"
                              >
                                <div className={`h-1 ${s.strip}`} />
                                <div className="p-2.5">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-sm font-bold tracking-tight text-slate-900">
                                      {t("rooms.roomNum", { room: r.number })}
                                    </span>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.chipBg} ${s.chipText} ${s.chipBorder}`}
                                    >
                                      {t(ROOM_STATUS_I18N[st])}
                                    </span>
                                  </div>
                                  <p className="mt-1 truncate text-[10px] text-slate-400">
                                    {[r.type, r.floor != null ? t("rooms.floor", { floor: r.floor }) : null]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-slate-600">
                                    {r.pricePerNight} <span className="text-slate-400">{t("rooms.perNight")}</span>
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Footer meta */}
      {!loading && !error && updatedAt && (
        <p className="flex items-center justify-center gap-2 pb-4 pt-1 text-center text-[10px] text-slate-400">
          {t("rooms.updated", { time: updatedAt.toLocaleTimeString() })}
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-500 transition active:scale-95"
          >
            <RefreshCw className="h-3 w-3" />
            {t("common.refresh")}
          </button>
        </p>
      )}
    </div>
  );
}

function RoomsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-1.5 w-full animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50/80 p-5 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
      <p className="mt-2.5 text-sm font-medium text-rose-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-rose-500 px-5 text-xs font-bold text-white transition active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50/70 text-indigo-300">
        {icon}
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
