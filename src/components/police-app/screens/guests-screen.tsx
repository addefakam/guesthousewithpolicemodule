"use client";

// ── Guests — live ACTIVE + UPCOMING stays city-wide (standalone Police App) ──
// Aurora light design system: uniform indigo filter chips, white stay
// cards with soft status strips and pastel identifiers.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Globe,
  IdCard,
  MapPin,
  Phone,
  Search,
  Users,
} from "lucide-react";
import { apiPoliceActiveReservations } from "@/lib/api";
import { ErrorBox, EmptyState } from "@/components/police-app/screens/rooms-screen";
import { BRAND } from "@/lib/police-app-status";

interface ActiveReservation {
  id: string;
  status: "ACTIVE" | "UPCOMING";
  checkIn: string;
  checkOut: string;
  nights: number;
  guestName: string;
  guestPhone: string;
  guestIdNumber: string;
  guestNationality: string;
  secondGuestName: string;
  secondGuestIdNumber: string;
  roomNumber: string;
  roomType: string;
  providerName: string;
  providerPhone: string;
  providerAddress: string;
}

type StayFilter = "ALL" | "ACTIVE" | "UPCOMING";

export default function GuestsScreen() {
  const { t } = useTranslation("policeApp");
  const [items, setItems] = useState<ActiveReservation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StayFilter>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiPoliceActiveReservations();
      setItems(res?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (filter !== "ALL" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.guestName.toLowerCase().includes(q) ||
        r.guestPhone.toLowerCase().includes(q) ||
        r.guestIdNumber.toLowerCase().includes(q) ||
        r.secondGuestName.toLowerCase().includes(q) ||
        r.secondGuestIdNumber.toLowerCase().includes(q) ||
        r.roomNumber.toLowerCase().includes(q) ||
        r.providerName.toLowerCase().includes(q)
      );
    });
  }, [items, search, filter]);

  const activeCount = useMemo(() => items?.filter((r) => r.status === "ACTIVE").length ?? 0, [items]);
  const upcomingCount = useMemo(() => items?.filter((r) => r.status === "UPCOMING").length ?? 0, [items]);

  const FILTERS: { key: StayFilter; label: string; count: number; dot?: string }[] = [
    { key: "ALL", label: t("rooms.filterAll"), count: items?.length ?? 0 },
    { key: "ACTIVE", label: t("guests.statusActive"), count: activeCount, dot: "bg-emerald-500" },
    { key: "UPCOMING", label: t("guests.statusUpcoming"), count: upcomingCount, dot: "bg-sky-500" },
  ];

  return (
    <div className="space-y-3 px-4 pt-4">
      <header className="px-1">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">{t("guests.title")}</h1>
        <p className="mt-0.5 text-xs text-slate-400">{t("guests.subtitle")}</p>
      </header>

      {/* Status filter chips — uniform indigo active state */}
      <section className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={t("guests.title")}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? BRAND.active : BRAND.idle
              }`}
            >
              {f.dot && (
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white/90" : f.dot}`} />
              )}
              {f.label}
              <span className="ml-0.5 opacity-70">· {f.count}</span>
            </button>
          );
        })}
      </section>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name="police-guests-search"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("guests.searchPlaceholder")}
          aria-label={t("guests.searchPlaceholder")}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="mt-2.5 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorBox message={error} onRetry={load} retryLabel={t("common.retry")} />
      ) : !items || items.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title={t("guests.empty")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={search.trim() ? t("guests.noMatch") : t("guests.empty")}
        />
      ) : (
        <>
          <p className="px-1 text-[11px] font-medium text-slate-400">
            {t("guests.showing", { count: filtered.length })}
          </p>
          <ul className="space-y-3">
            {filtered.map((r) => {
              const isActive = r.status === "ACTIVE";
              return (
                <li
                  key={r.id}
                  className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                >
                  {/* soft status strip */}
                  <div className={`h-1 ${isActive ? "bg-emerald-400" : "bg-sky-400"}`} />
                  <div className="p-4">
                    {/* Name + status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900">{r.guestName}</h3>
                        {r.secondGuestName && (
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            + {r.secondGuestName}
                          </p>
                        )}
                      </div>
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          isActive
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-sky-100 bg-sky-50 text-sky-700"
                        }`}
                      >
                        {isActive ? <BadgeCheck className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                        {isActive ? t("guests.statusActive") : t("guests.statusUpcoming")}
                      </span>
                    </div>

                    {/* Identity rows */}
                    <dl className="mt-3 space-y-1.5 text-xs">
                      {r.guestPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <dt className="sr-only">{t("guests.phone")}</dt>
                          <dd>
                            <a href={`tel:${r.guestPhone}`} className="font-medium text-indigo-600 underline-offset-2 hover:underline">
                              {r.guestPhone}
                            </a>
                          </dd>
                        </div>
                      )}
                      {r.guestIdNumber && (
                        <div className="flex items-center gap-2">
                          <IdCard className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <dt className="sr-only">{t("guests.idNumber")}</dt>
                          <dd className="truncate font-medium text-slate-800">{r.guestIdNumber}</dd>
                        </div>
                      )}
                      {r.guestNationality && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <dt className="sr-only">{t("guests.nationality")}</dt>
                          <dd className="truncate text-slate-500">{r.guestNationality}</dd>
                        </div>
                      )}
                    </dl>

                    {/* Stay meta */}
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <BedIcon />
                        <span className="min-w-0 truncate text-slate-500">
                          <span className="font-bold text-slate-800">{t("guests.room", { room: r.roomNumber })}</span>
                          {r.roomType ? ` · ${r.roomType}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="min-w-0 truncate text-slate-500">{r.providerName}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="text-slate-500">
                          {r.checkIn} <span className="text-slate-300">→</span> {r.checkOut}
                          <span className="ml-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            {t("guests.nights", { count: r.nights })}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function BedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" />
    </svg>
  );
}
