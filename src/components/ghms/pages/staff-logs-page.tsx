"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useAppStore } from "@/lib/store";
import { apiGetStaffLogs } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, Search, ChevronDown, ChevronUp, Filter } from "lucide-react";

// ── Types ──

interface StaffLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress: string;
  providerId: string;
  createdAt: string;
}

// ── Constants ──

const ACTION_VALUES = ["ALL", "CHECKIN", "CHECKOUT", "CREATE_RESERVATION", "UPDATE_RESERVATION", "CANCEL_RESERVATION", "CREATE_PAYMENT", "CREATE_GROUP_BOOKING", "UPDATE_GROUP_BOOKING", "DELETE_GROUP_BOOKING", "CREATE_MESSAGE_TEMPLATE", "SEND_MESSAGE", "BULK_SEND_MESSAGES", "UPDATE_ROOM"] as const;

const TARGET_VALUES = ["ALL", "RESERVATION", "GUEST", "ROOM", "PAYMENT", "EXPENSE", "GROUP_BOOKING", "MESSAGE_TEMPLATE", "MESSAGE_LOG"] as const;

const PAGE_LIMIT = 20;

// ── Helpers ──

function getActionBadgeClasses(action: string): string {
  const a = action.toUpperCase();

  if (a === "CHECKIN" || a === "CHECKOUT") {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  if (a.startsWith("CREATE_")) {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }
  if (a.startsWith("UPDATE_")) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  if (a.startsWith("DELETE_")) {
    return "bg-red-100 text-red-700 border-red-200";
  }
  if (a === "SEND_MESSAGE" || a === "BULK_SEND_MESSAGES") {
    return "bg-violet-100 text-violet-700 border-violet-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

// getActionLabel replaced by ACTION_LABELS lookup in component

function formatDetails(details: string): string {
  try {
    const parsed = JSON.parse(details);
    if (typeof parsed === "string") return parsed;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed);
      if (entries.length === 0) return "{}";
      return entries
        .slice(0, 6)
        .map(([key, val]) => `${key}: ${val}`)
        .join(" | ");
    }
    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed.slice(0, 3));
    }
    return String(parsed);
  } catch {
    return details;
  }
}

function formatFullDetails(details: string): string {
  try {
    const parsed = JSON.parse(details);
    if (typeof parsed === "string") return parsed;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return details;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  if (!name || name.trim() === "") return "?";
  return name.trim().charAt(0).toUpperCase();
}

function getAvatarColor(name: string): string {
  if (!name) return "bg-gray-200 text-gray-700";
  const colors = [
    "bg-blue-500 text-white",
    "bg-emerald-500 text-white",
    "bg-violet-500 text-white",
    "bg-amber-500 text-white",
    "bg-rose-500 text-white",
    "bg-cyan-500 text-white",
    "bg-indigo-500 text-white",
    "bg-pink-500 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

// ── Component ──

export default function StaffLogsPage() {
  const { t } = useTranslation("staffLogs");

  const ACTION_LABELS: Record<string, string> = {
    ALL: t("actionALL"),
    CHECKIN: t("actionCHECKIN"),
    CHECKOUT: t("actionCHECKOUT"),
    CREATE_RESERVATION: t("actionCREATE_RESERVATION"),
    UPDATE_RESERVATION: t("actionUPDATE_RESERVATION"),
    CANCEL_RESERVATION: t("actionCANCEL_RESERVATION"),
    CREATE_PAYMENT: t("actionCREATE_PAYMENT"),
    CREATE_GROUP_BOOKING: t("actionCREATE_GROUP_BOOKING"),
    UPDATE_GROUP_BOOKING: t("actionUPDATE_GROUP_BOOKING"),
    DELETE_GROUP_BOOKING: t("actionDELETE_GROUP_BOOKING"),
    CREATE_MESSAGE_TEMPLATE: t("actionCREATE_MESSAGE_TEMPLATE"),
    SEND_MESSAGE: t("actionSEND_MESSAGE"),
    BULK_SEND_MESSAGES: t("actionBULK_SEND_MESSAGES"),
    UPDATE_ROOM: t("actionUPDATE_ROOM"),
  };
  const TARGET_LABELS: Record<string, string> = {
    ALL: t("targetALL"),
    RESERVATION: t("targetRESERVATION"),
    GUEST: t("targetGUEST"),
    ROOM: t("targetROOM"),
    PAYMENT: t("targetPAYMENT"),
    EXPENSE: t("targetEXPENSE"),
    GROUP_BOOKING: t("targetGROUP_BOOKING"),
    MESSAGE_TEMPLATE: t("targetMESSAGE_TEMPLATE"),
    MESSAGE_LOG: t("targetMESSAGE_LOG"),
  };
  const refreshKey = useAppStore((s) => s.refreshKey);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Data
  const [logs, setLogs] = useState<StaffLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // UI
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch data
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });

      if (actionFilter && actionFilter !== "ALL") {
        params.set("action", actionFilter);
      }
      if (targetTypeFilter && targetTypeFilter !== "ALL") {
        params.set("targetType", targetTypeFilter);
      }
      if (dateFrom) {
        params.set("dateFrom", dateFrom);
      }
      if (dateTo) {
        params.set("dateTo", dateTo);
      }

      const res = await apiGetStaffLogs(params.toString());
      const body = res as {
        data: StaffLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };

      setLogs(body.data ?? []);
      setTotal(body.total ?? 0);
      setTotalPages(body.totalPages ?? 1);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("toastFailedLoad");
      toast.error(message);
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, targetTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

  // Reset to page 1 when filters change
  function applyFilters() {
    setPage(1);
  }

  function clearFilters() {
    setActionFilter("ALL");
    setTargetTypeFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function toggleRowExpanded(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Pagination helpers
  function getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  function goToPage(p: number) {
    if (p >= 1 && p <= totalPages) {
      setPage(p);
    }
  }

  // ── Render ──

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t("pageSubtitle")}
        </p>
      </div>

      {/* Filter Card */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t("lblFilters")}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Filter */}
            <div className="space-y-1.5">
              <Label>{t("lblAction")}</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action-filter" className="w-full">
                  <SelectValue placeholder={t("placeholderAllActions")} />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_VALUES.map((val) => (
                    <SelectItem key={val} value={val}>
                      {ACTION_LABELS[val] || val}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Type Filter */}
            <div className="space-y-1.5">
              <Label>{t("lblTargetType")}</Label>
              <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
                <SelectTrigger id="target-filter" className="w-full">
                  <SelectValue placeholder={t("placeholderAllTypes")} />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_VALUES.map((val) => (
                    <SelectItem key={val} value={val}>
                      {TARGET_LABELS[val] || val}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-1.5">
              <Label>{t("lblDateFrom")}</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <Label>{t("lblDateTo")}</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center gap-2 mt-4">
            <Button onClick={applyFilters} size="sm">
              <Search className="h-4 w-4 mr-1.5" />
              {t("btnSearch")}
            </Button>
            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
            >
              {t("btnClear")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {loading
            ? t("loading")
            : t(total === 1 ? "logEntriesCount_one" : "logEntriesCount_other", { count: total })}
        </p>
        {!loading && logs.length > 0 && (
          <p className="text-xs text-gray-400">
            {t("pageOf", { page, total: totalPages })}
          </p>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && logs.length === 0 && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ClipboardList className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {t("emptyTitle")}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm">
              {t("emptySubtitle")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mobile Card View */}
      {!loading && logs.length > 0 && (
        <div className="space-y-3 md:hidden">
          {logs.map((log) => {
            const isExpanded = expandedRows.has(log.id);
            const formattedDetails = formatDetails(log.details);
            const isTruncatable = formattedDetails.length > 100;

            return (
              <Card key={log.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Card Header Row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(log.userName)}`}
                      >
                        {getInitials(log.userName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {log.userName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDateTime(log.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={getActionBadgeClasses(log.action)}>
                      {ACTION_LABELS[log.action.toUpperCase()] || log.action}
                    </Badge>
                  </div>

                  {/* Info Row */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{t("lblTargetTypeMobile")}</span>
                      <span className="text-xs font-medium text-gray-700">
                        {TARGET_LABELS[log.targetType] || log.targetType?.replace(/_/g, " ") || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{t("lblIpAddress")}</span>
                      <span className="text-xs font-mono text-gray-700">
                        {log.ipAddress || "—"}
                      </span>
                    </div>

                    {/* Details */}
                    {log.details && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">{t("lblDetails")}</span>
                        <p className="text-xs text-gray-600 mt-0.5 break-all leading-relaxed">
                          {isExpanded || !isTruncatable
                            ? formattedDetails
                            : truncate(formattedDetails, 100)}
                        </p>
                        {isTruncatable && (
                          <button
                            type="button"
                            onClick={() => toggleRowExpanded(log.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                {t("btnShowLess")}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                {t("btnShowMore")}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Desktop Table View */}
      {!loading && logs.length > 0 && (
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/60">
                    <TableHead>{t("thDateTime")}</TableHead>
                    <TableHead>{t("thStaffName")}</TableHead>
                    <TableHead>{t("thAction")}</TableHead>
                    <TableHead>{t("thTargetType")}</TableHead>
                    <TableHead>{t("thDetailsCol")}</TableHead>
                    <TableHead>{t("thIpAddressCol")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const isExpanded = expandedRows.has(log.id);
                    const formattedDetails = formatDetails(log.details);
                    const fullDetails = formatFullDetails(log.details);
                    const isTruncatable = formattedDetails.length > 100;

                    return (
                      <TableRow key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        {/* Date/Time */}
                        <TableCell className="text-sm text-gray-600">
                          {formatDateTime(log.createdAt)}
                        </TableCell>

                        {/* Staff Name with Avatar */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(log.userName)}`}
                            >
                              {getInitials(log.userName)}
                            </div>
                            <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                              {log.userName}
                            </span>
                          </div>
                        </TableCell>

                        {/* Action Badge */}
                        <TableCell>
                          <Badge variant="outline" className={getActionBadgeClasses(log.action)}>
                            {ACTION_LABELS[log.action.toUpperCase()] || log.action}
                          </Badge>
                        </TableCell>

                        {/* Target Type */}
                        <TableCell className="text-sm text-gray-600">
                          {TARGET_LABELS[log.targetType] || log.targetType?.replace(/_/g, " ") || "—"}
                        </TableCell>

                        {/* Details */}
                        <TableCell>
                          {log.details ? (
                            <div>
                              <p className="text-sm text-gray-600 break-all leading-relaxed whitespace-pre-line">
                                {isExpanded
                                  ? fullDetails
                                  : truncate(formattedDetails, 100)}
                              </p>
                              {isTruncatable && (
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpanded(log.id)}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-3 w-3" />
                                      {t("btnShowLess")}
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3" />
                                      {t("btnShowMore")}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>

                        {/* IP Address */}
                        <TableCell className="text-sm font-mono text-gray-500">
                          {log.ipAddress || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="min-w-[80px]"
          >
            {t("btnPrevious")}
          </Button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((p) => (
              <Fragment key={p}>
                {p > 1 && getPageNumbers()[getPageNumbers().indexOf(p) - 1] !== p - 1 && (
                  <span className="px-1 text-xs text-gray-400">...</span>
                )}
                <Button
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(p)}
                  className="min-w-[36px] h-8 px-2"
                >
                  {p}
                </Button>
              </Fragment>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="min-w-[72px]"
          >
            {t("btnNext")}
          </Button>
        </div>
      )}
    </div>
  );
}
