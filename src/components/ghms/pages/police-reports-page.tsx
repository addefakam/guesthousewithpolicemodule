"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback } from "react";
import { apiPoliceReports } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, UserCheck, UserMinus, AlertTriangle, Building2, BedDouble,
  CalendarDays, RefreshCw, Download, Clock,
  Globe, CreditCard, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// ── Types ──
interface Summary {
  totalGuests: number; totalReservations: number; totalCheckIns: number;
  totalCheckOuts: number; activeGuests: number; totalMatches: number;
  totalProviders: number; totalRooms: number;
}
interface NameCount { name: string; count: number; }
interface ProviderRow { name: string; guests: number; checkIns: number; checkOuts: number; matches: number; rooms: number; }
interface OccupancyRow { name: string; total: number; occupied: number; available: number; reserved: number; maintenance: number; rate: number; }
interface FreqStay { id: string; guestName: string; guestPhone: string; guestIdNumber: string; providerNames: string; stayCount: number; avgDaysBetween: number; riskLevel: string; isReviewed: boolean; createdAt: string; }

interface ReportData {
  period: string; date: string; label: string; startDate: string; endDate: string;
  summary: Summary;
  checkInTrend: { date: string; count: number }[];
  checkOutTrend: { date: string; count: number }[];
  nationalities: NameCount[];
  idTypes: NameCount[];
  providerBreakdown: ProviderRow[];
  suspectSeverities: NameCount[];
  occupancyByProvider: OccupancyRow[];
  peakHours: { hour: string; count: number }[];
  frequentStayAlerts: FreqStay[];
  reservationStatuses: NameCount[];
  providers: { id: string; name: string }[];
}

const COLORS = ["#1e3a5f", "#2563eb", "#7c3aed", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0d9488", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6", "#f59e0b", "#64748b", "#84cc16"];

const STATUS_COLORS: Record<string, string> = { ACTIVE: "#16a34a", UPCOMING: "#2563eb", COMPLETED: "#64748b", CANCELLED: "#dc2626" };

// ── KPI Card ──
function KpiCard({ icon: Icon, label, value, sub, color = "text-primary" }: { icon: React.ElementType; label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{typeof value === "number" ? value.toLocaleString() : value}</p>
            {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className="size-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Inline bar ──
function InlineBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums min-w-[28px] text-right">{value}</span>
    </div>
  );
}

// ── Skeleton ──
function SkeletonGrid() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default function PoliceReportsPage() {
  const { t } = useTranslation("policeReports");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [providerId, setProviderId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiPoliceReports({ period, date, providerId });
      setData(res);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [period, date, providerId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const exportCSV = useCallback(() => {
    if (!data) return;
    const csvHeaders = [t('csvProvider'), t('csvRegisteredGuests'), t('csvCheckIns'), t('csvCheckOuts'), t('csvSuspectMatches'), t('csvRooms')].join(',');
    const nationalityHeader = [t('csvNationality'), t('csvCount')].join(',');
    const severityHeader = [t('csvSeverity'), t('csvCount')].join(',');
    const rows = [csvHeaders];
    for (const p of data.providerBreakdown) {
      rows.push(`"${p.name}",${p.guests},${p.checkIns},${p.checkOuts},${p.matches},${p.rooms}`);
    }
    rows.push("");
    rows.push(nationalityHeader);
    for (const n of data.nationalities) rows.push(`"${n.name}",${n.count}`);
    rows.push("");
    rows.push(severityHeader);
    for (const s of data.suspectSeverities) rows.push(`${s.name},${s.count}`);
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `police-report-${data.period}-${data.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('successCsvExport'));
  }, [data]);

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">{t('pageTitle')}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {data ? data.label : t('pageSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">{t('periodDaily')}</SelectItem>
              <SelectItem value="monthly">{t('periodMonthly')}</SelectItem>
              <SelectItem value="yearly">{t('periodYearly')}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[140px] h-8 text-xs"
          />
          {data && data.providers.length > 0 && (
            <Select value={providerId} onValueChange={(v) => setProviderId(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder={t('allProviders')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">{t('allProviders')}</SelectItem>
                {data.providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} /> {t('refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data} className="h-8 text-xs">
            <Download className="mr-1 h-3 w-3" /> {t('csv')}
          </Button>
        </div>
      </div>

      {loading ? <SkeletonGrid /> : data ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="text-xs gap-1.5 h-8"><BarChart3 className="size-3.5" /> {t('tabOverview')}</TabsTrigger>
            <TabsTrigger value="occupancy" className="text-xs gap-1.5 h-8"><BedDouble className="size-3.5" /> {t('tabOccupancy')}</TabsTrigger>
            <TabsTrigger value="demographics" className="text-xs gap-1.5 h-8"><Globe className="size-3.5" /> {t('tabDemographics')}</TabsTrigger>
            <TabsTrigger value="providers" className="text-xs gap-1.5 h-8"><Building2 className="size-3.5" /> {t('tabProviders')}</TabsTrigger>
          </TabsList>

          {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={Users} label={t('kpiRegisteredGuests')} value={data.summary.totalGuests} sub={providerId ? t('kpiInSelectedProvider') : t('kpiAcrossProviders', { count: data.summary.totalProviders })} />
              <KpiCard icon={UserCheck} label={t('kpiCheckIns')} value={data.summary.totalCheckIns} sub={`${data.summary.activeGuests} ${t('kpiCurrentlyActive')}`} />
              <KpiCard icon={UserMinus} label={t('kpiCheckOuts')} value={data.summary.totalCheckOuts} sub={`${data.summary.totalReservations} ${t('kpiTotalReservations')}`} />
              <KpiCard icon={AlertTriangle} label={t('kpiSuspectMatches')} value={data.summary.totalMatches} color={data.summary.totalMatches > 0 ? "text-red-600" : "text-emerald-600"} sub={data.summary.totalMatches > 0 ? t('kpiRequiresAttention') : t('kpiNoAlerts')} />
            </div>

            {/* Charts row */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Reservation status pie */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="size-4" /> {t('reservationStatus')}</CardTitle></CardHeader>
                <CardContent>
                  {data.reservationStatuses.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={data.reservationStatuses}
                          dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}
                        >
                          {data.reservationStatuses.map((entry, i) => (
                            <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{t('emptyReservations')}</div>
                  )}
                </CardContent>
              </Card>

              {/* Peak hours bar (daily/monthly only) */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="size-4" /> {data.peakHours.length > 0 ? t('peakCheckInHours') : t('checkInSummary')}</CardTitle></CardHeader>
                <CardContent>
                  {data.peakHours.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data.peakHours}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Bar dataKey="count" name={t('legendCheckIns')} fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{t('emptyHourlyData')}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Frequent stay alerts */}
            {data.frequentStayAlerts.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="size-4" /> {t('frequentStayAlerts')}</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('thguest', 'Guest')}</TableHead>
                        <TableHead>{t('thphoneId', 'Phone / ID')}</TableHead>
                        <TableHead>{t('thstays', 'Stays')}</TableHead>
                        <TableHead>{t('thavgDays', 'Avg Days')}</TableHead>
                        <TableHead>{t('thrisk', 'Risk')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.frequentStayAlerts.slice(0, 10).map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="text-xs font-medium">{f.guestName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{f.guestPhone || f.guestIdNumber}</TableCell>
                          <TableCell className="text-xs text-center font-semibold">{f.stayCount}</TableCell>
                          <TableCell className="text-xs text-center">{f.avgDaysBetween.toFixed(1)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] font-semibold ${f.riskLevel === "HIGH" ? "border-red-300 text-red-700 bg-red-50" : f.riskLevel === "MEDIUM" ? "border-amber-300 text-amber-700 bg-amber-50" : "border-slate-300 text-slate-600 bg-slate-50"}`}>
                              {t('risk_' + f.riskLevel)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════════ OCCUPANCY TAB ═══════════════ */}
          <TabsContent value="occupancy" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard icon={Building2} label={t('kpiTotalProviders')} value={data.summary.totalProviders} />
              <KpiCard icon={BedDouble} label={t('kpiTotalRooms')} value={data.summary.totalRooms} />
              <KpiCard icon={Users} label={t('kpiActiveGuests')} value={data.summary.activeGuests} sub={t('kpiCurrentlyCheckedIn')} />
            </div>

            {data.occupancyByProvider.length > 0 ? (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{t('occupancyByProvider')}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(250, data.occupancyByProvider.length * 40)}>
                    <BarChart data={data.occupancyByProvider} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="rate" name={t('occupancyPercent')} fill="#2563eb" radius={[0, 4, 4, 0]}>
                        {data.occupancyByProvider.map((entry, i) => (
                          <Cell key={i} fill={entry.rate > 80 ? "#dc2626" : entry.rate > 50 ? "#ca8a04" : "#16a34a"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : providerId ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{t('occupancyProviderHint')}</CardContent></Card>
            ) : null}

            {/* Occupancy table */}
            {data.occupancyByProvider.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{t('roomStatusBreakdown')}</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('thprovider', 'Provider')}</TableHead>
                        <TableHead>{t('thtotal', 'Total')}</TableHead>
                        <TableHead>{t('thoccupied', 'Occupied')}</TableHead>
                        <TableHead>{t('thavailable', 'Available')}</TableHead>
                        <TableHead>{t('threserved', 'Reserved')}</TableHead>
                        <TableHead>{t('thmaint', 'Maint.')}</TableHead>
                        <TableHead>{t('thrate', 'Rate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.occupancyByProvider.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{p.name}</TableCell>
                          <TableCell className="text-xs text-center">{p.total}</TableCell>
                          <TableCell className="text-xs text-center font-semibold text-red-600">{p.occupied}</TableCell>
                          <TableCell className="text-xs text-center text-emerald-600">{p.available}</TableCell>
                          <TableCell className="text-xs text-center text-blue-600">{p.reserved}</TableCell>
                          <TableCell className="text-xs text-center text-amber-600">{p.maintenance}</TableCell>
                          <TableCell className="text-xs text-center">
                            <Badge variant="outline" className={`text-[10px] font-semibold ${p.rate > 80 ? "border-red-300 text-red-700" : p.rate > 50 ? "border-amber-300 text-amber-700" : "border-emerald-300 text-emerald-700"}`}>
                              {p.rate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════════ DEMOGRAPHICS TAB ═══════════════ */}
          <TabsContent value="demographics" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Nationality pie */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Globe className="size-4" /> {t('nationalityDistribution')}</CardTitle></CardHeader>
                <CardContent>
                  {data.nationalities.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={data.nationalities} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
                          {data.nationalities.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">{t('emptyNationality')}</div>
                  )}
                </CardContent>
              </Card>

              {/* ID type distribution */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CreditCard className="size-4" /> {t('idTypeDistribution')}</CardTitle></CardHeader>
                <CardContent>
                  {data.idTypes.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={data.idTypes} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={100} paddingAngle={3}>
                          {data.idTypes.map((_, i) => (
                            <Cell key={i} fill={COLORS[(i + 5) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">{t('emptyIdType')}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Nationality table */}
            {data.nationalities.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{t('nationalityBreakdown')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.nationalities.map((n, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6 text-right">{i + 1}.</span>
                        <span className="text-xs font-medium w-36 truncate">{n.name}</span>
                        <InlineBar value={n.count} max={data.nationalities[0].count} color="bg-primary" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════════ PROVIDERS TAB ═══════════════ */}
          <TabsContent value="providers" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{t('providerActivitySummary')}</CardTitle></CardHeader>
              <CardContent>
                {data.providerBreakdown.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('thkey', '#')}</TableHead>
                        <TableHead>{t('thprovider', 'Provider')}</TableHead>
                        <TableHead>{t('throoms', 'Rooms')}</TableHead>
                        <TableHead>{t('thguests', 'Guests')}</TableHead>
                        <TableHead>{t('thcheckins', 'Check-Ins')}</TableHead>
                        <TableHead>{t('thcheckouts', 'Check-Outs')}</TableHead>
                        <TableHead>{t('thsuspectMatches', 'Suspect Matches')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.providerBreakdown.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{p.name}</TableCell>
                          <TableCell className="text-xs text-center">{p.rooms}</TableCell>
                          <TableCell className="text-xs text-center font-semibold">{p.guests}</TableCell>
                          <TableCell className="text-xs text-center text-blue-600">{p.checkIns}</TableCell>
                          <TableCell className="text-xs text-center text-emerald-600">{p.checkOuts}</TableCell>
                          <TableCell className="text-xs text-center">
                            {p.matches > 0 ? (
                              <Badge variant="outline" className="text-[10px] font-semibold border-red-300 text-red-700 bg-red-50">{p.matches}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">{t('emptyProviderData')}</div>
                )}
              </CardContent>
            </Card>

            {/* Provider guests bar chart */}
            {data.providerBreakdown.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{t('guestsByProvider')}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, data.providerBreakdown.length * 35)}>
                    <BarChart data={data.providerBreakdown} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="guests" name={t('legendGuests')} fill="#2563eb" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="checkIns" name={t('legendCheckIns')} fill="#16a34a" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="matches" name={t('legendSuspectMatches')} fill="#dc2626" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
