"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/pagination-controls";
import {
  BedDouble,
  Bed,
  Users,
  Search,
  Phone,
  MapPin,
  Building2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  RefreshCw,
  CalendarDays,
  BarChart3,
  Wrench,
  Lock,
  Clock,
  ShieldAlert,
  TrendingUp,
  PhoneCall,
  Mail,
  Copy,
  Ban,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { apiPoliceRoomAvailability, apiPoliceSuspendProvider } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// ── Types ──
interface RoomInfo {
  id: string;
  number: string;
  name: string;
  type: string;
  status: string;
  floor: number;
  capacity: number;
  pricePerNight: number;
}

interface ProviderStats {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  licenseNo: string;
  latitude: number;
  longitude: number;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  utilizationRate: number;
  totalCapacity: number;
  avgPrice: number;
  rooms: RoomInfo[];
}

interface RoomTypeStat {
  type: string;
  count: number;
}

interface Summary {
  totalProviders: number;
  totalRooms: number;
  totalCapacity: number;
  availableRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  maintenanceRooms: number;
  utilizationRate: number;
}

// ── Suspicious provider detection ──
interface SuspicionFlag {
  type: "high_maintenance" | "zero_available" | "all_non_available";
  message: string;
  severity: "HIGH" | "MEDIUM";
}

function detectSuspicion(p: ProviderStats, t: (key: string, opts?: Record<string, unknown>) => string): SuspicionFlag[] {
  const flags: SuspicionFlag[] = [];

  if (p.total === 0) return flags;

  // More than 30% rooms in maintenance = suspicious hiding
  const maintPct = (p.maintenance / p.total) * 100;
  if (maintPct >= 30 && p.maintenance > 0) {
    flags.push({
      type: "high_maintenance",
      message: t('flagRoomHiding', { maintenance: p.maintenance, total: p.total, pct: Math.round(maintPct) }),
      severity: maintPct >= 50 ? "HIGH" : "MEDIUM",
    });
  }

  // All rooms occupied/reserved/maintenance with zero available — suspicious during festivals
  if (p.available === 0 && p.total > 0) {
    flags.push({
      type: "zero_available",
      message: t('flagNoAvailable'),
      severity: "MEDIUM",
    });
  }

  return flags;
}

// ── Helpers ──
function formatRoomType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase().replace("_", "-");
}

function getRoomStatusColor(status: string): string {
  switch (status) {
    case "AVAILABLE": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "OCCUPIED": return "bg-blue-100 text-blue-800 border-blue-200";
    case "RESERVED": return "bg-amber-100 text-amber-800 border-amber-200";
    case "MAINTENANCE": return "bg-slate-200 text-slate-600 border-slate-300";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getUtilizationColor(rate: number): string {
  if (rate >= 90) return "text-rose-600";
  if (rate >= 70) return "text-amber-600";
  return "text-emerald-600";
}

function getUtilizationBarColor(rate: number): string {
  if (rate >= 90) return "bg-rose-500";
  if (rate >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

// ── Page ──
export default function PoliceRoomAvailabilityPage() {
  const { t } = useTranslation("roomAvailability");
  const [data, setData] = useState<{
    summary: Summary;
    roomTypes: RoomTypeStat[];
    providers: ProviderStats[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [detailProvider, setDetailProvider] = useState<ProviderStats | null>(null);
  const [showSuspiciousOnly, setShowSuspiciousOnly] = useState(false);
  // Suspension dialog state
  const [suspendProvider, setSuspendProvider] = useState<ProviderStats | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [providerMessage, setProviderMessage] = useState("");
  const [suspending, setSuspending] = useState(false);
  const providerPagination = usePagination({ totalItems: 0, initialPageSize: 10, pageSizeOptions: [5, 10, 20, 50] });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiPoliceRoomAvailability();
      if (result && typeof result === "object") {
        result.providers = Array.isArray(result.providers) ? result.providers : [];
        result.roomTypes = Array.isArray(result.roomTypes) ? result.roomTypes : [];
      }
      setData(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Handle suspension ──
  const handleOpenSuspend = (provider: ProviderStats) => {
    setSuspendProvider(provider);
    setSuspensionReason("");
    setProviderMessage("");
  };

  const handleSuspend = async () => {
    if (!suspendProvider) return;
    if (!suspensionReason.trim()) {
      toast.error(t('errorReasonRequired'));
      return;
    }
    try {
      setSuspending(true);
      await apiPoliceSuspendProvider({
        providerId: suspendProvider.id,
        suspensionReason: suspensionReason.trim(),
        providerMessage: providerMessage.trim() || undefined,
      });
      toast.success(t('successSuspended', { name: suspendProvider.name }));
      setSuspendProvider(null);
      setSuspensionReason("");
      setProviderMessage("");
      // Refresh data to remove the suspended provider from the list
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('errorSuspend'));
    } finally {
      setSuspending(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Compute suspicion for all providers ──
  const suspicionMap = data?.providers
    ? new Map(data.providers.map((p) => [p.id, detectSuspicion(p, t)]))
    : new Map();

  const suspiciousCount = data?.providers
    ? data.providers.filter((p) => suspicionMap.get(p.id)?.length > 0).length
    : 0;

  const highAlertCount = data?.providers
    ? data.providers.filter((p) =>
        suspicionMap.get(p.id)?.some((f) => f.severity === "HIGH")
      ).length
    : 0;

  // ── Sort providers ──
  const sortedProviders = data?.providers
    ? [...data.providers].sort((a, b) => {
        let cmp = 0;
        switch (sortBy) {
          case "name": cmp = a.name.localeCompare(b.name); break;
          case "rooms": cmp = a.total - b.total; break;
          case "available": cmp = a.available - b.available; break;
          case "occupied": cmp = a.occupied - b.occupied; break;
          case "utilization": cmp = a.utilizationRate - b.utilizationRate; break;
          case "capacity": cmp = a.totalCapacity - b.totalCapacity; break;
          case "maintenance": cmp = a.maintenance - b.maintenance; break;
          default: cmp = a.name.localeCompare(b.name);
        }
        return sortDir === "asc" ? cmp : -cmp;
      })
    : [];

  // ── Filter by search and suspicious toggle ──
  const filteredProviders = sortedProviders.filter((p) => {
    if (showSuspiciousOnly && suspicionMap.get(p.id)?.length === 0) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.ownerName.toLowerCase().includes(term) ||
      p.phone.includes(term) ||
      p.address.toLowerCase().includes(term)
    );
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    providerPagination.resetToFirst();
  }, [searchTerm, showSuspiciousOnly]);

  // Update total items when filtered list changes
  useEffect(() => {
    providerPagination.setTotalItems(filteredProviders.length);
  }, [filteredProviders.length]);

  const paginatedProviders = useMemo(() => providerPagination.paginate(filteredProviders), [filteredProviders, providerPagination]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary/60" />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BedDouble className="h-6 w-6 text-blue-600" />
            {t('pageTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('pageSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} title={t('refreshData')}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── City Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[10px] text-slate-500">{t('statProviders')}</p>
            </div>
            <p className="mt-1 text-xl font-bold text-slate-900">{s.totalProviders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[10px] text-slate-500">{t('statTotalRooms')}</p>
            </div>
            <p className="mt-1 text-xl font-bold text-slate-900">{s.totalRooms}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5">
              <Bed className="h-3.5 w-3.5 text-emerald-500" />
              <p className="text-[10px] text-emerald-600">{t('statAvailable')}</p>
            </div>
            <p className="mt-1 text-xl font-bold text-emerald-700">{s.availableRooms}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-[10px] text-blue-600">{t('statOccupied')}</p>
            </div>
            <p className="mt-1 text-xl font-bold text-blue-700">{s.occupiedRooms}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-[10px] text-amber-600">{t('statReserved')}</p>
            </div>
            <p className="mt-1 text-xl font-bold text-amber-700">{s.reservedRooms}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-300">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[10px] text-slate-500">{t('statMaintenance')}</p>
            </div>
            <p className="mt-1 text-xl font-bold text-slate-600">{s.maintenanceRooms}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-[10px] text-blue-600">{t('statCapacity')}</p>
            </div>
            <p className="mt-1 text-xl font-bold text-blue-700">{s.totalCapacity}</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-violet-500" />
              <p className="text-[10px] text-violet-600">{t('statUtilization')}</p>
            </div>
            <p className={`mt-1 text-xl font-bold ${getUtilizationColor(s.utilizationRate)}`}>
              {s.utilizationRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Suspicious Activity Alert Banner ── */}
      {suspiciousCount > 0 && (
        <div className={`rounded-lg border p-4 ${
          highAlertCount > 0
            ? "border-rose-300 bg-rose-50"
            : "border-amber-300 bg-amber-50"
        }`}>
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              highAlertCount > 0 ? "bg-rose-100" : "bg-amber-100"
            }`}>
              <ShieldAlert className={`h-5 w-5 ${
                highAlertCount > 0 ? "text-rose-600" : "text-amber-600"
              }`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${
                highAlertCount > 0 ? "text-rose-800" : "text-amber-800"
              }`}>
                {highAlertCount > 0
                  ? `${highAlertCount} ${t('highAlert')}` + (highAlertCount !== suspiciousCount ? `, ${suspiciousCount - highAlertCount} ${t('warning')}` : "")
                  : `${suspiciousCount} ${t('warning')}${suspiciousCount > 1 ? t('plural') : ''}`}
                {" "}— {t('suspiciousActivityDetected')}
              </p>
              <p className={`mt-0.5 text-xs ${
                highAlertCount > 0 ? "text-rose-700" : "text-amber-700"
              }`}>
                {t('suspiciousBannerDesc', { count: suspiciousCount })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Utilization Overview Bar ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
            <span>{t('cityWideUtilization')}</span>
            <span className={getUtilizationColor(s.utilizationRate)}>{s.utilizationRate}%</span>
          </div>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
            {s.totalRooms > 0 && (
              <>
                <div className="bg-emerald-500 transition-all" style={{ width: `${(s.availableRooms / s.totalRooms) * 100}%` }} title={`${t('available')}: ${s.availableRooms}`} />
                <div className="bg-blue-500 transition-all" style={{ width: `${(s.occupiedRooms / s.totalRooms) * 100}%` }} title={`${t('occupied')}: ${s.occupiedRooms}`} />
                <div className="bg-amber-500 transition-all" style={{ width: `${(s.reservedRooms / s.totalRooms) * 100}%` }} title={`${t('reserved')}: ${s.reservedRooms}`} />
                <div className="bg-slate-300 transition-all" style={{ width: `${(s.maintenanceRooms / s.totalRooms) * 100}%` }} title={`${t('maintenance')}: ${s.maintenanceRooms}`} />
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> {t('legendAvailable', { count: s.availableRooms })}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> {t('legendOccupied', { count: s.occupiedRooms })}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> {t('legendReserved', { count: s.reservedRooms })}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-300" /> {t('legendMaintenance', { count: s.maintenanceRooms })}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Room Type Distribution ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <BedDouble className="h-4 w-4" />
            {t('roomTypesDistribution')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {data.roomTypes.map((rt) => {
              const pct = s.totalRooms > 0 ? Math.round((rt.count / s.totalRooms) * 100) : 0;
              return (
                <div key={rt.type} className="rounded-lg border p-3 text-center">
                  <p className="text-[11px] text-slate-500">{formatRoomType(rt.type)}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{rt.count}</p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">{pct}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Provider List ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t('providerRoomBreakdown')}
              <Badge variant="outline" className="ml-1 text-[10px]">{t('providersCount', { count: filteredProviders.length })}</Badge>
            </CardTitle>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setSortDir("asc"); }}>
                <SelectTrigger className="h-9 w-[140px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{t('sortName')}</SelectItem>
                  <SelectItem value="rooms">{t('sortTotalRooms')}</SelectItem>
                  <SelectItem value="available">{t('sortAvailable')}</SelectItem>
                  <SelectItem value="occupied">{t('sortOccupied')}</SelectItem>
                  <SelectItem value="maintenance">{t('sortMaintenance')}</SelectItem>
                  <SelectItem value="utilization">{t('sortUtilization')}</SelectItem>
                  <SelectItem value="capacity">{t('sortCapacity')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                title={sortDir === "asc" ? t('sortAsc') : t('sortDesc')}
              >
                {sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {suspiciousCount > 0 && (
                <Button
                  variant={showSuspiciousOnly ? "default" : "outline"}
                  size="sm"
                  className={`h-9 gap-1.5 text-xs ${showSuspiciousOnly ? "bg-rose-600 hover:bg-rose-700" : ""}`}
                  onClick={() => setShowSuspiciousOnly(!showSuspiciousOnly)}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {showSuspiciousOnly ? t('showingSuspicious') : t('suspiciousCount', { count: suspiciousCount })}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t('thGuesthouse')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t('thOwnerContact')}</th>
                  <th className="px-4 py-2.5 text-center font-medium text-slate-600">{t('thRooms')}</th>
                  <th className="px-4 py-2.5 text-center font-medium text-slate-600">
                    <span className="text-emerald-600">{t('thAvail')}</span>
                    <span className="text-slate-300 mx-0.5">/</span>
                    <span className="text-blue-600">{t('thOcc')}</span>
                    <span className="text-slate-300 mx-0.5">/</span>
                    <span className="text-amber-600">{t('thRes')}</span>
                    <span className="text-slate-300 mx-0.5">/</span>
                    <span className="text-slate-400">{t('thMaint')}</span>
                  </th>
                  <th className="px-4 py-2.5 text-center font-medium text-slate-600">{t('thCapacity')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t('thUtilization')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-600">{t('thActions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProviders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      {showSuspiciousOnly ? t('emptySuspicious') : t('emptyProviders')}
                    </td>
                  </tr>
                ) : (
                  paginatedProviders.map((p) => {
                    const flags = suspicionMap.get(p.id) || [];
                    const hasHighAlert = flags.some((f) => f.severity === "HIGH");
                    return (
                      <tr
                        key={p.id}
                        className={`border-b hover:bg-slate-50 cursor-pointer ${
                          hasHighAlert ? "bg-rose-50/50 hover:bg-rose-50" : flags.length > 0 ? "bg-amber-50/30" : ""
                        }`}
                        onClick={() => setExpandedProvider(expandedProvider === p.id ? null : p.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{p.name}</p>
                            {hasHighAlert && (
                              <Badge variant="outline" className="text-[9px] bg-rose-100 text-rose-700 border-rose-300">
                                {t('highAlertBadge')}
                              </Badge>
                            )}
                            {flags.length > 0 && !hasHighAlert && (
                              <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-700 border-amber-300">
                                {t('flaggedBadge')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{p.address}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700">{p.ownerName}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {p.phone}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-slate-900">{p.total}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="inline-flex items-center justify-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 min-w-[24px]">{p.available}</span>
                            <span className="inline-flex items-center justify-center rounded-md bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 min-w-[24px]">{p.occupied}</span>
                            <span className="inline-flex items-center justify-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 min-w-[24px]">{p.reserved}</span>
                            <span className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold min-w-[24px] ${
                              p.maintenance > 0 && (p.maintenance / p.total) >= 0.3
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-500"
                            }`}>{p.maintenance}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-slate-700">{p.totalCapacity} {t('beds')}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-100 max-w-[80px]">
                              <div className={`h-full rounded-full ${getUtilizationBarColor(p.utilizationRate)}`} style={{ width: `${p.utilizationRate}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${getUtilizationColor(p.utilizationRate)}`}>
                              {p.utilizationRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setDetailProvider(p); }}
                              title={t('viewDetails')}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={(e) => { e.stopPropagation(); handleOpenSuspend(p); }}
                              title={t('suspendProvider')}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detailProvider} onOpenChange={() => setDetailProvider(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              {detailProvider?.name}
            </DialogTitle>
            <DialogDescription>
              {t('detailDialogDesc')}
            </DialogDescription>
          </DialogHeader>
          {detailProvider && (() => {
            const flags = suspicionMap.get(detailProvider.id) || [];
            const hasHighAlert = flags.some((f) => f.severity === "HIGH");
            return (
              <div className="space-y-4">
                {/* Suspicion alerts */}
                {flags.length > 0 && (
                  <div className={`rounded-lg border p-3 ${
                    hasHighAlert ? "border-rose-300 bg-rose-50" : "border-amber-300 bg-amber-50"
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className={`h-4 w-4 ${hasHighAlert ? "text-rose-600" : "text-amber-600"}`} />
                      <p className={`text-xs font-bold ${hasHighAlert ? "text-rose-800" : "text-amber-800"}`}>
                        {hasHighAlert ? t('detailHighAlert') : t('detailWarning')}
                      </p>
                    </div>
                    {flags.map((flag, i) => (
                      <p key={i} className={`text-xs ${hasHighAlert ? "text-rose-700" : "text-amber-700"}`}>
                        • {flag.message}
                      </p>
                    ))}
                  </div>
                )}

                {/* Contact Info */}
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                    <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
                    {t('directContact')}
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] text-slate-500">{t('detailOwner')}</p>
                      <p className="text-sm font-semibold text-slate-900">{detailProvider.ownerName}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] text-slate-500">{t('detailPhone')}</p>
                      <p className="text-sm font-semibold text-blue-700 flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {detailProvider.phone}
                        <button
                          onClick={() => { navigator.clipboard.writeText(detailProvider.phone); toast.success(t('phoneCopied')); }}
                          className="ml-auto p-0.5 text-slate-400 hover:text-slate-600"
                          title={t('copyPhone')}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] text-slate-500">{t('detailAddress')}</p>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                        {detailProvider.address || t('na')}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] text-slate-500">{t('detailLicenseNo')}</p>
                      <p className="text-sm font-semibold text-slate-900">{detailProvider.licenseNo || t('na')}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                <div className="grid grid-cols-5 gap-2">
                  <div className="rounded-lg border p-2.5 text-center">
                    <p className="text-[10px] text-slate-500">{t('detailTotal')}</p>
                    <p className="text-lg font-bold text-slate-900">{detailProvider.total}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 p-2.5 text-center">
                    <p className="text-[10px] text-emerald-600">{t('statAvailable')}</p>
                    <p className="text-lg font-bold text-emerald-700">{detailProvider.available}</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 p-2.5 text-center">
                    <p className="text-[10px] text-blue-600">{t('statOccupied')}</p>
                    <p className="text-lg font-bold text-blue-700">{detailProvider.occupied}</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 p-2.5 text-center">
                    <p className="text-[10px] text-amber-600">{t('statReserved')}</p>
                    <p className="text-lg font-bold text-amber-700">{detailProvider.reserved}</p>
                  </div>
                  <div className={`rounded-lg border p-2.5 text-center ${
                    detailProvider.maintenance > 0 && (detailProvider.maintenance / detailProvider.total) >= 0.3
                      ? "border-rose-300 bg-rose-50"
                      : "border-slate-300"
                  }`}>
                    <p className={`text-[10px] ${
                      detailProvider.maintenance > 0 && (detailProvider.maintenance / detailProvider.total) >= 0.3
                        ? "text-rose-600"
                        : "text-slate-500"
                    }`}>{t('statMaintenance')}</p>
                    <p className={`text-lg font-bold ${
                      detailProvider.maintenance > 0 && (detailProvider.maintenance / detailProvider.total) >= 0.3
                        ? "text-rose-700"
                        : "text-slate-600"
                    }`}>{detailProvider.maintenance}</p>
                  </div>
                </div>

                {/* Utilization */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-600 font-medium">{t('occupancyUtilization')}</span>
                    <span className={`font-bold ${getUtilizationColor(detailProvider.utilizationRate)}`}>
                      {detailProvider.utilizationRate}%
                    </span>
                  </div>
                  <Progress value={detailProvider.utilizationRate} className="h-2" />
                  <div className="mt-1.5 flex gap-3 text-[11px] text-slate-400">
                    <span>{t('avgPrice', { price: detailProvider.avgPrice.toLocaleString() })}</span>
                    <span>{t('totalCapacity', { count: detailProvider.totalCapacity })}</span>
                  </div>
                </div>

                {/* Room List */}
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    {t('roomDetails', { count: detailProvider.rooms.length })}
                  </p>
                  <div className="max-h-[300px] overflow-y-auto space-y-1">
                    {detailProvider.rooms.map((room) => (
                      <div key={room.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900 w-10">#{room.number}</span>
                          <span className="text-xs text-slate-600">{room.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-400">
                            {formatRoomType(room.type)} | {t('floorAbbr')}{room.floor} | {room.capacity} {t('beds')} | {room.pricePerNight.toLocaleString()} ETB
                          </span>
                          <Badge variant="outline" className={`text-[10px] ${getRoomStatusColor(room.status)}`}>
                            {t('status_' + room.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suspend Button */}
                <Separator />
                <div className="flex items-center justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setDetailProvider(null);
                      handleOpenSuspend(detailProvider);
                    }}
                  >
                    <Ban className="h-4 w-4" />
                    {t('suspendThisGuesthouse')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Suspend Provider Dialog ── */}
      <Dialog open={!!suspendProvider} onOpenChange={(open) => { if (!open) setSuspendProvider(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Ban className="h-5 w-5" />
              {t('suspendGuesthouseTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('suspendDialogDesc')}
            </DialogDescription>
          </DialogHeader>
          {suspendProvider && (
            <div className="space-y-4">
              {/* Provider info summary */}
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                    <Building2 className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{suspendProvider.name}</p>
                    <p className="text-xs text-slate-500">{suspendProvider.ownerName} &middot; {suspendProvider.phone}</p>
                    <p className="text-[11px] text-slate-400">{suspendProvider.address}</p>
                  </div>
                </div>
              </div>

              {/* Suspension Reason (required) */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  {t('reasonForSuspicion')} <span className="text-rose-500">*</span>
                </label>
                <Textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder={t('reasonPlaceholder')}
                  className="min-h-[100px] resize-none"
                  maxLength={1000}
                />
                <p className="mt-1 text-[11px] text-slate-400 text-right">{suspensionReason.length}/1000</p>
              </div>

              {/* Short Message to Provider */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  {t('messageToProvider')} <span className="text-slate-400 font-normal">{t('optional')}</span>
                </label>
                <Textarea
                  value={providerMessage}
                  onChange={(e) => setProviderMessage(e.target.value)}
                  placeholder={t('messagePlaceholder')}
                  className="min-h-[80px] resize-none"
                  maxLength={500}
                />
                <p className="mt-1 text-[11px] text-slate-400 text-right">{providerMessage.length}/500</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('messageHint')}
                </p>
              </div>

              {/* Warning */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    {t('suspensionWarning')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSuspendProvider(null)}
                  disabled={suspending}
                >
                  {t('cancel')}
                </Button>
                <Button
                  variant="destructive"
                  className="gap-1.5"
                  onClick={handleSuspend}
                  disabled={suspending || !suspensionReason.trim()}
                >
                  {suspending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('suspending')}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t('suspendAndNotify')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Pagination Controls ── */}
      {filteredProviders.length > 0 && (
        <PaginationControls
          currentPage={providerPagination.currentPage}
          totalPages={providerPagination.totalPages}
          pageSize={providerPagination.pageSize}
          pageSizeOptions={providerPagination.pageSizeOptions}
          totalItems={filteredProviders.length}
          rangeInfo={providerPagination.rangeInfo}
          goToPage={providerPagination.goToPage}
          setPageSize={providerPagination.setPageSize}
        />
      )}
    </div>
  );
}
