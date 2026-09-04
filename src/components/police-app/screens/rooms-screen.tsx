"use client";

// ── Room Availability — the flagship screen of the standalone Police App ──
// City-wide live room status across every approved guesthouse, with the
// police-badge-in-front-of-house hero as its visual identity.

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
import {
  PoliceHouseHero,
  UtilizationRing,
  StatusDot,
} from "@/components/police-app/visuals";
import {
  ROOM_STATUSES,
  ROOM_STATUS_STYLES,
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

// Provider stat fields are lowercase while room status values are uppercase
const PROVIDER_COUNT_KEY: Record<RoomStatus, "available" | "occupied" | "reserved" | "maintenance"> = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  RESERVED: "reserved",
  MAINTENANCE: "maintenance",
};

const ROOM_STATUS_KEYS: Record<RoomStatus, string> = {
  AVAILABLE: "rooms.available",
  OCCUPIED: "rooms.occupied",
  RESERVED: "rooms.reserved",
  MAINTENANCE: "rooms.maintenance",
};

function asRoomStatus(status: string): RoomStatus {
  return (ROOM_STATUSES as string[]).includes(status) ? (status as RoomStatus) : "MAINTENANCE";
}

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
    <div className="space-y-4 px-4 pb-6 pt-3">
      {/* ── Hero: police badge standing in front of the house ── */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 shadow-xl shadow-black/30">
        <PoliceHouseHero className="h-auto w-full" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#081426] via-[#081426]/75 to-transparent px-4 pb-3.5 pt-12">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-lg font-bold leading-tight text-white">
                <BedDouble className="h-5 w-5 shrink-0 text-amber-400" />
                {t("rooms.title")}
              </h1>
              <p className="mt-0.5 truncate text-xs text-slate-300">{t("rooms.subtitle")}</p>
            </div>
            {summary && (
              <div className="shrink-0 rounded-2xl border border-white/10 bg-[#0B1D3A]/70 px-3 py-2 backdrop-blur">
                <UtilizationRing value={summary.utilizationRate} size={52} />
                <p className="mt-1 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-300">
                  {t("rooms.utilization")}
                </p>
              </div>
            )}
          </div>
          {summary && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300">
              <span>
                <span className="font-bold text-white">{summary.totalRooms}</span> {t("rooms.totalRooms")}
              </span>
              <span>
                <span className="font-bold text-white">{summary.totalProviders}</span> {t("rooms.guesthouses")}
              </span>
              <span>
                <span className="font-bold text-white">{summary.totalCapacity}</span> {t("rooms.capacity")}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Status tiles (tap to filter) ── */}
      {statusCounts && (
        <section className="grid grid-cols-2 gap-2.5" aria-label={t("rooms.title")}>
          {ROOM_STATUSES.map((status) => {
            const s = ROOM_STATUS_STYLES[status];
            const active = filter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(active ? "ALL" : status)}
                aria-pressed={active}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.98] ${
                  active
                    ? `${s.chipActive} shadow-lg`
                    : "border-white/10 bg-white/[0.05] hover:bg-white/[0.08]"
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white/20" : `${s.chipBg} border ${s.chipBorder}`}`}>
                  <StatusDot status={status} className="h-3 w-3" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-xl font-bold leading-none ${active ? "text-white" : "text-white"}`}>
                    {statusCounts[status]}
                  </span>
                  <span className={`mt-1 block truncate text-[11px] font-medium ${active ? "text-white/85" : "text-slate-400"}`}>
                    {t(ROOM_STATUS_KEYS[status])}
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      )}

      {/* ── Search + filter chips ── */}
      <section className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            name="police-rooms-search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("rooms.searchPlaceholder")}
            aria-label={t("rooms.searchPlaceholder")}
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15"
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            aria-pressed={filter === "ALL"}
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition active:scale-95 ${
              filter === "ALL"
                ? "border-amber-400 bg-amber-400 text-[#0B1D3A]"
                : "border-white/15 bg-white/[0.05] text-slate-300"
            }`}
          >
            {t("rooms.filterAll")}
            {summary && <span className="opacity-70">· {summary.totalRooms}</span>}
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
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition active:scale-95 ${
                    active
                      ? s.chipActive
                      : "border-white/15 bg-white/[0.05] text-slate-300"
                  }`}
                >
                  <StatusDot status={status} className="h-1.5 w-1.5" />
                  {t(ROOM_STATUS_KEYS[status])}
                  <span className="opacity-70">· {statusCounts[status]}</span>
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
                className="flex h-7 shrink-0 items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] font-medium text-slate-400"
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
          icon={<BedDouble className="h-8 w-8" />}
          title={t("rooms.noProviders")}
        />
      ) : visibleProviders.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
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
              return (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-lg shadow-black/20"
                >
                  {/* Provider header (toggle) */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : p.id)}
                    aria-expanded={expanded}
                    className="w-full p-4 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-white">{p.name}</h3>
                        {p.address && (
                          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-400">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
                            {p.address}
                          </p>
                        )}
                        {p.phone && (
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                            <Phone className="h-3 w-3 shrink-0 text-slate-500" />
                            {p.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            p.utilizationRate >= 80
                              ? "bg-rose-500/20 text-rose-300"
                              : p.utilizationRate >= 50
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {p.utilizationRate}%
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                    {/* mini status counts */}
                    <div className="mt-3 flex items-center gap-3">
                      {ROOM_STATUSES.map((status) => (
                        <span key={status} className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                          <StatusDot status={status} />
                          {p[PROVIDER_COUNT_KEY[status]]}
                        </span>
                      ))}
                      <span className="ml-auto text-[11px] text-slate-500">
                        {p.total} {t("rooms.roomsWord")}
                      </span>
                    </div>
                    {/* utilization bar */}
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${
                          p.utilizationRate >= 80
                            ? "bg-rose-400"
                            : p.utilizationRate >= 50
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                        }`}
                        style={{ width: `${p.utilizationRate}%` }}
                      />
                    </div>
                  </button>

                  {/* Expanded room chips */}
                  {expanded && (
                    <div className="border-t border-white/10 bg-black/20 p-3.5">
                      <div className="mb-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        <span>{t("rooms.avgPrice")}: <span className="text-slate-300">{p.avgPrice}</span></span>
                        <span>{t("rooms.capacity")}: <span className="text-slate-300">{p.totalCapacity}</span></span>
                        {p.licenseNo && <span>{t("rooms.license")}: <span className="text-slate-300">{p.licenseNo}</span></span>}
                      </div>
                      {p.matchedRooms.length === 0 ? (
                        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-xs text-slate-500">
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
                                className={`rounded-xl border p-2.5 ${s.chipBg} ${s.chipBorder}`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className={`text-sm font-bold ${s.chipText}`}>
                                    {t("rooms.roomNum", { room: r.number })}
                                  </span>
                                  <StatusDot status={st} />
                                </div>
                                <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                  {[r.type, r.floor != null ? t("rooms.floor", { floor: r.floor }) : null]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                                <p className="mt-0.5 text-[10px] font-semibold text-slate-300">
                                  {r.pricePerNight} <span className="font-normal text-slate-500">{t("rooms.perNight")}</span>
                                </p>
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
        <p className="flex items-center justify-center gap-2 pt-1 text-center text-[10px] text-slate-500">
          {t("rooms.updated", { time: updatedAt.toLocaleTimeString() })}
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 font-semibold text-slate-300 transition active:scale-95"
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
        <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-white/5" />
          <div className="mt-3 h-1.5 w-full animate-pulse rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
      <p className="mt-2.5 text-sm font-medium text-rose-200">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-rose-400/40 px-5 text-xs font-bold text-rose-200 transition active:scale-95"
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
        {icon}
      </div>
      <p className="mt-3.5 text-sm font-semibold text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
