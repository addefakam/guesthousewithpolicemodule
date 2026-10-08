"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, Search, ChevronDown, ChevronUp, Filter, Calendar, Wifi, Download } from "lucide-react";

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

const ACTION_VALUES = ["ALL", "CHECKIN", "CHECKOUT", "RESERVATION_CREATE", "RESERVATION_CANCEL", "RESERVATION_UPDATE", "GUEST_CREATE", "GUEST_UPDATE", "GUEST_DELETE", "ROOM_CREATE", "ROOM_UPDATE", "ROOM_DELETE", "ROOM_STATUS_CHANGE", "PAYMENT_RECORD", "BULK_CHECKIN", "BULK_CHECKOUT", "BULK_CANCEL", "CREATE_GROUP_BOOKING", "UPDATE_GROUP_BOOKING", "DELETE_GROUP_BOOKING", "GROUP_CHECKOUT", "GROUP_PAYMENT", "CREATE_MESSAGE_TEMPLATE", "UPDATE_MESSAGE_TEMPLATE", "DELETE_MESSAGE_TEMPLATE", "SEND_MESSAGE", "BULK_SEND_MESSAGES", "ISSUE_CERTIFICATE", "HOUSEKEEPING_CREATE", "HOUSEKEEPING_UPDATE", "HOUSEKEEPING_DELETE", "USER_CREATE", "USER_UPDATE", "USER_DELETE", "TASK_CREATE", "TASK_UPDATE", "TASK_ASSIGN", "TASK_COMPLETE", "TASK_DELETE"] as const;

const TARGET_VALUES = ["ALL", "RESERVATION", "GUEST", "ROOM", "PAYMENT", "EXPENSE", "GROUP_BOOKING", "MESSAGE_TEMPLATE", "MESSAGE_LOG", "PROVIDER", "HOUSEKEEPING", "USER", "TASK"] as const;

const PAGE_LIMIT = 20;

// ── Helpers ──

function getActionBadgeClasses(action: string): string {
  const a = action.toUpperCase();

  if (a === "CHECKIN" || a === "CHECKOUT" || a === "GROUP_CHECKOUT") {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  if (a.startsWith("CREATE_") || a === "RESERVATION_CREATE") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }
  if (a.startsWith("UPDATE_")) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  if (a.startsWith("DELETE_") || a === "RESERVATION_CANCEL" || a === "BULK_CANCEL") {
    return "bg-red-100 text-red-700 border-red-200";
  }
  if (a === "SEND_MESSAGE" || a === "BULK_SEND_MESSAGES") {
    return "bg-violet-100 text-violet-700 border-violet-200";
  }
  if (a.startsWith("BULK_")) {
    return "bg-cyan-100 text-cyan-700 border-cyan-200";
  }
  if (a === "PAYMENT_RECORD" || a === "GROUP_PAYMENT") {
    return "bg-teal-100 text-teal-700 border-teal-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
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
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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

/**
 * Parse the `details` JSON blob into a compact, human-readable "Target" summary.
 * Examples:
 *   RESERVATION_CREATE  →  "Room 101, Guest: Kebede"
 *   CHECKOUT            →  "Room 101, Guest: Kebede"
 *   PAYMENT_RECORD      →  "Amount: 1500 ETB, Method: Cash"
 *   CREATE_GROUP_BOOKING→  "Group: Wedding Party"
 *   SEND_MESSAGE        →  "Template: Welcome, To: +2519…"
 *   BULK_CHECKIN        →  "3/5 reservations"
 */
function getTargetSummary(log: StaffLog): string {
  if (!log.details) return "—";

  let d: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(log.details);
    if (typeof parsed === "string") return parsed || "—";
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      d = parsed as Record<string, unknown>;
    } else {
      return String(parsed);
    }
  } catch {
    // details is plain text, not JSON
    return log.details;
  }

  const action = (log.action || "").toUpperCase();
  const parts: string[] = [];

  const guestName = (d.guestName as string) || "";
  const roomNumber = (d.roomNumber as string) || (d.room as string) || "";
  const groupName = (d.groupName as string) || (d.name as string) || "";

  // ── Reservation lifecycle ──
  if (action === "RESERVATION_CREATE" || action === "CHECKIN" || action === "CHECKOUT") {
    if (roomNumber) parts.push(`Room ${roomNumber}`);
    if (guestName) parts.push(`Guest: ${guestName}`);
  } else if (action === "RESERVATION_CANCEL") {
    if (guestName) parts.push(`Guest: ${guestName}`);
    if (roomNumber) parts.push(`Room ${roomNumber}`);
  }
  // ── Bulk reservation actions ──
  else if (action.startsWith("BULK_")) {
    const total = Number(d.total ?? 0);
    const success = Number(d.success ?? 0);
    const failed = Number(d.failed ?? 0);
    if (total > 0) {
      parts.push(`${success}/${total} reservations`);
      if (failed > 0) parts.push(`${failed} failed`);
    }
  }
  // ── Guest ──
  else if (action === "GUEST_CREATE" || action === "GUEST_UPDATE") {
    if (guestName) parts.push(`Guest: ${guestName}`);
    if (d.phone) parts.push(`Phone: ${d.phone}`);
    if (d.idNumber) parts.push(`ID: ${d.idNumber}`);
  }
  // ── Room ──
  else if (action === "ROOM_CREATE" || action === "ROOM_UPDATE") {
    if (roomNumber) parts.push(`Room ${roomNumber}`);
    if (d.roomType) parts.push(`Type: ${d.roomType}`);
  }
  // ── Payment ──
  else if (action === "PAYMENT_RECORD") {
    if (d.amount !== undefined && d.amount !== null && d.amount !== "") {
      const amt = typeof d.amount === "number" ? d.amount.toLocaleString() : d.amount;
      parts.push(`Amount: ${amt}`);
    }
    if (d.method) parts.push(`Method: ${d.method}`);
  }
  // ── Group booking ──
  else if (
    action === "CREATE_GROUP_BOOKING" ||
    action === "UPDATE_GROUP_BOOKING" ||
    action === "DELETE_GROUP_BOOKING"
  ) {
    if (groupName) parts.push(`Group: ${groupName}`);
    if (d.startDate) parts.push(`From: ${d.startDate}`);
  } else if (action === "GROUP_CHECKOUT") {
    if (groupName) parts.push(`Group: ${groupName}`);
    const co = Number(d.checkedOut ?? 0);
    const tot = Number(d.total ?? 0);
    if (tot > 0) parts.push(`Checked out: ${co}/${tot}`);
  } else if (action === "GROUP_PAYMENT") {
    if (groupName) parts.push(`Group: ${groupName}`);
    if (d.amount !== undefined && d.amount !== null && d.amount !== "") {
      const amt = typeof d.amount === "number" ? d.amount.toLocaleString() : d.amount;
      parts.push(`Amount: ${amt}`);
    }
    if (d.method) parts.push(`Method: ${d.method}`);
  }
  // ── Message templates / sends ──
  else if (
    action === "CREATE_MESSAGE_TEMPLATE" ||
    action === "UPDATE_MESSAGE_TEMPLATE" ||
    action === "DELETE_MESSAGE_TEMPLATE"
  ) {
    if (d.name) parts.push(`Template: ${d.name}`);
    if (d.channel) parts.push(`Channel: ${d.channel}`);
  } else if (action === "SEND_MESSAGE") {
    if (d.template) parts.push(`Template: ${d.template}`);
    if (d.recipient) parts.push(`To: ${d.recipient}`);
  } else if (action === "BULK_SEND_MESSAGES") {
    if (d.template) parts.push(`Template: ${d.template}`);
    const sent = Number(d.sent ?? 0);
    const failed = Number(d.failed ?? 0);
    parts.push(`${sent} sent`);
    if (failed > 0) parts.push(`${failed} failed`);
  }

  // Fallback: show key/value pairs
  if (parts.length === 0) {
    const entries = Object.entries(d).slice(0, 3);
    if (entries.length === 0) return "—";
    return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
  }

  return parts.join(", ");
}

// ── Component ──

export default function StaffLogsPage() {
  const { t } = useTranslation("staffLogs");

  const ACTION_LABELS: Record<string, string> = {
    ALL: t("actionALL"),
    CHECKIN: t("actionCHECKIN"),
    CHECKOUT: t("actionCHECKOUT"),
    RESERVATION_CREATE: "Reservation Created",
    RESERVATION_CANCEL: "Reservation Cancelled",
    GUEST_CREATE: "Guest Created",
    GUEST_UPDATE: "Guest Updated",
    ROOM_CREATE: "Room Created",
    ROOM_UPDATE: "Room Updated",
    PAYMENT_RECORD: "Payment Recorded",
    BULK_CHECKIN: "Bulk Check-In",
    BULK_CHECKOUT: "Bulk Check-Out",
    BULK_CANCEL: "Bulk Cancel",
    CREATE_GROUP_BOOKING: t("actionCREATE_GROUP_BOOKING"),
    UPDATE_GROUP_BOOKING: t("actionUPDATE_GROUP_BOOKING"),
    DELETE_GROUP_BOOKING: t("actionDELETE_GROUP_BOOKING"),
    CREATE_MESSAGE_TEMPLATE: t("actionCREATE_MESSAGE_TEMPLATE"),
    SEND_MESSAGE: t("actionSEND_MESSAGE"),
    BULK_SEND_MESSAGES: t("actionBULK_SEND_MESSAGES"),
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
  const [staffFilter, setStaffFilter] = useState<string>("ALL");
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
      if (staffFilter && staffFilter !== "ALL") {
        params.set("userId", staffFilter);
      }
      if (dateFrom) {
        params.set("from", dateFrom);
      }
      if (dateTo) {
        params.set("to", dateTo);
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
  }, [page, actionFilter, targetTypeFilter, staffFilter, dateFrom, dateTo, t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

  // Staff dropdown options — derived from the unique staff members that
  // appear in the current page of logs. Built client-side so we don't need
  // an extra /api/users round-trip; the trade-off is that switching the
  // filter to a user not in the current page requires narrowing the date
  // range first.
  const staffOptions = useMemo(() => {
    const seen = new Map<string, string>();
    logs.forEach((l) => {
      if (l.userId && !seen.has(l.userId)) {
        seen.set(l.userId, l.userName || l.userId);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  // Reset to page 1 when filters change
  function applyFilters() {
    setPage(1);
  }

  function clearFilters() {
    setActionFilter("ALL");
    setTargetTypeFilter("ALL");
    setStaffFilter("ALL");
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

            {/* Staff Filter — built from the unique userIds in the current page */}
            <div className="space-y-1.5">
              <Label>{t("lblStaffMember", { defaultValue: "Staff Member" })}</Label>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger id="staff-filter" className="w-full">
                  <SelectValue placeholder={t("placeholderAllStaff", { defaultValue: "All staff" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("placeholderAllStaff", { defaultValue: "All staff" })}</SelectItem>
                  {staffOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
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
            <Button
              onClick={() => {
                // Build the same filter query as fetchLogs but hit the export
                // endpoint and trigger a browser download.
                const params = new URLSearchParams();
                if (actionFilter && actionFilter !== "ALL") params.set("action", actionFilter);
                if (targetTypeFilter && targetTypeFilter !== "ALL") params.set("targetType", targetTypeFilter);
                if (staffFilter && staffFilter !== "ALL") params.set("userId", staffFilter);
                if (dateFrom) params.set("from", dateFrom);
                if (dateTo) params.set("to", dateTo);
                const url = `/api/staff-logs/export${params.toString() ? "?" + params.toString() : ""}`;
                window.open(url, "_blank");
              }}
              variant="outline"
              size="sm"
              className="ml-auto"
              title={t("btnExportCsv", { defaultValue: "Download CSV" })}
            >
              <Download className="h-4 w-4 mr-1.5" />
              {t("btnExportCsv", { defaultValue: "Export CSV" })}
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
                <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-2/3" />
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

      {/* Compact Card List — same layout for mobile & desktop */}
      {!loading && logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => {
            const isExpanded = expandedRows.has(log.id);
            const targetSummary = getTargetSummary(log);
            const isTruncatable = targetSummary.length > 90;
            const actionLabel = ACTION_LABELS[log.action.toUpperCase()] || log.action;

            return (
              <div
                key={log.id}
                className="border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors shadow-sm"
              >
                {/* Line 1: Staff · Action */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(log.userName)}`}
                      title={log.userName || "Unknown staff"}
                    >
                      {getInitials(log.userName)}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {t("thStaffName") || "Staff"}:
                      </span>
                      <span className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                        {log.userName || "—"}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className={getActionBadgeClasses(log.action)}>
                    {actionLabel}
                  </Badge>
                </div>

                {/* Line 2: Target */}
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap mt-0.5">
                      {t("lblTargetTypeMobile") || "Target"}:
                    </span>
                    <p
                      className={`text-sm text-gray-700 break-words leading-relaxed ${
                        isExpanded ? "" : "line-clamp-2"
                      }`}
                    >
                      {targetSummary}
                    </p>
                    {isTruncatable && (
                      <button
                        type="button"
                        onClick={() => toggleRowExpanded(log.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-0.5 font-medium shrink-0"
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
                </div>

                {/* Line 3: Date · IP */}
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50/50 rounded-b-lg">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-600 truncate">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Wifi className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs font-mono text-gray-500">
                      {log.ipAddress || "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
