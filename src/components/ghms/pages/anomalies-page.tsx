"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { apiGetAnomalies, apiReviewAnomalies, apiTriggerAnomalyScan } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle, BrainCircuit, RefreshCw, Eye, EyeOff, CheckCircle2, XCircle, ShieldAlert,
  TrendingUp, Activity, Filter, Loader2, Zap, Info, ToggleLeft, ToggleRight,
} from "lucide-react";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

// ── Types ──
interface AnomalyItem {
  id: string;
  type: string;
  severity: string;
  riskScore: number;
  guestName: string;
  guestPhone: string;
  guestIdNumber: string;
  providerId: string;
  providerName: string;
  description: string;
  metadata: string;
  isReviewed: number; // SQLite boolean = 0/1
  createdAt: string;
}
interface AnomalyStats {
  total: number;
  unreviewed: number;
  bySeverity: { severity: string; count: number }[];
  byType: { type: string; count: number }[];
  last30Days: number;
}
const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const ANOMALY_TYPES = [
  "IDENTITY_MISMATCH",
  "RAPID_MULTI_PROVIDER",
  "NO_SHOW_PATTERN",
  "CASH_ANOMALY",
  "CROSS_PROVIDER_ID",
  "SHORT_STAY_PATTERN",
  "FAKE_ID_PATTERN",
] as const;

function getRiskColor(score: number): string {
  if (score >= 75) return "text-red-600";
  if (score >= 50) return "text-orange-600";
  if (score >= 25) return "text-yellow-600";
  return "text-emerald-600";
}

function getRiskBg(score: number): string {
  if (score >= 75) return "bg-red-50";
  if (score >= 50) return "bg-orange-50";
  if (score >= 25) return "bg-yellow-50";
  return "bg-emerald-50";
}

export default function AnomaliesPage() {
  const { t } = useTranslation("anomalies");
  const { refreshKey } = useAppStore();
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [stats, setStats] = useState<AnomalyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [reviewMode, setReviewMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [detectionEnabled, setDetectionEnabled] = useState<boolean>(false);

  const pagination = usePagination({ totalItems: stats?.total || 0 });

  const getTypeLabel = (val: string) => {
    const map: Record<string, string> = {
      IDENTITY_MISMATCH: t('typeLabelsIdentityMismatch'),
      RAPID_MULTI_PROVIDER: t('typeLabelsRapidMultiProvider'),
      NO_SHOW_PATTERN: t('typeLabelsNoShowPattern'),
      CASH_ANOMALY: t('typeLabelsCashAnomaly'),
      CROSS_PROVIDER_ID: t('typeLabelsCrossProviderId'),
      SHORT_STAY_PATTERN: t('typeLabelsShortStayPattern'),
      FAKE_ID_PATTERN: t('typeLabelsFakeIdPattern'),
    };
    return map[val] || val;
  };

  const getTypeDesc = (val: string) => {
    const map: Record<string, string> = {
      IDENTITY_MISMATCH: t('typeDescsIdentityMismatch'),
      RAPID_MULTI_PROVIDER: t('typeDescsRapidMultiProvider'),
      NO_SHOW_PATTERN: t('typeDescsNoShowPattern'),
      CASH_ANOMALY: t('typeDescsCashAnomaly'),
      CROSS_PROVIDER_ID: t('typeDescsCrossProviderId'),
      SHORT_STAY_PATTERN: t('typeDescsShortStayPattern'),
      FAKE_ID_PATTERN: t('typeDescsFakeIdPattern'),
    };
    return map[val] || val;
  };

  const formatTime = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return t('timeJustNow');
      if (mins < 60) return t('timeMinutesAgo', { m: mins });
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return t('timeHoursAgo', { h: hrs, m: mins % 60 });
      const days = Math.floor(hrs / 24);
      return t('timeDaysAgo', { d: days, h: hrs % 24 });
    } catch {
      return dateStr;
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams();
      if (selectedType) q.set("type", selectedType);
      if (selectedSeverity) q.set("severity", selectedSeverity);
      q.set("page", String(pagination.currentPage));
      q.set("pageSize", String(pagination.pageSize));

      const data = await apiGetAnomalies(q.toString());
      setAnomalies((data.anomalies || []) as AnomalyItem[]);
      setStats(data.stats || null);
      pagination.setTotalItems(data.total || 0);
      // Update enabled state from API response
      if (data.enabled !== undefined) {
        setDetectionEnabled(data.enabled);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedSeverity, pagination.currentPage, pagination.pageSize, refreshKey]);

  const handleScan = async () => {
    try {
      setScanning(true);
      const result = await apiTriggerAnomalyScan();
      setScanResult(result.message);
      toast.success(result.message);
      fetchData(); // Refresh after scan
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorScan'));
    } finally {
      setScanning(false);
    }
  };

  const handleReview = async () => {
    if (selectedIds.size === 0) {
      toast.error(t('errorSelectToReview'));
      return;
    }
    try {
      await apiReviewAnomalies([...selectedIds]);
      toast.success(t('successReviewed', { count: selectedIds.size }));
      setSelectedIds(new Set());
      fetchData();
    } catch (err) {
      toast.error(t('errorReview'));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const unreviewedCount = stats?.unreviewed || 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pageTitle')}</h1>
          <p className="text-sm text-gray-500">
            {t('pageSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {detectionEnabled ? (
            <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs font-medium px-2.5 py-1">
              <ToggleRight className="h-3 w-3 mr-1" />{t('active')}
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs font-medium px-2.5 py-1">
              <ToggleLeft className="h-3 w-3 mr-1" />{t('inactive')}
            </Badge>
          )}
          {unreviewedCount > 0 && (
            <Badge className="bg-red-500 text-white text-xs font-bold px-2.5 py-1">
              {unreviewedCount} {t('unreviewed')}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {t('runSystemScan')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-sky-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('statTotal')}</span>
                <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-rose-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('statUnreviewed')}</span>
                <span className="text-2xl font-bold text-rose-600">{stats.unreviewed}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('statLast30Days')}</span>
                <span className="text-2xl font-bold text-amber-600">{stats.last30Days}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-violet-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('statAnomalyTypes')}</span>
                <span className="text-2xl font-bold text-violet-600">{stats.byType.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters + Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-1 gap-2">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('allTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('allTypes')}</SelectItem>
              {ANOMALY_TYPES.map((key) => (
                <SelectItem key={key} value={key}>{getTypeLabel(key)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('allSeverity')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('allSeverity')}</SelectItem>
              <SelectItem value="CRITICAL">{t('severityCritical')}</SelectItem>
              <SelectItem value="HIGH">{t('severityHigh')}</SelectItem>
              <SelectItem value="MEDIUM">{t('severityMedium')}</SelectItem>
              <SelectItem value="LOW">{t('severityLow')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          {reviewMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setReviewMode(false)}>
                {t('cancel')}
              </Button>
              <Button variant="default" size="sm" onClick={handleReview}>
                {t('markReviewed', { count: selectedIds.size })}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewMode(true)}
            >
              {t('selectToReview')}
            </Button>
          )}
        </div>
      </div>

      {/* Detection Status Banner */}
      {!detectionEnabled && !loading && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <ToggleLeft className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            {t('detectionOffBanner')}
          </p>
        </div>
      )}

      {/* Scan Result Banner */}
      {scanResult && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 mb-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="text-sm text-emerald-800 font-medium">{scanResult}</p>
        </div>
      )}

      {/* Anomalies Table */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : anomalies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BrainCircuit className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">{t('emptyTitle')}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t('emptyDescription')}
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('thtype', 'Type')}</TableHead>
                    <TableHead>{t('thseverity', 'Severity')}</TableHead>
                    <TableHead>{t('thrisk', 'Risk')}</TableHead>
                    <TableHead>{t('thguest', 'Guest')}</TableHead>
                    <TableHead>{t('thphone', 'Phone')}</TableHead>
                    <TableHead>{t('thprovider', 'Provider')}</TableHead>
                    <TableHead>{t('thtime', 'Time')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map((a) => {
                    const meta = a.metadata ? JSON.parse(a.metadata) : {};
                    return (
                      <TableRow
                        key={a.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          reviewMode && selectedIds.has(a.id) ? "bg-violet-50" : ""
                        }`}
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            {reviewMode ? (
                              <button
                                onClick={() => toggleSelect(a.id)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                {selectedIds.has(a.id) ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <Zap className="h-4 w-4 text-violet-500" />
                            )}
                            <span className="text-xs font-medium text-gray-700">
                              {getTypeLabel(a.type)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge className={SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.LOW}>
                            {a.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <span className={`font-bold text-sm ${getRiskColor(a.riskScore)}`}>{a.riskScore}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate max-w-[150px]" title={a.guestName}>{a.guestName}</p>
                          {a.guestIdNumber && (
                            <p className="text-[10px] text-gray-400 truncate max-w-[150px]" title={a.guestIdNumber}>
                              {t('idPrefix')} {a.guestIdNumber}
                            </p>
                          )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-xs text-gray-600 font-mono">{a.guestPhone || "—"}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-xs text-gray-600 truncate max-w-[120px]" title={a.providerName}>{a.providerName || "—"}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(a.createdAt)}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {anomalies.length > 0 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          pageSizeOptions={pagination.pageSizeOptions}
          totalItems={pagination.rangeInfo.total}
          goToPage={pagination.goToPage}
          setPageSize={pagination.setPageSize}
          rangeInfo={pagination.rangeInfo}
        />
      )}

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-sky-500" />
            {t('howItWorks')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            {t('howItWorksDesc')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ANOMALY_TYPES.map((type) => (
              <div key={type} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-violet-500" />
                  <span className="font-medium text-gray-900">{getTypeLabel(type)}</span>
                </div>
                <p className="text-xs text-gray-500">{getTypeDesc(type)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800">{t('riskScoring')}</span>
            </div>
            <p className="text-xs text-amber-700">
              {t('riskScoringDesc')}
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {t('toggleDesc')}
          </p>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewMode} onOpenChange={(open) => { if (!open) setReviewMode(false); setSelectedIds(new Set()); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('reviewDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('reviewDialogDesc', { count: selectedIds.size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
              <Button variant="outline" onClick={() => setReviewMode(false)}>{t('cancel')}</Button>
              <Button onClick={handleReview} disabled={selectedIds.size === 0}>
                {t('confirmReview', { count: selectedIds.size })}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
