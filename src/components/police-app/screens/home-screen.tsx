"use client";

// ── Home — compact police dashboard for the standalone app ──

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BedDouble,
  Building2,
  LayoutDashboard,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import { apiPoliceDashboard } from "@/lib/api";
import { formatEtb } from "@/lib/police-app-status";
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
      <div className="space-y-4 px-4 pb-6 pt-3" aria-hidden="true">
        <div className="h-6 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
          ))}
        </div>
        <div className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pb-6 pt-6">
        <ErrorBox message={error} onRetry={load} retryLabel={t("common.retry")} />
      </div>
    );
  }

  if (!data) return null;

  const busiest = [...data.providers]
    .sort((a, b) => b.activeReservations - a.activeReservations || b.revenue - a.revenue)
    .slice(0, 5);
  const maxActive = Math.max(1, ...busiest.map((p) => p.activeReservations));

  const kpis: {
    key: string;
    value: number;
    icon: React.ReactNode;
    navigateTo?: Tab;
    accent: string;
  }[] = [
    {
      key: "home.totalProviders",
      value: data.totalProviders,
      icon: <Building2 className="h-5 w-5" />,
      accent: "text-sky-300 bg-sky-500/15 border-sky-500/30",
      navigateTo: "rooms",
    },
    {
      key: "home.totalRooms",
      value: data.totalRooms,
      icon: <BedDouble className="h-5 w-5" />,
      accent: "text-violet-300 bg-violet-500/15 border-violet-500/30",
      navigateTo: "rooms",
    },
    {
      key: "home.activeStays",
      value: data.activeReservations,
      icon: <Users className="h-5 w-5" />,
      accent: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
      navigateTo: "guests",
    },
    {
      key: "home.totalGuests",
      value: data.totalGuests,
      icon: <UserRound className="h-5 w-5" />,
      accent: "text-amber-300 bg-amber-500/15 border-amber-500/30",
    },
  ];

  return (
    <div className="space-y-4 px-4 pb-6 pt-3">
      <header className="flex items-center gap-2 px-1">
        <LayoutDashboard className="h-5 w-5 text-amber-400" />
        <div>
          <h1 className="text-lg font-bold leading-tight text-white">{t("home.title")}</h1>
          <p className="text-xs text-slate-400">{t("home.subtitle")}</p>
        </div>
      </header>

      {/* KPI grid */}
      <section className="grid grid-cols-2 gap-2.5" aria-label={t("home.title")}>
        {kpis.map((k) => {
          const inner = (
            <>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${k.accent}`}>
                {k.icon}
              </span>
              <span className="mt-2.5 block text-2xl font-bold leading-none text-white">
                {k.value.toLocaleString()}
              </span>
              <span className="mt-1.5 block text-[11px] font-medium leading-tight text-slate-400">
                {t(k.key)}
              </span>
            </>
          );
          return k.navigateTo ? (
            <button
              key={k.key}
              type="button"
              onClick={() => onNavigate(k.navigateTo!)}
              className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left shadow-lg shadow-black/20 transition hover:bg-white/[0.08] active:scale-[0.98]"
            >
              {inner}
            </button>
          ) : (
            <div key={k.key} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-lg shadow-black/20">
              {inner}
            </div>
          );
        })}
      </section>

      {/* Revenue */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t("home.totalRevenue")}</p>
            <p className="text-xl font-bold leading-tight text-white">{formatEtb(data.revenue)}</p>
          </div>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("home.reservationRevenue")}</p>
            <p className="mt-1 text-sm font-bold text-slate-100">{formatEtb(data.reservationRevenue)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("home.daytimeRevenue")}</p>
            <p className="mt-1 text-sm font-bold text-slate-100">{formatEtb(data.daytimeRevenue)}</p>
          </div>
        </div>
      </section>

      {/* Busiest guesthouses */}
      {busiest.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-lg shadow-black/20">
          <button
            type="button"
            onClick={() => onNavigate("rooms")}
            className="flex w-full items-center justify-between"
          >
            <h2 className="text-sm font-bold text-white">{t("home.busiest")}</h2>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
              {t("home.viewRooms")}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
          <ul className="mt-3 space-y-3">
            {busiest.map((p) => (
              <li key={p.id}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate font-semibold text-slate-200">{p.name}</span>
                  <span className="shrink-0 font-bold text-slate-300">
                    {p.activeReservations} <span className="font-normal text-slate-500">{t("home.activeWord")}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
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
