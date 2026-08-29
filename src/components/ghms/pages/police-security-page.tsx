"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { apiPoliceAuditLogs, apiPoliceGeofences, apiPoliceCreateGeofence, apiPoliceDeleteGeofence, apiPoliceOfficers, apiPoliceCreateOfficer, apiPoliceUpdateOfficer, apiPoliceDeleteOfficer } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/pagination-controls";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, MapPin, RefreshCw, Activity, UserCog, UserPlus,
} from "lucide-react";

interface AuditLog { id: string; officerName: string; action: string; targetId: string | null; targetType: string | null; ipAddress: string | null; createdAt: string; }
interface Geofence { id: string; name: string; address: string; latitude: number; longitude: number; radius: number; severity: string; isActive: boolean; createdAt: string; }
interface Officer { id: string; username: string; name: string; role: string; permissions: string; providerId: string | null; createdAt: string; }

export default function PoliceSecurityPage() {
  const { t } = useTranslation("security");

  const getTabLabel = (val: string) => {
    const map: Record<string, string> = {
      audit: t('tabsAudit'),
      geofence: t('tabsGeofence'),
      officers: t('tabsOfficers'),
    };
    return map[val] || val;
  };

  const getActionLabel = (val: string) => {
    const map: Record<string, string> = {
      VIEWED_GUEST: t('actionLabelsViewedGuest'),
      VIEWED_MATCH: t('actionLabelsViewedMatch'),
      EXPORTED_DATA: t('actionLabelsExportedData'),
      OFFICER_LOGIN: t('actionLabelsOfficerLogin'),
      SCANNED_WATCHLIST: t('actionLabelsScannedWatchlist'),
    };
    return map[val] || val;
  };

  const getRankLabel = (val: string) => {
    const map: Record<string, string> = {
      ADMIN: t('rankAdmin'),
      DETECTIVE: t('rankDetective'),
      OFFICER: t('rankOfficer'),
      VIEWER: t('rankViewer'),
    };
    return map[val] || val;
  };

  const { refreshKey } = useAppStore();
  const [activeTab, setActiveTab] = useState<"audit" | "geofence" | "officers">("audit");

  // Audit
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const auditPag = usePagination({ totalItems: auditTotal, initialPageSize: 20, pageSizeOptions: [10, 20, 50, 100] });
  const pagAudit = auditPag.paginate(auditLogs);

  const fetchAudit = useCallback(async () => {
    try {
      setAuditLoading(true);
      const params = new URLSearchParams({ page: String(auditPag.currentPage), pageSize: String(auditPag.pageSize) });
      if (actionFilter) params.set("action", actionFilter);
      const d: any = await apiPoliceAuditLogs(params.toString());
      setAuditLogs(d.logs || []);
      setAuditTotal(d.total || 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('errorLoadAudit');
      toast.error(msg);
    }
    finally { setAuditLoading(false); }
  }, [auditPag.currentPage, auditPag.pageSize, actionFilter]);

  // Geofences
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [geoLoading, setGeoLoading] = useState(true);
  const [showGeoForm, setShowGeoForm] = useState(false);
  const [geoForm, setGeoForm] = useState({ name: "", address: "", latitude: "", longitude: "", radius: "1000", severity: "HIGH" });
  const [geoSaving, setGeoSaving] = useState(false);

  // Officers
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [officersLoading, setOfficersLoading] = useState(true);
  const [showOfficerForm, setShowOfficerForm] = useState(false);
  const [officerForm, setOfficerForm] = useState({ username: "", password: "", name: "", policeRank: "OFFICER" });
  const [officerSaving, setOfficerSaving] = useState(false);

  useEffect(() => { fetchAudit(); }, [fetchAudit, refreshKey]);

  const fetchGeo = useCallback(async () => {
    try { setGeoLoading(true); const d = await apiPoliceGeofences(); setGeofences(Array.isArray(d) ? d : []); }
    catch { toast.error(t('errorLoadGeofences')); }
    finally { setGeoLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === "geofence") fetchGeo(); if (activeTab === "officers") fetchOfficers(); }, [activeTab, fetchGeo, refreshKey]);

  const createGeofence = async () => {
    if (!geoForm.name) { toast.error(t('errorNameRequired')); return; }
    try {
      setGeoSaving(true);
      await apiPoliceCreateGeofence({ ...geoForm, latitude: parseFloat(geoForm.latitude), longitude: parseFloat(geoForm.longitude), radius: parseInt(geoForm.radius) });
      toast.success(t('successGeofenceCreated'));
      setShowGeoForm(false);
      setGeoForm({ name: "", address: "", latitude: "", longitude: "", radius: "1000", severity: "HIGH" });
      fetchGeo();
    } catch { toast.error(t('errorCreateGeofence')); }
    finally { setGeoSaving(false); }
  };

  const deleteGeofence = async (id: string) => {
    try { await apiPoliceDeleteGeofence(id); toast.success(t('successGeofenceDeleted')); fetchGeo(); }
    catch { toast.error(t('errorDelete')); }
  };

  const fetchOfficers = useCallback(async () => {
    try { setOfficersLoading(true); const d = await apiPoliceOfficers(); setOfficers(Array.isArray(d) ? d : []); }
    catch { toast.error(t('errorLoadOfficers')); }
    finally { setOfficersLoading(false); }
  }, []);

  const createOfficer = async () => {
    if (!officerForm.username || !officerForm.password || !officerForm.name) { toast.error(t('errorAllFieldsRequired')); return; }
    try {
      setOfficerSaving(true);
      await apiPoliceCreateOfficer(officerForm);
      toast.success(t('successOfficerCreated'));
      setShowOfficerForm(false);
      setOfficerForm({ username: "", password: "", name: "", policeRank: "OFFICER" });
      fetchOfficers();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('errorCreateOfficer')); }
    finally { setOfficerSaving(false); }
  };

  const updateOfficerRank = async (id: string, rank: string) => {
    try {
      await apiPoliceUpdateOfficer(id, { policeRank: rank });
      toast.success(t('successRankUpdated'));
      fetchOfficers();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('errorUpdateRank')); }
  };

  const deleteOfficer = async (id: string) => {
    if (!confirm(t('confirmDeleteOfficer'))) return;
    try { await apiPoliceDeleteOfficer(id); toast.success(t('successOfficerDeleted')); fetchOfficers(); }
    catch { toast.error(t('errorDeleteOfficer')); }
  };

  const tabs = [
    { key: "audit" as const, icon: Activity },
    { key: "geofence" as const, icon: MapPin },
    { key: "officers" as const, icon: UserCog },
  ];

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">{t('pageTitle')}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{t('pageSubtitle')}</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/50 p-0.5">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap " + (activeTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            <tab.icon className="h-3.5 w-3.5" /> {getTabLabel(tab.key)}
          </button>
        ))}
      </div>

      {/* Audit Trail */}
      {activeTab === "audit" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}>
              <SelectTrigger size="sm" className="h-8 w-[150px] text-xs"><SelectValue placeholder={t('filterAction')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allActions')}</SelectItem>
                <SelectItem value="VIEW_GUEST">{getActionLabel('VIEWED_GUEST')}</SelectItem>
                <SelectItem value="VIEW_MATCH">{getActionLabel('VIEWED_MATCH')}</SelectItem>
                <SelectItem value="EXPORT_DATA">{getActionLabel('EXPORTED_DATA')}</SelectItem>
                <SelectItem value="SCAN_WATCHLIST">{getActionLabel('SCANNED_WATCHLIST')}</SelectItem>
                <SelectItem value="LOGIN">{t('login')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-0">
              {auditLoading ? <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : (
                <div className="divide-y">
                  {pagAudit.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-3 sm:px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="secondary" className="text-[9px] shrink-0">{getActionLabel(a.action)}</Badge>
                        <p className="text-xs truncate">{a.officerName || t('system')}</p>
                        {a.targetId && <span className="text-[10px] text-muted-foreground hidden sm:inline">{a.targetType}: {a.targetId.slice(0, 8)}...</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.ipAddress && <span className="text-[10px] text-muted-foreground hidden sm:inline">{a.ipAddress}</span>}
                        <span className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <PaginationControls currentPage={auditPag.currentPage} totalPages={auditPag.totalPages} pageSize={auditPag.pageSize} pageSizeOptions={auditPag.pageSizeOptions} totalItems={auditTotal} rangeInfo={auditPag.rangeInfo} goToPage={auditPag.goToPage} setPageSize={auditPag.setPageSize} />
        </div>
      )}

      {/* Geofencing */}
      {activeTab === "geofence" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowGeoForm(!showGeoForm)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> {showGeoForm ? t('cancel') : t('addZone')}
            </Button>
          </div>

          {showGeoForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm">{t('newGeofenceTitle')}</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t('lblzoneName', 'Zone Name')} *</Label><Input value={geoForm.name} onChange={(e) => setGeoForm({ ...geoForm, name: e.target.value })} placeholder={t('placeholderZoneName')} /></div>
                <div className="space-y-1.5"><Label>{t('lbladdress', 'Address')}</Label><Input value={geoForm.address} onChange={(e) => setGeoForm({ ...geoForm, address: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t('lbllatitude', 'Latitude')} *</Label><Input type="number" step="0.0001" value={geoForm.latitude} onChange={(e) => setGeoForm({ ...geoForm, latitude: e.target.value })} placeholder="9.0250" /></div>
                <div className="space-y-1.5"><Label>{t('lbllongitude', 'Longitude')} *</Label><Input type="number" step="0.0001" value={geoForm.longitude} onChange={(e) => setGeoForm({ ...geoForm, longitude: e.target.value })} placeholder="38.7469" /></div>
                <div className="space-y-1.5"><Label>{t('lblradiusMeters', 'Radius (meters)')}</Label><Input type="number" value={geoForm.radius} onChange={(e) => setGeoForm({ ...geoForm, radius: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>{t('lblseverity', 'Severity')}</Label>
                  <Select value={geoForm.severity} onValueChange={(v) => setGeoForm({ ...geoForm, severity: v })}>
                    <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRITICAL">{t('severityCritical')}</SelectItem>
                      <SelectItem value="HIGH">{t('severityHigh')}</SelectItem>
                      <SelectItem value="MEDIUM">{t('severityMedium')}</SelectItem>
                      <SelectItem value="LOW">{t('severityLow')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button size="sm" onClick={createGeofence} disabled={geoSaving}><RefreshCw className={"mr-1 h-3.5 w-3.5 " + (geoSaving ? "animate-spin" : "")} /> {geoSaving ? t('saving') : t('createZone')}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              {geoLoading ? <Skeleton className="h-24 w-full" /> : geofences.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">{t('emptyGeofences')}</p>
              ) : (
                <div className="divide-y">
                  {geofences.map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-3 sm:px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{g.name}</p>
                          <div className="flex gap-2 text-[10px] text-muted-foreground">
                            <span>{g.latitude.toFixed(4)}, {g.longitude.toFixed(4)}</span>
                            <span>{t('radiusDisplay', { m: g.radius })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[9px] bg-red-100 text-red-800 border-red-200">{t('severity_' + g.severity)}</Badge>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => deleteGeofence(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Officers Management */}
      {activeTab === "officers" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">{t('officersDescription')}</p>
            <Button size="sm" onClick={() => setShowOfficerForm(!showOfficerForm)}>
              <UserPlus className="mr-1 h-3.5 w-3.5" /> {showOfficerForm ? t('cancel') : t('addOfficer')}
            </Button>
          </div>

          {showOfficerForm && (
            <Card>
              <CardHeader><CardTitle className="text-sm">{t('newOfficerTitle')}</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t('lblusername', 'Username')} *</Label><Input value={officerForm.username} onChange={(e) => setOfficerForm({ ...officerForm, username: e.target.value })} placeholder={t('placeholderUsername')} /></div>
                <div className="space-y-1.5"><Label>{t('lblpassword', 'Password')} *</Label><Input type="password" value={officerForm.password} onChange={(e) => setOfficerForm({ ...officerForm, password: e.target.value })} placeholder={t('placeholderPassword')} /></div>
                <div className="space-y-1.5"><Label>{t('lblfullName', 'Full Name')} *</Label><Input value={officerForm.name} onChange={(e) => setOfficerForm({ ...officerForm, name: e.target.value })} placeholder={t('placeholderOfficerName')} /></div>
                <div className="space-y-1.5">
                  <Label>{t('lblrank', 'Rank')}</Label>
                  <Select value={officerForm.policeRank} onValueChange={(v) => setOfficerForm({ ...officerForm, policeRank: v })}>
                    <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">{t('rankAdminFull')}</SelectItem>
                      <SelectItem value="DETECTIVE">{t('rankDetectiveDesc')}</SelectItem>
                      <SelectItem value="OFFICER">{t('rankOfficerDesc')}</SelectItem>
                      <SelectItem value="VIEWER">{t('rankViewerDesc')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button size="sm" onClick={createOfficer} disabled={officerSaving}><RefreshCw className={"mr-1 h-3.5 w-3.5 " + (officerSaving ? "animate-spin" : "")} /> {officerSaving ? t('creating') : t('createOfficer')}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              {officersLoading ? <Skeleton className="h-24 w-full" /> : officers.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">{t('emptyOfficers')}</p>
              ) : (
                <div className="divide-y">
                  {officers.map((o) => {
                    let rank = "OFFICER";
                    try { const perms = JSON.parse(o.permissions || "[]"); const rankPerm = perms.find((p: string) => p.startsWith("police_rank:")); if (rankPerm) rank = rankPerm.replace("police_rank:", ""); } catch {}
                    const rankColors: Record<string, string> = { ADMIN: "bg-amber-100 text-amber-800 border-amber-200", DETECTIVE: "bg-violet-100 text-violet-800 border-violet-200", OFFICER: "bg-sky-100 text-sky-800 border-sky-200", VIEWER: "bg-slate-100 text-slate-600 border-slate-200" };
                    return (
                      <div key={o.id} className="flex items-center justify-between p-3 sm:px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <UserCog className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{o.name}</p>
                            <div className="flex gap-2 text-[10px] text-muted-foreground">
                              <span>@{o.username}</span>
                              <span>{t('joined', { date: new Date(o.createdAt).toLocaleDateString() })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Select defaultValue={rank} onValueChange={(v) => updateOfficerRank(o.id, v)}>
                            <SelectTrigger className="h-7 w-[110px] text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">{getRankLabel('ADMIN')}</SelectItem>
                              <SelectItem value="DETECTIVE">{getRankLabel('DETECTIVE')}</SelectItem>
                              <SelectItem value="OFFICER">{getRankLabel('OFFICER')}</SelectItem>
                              <SelectItem value="VIEWER">{getRankLabel('VIEWER')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant="outline" className={`text-[9px] ${rankColors[rank] || ""}`}>{getRankLabel(rank)}</Badge>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => deleteOfficer(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">{t('rankPermissionsTitle')}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { rank: getRankLabel("ADMIN"), color: "bg-amber-100 text-amber-800", desc: t('rankAdminPermissions') },
                  { rank: getRankLabel("DETECTIVE"), color: "bg-violet-100 text-violet-800", desc: t('rankDetectivePermissions') },
                  { rank: getRankLabel("OFFICER"), color: "bg-sky-100 text-sky-800", desc: t('rankOfficerPermissions') },
                  { rank: getRankLabel("VIEWER"), color: "bg-slate-100 text-slate-800", desc: t('rankViewerPermissions') },
                ].map((r) => (
                  <div key={r.rank} className="flex items-start gap-2 rounded-lg border p-2.5">
                    <Badge variant="outline" className={`text-[9px] mt-0.5 shrink-0 ${r.color}`}>{r.rank}</Badge>
                    <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
