"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { apiGetReports } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Percent,
  Download,
  BarChart3,
  CalendarDays,
} from "lucide-react";

interface Reservation {
  id: string;
  status: string;
  paidAmount: number;
  checkIn: string;
  guest: { name: string; phone: string };
  room: { number: string; name: string; type: string };
}

interface ExpenseBreakdownItem {
  category: string;
  amount: number;
}

interface DailyRevenueItem {
  date: string;
  amount: number;
}

interface ReportData {
  revenue: number;
  expenses: number;
  profit: number;
  occupancyRate: number;
  reservations: Reservation[];
  expenseBreakdown: ExpenseBreakdownItem[];
  dailyRevenue: DailyRevenueItem[];
}

const EXPENSE_COLORS = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
];

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
  CHECKED_IN: "bg-green-100 text-green-700 border-green-200",
  CHECKED_OUT: "bg-slate-100 text-slate-700 border-slate-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  NO_SHOW: "bg-amber-100 text-amber-700 border-amber-200",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ReportsPage() {
  const { refreshKey } = useAppStore();
  const today = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const result = await apiGetReports(params.toString());
      setData(result);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports, refreshKey]);

  const statusBreakdown = useMemo(() => {
    if (!data?.reservations) return [];
    const map = new Map<string, { count: number; revenue: number }>();
    for (const r of data.reservations) {
      const existing = map.get(r.status) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += r.paidAmount;
      map.set(r.status, existing);
    }
    return Array.from(map.entries()).map(([status, info]) => ({
      status,
      ...info,
    }));
  }, [data]);

  const maxDailyRevenue = useMemo(() => {
    if (!data?.dailyRevenue?.length) return 0;
    return Math.max(...data.dailyRevenue.map((d) => d.amount), 1);
  }, [data]);

  const maxExpenseCategory = useMemo(() => {
    if (!data?.expenseBreakdown?.length) return 0;
    return Math.max(...data.expenseBreakdown.map((e) => e.amount), 1);
  }, [data]);

  const handleExport = () => {
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${from}-to-${to}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            View financial summaries and analytics.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={loading || !data}>
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>
      </div>

      {/* Date Range Picker */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-end gap-4 pt-6">
          <div className="grid gap-2 flex-1 w-full sm:w-auto">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="grid gap-2 flex-1 w-full sm:w-auto">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button onClick={fetchReports} disabled={loading}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Apply
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-rose-600">{formatCurrency(data.expenses)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold ${data.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {formatCurrency(data.profit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Occupancy
                </CardTitle>
                <Percent className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.occupancyRate}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue vs Expenses Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Revenue vs Expenses (Daily)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.dailyRevenue.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No daily data available for this range.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                  {data.dailyRevenue.map((d) => (
                    <div key={d.date} className="flex items-center gap-3 text-sm">
                      <span className="w-24 shrink-0 text-muted-foreground truncate">
                        {d.date}
                      </span>
                      <div className="flex-1 flex items-center gap-1">
                        <div
                          className="h-5 rounded bg-emerald-500 transition-all"
                          style={{
                            width: `${Math.max((d.amount / maxDailyRevenue) * 100, 2)}%`,
                          }}
                          title={`Revenue: ${formatCurrency(d.amount)}`}
                        />
                      </div>
                      <span className="w-20 text-right font-medium">
                        {formatCurrency(d.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown + Reservation Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {data.expenseBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No expenses recorded.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.expenseBreakdown.map((item, i) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{item.category}</span>
                          <span>{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-muted">
                          <div
                            className={`h-3 rounded-full ${EXPENSE_COLORS[i % EXPENSE_COLORS.length]}`}
                            style={{
                              width: `${(item.amount / maxExpenseCategory) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reservations Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Reservations by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {statusBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No reservations in this period.
                  </p>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statusBreakdown.map((row) => (
                          <TableRow key={row.status}>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={STATUS_COLORS[row.status] || ""}
                              >
                                {row.status.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{row.count}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(row.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Revenue Trend Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {data.dailyRevenue.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No daily data available.
                </p>
              ) : (
                <div className="rounded-lg border max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.dailyRevenue.map((d) => (
                        <TableRow key={d.date}>
                          <TableCell>{d.date}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(d.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BarChart3 className="mb-3 h-10 w-10 opacity-40" />
          <p className="font-medium">No report data</p>
          <p className="text-sm">Select a date range and click Apply.</p>
        </div>
      )}
    </div>
  );
}