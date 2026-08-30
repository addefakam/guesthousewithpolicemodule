"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { useAppStore } from "@/lib/store";
import { apiPoliceDashboard } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGetAnomalies, apiToggleAnomalyDetection } from "@/lib/api";
import {
  Building2,
  CheckCircle2,
  Clock,
  DoorOpen,
  Users,
  Banknote,
  TrendingUp,
  AlertCircle,

  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";

interface DashboardData {
  totalProviders: number;
  totalRooms: number;
  totalGuests: number;
  activeReservations: number;
  revenue: number;
  providers: ProviderBreakdown[];
}

interface ProviderBreakdown {
  id: string;
  name: string;
  status: string;
  rooms: number;
  guests: number;
  totalReservations: number;
  activeReservations: number;
  revenue: number;
}

interface Provider {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  PENDING: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200",
  REJECTED: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
  SUSPENDED: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200",
};

// STATUS_LABELS replaced by t() in component

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PoliceDashboardPage() {
  const { t } = useTranslation("policeDashboard");
  const { refreshKey, currentUser } = useAppStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [anomalyEnabled, setAnomalyEnabled] = useState(false);
  const [anomalyToggling, setAnomalyToggling] = useState(false);

  const isAdmin = currentUser?.role === "POLICE" && currentUser?.policeRank === "ADMIN";

  // Fetch anomaly toggle status
  const fetchAnomalyStatus = useCallback(async () => {
    try {
      const data = await apiGetAnomalies("pageSize=1");
      if (data.enabled !== undefined) setAnomalyEnabled(data.enabled);
    } catch { /* non-critical */ }
  }, []);

  const handleAnomalyToggle = async () => {
    if (!isAdmin || anomalyToggling) return;
    try {
      setAnomalyToggling(true);
      const result = await apiToggleAnomalyDetection(!anomalyEnabled);
      setAnomalyEnabled(result.enabled);
    } catch { /* non-critical */ }
    finally { setAnomalyToggling(false); }
  };

  useEffect(() => {
    fetchAnomalyStatus();
  }, [fetchAnomalyStatus]);

  const providerPagination = usePagination({ totalItems: dashboard?.providers?.length || 0, initialPageSize: 5, pageSizeOptions: [5, 10, 20, 50] });
  const paginatedProviders = useMemo(() => providerPagination.paginate(dashboard?.providers || []), [dashboard?.providers, providerPagination]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const dashData = await apiPoliceDashboard();

      const dash = dashData && typeof dashData === "object" ? dashData : null;
      const dashSafe = {
        ...dash,
        providers: Array.isArray(dash?.providers) ? dash.providers : [],
      };
      setDashboard(dashSafe);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("failedToLoad");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      APPROVED: t("statusApproved"),
      PENDING: t("statusPending"),
      REJECTED: t("statusRejected"),
      SUSPENDED: t("statusSuspended"),
    };
    return map[status] || status;
  };

  const kpiCards = dashboard
    ? [
        {
          title: t("kpiProviders"),
          value: dashboard.totalProviders,
          icon: Building2,
          color: "text-slate-600",
          bg: "bg-slate-100",
        },
        {
          title: t("kpiApproved"),
          value: dashboard.providers.filter((p) => p.status === "APPROVED").length,
          icon: CheckCircle2,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          title: t("kpiPending"),
          value: dashboard.providers.filter((p) => p.status === "PENDING").length,
          icon: Clock,
          color: "text-yellow-600",
          bg: "bg-yellow-50",
        },
        {
          title: t("kpiRooms"),
          value: dashboard.totalRooms,
          icon: DoorOpen,
          color: "text-sky-600",
          bg: "bg-sky-50",
        },
        {
          title: t("kpiActive"),
          value: dashboard.activeReservations,
          icon: Users,
          color: "text-violet-600",
          bg: "bg-violet-50",
        },
        {
          title: t("kpiTotalRevenue"),
          value: formatCurrency(dashboard.revenue),
          icon: Banknote,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
      ]
    : [];

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      {/* Top bar: title + anomaly toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>
          <p className="text-xs sm:text-sm text-gray-500">{t("pageSubtitle")}</p>
        </div>
        {/* Anomaly Detection Toggle — ADMIN only */}
        <div className="shrink-0">
          <button
            onClick={handleAnomalyToggle}
            disabled={!isAdmin || anomalyToggling}
            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-all duration-200 ${
              anomalyEnabled
                ? "border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 shadow-sm"
                : "border-slate-200 bg-slate-50 hover:bg-slate-100"
            } ${!isAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            title={!isAdmin ? t("tooltipAdminOnly") : anomalyEnabled ? t("tooltipDisable") : t("tooltipEnable")}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              anomalyEnabled ? "bg-violet-500 text-white" : "bg-slate-200 text-slate-400"
            }`}>
              {anomalyToggling ? (
                <Loader2 className="size-4 animate-spin" />
              ) : anomalyEnabled ? (
                <ToggleRight className="size-4" />
              ) : (
                <ToggleLeft className="size-4" />
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className={`text-xs font-bold leading-tight ${anomalyEnabled ? "text-violet-800" : "text-slate-600"}`}>
                {t("smartDetection")}
              </p>
              <p className={`text-[10px] leading-tight mt-0.5 ${anomalyEnabled ? "text-violet-600" : "text-slate-400"}`}>
                {anomalyEnabled ? t("active") : t("inactive")}
              </p>
            </div>
            {/* Toggle switch */}
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ${
                anomalyEnabled ? "bg-violet-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                  anomalyEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards — 2 cols on mobile, 3 on tablet, 6 on desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-3 sm:p-4">
                  <Skeleton className="mb-2 h-3 w-16" />
                  <Skeleton className="h-7 w-14" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((kpi) => (
              <Card key={kpi.title} className="shadow-sm">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${kpi.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] sm:text-xs text-muted-foreground">{kpi.title}</p>
                      <p className={`text-sm sm:text-lg font-bold leading-tight ${kpi.color}`}>{kpi.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Provider Overview — Cards on mobile, Table on md+ */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 pb-2 sm:px-6 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            {t("overviewTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4 sm:p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full sm:h-10" />
              ))}
            </div>
          ) : !dashboard?.providers.length ? (
            <div className="flex flex-col items-center py-10 sm:py-12 text-center">
              <AlertCircle className="mb-2 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40" />
              <p className="text-xs sm:text-sm text-muted-foreground">{t("overviewEmpty")}</p>
            </div>
          ) : (
            <>

              {/* Mobile: Card layout */}
              <div className="space-y-2 p-3 sm:hidden">
                {paginatedProviders.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{p.name}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <DoorOpen className="h-3 w-3" /> {t("roomsCount", { count: p.rooms })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {t("activeCount", { count: p.activeReservations })}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className={`shrink-0 text-[10px] ${STATUS_BADGE_CLASS[p.status] || ""}`}>
                        {getStatusLabel(p.status)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t pt-2">
                      <span className="text-[10px] text-muted-foreground">{t("monthlyRevenue")}</span>
                      <span className="text-xs font-semibold text-emerald-600">{formatCurrency(p.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table layout */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("colProviderName")}</TableHead>
                      <TableHead>{t("colStatus")}</TableHead>
                      <TableHead className="text-center">{t("colRooms")}</TableHead>
                      <TableHead className="text-center">{t("colActiveReservations")}</TableHead>
                      <TableHead className="text-right">{t("monthlyRevenue")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProviders.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={STATUS_BADGE_CLASS[p.status] || ""}>
                            {getStatusLabel(p.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{p.rooms}</TableCell>
                        <TableCell className="text-center">
                          <span className={p.activeReservations > 0 ? "font-semibold text-emerald-600" : "text-muted-foreground"}>
                            {p.activeReservations}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {!loading && dashboard && dashboard.providers.length > 0 && (
        <PaginationControls
          currentPage={providerPagination.currentPage}
          totalPages={providerPagination.totalPages}
          pageSize={providerPagination.pageSize}
          pageSizeOptions={providerPagination.pageSizeOptions}
          totalItems={dashboard.providers.length}
          rangeInfo={providerPagination.rangeInfo}
          goToPage={providerPagination.goToPage}
          setPageSize={providerPagination.setPageSize}
        />
      )}
    </div>
  );
}
