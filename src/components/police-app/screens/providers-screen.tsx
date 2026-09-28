"use client";

// ── Providers list — standalone Police App screen ──
// Lists ALL guesthouses in the city (regardless of status: PENDING,
// APPROVED, REJECTED, SUSPENDED) sorted alphabetically by name.
// Reached by tapping the "Total Guesthouses" KPI on the home screen.
//
// Aurora light design: matches RoomsScreen + GuestsScreen — clean light
// surfaces, one indigo→violet accent for interactive states, soft pastel
// status identifiers, gentle fade-rise when switching tabs.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  FileText,
} from "lucide-react";
import { apiGetProviders } from "@/lib/api";
import {
  PROVIDER_STATUS_STYLES,
  PROVIDER_STATUS_I18N,
  BRAND,
  type ProviderStatus,
} from "@/lib/police-app-status";
import { useAppStore } from "@/lib/store";

interface Provider {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  type: string;
  licenseNo: string;
  status: string;
  approvedAt: string | null;
  createdAt: string;
}

type StatusFilter = "ALL" | ProviderStatus;

const PROVIDER_STATUSES: ProviderStatus[] = ["APPROVED", "PENDING", "REJECTED", "SUSPENDED"];

// Human-readable label for each guesthouse type — keeps the UI consistent
// with the main system's providers page and the mobile app's registration
// form (same enum values).
const TYPE_LABELS: Record<string, string> = {
  GUEST_HOUSE: "Guest House",
  HOTEL: "Hotel",
  LODGE: "Lodge",
  RESORT: "Resort",
  OTHER: "Other",
  HOMESTAY: "Homestay",
  DHARAMSHALA: "Dharamshala",
};

export default function ProvidersScreen() {
  const { t } = useTranslation("policeApp");
  // Subscribe to the global refreshKey so the header's refresh button
  // triggers a re-fetch on this screen.
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // apiGetProviders returns ALL providers (no status filter) ordered
      // by createdAt desc. We re-sort alphabetically by name on the
      // client so the list is browsable and matches the main system.
      const data = await apiGetProviders();
      const list: Provider[] = Array.isArray(data) ? data : [];
      const sorted = list.slice().sort((a, b) => {
        const nameA = (a.name || "").trim().toLowerCase();
        const nameB = (b.name || "").trim().toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        // Stable secondary sort by owner name — breaks ties when two
        // guesthouses share the same name (rare but possible).
        const ownerA = (a.ownerName || "").trim().toLowerCase();
        const ownerB = (b.ownerName || "").trim().toLowerCase();
        if (ownerA < ownerB) return -1;
        if (ownerA > ownerB) return 1;
        return 0;
      });
      setProviders(sorted);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // ── Filtered + searched view ──
  // Search matches name OR ownerName OR phone OR address OR licenseNo —
  // matches the main system's providers page search behavior so both
  // surfaces can find a guesthouse by the same set of terms.
  const visibleProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return providers.filter((p) => {
      if (filter !== "ALL" && p.status !== filter) return false;
      if (!q) return true;
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.ownerName || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q) ||
        (p.licenseNo || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q)
      );
    });
  }, [providers, search, filter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: providers.length,
      APPROVED: 0,
      PENDING: 0,
      REJECTED: 0,
      SUSPENDED: 0,
    };
    for (const p of providers) {
      if (counts[p.status] !== undefined) counts[p.status]++;
    }
    return counts;
  }, [providers]);

  if (loading) {
    return (
      <div className="space-y-3 px-4 pt-4" aria-hidden="true">
        <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
        <div className="h-16 animate-pulse rounded-2xl border border-slate-100 bg-white" />
        <div className="h-16 animate-pulse rounded-2xl border border-slate-100 bg-white" />
        <div className="h-16 animate-pulse rounded-2xl border border-slate-100 bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pt-6">
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors active:bg-rose-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pt-4">
      {/* ── Header ── */}
      <header>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">{t("providers.title")}</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          {t("providers.subtitle", { count: providers.length })}
          {updatedAt && (
            <span className="ml-2 opacity-60">· {updatedAt.toLocaleTimeString()}</span>
          )}
        </p>
      </header>

      {/* ── Search box ── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name="police-providers-search"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("providers.searchPlaceholder")}
          aria-label={t("providers.searchPlaceholder")}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
        />
      </div>

      {/* ── Status filter chips (horizontal scroll) ── */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          aria-pressed={filter === "ALL"}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "ALL" ? BRAND.active : BRAND.idle
          }`}
        >
          {t("providers.filterAll")}
          <span className="ml-1 opacity-70">· {statusCounts.ALL}</span>
        </button>
        {PROVIDER_STATUSES.map((status) => {
          const s = PROVIDER_STATUS_STYLES[status];
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
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {t(PROVIDER_STATUS_I18N[status])}
              <span className="opacity-70">· {statusCounts[status] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* ── Provider list ── */}
      {visibleProviders.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <Building2 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-500">{t("providers.empty")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleProviders.map((p) => {
            const s = PROVIDER_STATUS_STYLES[p.status as ProviderStatus] || PROVIDER_STATUS_STYLES.PENDING;
            return (
              <li
                key={p.id}
                className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Name + type */}
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold tracking-tight text-slate-900">
                        {p.name || "—"}
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                        {TYPE_LABELS[p.type] || p.type || "—"}
                      </span>
                    </div>
                    {/* Owner */}
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {p.ownerName || "—"}
                    </p>
                    {/* Contact details */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      {p.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {p.phone}
                        </span>
                      )}
                      {p.address && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{p.address}</span>
                        </span>
                      )}
                    </div>
                    {/* License No (now required + unique) */}
                    {p.licenseNo && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                        <FileText className="h-3 w-3" />
                        <span className="font-mono">{p.licenseNo}</span>
                      </div>
                    )}
                  </div>
                  {/* Status badge */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${s.chip}`}
                    >
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {t(PROVIDER_STATUS_I18N[p.status as ProviderStatus] || "rooms.statusUnknown")}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Result count footer */}
      <p className="px-1 pb-2 text-center text-[10px] text-slate-400">
        {t("providers.showing", { shown: visibleProviders.length, total: providers.length })}
      </p>
    </div>
  );
}
