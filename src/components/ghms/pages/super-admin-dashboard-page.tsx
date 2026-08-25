"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  Building2,
  Shield,
  CreditCard,
  Settings,
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Star,
  Globe,
  Server,
} from "lucide-react";

// ── Types ──

interface OwnerAccountsData {
  users: Array<{ id: string; role: string; createdAt: string }>;
  policeUsers: Array<{ id: string; role: string; createdAt: string }>;
  providers: Array<{
    id: string;
    name: string;
    status?: string;
    createdAt?: string;
  }>;
}

interface SubscriptionStatusData {
  active: number;
  expiringSoon: number;
  suspended: number;
  total: number;
}

interface DashboardStats {
  totalUsers: number;
  activeGuesthouses: number;
  policeOfficers: number;
  activeSubscriptions: number;
  pendingApprovals: number;
  expiringSubscriptions: number;
}

// ── Component ──

import { useTranslation } from "react-i18next";

export default function SuperAdminDashboardPage() {
  const { t } = useTranslation("superadmin");
  const { refreshKey, setCurrentPage } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeGuesthouses: 0,
    policeOfficers: 0,
    activeSubscriptions: 0,
    pendingApprovals: 0,
    expiringSubscriptions: 0,
  });

  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const token = localStorage.getItem("ghms_token");
    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    let totalUsers = 0;
    let policeOfficers = 0;
    let activeGuesthouses = 0;
    let pendingApprovals = 0;
    let activeSubscriptions = 0;
    let expiringSubscriptions = 0;

    try {
      // Fetch owner accounts for user/provider counts
      const accountsRes = await fetch("/api/owner-accounts", { headers });
      if (accountsRes.ok) {
        const accountsData: OwnerAccountsData = await accountsRes.json();
        const provs = Array.isArray(accountsData.providers) ? accountsData.providers : [];
        totalUsers = (Array.isArray(accountsData.users) ? accountsData.users.length : 0) + (Array.isArray(accountsData.policeUsers) ? accountsData.policeUsers.length : 0);
        policeOfficers = Array.isArray(accountsData.policeUsers) ? accountsData.policeUsers.length : 0;
        activeGuesthouses = provs.filter(
          (p) => p.status === "APPROVED" || p.status === "active"
        ).length;
        pendingApprovals = provs.filter(
          (p) => p.status === "PENDING" || p.status === "pending"
        ).length;
      }
    } catch {
      // Silently handle - will use defaults
    }

    try {
      // Fetch subscription status
      const subRes = await fetch("/api/subscription/status", { headers });
      if (subRes.ok) {
        const subData: SubscriptionStatusData = await subRes.json();
        activeSubscriptions = subData.active ?? 0;
        expiringSubscriptions = subData.expiringSoon ?? 0;
      }
    } catch {
      // Silently handle
    }

    // NOTE: /api/dashboard is provider-scoped and does not return admin-level
    // aggregation fields (totalUsers, activeGuesthouses, etc.). Those come from
    // /api/owner-accounts and /api/subscription/status above. Do NOT call
    // /api/dashboard here — it causes 500 errors for SUPERUSERs with providerId.

    setStats({
      totalUsers,
      activeGuesthouses,
      policeOfficers,
      activeSubscriptions,
      pendingApprovals,
      expiringSubscriptions,
    });

    if (isRefresh) {
      setRefreshing(false);
      toast.success(t("msgRefreshSuccess"));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, refreshKey]);

  const handleRefresh = () => {
    fetchAllData(true);
  };

  // ── Stat Cards ──
  const statCards = [
    {
      label: t("statTotalUsers"),
      value: stats.totalUsers,
      icon: <Users className="h-4 w-4" />,
      color: "text-sky-600",
      bg: "bg-sky-50",
      border: "border-sky-100",
    },
    {
      label: t("statActiveGuesthouses"),
      value: stats.activeGuesthouses,
      icon: <Building2 className="h-4 w-4" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: t("statPoliceOfficers"),
      value: stats.policeOfficers,
      icon: <Shield className="h-4 w-4" />,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
    {
      label: t("statActiveSubscriptions"),
      value: stats.activeSubscriptions,
      icon: <CreditCard className="h-4 w-4" />,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
  ];

  // ── Loading Skeleton ──
  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {t("pageTitle")}
            </h1>
            <Badge className="gap-1.5 border-0 bg-emerald-600 hover:bg-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {t("systemOnline")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {t("pageSubtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-fit gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {t("btnRefresh")}
        </Button>
      </div>

      {/* ── System Overview Card ── */}
      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                {t("ghmsTitle")}
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                {t("ghmsSubtitle")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className={`flex items-center gap-3 rounded-xl border ${stat.border} ${stat.bg} p-3`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ${stat.color}`}
                >
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </CardContent>
      </Card>

      {/* ── Bottom Row: Alerts + System Info ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* System Alerts */}
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <Activity className="h-4 w-4 text-slate-500" />
              {t("sectionSystemAlerts")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Pending Approvals */}
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 transition-colors cursor-pointer ${
                stats.pendingApprovals > 0
                  ? "border-amber-200 bg-amber-50/60 hover:bg-amber-50"
                  : "border-slate-200 bg-slate-50/40 hover:bg-slate-50"
              }`}
              onClick={() => setCurrentPage("owner-accounts")}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  stats.pendingApprovals > 0
                    ? "bg-amber-100"
                    : "bg-slate-100"
                }`}
              >
                {stats.pendingApprovals > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {t("alertPendingApprovals")}
                  </p>
                  {stats.pendingApprovals > 0 && (
                    <Badge className="border-0 bg-amber-600 hover:bg-amber-700 text-white">
                      {stats.pendingApprovals}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {stats.pendingApprovals > 0
                    ? t("descPendingApprovals", { count: stats.pendingApprovals })
                    : t("descNoPendingApprovals")}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            </div>

            {/* Expiring Subscriptions */}
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 transition-colors cursor-pointer ${
                stats.expiringSubscriptions > 0
                  ? "border-rose-200 bg-rose-50/60 hover:bg-rose-50"
                  : "border-slate-200 bg-slate-50/40 hover:bg-slate-50"
              }`}
              onClick={() => setCurrentPage("subscriptions")}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  stats.expiringSubscriptions > 0
                    ? "bg-rose-100"
                    : "bg-slate-100"
                }`}
              >
                {stats.expiringSubscriptions > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {t("alertExpiringSubscriptions")}
                  </p>
                  {stats.expiringSubscriptions > 0 && (
                    <Badge className="border-0 bg-rose-600 hover:bg-rose-700 text-white">
                      {stats.expiringSubscriptions}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {stats.expiringSubscriptions > 0
                    ? t("descExpiringSubscriptions", { count: stats.expiringSubscriptions })
                    : t("descNoExpiringSubscriptions")}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            </div>

            {/* System Health */}
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {t("alertSystemHealth")}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t("descSystemHealth")}
                </p>
              </div>
              <Badge className="border-0 bg-emerald-600 hover:bg-emerald-700 text-white">
                {t("statusHealthy")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <Server className="h-4 w-4 text-slate-500" />
              {t("sectionSystemInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {[
                {
                  label: t("infoSystemName"),
                  value: "GHMS",
                  icon: <Globe className="h-3.5 w-3.5 text-slate-400" />,
                },
                {
                  label: t("infoVersion"),
                  value: "1.0",
                  icon: <Settings className="h-3.5 w-3.5 text-slate-400" />,
                },
                {
                  label: t("infoEnvironment"),
                  value:
                    typeof process !== "undefined" && process.env && process.env.NODE_ENV
                      ? String(process.env.NODE_ENV).charAt(0).toUpperCase() +
                        String(process.env.NODE_ENV).slice(1)
                      : "Production",
                  icon: <Server className="h-3.5 w-3.5 text-slate-400" />,
                },
                {
                  label: t("infoStatus"),
                  value: t("statusActive"),
                  icon: <Activity className="h-3.5 w-3.5 text-slate-400" />,
                  badge: true,
                },
              ].map((item, index) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span className="text-sm text-slate-500">
                        {item.label}
                      </span>
                    </div>
                    {item.badge ? (
                      <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {item.value}
                      </Badge>
                    ) : (
                      <span className="text-sm font-medium text-slate-800">
                        {item.value}
                      </span>
                    )}
                  </div>
                  {index < 3 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
