'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  FileDown,
  Printer,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BedDouble,
  Sparkles,
  Receipt,
  Users,
  Moon,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { getReports } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface ReportData {
  period: { from: string; to: string };
  roomRevenue: number;
  serviceRevenue: number;
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  occupancyRate: number;
  reservationCount: number;
  uniqueGuests: number;
  totalNights: number;
  revenueByRoomType: Record<string, number>;
  expensesByCategory: Record<string, number>;
  dailyBreakdown: Array<{ date: string; revenue: number; expenses: number }>;
}

const PIE_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#06b6d4', '#ec4899'];

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function getQuickDates(period: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');

  switch (period) {
    case 'daily':
      return { from: `${y}-${pad(m + 1)}-${pad(d)}`, to: `${y}-${pad(m + 1)}-${pad(d)}` };
    case 'weekly': {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(d - ((dayOfWeek + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        from: `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`,
        to: `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`,
      };
    }
    case 'monthly':
      return {
        from: `${y}-${pad(m + 1)}-01`,
        to: `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`,
      };
    case 'yearly':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    default:
      return {
        from: `${y}-${pad(m + 1)}-01`,
        to: `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`,
      };
  }
}

export default function ReportsPage() {
  const { currentUser } = useAppStore();
  const currency = 'ETB';

  const now = new Date();
  const [fromDate, setFromDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  );
  const [toDate, setToDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
  );
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReports(fromDate, toDate);
      setReport(data);
    } catch {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleQuickPeriod = (period: string) => {
    const dates = getQuickDates(period);
    setFromDate(dates.from);
    setToDate(dates.to);
  };

  const handleExportCSV = async () => {
    try {
      const data = await getReports(fromDate, toDate);
      const rows = [
        ['Report Period', `${data.period.from} to ${data.period.to}`],
        [],
        ['Metric', 'Value'],
        ['Gross Revenue', data.grossRevenue],
        ['Net Profit', data.netProfit],
        ['Room Revenue', data.roomRevenue],
        ['Service Revenue', data.serviceRevenue],
        ['Total Expenses', data.totalExpenses],
        ['Occupancy Rate', `${data.occupancyRate}%`],
        ['Total Reservations', data.reservationCount],
        ['Unique Guests', data.uniqueGuests],
        ['Total Guest-Nights', data.totalNights],
        [],
        ['Revenue by Room Type'],
        ...Object.entries(data.revenueByRoomType).map(([k, v]) => [k, v]),
        [],
        ['Expenses by Category'],
        ...Object.entries(data.expensesByCategory).map(([k, v]) => [k, v]),
        [],
        ['Daily Breakdown'],
        ['Date', 'Revenue', 'Expenses'],
        ...data.dailyBreakdown.map((d) => [d.date, d.revenue, d.expenses]),
      ];
      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${fromDate}-to-${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const handlePrint = () => window.print();

  const pieData = report
    ? Object.entries(report.expensesByCategory).map(([name, value]) => ({ name, value }))
    : [];

  const roomTypeData = report
    ? Object.entries(report.revenueByRoomType).map(([name, value]) => ({ name, value }))
    : [];

  const kpis = report
    ? [
        { label: 'Gross Revenue', value: fmt(report.grossRevenue), icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { label: 'Net Profit', value: fmt(report.netProfit), icon: report.netProfit >= 0 ? TrendingUp : TrendingDown, color: report.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400', bg: report.netProfit >= 0 ? 'bg-emerald-400/10' : 'bg-red-400/10' },
        { label: 'Room Revenue', value: fmt(report.roomRevenue), icon: BedDouble, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Service Revenue', value: fmt(report.serviceRevenue), icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        { label: 'Total Expenses', value: fmt(report.totalExpenses), icon: Receipt, color: 'text-red-400', bg: 'bg-red-400/10' },
        { label: 'Avg Occupancy', value: `${report.occupancyRate}%`, icon: Moon, color: 'text-orange-400', bg: 'bg-orange-400/10' },
      ]
    : [];

  const stats = report
    ? [
        { label: 'Total Reservations', value: report.reservationCount, icon: CalendarDays, color: 'text-amber-400' },
        { label: 'Unique Guests', value: report.uniqueGuests, icon: Users, color: 'text-emerald-400' },
        { label: 'Total Guest-Nights', value: report.totalNights, icon: Moon, color: 'text-purple-400' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-lg">Reports & Analytics</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {report ? `${report.period.from} — ${report.period.to}` : 'Select a date range'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleExportCSV} title="Export CSV">
                <FileDown className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrint} title="Print">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">From</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">To</label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <Button onClick={fetchReport} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
                <Button key={p} variant="outline" size="sm" onClick={() => handleQuickPeriod(p)}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && !report && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {report && (
        <>
          {/* KPI Summary */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                      <p className={`text-sm font-bold ${kpi.color} truncate`}>{kpi.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <Card key={s.label} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <s.icon className={`h-8 w-8 ${s.color}`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Revenue vs Expenses Bar Chart */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {report.dailyBreakdown.length > 0 ? (
                  <ChartContainer
                    config={{
                      revenue: { label: 'Revenue', color: '#f59e0b' },
                      expenses: { label: 'Expenses', color: '#ef4444' },
                    }}
                    className="h-[300px] w-full"
                  >
                    <BarChart data={report.dailyBreakdown} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2 32.6% 17.5%)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'hsl(215 20.2% 65.1%)' }}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(215 20.2% 65.1%)' }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No daily data available</p>
                )}
              </CardContent>
            </Card>

            {/* Expense Breakdown Doughnut */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ChartContainer
                    config={Object.fromEntries(pieData.map((d, i) => [d.name, { label: d.name, color: PIE_COLORS[i % PIE_COLORS.length] }]))}
                    className="h-[300px] w-full"
                  >
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: 'hsl(215 20.2% 65.1%)' }}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No expense data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Two-column: Revenue Breakdown + Expense Breakdown by Category */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Revenue Breakdown */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Room Revenue', value: report.roomRevenue, color: 'text-blue-400' },
                  { label: 'Service Revenue', value: report.serviceRevenue, color: 'text-purple-400' },
                  { label: 'Gross Revenue', value: report.grossRevenue, color: 'text-amber-400', bold: true },
                  { label: 'Total Expenses', value: report.totalExpenses, color: 'text-red-400' },
                  { label: 'Net Profit', value: report.netProfit, color: report.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400', bold: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                    <span className={`text-sm ${item.bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {item.label}
                    </span>
                    <span className={`text-sm font-semibold ${item.color}`}>{fmt(item.value)} {currency}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Expense Breakdown by Category */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Expense Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(report.expensesByCategory).length > 0 ? (
                  Object.entries(report.expensesByCategory).map(([cat, val]) => {
                    const pct = report.totalExpenses > 0 ? (val / report.totalExpenses) * 100 : 0;
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{cat}</span>
                          <span className="font-semibold text-foreground">
                            {fmt(val)} {currency}
                            <span className="ml-2 text-xs text-muted-foreground">({pct.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-red-400/70 transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-4">No expenses recorded</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Room Type */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Revenue by Room Type</CardTitle>
            </CardHeader>
            <CardContent>
              {roomTypeData.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {roomTypeData.map((rt, i) => (
                    <div key={rt.name} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-sm text-muted-foreground">{rt.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{fmt(rt.value)} {currency}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No room revenue data</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}