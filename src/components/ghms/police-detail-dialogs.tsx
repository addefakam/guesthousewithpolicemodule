"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { apiPoliceRoomAvailability, apiPoliceActiveReservations } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Building2,
  CheckCircle2,
  Clock,
  DoorOpen,
  Users,
  Banknote,
  AlertCircle,
  Phone,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// KPI drill-down dialogs for the Police Dashboard.
// Clicking any KPI card opens one of these to show the details behind the
// number. Data comes either from the already-fetched dashboard payload
// (providers / approved / pending / revenue) or from dedicated read-only
// police endpoints fetched when the dialog opens (rooms / active).
// ─────────────────────────────────────────────────────────────────────────────

export type KpiDetailKind =
  | "providers"
  | "approved"
  | "pending"
  | "rooms"
  | "active"
  | "revenue";

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

interface DashboardPayload {
  totalProviders: number;
  totalRooms: number;
  totalGuests: number;
  activeReservations: number;
  revenue: number;
  providers: ProviderBreakdown[];
}

interface RoomAvailabilityProvider {
  id: string;
  name: string;
  phone: string;
  address: string;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  utilizationRate: number;
  totalCapacity: number;
  avgPrice: number;
}

interface RoomAvailabilityData {
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
  providers: RoomAvailabilityProvider[];
}

interface ActiveReservation {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestName: string;
  guestPhone: string;
  guestIdNumber: string;
  secondGuestName: string;
  roomNumber: string;
  providerName: string;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  PENDING: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200",
  REJECTED: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
  SUSPENDED: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200",
};

const DIALOG_META: Record<KpiDetailKind, { icon: typeof Building2; iconClass: string }> = {
  providers: { icon: Building2, iconClass: "text-slate-600 bg-slate-100" },
  approved: { icon: CheckCircle2, iconClass: "text-emerald-600 bg-emerald-50" },
  pending: { icon: Clock, iconClass: "text-yellow-600 bg-yellow-50" },
  rooms: { icon: DoorOpen, iconClass: "text-sky-600 bg-sky-50" },
  active: { icon: Users, iconClass: "text-violet-600 bg-violet-50" },
  revenue: { icon: Banknote, iconClass: "text-emerald-600 bg-emerald-50" },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground/40" />
      <p className="text-xs sm:text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function DialogSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 pl-8 text-xs sm:text-sm"
      />
    </div>
  );
}

// ── Providers list (all / approved / pending) ────────────────────────────────

function ProvidersDetail({
  dashboard,
  filterStatus,
}: {
  dashboard: DashboardPayload;
  filterStatus?: "APPROVED" | "PENDING";
}) {
  const { t } = useTranslation("policeDashboard");
  const [query, setQuery] = useState("");

  const all = useMemo(
    () =>
      filterStatus
        ? dashboard.providers.filter((p) => p.status === filterStatus)
        : dashboard.providers,
    [dashboard.providers, filterStatus]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((p) => p.name.toLowerCase().includes(q));
  }, [all, query]);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      APPROVED: t("statusApproved"),
      PENDING: t("statusPending"),
      REJECTED: t("statusRejected"),
      SUSPENDED: t("statusSuspended"),
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-3">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={t("detail.searchPlaceholder")}
      />
      {filtered.length === 0 ? (
        <EmptyState message={t("detail.emptyProviders")} />
      ) : (
        <div className="max-h-[55vh] overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>{t("colProviderName")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="text-center">{t("colRooms")}</TableHead>
                <TableHead className="text-center">{t("detail.colActive")}</TableHead>
                <TableHead className="text-right">{t("monthlyRevenue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${STATUS_BADGE_CLASS[p.status] || ""}`}
                    >
                      {statusLabel(p.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{p.rooms}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        p.activeReservations > 0
                          ? "font-semibold text-emerald-600"
                          : "text-muted-foreground"
                      }
                    >
                      {p.activeReservations}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(p.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Room availability ────────────────────────────────────────────────────────

function RoomsDetail() {
  const { t } = useTranslation("policeDashboard");
  const [data, setData] = useState<RoomAvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await apiPoliceRoomAvailability();
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  if (loading) return <DialogSkeleton rows={6} />;
  if (error || !data) return <EmptyState message={t("detail.emptyRooms")} />;

  const s = data.summary;
  const tiles = [
    { label: t("detail.colAvailable"), value: s.availableRooms, cls: "text-emerald-600 bg-emerald-50" },
    { label: t("detail.colOccupied"), value: s.occupiedRooms, cls: "text-violet-600 bg-violet-50" },
    { label: t("detail.colReserved"), value: s.reservedRooms, cls: "text-amber-600 bg-amber-50" },
    { label: t("detail.colMaintenance"), value: s.maintenanceRooms, cls: "text-slate-500 bg-slate-100" },
  ];

  return (
    <div className="space-y-3">
      {/* City-wide summary */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("detail.roomsSummaryLabel")}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-lg border p-2 text-center">
              <div className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-md ${tile.cls}`}>
                <DoorOpen className="h-3.5 w-3.5" />
              </div>
              <p className="text-sm font-bold leading-tight">{tile.value}</p>
              <p className="truncate text-[9px] sm:text-[10px] text-muted-foreground">{tile.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-provider breakdown */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("detail.byProviderLabel")}
        </p>
        {data.providers.length === 0 ? (
          <EmptyState message={t("detail.emptyRooms")} />
        ) : (
          <div className="max-h-[45vh] overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>{t("colProviderName")}</TableHead>
                  <TableHead className="text-center">{t("colRooms")}</TableHead>
                  <TableHead className="text-center">{t("detail.colAvailable")}</TableHead>
                  <TableHead className="text-center">{t("detail.colOccupied")}</TableHead>
                  <TableHead className="text-center">{t("detail.colUtilization")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[140px] truncate font-medium sm:max-w-none">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-center">{p.total}</TableCell>
                    <TableCell className="text-center font-semibold text-emerald-600">
                      {p.available}
                    </TableCell>
                    <TableCell className="text-center">{p.occupied}</TableCell>
                    <TableCell className="text-center">
                      <div className="mx-auto flex w-14 items-center gap-1.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${Math.min(p.utilizationRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{p.utilizationRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Active & upcoming reservations ───────────────────────────────────────────

function ActiveReservationsDetail() {
  const { t } = useTranslation("policeDashboard");
  const [items, setItems] = useState<ActiveReservation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "UPCOMING">("ALL");

  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await apiPoliceActiveReservations();
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const filtered = useMemo(() => {
    let list = items || [];
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [
        r.guestName,
        r.guestPhone,
        r.guestIdNumber,
        r.secondGuestName,
        r.roomNumber,
        r.providerName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, query, statusFilter]);

  const statusBadge = (status: string) =>
    status === "ACTIVE" ? (
      <Badge className="border-emerald-200 bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">
        {t("detail.statusActive")}
      </Badge>
    ) : (
      <Badge className="border-sky-200 bg-sky-100 text-[10px] text-sky-800 hover:bg-sky-100">
        {t("detail.statusUpcoming")}
      </Badge>
    );

  if (loading) return <DialogSkeleton rows={6} />;
  if (error || !items) return <EmptyState message={t("failedToLoad")} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-1.5">
          {(["ALL", "ACTIVE", "UPCOMING"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                statusFilter === f
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f === "ALL" ? t("detail.filterAll") : f === "ACTIVE" ? t("detail.filterActive") : t("detail.filterUpcoming")}
            </button>
          ))}
        </div>
        <div className="flex-1 sm:ml-auto sm:max-w-xs">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("detail.searchGuestPlaceholder")}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={t("detail.emptyActive")} />
      ) : (
        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-0.5">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border p-2.5 sm:p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {r.guestName}
                    {r.secondGuestName ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        {t("detail.secondGuest", { name: r.secondGuestName })}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {t("detail.colRoom")} {r.roomNumber} · {r.providerName}
                  </p>
                </div>
                {statusBadge(r.status)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
                {r.guestPhone ? (
                  <a
                    href={`tel:${r.guestPhone}`}
                    className="flex items-center gap-1 font-medium text-slate-700 hover:underline"
                  >
                    <Phone className="h-3 w-3" /> {r.guestPhone}
                  </a>
                ) : null}
                {r.guestIdNumber ? <span>ID: {r.guestIdNumber}</span> : null}
                <span className="ml-auto">
                  {formatDate(r.checkIn)} → {formatDate(r.checkOut)} · {r.nights}{" "}
                  {r.nights === 1 ? t("detail.colNights").replace(/s$/, "") : t("detail.colNights")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Revenue breakdown ────────────────────────────────────────────────────────

function RevenueDetail({ dashboard }: { dashboard: DashboardPayload }) {
  const { t } = useTranslation("policeDashboard");

  const providers = useMemo(
    () =>
      [...dashboard.providers]
        .filter((p) => p.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue),
    [dashboard.providers]
  );

  const total = dashboard.revenue || 0;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
          {t("detail.totalRevenueLabel")}
        </p>
        <p className="mt-0.5 text-xl font-bold text-emerald-800">{formatCurrency(total)}</p>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("detail.perProviderLabel")}
      </p>

      {providers.length === 0 ? (
        <EmptyState message={t("detail.emptyRevenue")} />
      ) : (
        <div className="max-h-[45vh] space-y-1.5 overflow-y-auto pr-0.5">
          {providers.map((p) => {
            const share = total > 0 ? Math.round((p.revenue / total) * 100) : 0;
            return (
              <div key={p.id} className="rounded-lg border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">{p.name}</p>
                  <p className="shrink-0 text-sm font-semibold text-emerald-600">
                    {formatCurrency(p.revenue)}
                  </p>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(share, 100)}%` }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-[10px] text-muted-foreground">
                    {share}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main dialog wrapper ──────────────────────────────────────────────────────

export function PoliceDetailDialog({
  kind,
  open,
  onOpenChange,
  dashboard,
}: {
  kind: KpiDetailKind | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboard: DashboardPayload | null;
}) {
  const { t } = useTranslation("policeDashboard");

  const titleKey =
    kind === "providers"
      ? "detail.providersTitle"
      : kind === "approved"
        ? "detail.approvedTitle"
        : kind === "pending"
          ? "detail.pendingTitle"
          : kind === "rooms"
            ? "detail.roomsTitle"
            : kind === "active"
              ? "detail.activeTitle"
              : "detail.revenueTitle";

  const subtitle =
    kind === "providers"
      ? t("detail.subtitleProviders", { count: dashboard?.totalProviders || 0 })
      : kind === "approved"
        ? t("detail.subtitleApproved", {
            count: dashboard?.providers.filter((p) => p.status === "APPROVED").length || 0,
          })
        : kind === "pending"
          ? t("detail.subtitlePending", {
              count: dashboard?.providers.filter((p) => p.status === "PENDING").length || 0,
            })
          : kind === "active"
            ? t("detail.subtitleActiveCount", {
                count: dashboard?.activeReservations || 0,
              })
            : kind === "rooms"
              ? t("detail.subtitleRoomsCount", { count: dashboard?.totalRooms || 0 })
              : kind === "revenue"
                ? t("detail.revenueDesc")
                : null;

  const meta = kind ? DIALOG_META[kind] : null;
  const Icon = meta?.icon ?? Building2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            {meta ? (
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconClass}`}>
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            {kind ? t(titleKey) : ""}
          </DialogTitle>
          {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
        </DialogHeader>

        {kind === "providers" || kind === "approved" || kind === "pending" ? (
          dashboard ? (
            <ProvidersDetail
              key={kind}
              dashboard={dashboard}
              filterStatus={kind === "approved" ? "APPROVED" : kind === "pending" ? "PENDING" : undefined}
            />
          ) : (
            <DialogSkeleton rows={5} />
          )
        ) : kind === "rooms" ? (
          <RoomsDetail />
        ) : kind === "active" ? (
          <ActiveReservationsDetail />
        ) : kind === "revenue" ? (
          dashboard ? (
            <RevenueDetail dashboard={dashboard} />
          ) : (
            <DialogSkeleton rows={4} />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
