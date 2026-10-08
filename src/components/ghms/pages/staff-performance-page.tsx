"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiGetStaffPerformance } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  User,
  Trophy,
  Award,
} from "lucide-react";

interface PerformanceEntry {
  userId: string;
  userName: string;
  username: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksPending: number;
  tasksOverdue: number;
  actionsLast30Days: number;
  lastActionAt: string | null;
  lastLogin: string | null;
}

export default function StaffPerformancePage() {
  const { t } = useTranslation();
  const refreshKey = useAppStore((s) => s.refreshKey);

  const [data, setData] = useState<PerformanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTasks, setTotalTasks] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await apiGetStaffPerformance()) as {
        data: PerformanceEntry[];
        totalTasks: number;
      };
      setData(res.data || []);
      setTotalTasks(res.totalTasks || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load performance data";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Top performer = highest completion rate (with at least 1 completed task).
  // Tiebreak: more actions in last 30 days.
  const topPerformer = data.find((u) => u.tasksCompleted > 0) || null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-indigo-500" />
          {t("staffPerfTitle", { defaultValue: "Staff Performance" })}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t("staffPerfSubtitle", {
            defaultValue: "Audit your staff's work — tasks completed, actions taken, overdue items.",
          })}
        </p>
      </div>

      {/* Top KPI cards */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <User className="h-3.5 w-3.5" />
                {t("kpiActiveStaff", { defaultValue: "Active Staff" })}
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {t("kpiTotalCompleted", { defaultValue: "Tasks Completed" })}
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {data.reduce((sum, u) => sum + u.tasksCompleted, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                {t("kpiPending", { defaultValue: "Pending / In-Progress" })}
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {data.reduce((sum, u) => sum + u.tasksPending, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                {t("kpiOverdue", { defaultValue: "Overdue" })}
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {data.reduce((sum, u) => sum + u.tasksOverdue, 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Performer Spotlight */}
      {!loading && topPerformer && (
        <Card className="border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-pink-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-fuchsia-700 font-semibold">
                {t("topPerformer", { defaultValue: "🏆 Top Performer" })}
              </p>
              <p className="text-lg font-bold text-slate-900">{topPerformer.userName}</p>
              <p className="text-xs text-slate-600 mt-0.5">
                {topPerformer.tasksCompleted} {t("tasksCompleted", { defaultValue: "tasks completed" })} ·{" "}
                {topPerformer.actionsLast30Days} {t("actions30d", { defaultValue: "actions (30 days)" })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              {t("noPerfData", { defaultValue: "No staff activity yet. Assign tasks to see performance metrics here." })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("staffPerfTableTitle", { defaultValue: "Per-Staff Breakdown" })}
            </CardTitle>
            <CardDescription>
              {t("staffPerfTableDesc", {
                defaultValue: "Sorted by tasks completed, then by recent activity. Last 30 days of actions.",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop: table view */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-500 border-b">
                    <th className="text-left py-2 font-medium">{t("thStaff", { defaultValue: "Staff Member" })}</th>
                    <th className="text-center py-2 font-medium">{t("thAssigned", { defaultValue: "Assigned" })}</th>
                    <th className="text-center py-2 font-medium">{t("thCompleted", { defaultValue: "Completed" })}</th>
                    <th className="text-center py-2 font-medium">{t("thPending", { defaultValue: "Pending" })}</th>
                    <th className="text-center py-2 font-medium">{t("thOverdue", { defaultValue: "Overdue" })}</th>
                    <th className="text-center py-2 font-medium">{t("thActions30d", { defaultValue: "Actions (30d)" })}</th>
                    <th className="text-right py-2 font-medium">{t("thLastActive", { defaultValue: "Last Active" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((u, idx) => {
                    const completionRate = u.tasksAssigned > 0
                      ? Math.round((u.tasksCompleted / u.tasksAssigned) * 100)
                      : 0;
                    return (
                      <tr key={u.userId} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {idx === 0 && u.tasksCompleted > 0 && (
                              <Award className="h-3.5 w-3.5 text-fuchsia-500 shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{u.userName}</p>
                              {u.username && (
                                <p className="text-xs text-slate-400">@{u.username}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-center">{u.tasksAssigned}</td>
                        <td className="text-center">
                          <span className="text-emerald-700 font-semibold">{u.tasksCompleted}</span>
                          {u.tasksAssigned > 0 && (
                            <span className="text-xs text-slate-400 ml-1">({completionRate}%)</span>
                          )}
                        </td>
                        <td className="text-center">
                          {u.tasksPending > 0 ? (
                            <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                              {u.tasksPending}
                            </Badge>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          {u.tasksOverdue > 0 ? (
                            <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200">
                              {u.tasksOverdue}
                            </Badge>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="text-center">{u.actionsLast30Days}</td>
                        <td className="text-right text-xs text-slate-500">
                          {u.lastActionAt
                            ? new Date(u.lastActionAt).toLocaleDateString()
                            : t("never", { defaultValue: "Never" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: card list */}
            <div className="md:hidden space-y-3">
              {data.map((u) => {
                const completionRate = u.tasksAssigned > 0
                  ? Math.round((u.tasksCompleted / u.tasksAssigned) * 100)
                  : 0;
                return (
                  <div key={u.userId} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-slate-900">{u.userName}</p>
                        {u.username && <p className="text-xs text-slate-400">@{u.username}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{t("completion", { defaultValue: "Completion" })}</p>
                        <p className="text-lg font-bold text-emerald-700">{completionRate}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <p className="text-slate-400">{t("assigned", { defaultValue: "Assigned" })}</p>
                        <p className="font-semibold text-slate-700">{u.tasksAssigned}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">{t("completed", { defaultValue: "Completed" })}</p>
                        <p className="font-semibold text-emerald-700">{u.tasksCompleted}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">{t("overdue", { defaultValue: "Overdue" })}</p>
                        <p className="font-semibold text-rose-700">{u.tasksOverdue}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">{t("actions", { defaultValue: "Actions" })}</p>
                        <p className="font-semibold text-slate-700">{u.actionsLast30Days}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
