"use client";

// ── Home — compact police dashboard for the standalone app ──
// Light cards on gray-50, matching the /m operator app look.

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BedDouble,
  Building2,
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
      <div className="space-y-3 px-4 pt-4" aria-hidden="true">
        <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white border border-gray-100" />
          ))}
        </div>
        <div className="h-36 animate-pulse rounded-2xl bg-white border border-gray-100" />
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
      icon: <Building2 className="h-4 w-4" />,
      accent: "text-sky-600 bg-sky-50",
      navigateTo: "rooms",
    },
    {
      key: "home.totalRooms",
      value: data.totalRooms,
      icon: <BedDouble className="h-4 w-4" />,
      accent: "text-violet-600 bg-violet-50",
      navigateTo: "rooms",
    },
    {
      key: "home.activeStays",
      value: data.activeReservations,
      icon: <Users className="h-4 w-4" />,
      accent: "text-emerald-600 bg-emerald-50",
      navigateTo: "guests",
    },
    {
      key: "home.totalGuests",
      value: data.totalGuests,
      icon: <UserRound className="h-4 w-4" />,
      accent: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="space-y-3 px-4 pt-4">
      <header className="px-1">
        <h1 className="text-lg font-bold leading-tight text-gray-900">{t("home.title")}</h1>
        <p className="text-xs text-gray-500">{t("home.subtitle")}</p>
      </header>

      {/* KPI grid */}
      <section className="grid grid-cols-2 gap-3" aria-label={t("home.title")}>
        {kpis.map((k) => {
          const inner = (
            <>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${k.accent}`}>
                {k.icon}
              </span>
              <span className="mt-2.5 block text-2xl font-bold leading-none text-gray-900">
                {k.value.toLocaleString()}
              </span>
              <span className="mt-1.5 block text-[11px] font-medium leading-tight text-gray-500">
                {t(k.key)}
              </span>
            </>
          );
          return k.navigateTo ? (
            <button
              key={k.key}
              type="button"
              onClick={() => onNavigate(k.navigateTo!)}
              className="rounded-2xl bg-white border border-gray-100 p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
            >
              {inner}
            </button>
          ) : (
            <div key={k.key} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
              {inner}
            </div>
          );
        })}
      </section>

      {/* Revenue */}
      <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Wallet className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("home.totalRevenue")}</p>
            <p className="text-xl font-bold leading-tight text-gray-900">{formatEtb(data.revenue)}</p>
          </div>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("home.reservationRevenue")}</p>
            <p className="mt-1 text-sm font-bold text-gray-800">{formatEtb(data.reservationRevenue)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("home.daytimeRevenue")}</p>
            <p className="mt-1 text-sm font-bold text-gray-800">{formatEtb(data.daytimeRevenue)}</p>
          </div>
        </div>
      </section>

      {/* Busiest guesthouses */}
      {busiest.length > 0 && (
        <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
          <button
            type="button"
            onClick={() => onNavigate("rooms")}
            className="flex w-full items-center justify-between"
          >
            <h2 className="text-sm font-bold text-gray-800">{t("home.busiest")}</h2>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              {t("home.viewRooms")}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
          <ul className="mt-3 space-y-3">
            {busiest.map((p) => (
              <li key={p.id}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate font-semibold text-gray-800">{p.name}</span>
                  <span className="shrink-0 font-bold text-gray-700">
                    {p.activeReservations} <span className="font-normal text-gray-400">{t("home.activeWord")}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
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
