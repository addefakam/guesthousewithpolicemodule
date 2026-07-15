"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { apiPoliceDashboard, apiGetProviders } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  CheckCircle2,
  Clock,
  DoorOpen,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
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

interface RecentGuest {
  id: string;
  name: string;
  phone: string;
  provider: { id: string; name: string } | null;
  createdAt: string;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  PENDING: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200",
  REJECTED: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
  SUSPENDED: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200",
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  PENDING: "Pending",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

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
  const { refreshKey } = useAppStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentGuests, setRecentGuests] = useState<RecentGuest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashData, provData] = await Promise.all([
        apiPoliceDashboard(),
        apiGetProviders(),
      ]);

      setDashboard(dashData);

      // Build recent guests from all providers' guest counts
      // Since police-guests API is available, we don't have a direct "recent registrations" endpoint
      // from the dashboard. We'll use providers' createdAt as a proxy for registration timeline.
      const providers: Provider[] = Array.isArray(provData) ? provData : [];
      setRecentGuests(
        providers.slice(0, 8).map((p) => ({
          id: p.id,
          name: p.name,
          phone: "",
          provider: { id: p.id, name: p.name },
          createdAt: p.createdAt,
        }))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const kpiCards = dashboard
    ? [
        {
          title: "Total Providers",
          value: dashboard.totalProviders,
          icon: Building2,
          color: "text-slate-600",
          bg: "bg-slate-100",
        },
        {
          title: "Approved",
          value: dashboard.providers.filter((p) => p.status === "APPROVED").length,
          icon: CheckCircle2,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          title: "Pending",
          value: dashboard.providers.filter((p) => p.status === "PENDING").length,
          icon: Clock,
          color: "text-yellow-600",
          bg: "bg-yellow-50",
        },
        {
          title: "Total Rooms",
          value: dashboard.totalRooms,
          icon: DoorOpen,
          color: "text-sky-600",
          bg: "bg-sky-50",
        },
        {
          title: "Active Guests",
          value: dashboard.activeReservations,
          icon: Users,
          color: "text-violet-600",
          bg: "bg-violet-50",
        },
        {
          title: "Total Revenue",
          value: formatCurrency(dashboard.revenue),
          icon: DollarSign,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
      ]
    : [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((kpi) => (
              <Card key={kpi.title} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-muted-foreground">{kpi.title}</p>
                      <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Per-Provider Overview Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Provider Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !dashboard?.providers.length ? (
            <div className="flex flex-col items-center py-12 text-center">
              <AlertCircle className="mb-2 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No provider data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Rooms</TableHead>
                    <TableHead className="text-center">Active Reservations</TableHead>
                    <TableHead className="text-right">Monthly Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.providers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_BADGE_CLASS[p.status] || ""}>
                          {STATUS_LABELS[p.status] || p.status}
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
          )}
        </CardContent>
      </Card>

      {/* Recent Registrations */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Recent Provider Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentGuests.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No recent registrations</p>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {recentGuests.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Registered {formatDate(item.createdAt)}</p>
                    </div>
                    <Badge variant="secondary" className="ml-3 shrink-0">
                      {formatDate(item.createdAt)}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}