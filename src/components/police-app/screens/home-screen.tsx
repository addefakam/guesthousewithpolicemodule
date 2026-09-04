"use client";

// ── Home — compact police dashboard (Aurora light design system) ──
// Uniform white cards on the soft canvas; one indigo→violet brand flow
// carries the accent (gradient revenue figure, busiest bars).

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { apiPoliceDashboard } from "@/lib/api";
import { formatEtb, BRAND } from "@/lib/police-app-status";
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

type Tab = "home" | "rooms" | "guests" | "more";

export default function HomeScreen({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { t } = useTranslation("policeApp");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiPoliceDashboard());
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
