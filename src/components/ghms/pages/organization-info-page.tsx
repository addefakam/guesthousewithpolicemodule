"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiGetMyProvider, apiUpdateMyProvider } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Save,
  Loader2,
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileCheck,
  Upload,
  MapPin,
  CheckCircle2,
} from "lucide-react";

// ── Types ──

interface MyProvider {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  type: string;
  licenseNo: string;
  licenseFile: string;
  status: string;
  latitude: number;
  longitude: number;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string;
  suspensionReason: string;
  suspendedAt: string | null;
  suspendedBy: string;
  certNumber: string | null;
  certIssuedAt: string | null;
  certIssuedByName: string | null;
  createdAt: string;
  updatedAt: string;
  // Operational config from Settings
  logo: string | null;
  currency: string;
  taxRate: number;
  language: string;
  checkInTime: string;
  checkOutTime: string;
}

const GUESTHOUSE_TYPES = [
  { value: "GUEST_HOUSE", label: "Guest House" },
  { value: "HOTEL", label: "Hotel" },
  { value: "LODGE", label: "Lodge" },
  { value: "RESORT", label: "Resort" },
  { value: "OTHER", label: "Other" },
];

const STATUS_BADGE: Record<string, { color: string; icon: typeof ShieldCheck }> = {
  APPROVED: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: ShieldCheck },
  PENDING: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  REJECTED: { color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
  SUSPENDED: { color: "bg-slate-100 text-slate-700 border-slate-300", icon: AlertTriangle },
};

// ── Helpers ──

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

// ── Component ──

export default function OrganizationInfoPage() {
  const { t } = useTranslation("organization");
  const refreshKey = useAppStore((s) => s.refreshKey);

  const [data, setData] = useState<MyProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Core form fields
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("GUEST_HOUSE");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseFile, setLicenseFile] = useState<string>("");

  // Operational form fields
  const [currency, setCurrency] = useState("ETB");
  const [taxRate, setTaxRate] = useState(0);
  const [language, setLanguage] = useState("en");
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [logo, setLogo] = useState<string>("");

  // Track which sections have unsaved changes
  const [coreDirty, setCoreDirty] = useState(false);
  const [opsDirty, setOpsDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = (await apiGetMyProvider()) as MyProvider;
      setData(d);
      setName(d.name || "");
      setOwnerName(d.ownerName || "");
      setPhone(d.phone || "");
      setEmail(d.email || "");
      setAddress(d.address || "");
      setType(d.type || "GUEST_HOUSE");
      setLicenseNo(d.licenseNo || "");
      setLicenseFile("");
      setCurrency(d.currency || "ETB");
      setTaxRate(d.taxRate || 0);
      setLanguage(d.language || "en");
      setCheckInTime(d.checkInTime || "14:00");
      setCheckOutTime(d.checkOutTime || "12:00");
      setLogo("");
      setCoreDirty(false);
      setOpsDirty(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errorLoad");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Mark dirty on form field change
  function onCoreChange() { if (!coreDirty) setCoreDirty(true); }
  function onOpsChange() { if (!opsDirty) setOpsDirty(true); }

  async function handleLicenseFileUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("errorFileTooLarge", { defaultValue: "File too large (max 5MB)" }));
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setLicenseFile(dataUrl);
      onCoreChange();
    } catch {
      toast.error(t("errorFileRead", { defaultValue: "Failed to read file" }));
    }
  }

  async function handleLogoUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("errorLogoTooLarge", { defaultValue: "Logo too large (max 2MB)" }));
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setLogo(dataUrl);
      onOpsChange();
    } catch {
      toast.error(t("errorFileRead", { defaultValue: "Failed to read file" }));
    }
  }

  // ── Save handlers ──

  async function saveCore() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name, ownerName, phone, email, address, type, licenseNo,
      };
      if (licenseFile) payload.licenseFile = licenseFile;
      const res = (await apiUpdateMyProvider(payload)) as {
        success: boolean;
        provider?: MyProvider;
      };
      if (res.success) {
        toast.success(t("saved", { defaultValue: "Organization info saved" }));
        await load();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errorSave");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function saveOps() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        currency, taxRate, language, checkInTime, checkOutTime,
      };
      if (logo) payload.logo = logo;
      const res = (await apiUpdateMyProvider(payload)) as { success: boolean };
      if (res.success) {
        toast.success(t("opsSaved", { defaultValue: "Operational config saved" }));
        await load();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errorSave");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-2xl font-bold">{t("title", { defaultValue: "Organization Info" })}</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("noOrganization", {
              defaultValue: "No organization associated with your account.",
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = STATUS_BADGE[data.status]?.icon || ShieldCheck;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {t("title", { defaultValue: "Organization Info" })}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t("subtitle", {
            defaultValue:
              "View and edit your guesthouse information. Changes save instantly.",
          })}
        </p>
      </div>

      {/* ── Section A — Status Banner (READ-ONLY) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            {t("statusTitle", { defaultValue: "Approval Status" })}
          </CardTitle>
          <CardDescription>
            {t("statusDesc", {
              defaultValue: "Your organization's current standing with the police.",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status + Cert Number */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">
                {t("statusLabel", { defaultValue: "Status" })}
              </Label>
              <Badge variant="outline" className={`mt-1 ${STATUS_BADGE[data.status]?.color || ""}`}>
                <StatusIcon className="h-3.5 w-3.5 mr-1" />
                {data.status}
              </Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {t("certNumber", { defaultValue: "Certificate Number" })}
              </Label>
              <p className="text-sm font-mono text-gray-900 mt-1">
                {data.certNumber || "—"}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {t("licenseNo", { defaultValue: "License Number" })}
              </Label>
              <p className="text-sm font-mono text-gray-900 mt-1">{data.licenseNo || "—"}</p>
            </div>
          </div>

          <Separator />

          {/* Approval details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">
                {t("approvedBy", { defaultValue: "Approved By" })}
              </Label>
              <p className="text-sm text-gray-900 mt-1">
                {data.approvedBy || "—"}
                {data.approvedAt && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({formatDate(data.approvedAt)})
                  </span>
                )}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {t("certIssuedAt", { defaultValue: "Certificate Issued" })}
              </Label>
              <p className="text-sm text-gray-900 mt-1">{formatDate(data.certIssuedAt)}</p>
            </div>
          </div>

          {/* Rejection / Suspension reasons (only shown if applicable) */}
          {data.status === "REJECTED" && data.rejectionReason && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">
                {t("rejectionReason", { defaultValue: "Rejection Reason" })}
              </p>
              <p className="text-sm text-red-800">{data.rejectionReason}</p>
            </div>
          )}
          {data.status === "SUSPENDED" && data.suspensionReason && (
            <div className="rounded-md border border-slate-300 bg-slate-100 p-3">
              <p className="text-xs font-semibold text-slate-700 mb-1">
                {t("suspensionReason", { defaultValue: "Suspension Reason" })}
              </p>
              <p className="text-sm text-slate-800">{data.suspensionReason}</p>
              <p className="text-xs text-slate-500 mt-1">
                {t("suspendedBy", { defaultValue: "Suspended by" })}: {data.suspendedBy || "—"}
                {data.suspendedAt && ` · ${formatDate(data.suspendedAt)}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section B — Core Organization Info (EDITABLE) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-indigo-500" />
            {t("coreTitle", { defaultValue: "Core Organization Info" })}
          </CardTitle>
          <CardDescription>
            {t("coreDesc", {
              defaultValue: "Changes here save instantly — no re-approval required.",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-xs">
                {t("name", { defaultValue: "Guesthouse Name" })} *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => { setName(e.target.value); onCoreChange(); }}
                className="mt-1"
                disabled={data.status === "SUSPENDED"}
              />
            </div>
            <div>
              <Label htmlFor="ownerName" className="text-xs">
                {t("ownerName", { defaultValue: "Owner Name" })} *
              </Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={(e) => { setOwnerName(e.target.value); onCoreChange(); }}
                className="mt-1"
                disabled={data.status === "SUSPENDED"}
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-xs">
                {t("phone", { defaultValue: "Phone" })} *
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); onCoreChange(); }}
                className="mt-1"
                placeholder="+251 9XX XXX XXX"
                disabled={data.status === "SUSPENDED"}
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">
                {t("email", { defaultValue: "Email" })}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); onCoreChange(); }}
                className="mt-1"
                disabled={data.status === "SUSPENDED"}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address" className="text-xs">
                {t("address", { defaultValue: "Address" })} *
              </Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => { setAddress(e.target.value); onCoreChange(); }}
                className="mt-1"
                rows={2}
                disabled={data.status === "SUSPENDED"}
              />
            </div>
            <div>
              <Label htmlFor="type" className="text-xs">
                {t("type", { defaultValue: "Guesthouse Type" })}
              </Label>
              <Select
                value={type}
                onValueChange={(v) => { setType(v); onCoreChange(); }}
                disabled={data.status === "SUSPENDED"}
              >
                <SelectTrigger id="type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GUESTHOUSE_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(`type_${opt.value}`, { defaultValue: opt.label })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="licenseNo" className="text-xs">
                {t("licenseNoLabel", { defaultValue: "License Number (read-only)" })}
              </Label>
              <Input
                id="licenseNo"
                value={licenseNo}
                onChange={(e) => { setLicenseNo(e.target.value); onCoreChange(); }}
                className="mt-1 font-mono"
                disabled={data.status === "SUSPENDED"}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {t("licenseNoHint", {
                  defaultValue: "Changing this requires a unique value — duplicates are rejected.",
                })}
              </p>
            </div>
          </div>

          {/* License file upload */}
          <div>
            <Label className="text-xs">
              {t("licenseFile", { defaultValue: "License Document" })}
            </Label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                {data.licenseFile && !licenseFile ? (
                  <a
                    href={data.licenseFile}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                  >
                    <FileCheck className="h-4 w-4" />
                    {t("viewCurrentLicense", { defaultValue: "View current license" })}
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("noLicenseOnFile", { defaultValue: "No license document on file." })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLicenseFileUpload(f);
                  }}
                  className="hidden"
                  id="license-file-upload"
                  disabled={data.status === "SUSPENDED"}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("license-file-upload")?.click()}
                  disabled={data.status === "SUSPENDED"}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {licenseFile
                    ? t("newLicenseSelected", { defaultValue: "New file selected" })
                    : t("uploadNewLicense", { defaultValue: "Upload new license" })}
                </Button>
                {licenseFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setLicenseFile(""); onCoreChange(); }}
                  >
                    {t("clear", { defaultValue: "Clear" })}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* GPS Coordinates (optional, instant) */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <Label htmlFor="latitude" className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {t("latitude", { defaultValue: "Latitude" })}
              </Label>
              <Input
                id="latitude"
                type="number"
                step="0.0001"
                defaultValue={data.latitude}
                onBlur={(e) => {
                  // GPS coordinates don't trigger re-approval — sent separately.
                  if (e.target.value !== String(data.latitude)) {
                    apiUpdateMyProvider({
                      latitude: parseFloat(e.target.value) || data.latitude,
                    }).then(() => toast.success(t("gpsSaved", { defaultValue: "GPS coordinates saved" })))
                      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed"));
                  }
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="longitude" className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {t("longitude", { defaultValue: "Longitude" })}
              </Label>
              <Input
                id="longitude"
                type="number"
                step="0.0001"
                defaultValue={data.longitude}
                onBlur={(e) => {
                  if (e.target.value !== String(data.longitude)) {
                    apiUpdateMyProvider({
                      longitude: parseFloat(e.target.value) || data.longitude,
                    }).then(() => toast.success(t("gpsSaved", { defaultValue: "GPS coordinates saved" })))
                      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed"));
                  }
                }}
                className="mt-1"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              onClick={saveCore}
              disabled={saving || !coreDirty || data.status === "SUSPENDED"}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {t("saveCore", { defaultValue: "Save Core Info" })}
            </Button>
          </div>
          {data.status === "SUSPENDED" && (
            <p className="text-xs text-amber-600 text-right">
              {t("suspendedEditBlocked", {
                defaultValue: "Editing is disabled while your account is suspended.",
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Section C — Operational Config (EDITABLE, instant) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            {t("opsTitle", { defaultValue: "Operational Config" })}
          </CardTitle>
          <CardDescription>
            {t("opsDesc", {
              defaultValue: "Instant changes — no police re-approval required.",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency" className="text-xs">
                {t("currency", { defaultValue: "Currency" })}
              </Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => { setCurrency(e.target.value); onOpsChange(); }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="taxRate" className="text-xs">
                {t("taxRate", { defaultValue: "Tax Rate (%)" })}
              </Label>
              <Input
                id="taxRate"
                type="number"
                step="0.1"
                min="0"
                value={taxRate}
                onChange={(e) => { setTaxRate(parseFloat(e.target.value) || 0); onOpsChange(); }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="language" className="text-xs">
                {t("language", { defaultValue: "Default Language" })}
              </Label>
              <Select
                value={language}
                onValueChange={(v) => { setLanguage(v); onOpsChange(); }}
              >
                <SelectTrigger id="language" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="am">አማርኛ</SelectItem>
                  <SelectItem value="or">Afaan Oromoo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="checkInTime" className="text-xs">
                  {t("checkInTime", { defaultValue: "Check-in Time" })}
                </Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={checkInTime}
                  onChange={(e) => { setCheckInTime(e.target.value); onOpsChange(); }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="checkOutTime" className="text-xs">
                  {t("checkOutTime", { defaultValue: "Check-out Time" })}
                </Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => { setCheckOutTime(e.target.value); onOpsChange(); }}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Logo upload */}
          <div>
            <Label className="text-xs">
              {t("logo", { defaultValue: "Logo" })}
            </Label>
            <div className="mt-2 flex items-center gap-4">
              {data.logo && !logo ? (
                <img
                  src={data.logo}
                  alt="logo"
                  className="h-12 w-12 rounded border object-contain"
                />
              ) : logo ? (
                <img
                  src={logo}
                  alt="new logo"
                  className="h-12 w-12 rounded border object-contain"
                />
              ) : (
                <div className="h-12 w-12 rounded border bg-slate-50 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-slate-300" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoUpload(f);
                }}
                className="hidden"
                id="logo-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("logo-upload")?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {t("uploadLogo", { defaultValue: "Upload logo" })}
              </Button>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              onClick={saveOps}
              disabled={saving || !opsDirty}
              variant="outline"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {t("saveOps", { defaultValue: "Save Operational Config" })}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
