"use client";

// ── All Guests — full guest registry city-wide (standalone Police App) ──
// Reached from the Active Stays screen's "Total Guests" button.
// Shows ALL registered guests across every guesthouse, paginated and
// searchable — matching the main system's Police → Guests page.
//
// Aurora light design: matches the rest of the police app.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Globe,
  IdCard,
  Phone,
  RefreshCw,
  Search,
  Star,
  Users,
} from "lucide-react";
import { apiPoliceGuests } from "@/lib/api";
import { ErrorBox, EmptyState } from "@/components/police-app/screens/rooms-screen";
import { BRAND } from "@/lib/police-app-status";
import GuestLifecycleBadges, { type GuestLifecycleSummary } from "@/components/shared/guest-lifecycle-badges";
import { apiGetGuestLifecycle } from "@/lib/api";

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
  const [guests, setGuests] = useState<Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lifecycleMap, setLifecycleMap] = useState<Record<string, GuestLifecycleSummary>>({});

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
  }, [load]);

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
            <li
              key={g.id}
              className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md"
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
              </div>
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
    </div>
  );
}
