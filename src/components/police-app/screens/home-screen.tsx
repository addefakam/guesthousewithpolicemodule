"use client";

// ── Home — compact police dashboard (Aurora light design system) ──
// Uniform white cards on the soft canvas; one indigo→violet brand flow
// carries the accent (gradient revenue figure, busiest bars).
// The main page also carries the Provider Room Breakdown list — every
// guesthouse with its available / occupied / reserved / maintenance
// counts and tappable room chips (same design as the Rooms screen).

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronDown, MapPin, Phone } from "lucide-react";
import { apiPoliceDashboard, apiPoliceRoomAvailability } from "@/lib/api";
import {
  formatEtb,
  BRAND,
  ROOM_STATUSES,
  ROOM_STATUS_STYLES,
  ROOM_STATUS_I18N,
  PROVIDER_COUNT_KEY,
  asRoomStatus,
} from "@/lib/police-app-status";
import { StatusDot } from "@/components/police-app/visuals";
import { ErrorBox } from "@/components/police-app/screens/rooms-screen";

interface ProviderRow {
  id: string;
  name: string;
  status: string;
  rooms: number;
  guests: number;
  totalReservations: number;
  activeReservations: number;
  revenue: number;
}

interface DashboardData {
  totalProviders: number;
  totalRooms: number;
  totalGuests: number;
  activeReservations: number;
  revenue: number;
  reservationRevenue: number;
  daytimeRevenue: number;
  providers: ProviderRow[];
}

interface BreakdownRoom {
  id: string;
  number: string;
  type: string;
  status: string;
  floor: number;
  pricePerNight: number;
}

interface BreakdownProvider {
  id: string;
  name: string;
  address: string;
  phone: string;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  utilizationRate: number;
  rooms: BreakdownRoom[];
}

interface BreakdownData {
  providers: BreakdownProvider[];
}

type Tab = "home" | "rooms" | "guests" | "system";

export default function HomeScreen({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { t } = useTranslation("policeApp");
  const [data, setData] = useState<DashboardData | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, bd] = await Promise.all([apiPoliceDashboard(), apiPoliceRoomAvailability()]);
      setData(d);
      setBreakdown(bd);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3 px-4 pt-4" aria-hidden="true">
        <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-white" />
          ))}
        </div>
        <div className="h-36 animate-pulse rounded-2xl border border-slate-100 bg-white" />
        <div className="h-44 animate-pulse rounded-2xl border border-slate-100 bg-white" />
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

  if (!data) return null;

  const busiest = [...data.providers]
    .sort((a, b) => b.activeReservations - a.activeReservations || b.revenue - a.revenue)
    .slice(0, 5);
  const maxActive = Math.max(1, ...busiest.map((p) => p.activeReservations));

  const breakdownProviders: BreakdownProvider[] = Array.isArray(breakdown?.providers)
    ? breakdown!.providers
    : [];

  // Uniform KPI cards — same structure and weight; a soft dot is the only
  // per-metric identifier (kept in one pastel family).
  const kpis: {
    key: string;
    value: number;
    dot: string;
    navigateTo?: Tab;
  }[] = [
    { key: "home.totalProviders", value: data.totalProviders, dot: "bg-sky-400", navigateTo: "rooms" },
    { key: "home.totalRooms", value: data.totalRooms, dot: "bg-violet-400", navigateTo: "rooms" },
    { key: "home.activeStays", value: data.activeReservations, dot: "bg-emerald-400", navigateTo: "guests" },
    { key: "home.totalGuests", value: data.totalGuests, dot: "bg-amber-400" },
  ];

  return (
    <div className="space-y-3 px-4 pt-4">
      <header className="px-1">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">{t("home.title")}</h1>
        <p className="mt-0.5 text-xs text-slate-400">{t("home.subtitle")}</p>
      </header>

      {/* KPI grid — uniform cards */}
      <section className="grid grid-cols-2 gap-3" aria-label={t("home.title")}>
        {kpis.map((k) => {
          const inner = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {t(k.key)}
                </span>
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${k.dot}`} />
              </div>
              <p className="mt-2.5 text-[26px] font-bold leading-none tracking-tight text-slate-900">
                {k.value.toLocaleString()}
              </p>
            </>
          );
          return k.navigateTo ? (
            <button
              key={k.key}
              type="button"
              onClick={() => onNavigate(k.navigateTo!)}
              className="rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
            >
              {inner}
            </button>
          ) : (
            <div key={k.key} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              {inner}
            </div>
          );
        })}
      </section>

      {/* Revenue */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {t("home.totalRevenue")}
        </p>
        <p className={`mt-1.5 text-2xl font-bold tracking-tight ${BRAND.gradientText}`}>
          {formatEtb(data.revenue)}
        </p>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              {t("home.reservationRevenue")}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800">{formatEtb(data.reservationRevenue)}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              {t("home.daytimeRevenue")}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800">{formatEtb(data.daytimeRevenue)}</p>
          </div>
        </div>
      </section>

      {/* ── Provider Room Breakdown — every guesthouse with its room status list ── */}
      {breakdownProviders.length > 0 && (
        <section className="space-y-2.5" aria-label={t("home.providerBreakdown")}>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-800">{t("home.providerBreakdown")}</h2>
            <button
              type="button"
              onClick={() => onNavigate("rooms")}
              className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600"
            >
              {t("home.viewRooms")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="space-y-3">
            {breakdownProviders.map((p) => {
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
                    {/* mini status counts — the available / occupied / etc. list */}
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
                      {p.rooms.length === 0 ? (
                        <p className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                          {t("rooms.noRoomsForFilter")}
                        </p>
                      ) : (
                        <ul className="grid grid-cols-2 gap-2">
                          {p.rooms.map((r) => {
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
        </section>
      )}

      {/* Busiest guesthouses */}
      {busiest.length > 0 && (
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => onNavigate("rooms")}
            className="flex w-full items-center justify-between"
          >
            <h2 className="text-sm font-bold text-slate-800">{t("home.busiest")}</h2>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
              {t("home.viewRooms")}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
          <ul className="mt-3 space-y-3">
            {busiest.map((p) => (
              <li key={p.id}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate font-semibold text-slate-800">{p.name}</span>
                  <span className="shrink-0 font-bold text-slate-700">
                    {p.activeReservations} <span className="font-normal text-slate-400">{t("home.activeWord")}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${BRAND.gradientBar}`}
                    style={{ width: `${Math.max(6, Math.round((p.activeReservations / maxActive) * 100))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
