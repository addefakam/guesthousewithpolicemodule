'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BedDouble,
  DollarSign,
  Users,
  Clock,
  DoorOpen,
  TrendingDown,
  PlusCircle,
  UserPlus,
  CalendarCheck,
  Sparkles,
  Receipt,
  FileBarChart,
  Activity,
  LogIn,
  LogOut,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboard, getReservations } from '@/lib/api';
import { useAppStore, type Page } from '@/lib/store';
import { toast } from 'sonner';
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
} from 'recharts';

interface DashboardData {
  occupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  todayRevenue: number;
  activeGuests: number;
  pendingPaymentsAmount: number;
  pendingPaymentsCount: number;
  todayExpenses: number;
  todayCheckins: number;
  last7DaysRevenue: { date: string; revenue: number }[];
  recentActivity: { id: string; message: string; type: string; createdAt: string }[];
}

interface TodaySchedule {
  id: string;
  guest: { name: string };
  room: { number: string };
  checkIn: string;
  checkOut: string;
  status: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getActivityDotColor(type: string): string {
  switch (type) {
    case 'SUCCESS':
      return 'bg-emerald-500';
    case 'WARNING':
      return 'bg-amber-500';
    case 'ERROR':
      return 'bg-rose-500';
    default:
      return 'bg-blue-500';
  }
}

const kpiConfigs = [
  {
    key: 'occupancyRate' as const,
    label: 'Occupancy Rate',
    subtitle: 'of rooms occupied',
    icon: BedDouble,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    suffix: '%',
  },
  {
    key: 'todayRevenue' as const,
    label: "Today's Revenue",
    subtitle: 'from rooms & services',
    icon: DollarSign,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    prefix: 'ETB ',
  },
  {
    key: 'activeGuests' as const,
    label: 'Active Guests',
    subtitle: 'currently staying',
    icon: Users,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    key: 'pendingPaymentsAmount' as const,
    label: 'Pending Payments',
    subtitle: 'p:pendingPaymentsCount unpaid',
    icon: Clock,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    prefix: 'ETB ',
  },
  {
    key: 'availableRooms' as const,
    label: 'Available Rooms',
    subtitle: 'ready for booking',
    icon: DoorOpen,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    key: 'todayExpenses' as const,
    label: "Today's Expenses",
    subtitle: 'operational costs',
    icon: TrendingDown,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    prefix: 'ETB ',
  },
];

const quickActions: { label: string; icon: typeof PlusCircle; page: Page }[] = [
  { label: 'Add Room', icon: DoorOpen, page: 'rooms' },
  { label: 'Add Guest', icon: UserPlus, page: 'guests' },
  { label: 'New Reservation', icon: CalendarCheck, page: 'reservations' },
  { label: 'Book Service', icon: Sparkles, page: 'daytime' },
  { label: 'Add Expense', icon: Receipt, page: 'expenses' },
  { label: 'Generate Report', icon: FileBarChart, page: 'reports' },
];

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7'];

export default function DashboardPage() {
  const { refreshKey, setCurrentPage } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [schedule, setSchedule] = useState<TodaySchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashData, reservations] = await Promise.all([
        getDashboard(),
        getReservations(),
      ]);
      setData(dashData);

      const today = new Date().toISOString().split('T')[0];
      const todaySchedule = (reservations as TodaySchedule[]).filter(
        (r) => r.checkIn === today || r.checkOut === today
      );
      setSchedule(todaySchedule);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const getKpiValue = (key: string, value: number, cfg: typeof kpiConfigs[0]) => {
    if (cfg.prefix) return `${formatCurrency(value)}`;
    if (cfg.suffix) return `${value}${cfg.suffix}`;
    if (key === 'pendingPaymentsAmount') return formatCurrency(value);
    return value.toLocaleString();
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Pie chart data
  const pieData = [
    { name: 'Available', value: data.availableRooms },
    { name: 'Occupied', value: data.occupiedRooms },
    { name: 'Maintenance', value: data.totalRooms - data.availableRooms - data.occupiedRooms },
  ].filter((d) => d.value > 0);

  // Bar chart data
  const barData = data.last7DaysRevenue.map((d) => ({
    day: formatDate(d.date),
    revenue: d.revenue,
  }));

  const checkIns = schedule.filter((s) => s.checkIn === today.toISOString().split('T')[0]);
  const checkOuts = schedule.filter((s) => s.checkOut === today.toISOString().split('T')[0]);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpiConfigs.map((cfg) => {
          const Icon = cfg.icon;
          const rawValue = data[cfg.key] as number;
          let displayValue: string;
          if (cfg.key === 'pendingPaymentsAmount') {
            displayValue = formatCurrency(rawValue);
          } else if (cfg.key === 'todayRevenue' || cfg.key === 'todayExpenses') {
            displayValue = formatCurrency(rawValue);
          } else if (cfg.suffix) {
            displayValue = `${rawValue}${cfg.suffix}`;
          } else {
            displayValue = rawValue.toLocaleString();
          }

          return (
            <Card
              key={cfg.key}
              className="border-border/50 transition-all duration-200 hover:border-border hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`rounded-lg p-2 ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {displayValue}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-foreground/80">{cfg.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {cfg.key === 'pendingPaymentsAmount'
                      ? `${data.pendingPaymentsCount} unpaid`
                      : cfg.subtitle}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Bar Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
            <CardDescription>Last 7 days performance</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2 32.6% 17.5%)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'hsl(215 20.2% 65.1%)', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(217.2 32.6% 17.5%)' }}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(215 20.2% 65.1%)', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(217.2 32.6% 17.5%)' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222.2 84% 6.9%)',
                      border: '1px solid hsl(217.2 32.6% 17.5%)',
                      borderRadius: '8px',
                      color: 'hsl(210 40% 98%)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Room Occupancy Pie Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Room Occupancy</CardTitle>
            <CardDescription>
              {data.occupiedRooms} of {data.totalRooms} rooms in use
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222.2 84% 6.9%)',
                      border: '1px solid hsl(217.2 32.6% 17.5%)',
                      borderRadius: '8px',
                      color: 'hsl(210 40% 98%)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.page}
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4 border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
                  onClick={() => setCurrentPage(action.page)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row: Activity + Today's Schedule */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                data.recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="mt-1.5 flex-shrink-0">
                      <div className={`h-2 w-2 rounded-full ${getActivityDotColor(item.type)}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground leading-snug">{item.message}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatTimeAgo(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Check-ins & Check-outs */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Today&apos;s Schedule</CardTitle>
            <CardDescription>
              {checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''} &middot;{' '}
              {checkOuts.length} check-out{checkOuts.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {schedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No check-ins or check-outs today</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Guest</TableHead>
                      <TableHead className="text-xs">Room</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkIns.map((item) => (
                      <TableRow key={`in-${item.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-xs">Check-in</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {item.guest.name}
                        </TableCell>
                        <TableCell className="text-xs">{item.room.number}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-emerald-500/50 text-emerald-400"
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {checkOuts.map((item) => (
                      <TableRow key={`out-${item.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <LogOut className="h-3.5 w-3.5 text-orange-500" />
                            <span className="text-xs">Check-out</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {item.guest.name}
                        </TableCell>
                        <TableCell className="text-xs">{item.room.number}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-orange-500/50 text-orange-400"
                          >
                            {item.status}
                          </Badge>
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
    </div>
  );
}