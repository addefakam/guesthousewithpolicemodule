"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { useAppStore } from "@/lib/store";
import { apiGetProviders, apiUpdateProvider, apiPoliceSuspendProvider, apiSuperCreateProvider, apiSuperBulkImportProviders, req } from "@/lib/api";
import { toast } from "sonner";
import { isValidPhone, isValidEmail } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Ban,
  Eye,
  Phone,
  Mail,
  MapPin,
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  ShieldCheck,
  User,
  Send,
  AlertTriangle,
  Loader2,
  UserPlus,
  KeyRound,
  Upload,
  X,
  RotateCcw,
  Table2,
} from "lucide-react";
import InfoCard from "@/components/shared/info-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface Provider {
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
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
  suspensionReason?: string;
  suspendedAt?: string | null;
  suspendedBy?: string;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200",
  APPROVED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
  SUSPENDED: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200",
};

const GUESTHOUSE_TYPES = [
  { value: "GUEST_HOUSE" },
  { value: "HOTEL" },
  { value: "LODGE" },
  { value: "HOMESTAY" },
  { value: "RESORT" },
  { value: "DHARAMSHALA" },
  { value: "OTHER" },
];

const SUB_CITY_WOREDAS: Record<string, string[]> = {
  "Cheleleka": ["Erer", "Arsadee", "Kilolee"],
  "Dhibaayyuu": ["Dhaka Booraa", "Dirree", "Horaa", "Biiftuu"],
  "Dukam": ["Odaa Nabee", "Xaddachaa", "Malkaa", "Abbuu Seeraa"],
};

interface RegisterForm {
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  subCity: string;
  woreda: string;
  type: string;
  licenseNo: string;
  licenseFileData: string;
  licenseFileName: string;
  username: string;
  password: string;
}

const emptyRegisterForm: RegisterForm = {
  name: "",
  ownerName: "",
  phone: "",
  email: "",
  address: "",
  subCity: "",
  woreda: "",
  type: "",
  licenseNo: "",
  licenseFileData: "",
  licenseFileName: "",
  username: "",
  password: "",
};

export default function ProvidersPage() {
  const { t } = useTranslation('providers');
  const { refreshKey, triggerRefresh, currentUser } = useAppStore();
  const isSuperuser = currentUser?.role === "SUPERUSER";

  const getStatusConfig = (status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      PENDING: { label: t('statusPending'), variant: "secondary" },
      APPROVED: { label: t('statusApproved'), variant: "default" },
      REJECTED: { label: t('statusRejected'), variant: "destructive" },
      SUSPENDED: { label: t('statusSuspended'), variant: "outline" },
    };
    return map[status] || { label: status, variant: "secondary" as const };
  };

  function StatusBadge({ status }: { status: string }) {
    const cfg = getStatusConfig(status);
    return (
      <Badge variant={cfg.variant} className={STATUS_BADGE_CLASS[status] || ""}>
        {cfg.label}
      </Badge>
    );
  }

  const getTypeLabel = (value: string): string => {
    const map: Record<string, string> = {
      GUEST_HOUSE: t('typeGuestHouse'),
      HOTEL: t('typeHotel'),
      LODGE: t('typeLodge'),
      HOMESTAY: t('typeHomestay'),
      RESORT: t('typeResort'),
      DHARAMSHALA: t('typeDharamshala'),
      OTHER: t('typeOther'),
    };
    return map[value] || value;
  };

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Registration form
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterForm>(emptyRegisterForm);
  const [registering, setRegistering] = useState(false);



  // Action dialogs
  const [rejectDialog, setRejectDialog] = useState<Provider | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ provider: Provider; action: string } | null>(null);
  const [actioning, setActioning] = useState(false);

  // Suspension dialog (with reason + notification)
  const [suspendDialog, setSuspendDialog] = useState<Provider | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [providerMessage, setProviderMessage] = useState("");
  const [suspending, setSuspending] = useState(false);

  // Bulk import state
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<Record<string, string>[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const pagination = usePagination({ totalItems: providers.length, initialPageSize: 5, pageSizeOptions: [5, 10, 20, 50] });
  const paginatedProviders = useMemo(() => pagination.paginate(providers), [providers, pagination]);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGetProviders();
      setProviders(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('failedToLoad');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders, refreshKey]);

  const openDetail = (provider: Provider) => {
    setSelectedProvider(provider);
    setDetailOpen(true);
  };

  const openReject = (provider: Provider) => {
    setRejectDialog(provider);
    setRejectReason("");
  };



  const handleReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) {
      toast.error(t('rejectionReasonRequired'));
      return;
    }
    try {
      setActioning(true);
      await apiUpdateProvider(rejectDialog.id, { status: "REJECTED", rejectionReason: rejectReason.trim() });
      toast.success(t('providerRejected'));
      setRejectDialog(null);
      setRejectReason("");
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('failedToReject');
      toast.error(message);
    } finally {
      setActioning(false);
    }
  };

  const handleStatusAction = async (provider: Provider, status: string) => {
    try {
      setActioning(true);
      if (status === "REACTIVATE") {
        // Police reactivates: set back to APPROVED and clear suspension fields
        await apiUpdateProvider(provider.id, { status: "APPROVED" });
        toast.success(t('providerReactivated', { name: provider.name }));
      } else {
        await apiUpdateProvider(provider.id, { status });
        toast.success(t('providerStatusUpdated', { status: status.toLowerCase() }));
      }
      setConfirmAction(null);
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('failedToUpdate');
      toast.error(message);
    } finally {
      setActioning(false);
    }
  };

  const openSuspend = (provider: Provider) => {
    setSuspendDialog(provider);
    setSuspensionReason("");
    setProviderMessage("");
  };

  const handleRegister = async () => {
    if (
      !registerForm.name.trim() ||
      !registerForm.ownerName.trim() ||
      !registerForm.phone.trim() ||
      !registerForm.email.trim() ||
      !registerForm.type ||
      !registerForm.licenseNo.trim() ||
      !registerForm.username.trim() ||
      !registerForm.password.trim() ||
      !registerForm.subCity ||
      !registerForm.woreda
    ) {
      toast.error(t('fillRequiredFields'));
      return;
    }
    if (registerForm.password.trim().length < 4) {
      toast.error(t('passwordMinLength'));
      return;
    }
    if (!isValidPhone(registerForm.phone)) {
      toast.error(t('invalidPhone'));
      return;
    }
    if (!isValidEmail(registerForm.email)) {
      toast.error(t('invalidEmail'));
      return;
    }
    try {
      setRegistering(true);
      const address = ["Bishoftu", registerForm.subCity, registerForm.woreda].filter(Boolean).join(", ");
      await apiSuperCreateProvider({
        ...registerForm,
        address,
        licenseFile: registerForm.licenseFileData || undefined,
      });
      toast.success(t('registeredAndApproved', { name: registerForm.name }));
      setRegisterOpen(false);
      setRegisterForm(emptyRegisterForm);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('failedToRegister'));
    } finally {
      setRegistering(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendDialog) return;
    if (!suspensionReason.trim()) {
      toast.error(t('suspensionReasonRequired'));
      return;
    }
    try {
      setSuspending(true);
      await apiPoliceSuspendProvider({
        providerId: suspendDialog.id,
        suspensionReason: suspensionReason.trim(),
        providerMessage: providerMessage.trim() || undefined,
      });
      toast.success(t('providerSuspendedNotified', { name: suspendDialog.name }));
      setSuspendDialog(null);
      setSuspensionReason("");
      setProviderMessage("");
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('failedToSuspend'));
    } finally {
      setSuspending(false);
    }
  };

  // ── Bulk Import handlers ──
  const handleDownloadTemplate = () => {
    import("xlsx").then((XLSX) => {
      const headers = ["Full Name", "Phone", "Email", "Guesthouse Name", "Type", "License No", "Sub-City", "Woreda", "Username", "Password"];
      const example1 = ["Abebe Kebede", "+251911223344", "abebe@example.com", "Sunshine Guest House", "GUEST_HOUSE", "LIC-2024-001", "Cheleleka", "Erer", "sunshine_gh", "pass1234"];
      const example2 = ["Tigist Haile", "+251922334455", "tigist@example.com", "Bishoftu Lodge", "LODGE", "LIC-2024-002", "Dukam", "Malkaa", "bishoftu_lodge", "pass5678"];
      const ws = XLSX.utils.aoa_to_sheet([headers, example1, example2]);
      // Set column widths
      ws["!cols"] = headers.map(() => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Guesthouses");
      XLSX.writeFile(wb, "guesthouse_bulk_import_template.xlsx");
      toast.success(t('templateDownloaded'));
    });
  };

  const handleBulkFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setBulkErrors([]);
    setBulkPreview([]);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

      if (rows.length === 0) {
        setBulkErrors([t('bulkNoDataRows')]);
        return;
      }

      // Validate columns
      const requiredCols = ["Full Name", "Phone", "Email", "Guesthouse Name", "Type", "License No", "Sub-City", "Woreda", "Username", "Password"];
      const firstRowKeys = Object.keys(rows[0]);
      const missingCols = requiredCols.filter((c) => !firstRowKeys.includes(c));
      if (missingCols.length > 0) {
        setBulkErrors([t('bulkMissingCols', { cols: missingCols.join(', ') })]);
        return;
      }

      // Validate rows
      const errors: string[] = [];
      const validSubCities = Object.keys(SUB_CITY_WOREDAS);
      const validTypes = GUESTHOUSE_TYPES.map((t) => t.value);
      rows.forEach((row, idx) => {
        const rowNum = idx + 2; // Excel row number (1-based + header)
        const fullName = (row["Full Name"] || "").trim();
        const phone = (row["Phone"] || "").trim();
        const email = (row["Email"] || "").trim();
        const ghName = (row["Guesthouse Name"] || "").trim();
        const type = (row["Type"] || "").trim();
        const licenseNo = (row["License No"] || "").trim();
        const subCity = (row["Sub-City"] || "").trim();
        const woreda = (row["Woreda"] || "").trim();
        const username = (row["Username"] || "").trim();
        const password = (row["Password"] || "").trim();

        if (!fullName) errors.push(t('bulkRowFieldEmpty', { row: rowNum, field: "Full Name" }));
        if (!phone) errors.push(t('bulkRowFieldEmpty', { row: rowNum, field: "Phone" }));
        else if (!isValidPhone(phone)) errors.push(t('bulkRowInvalidPhone', { row: rowNum, value: phone }));
        if (!email) errors.push(t('bulkRowFieldEmpty', { row: rowNum, field: "Email" }));
        else if (!isValidEmail(email)) errors.push(t('bulkRowInvalidEmail', { row: rowNum, value: email }));
        if (!ghName) errors.push(t('bulkRowFieldEmpty', { row: rowNum, field: "Guesthouse Name" }));
        if (!type) errors.push(t('bulkRowFieldEmpty', { row: rowNum, field: "Type" }));
        else if (!validTypes.includes(type)) errors.push(t('bulkRowInvalidType', { row: rowNum, value: type, valid: validTypes.join(", ") }));
        if (!licenseNo) errors.push(t('bulkRowFieldEmpty', { row: rowNum, field: "License No" }));
        if (!subCity) errors.push(t('bulkRowFieldEmpty', { row: rowNum, field: "Sub-City" }));
        else if (!validSubCities.includes(subCity)) errors.push(t('bulkRowInvalidSubCity', { row: rowNum, value: subCity, valid: validSubCities.join(", ") }));
        if (!woreda) errors.push(t('bulkRowFieldEmpty', { row: rowNum, field: "Woreda" }));
        else if (subCity && validSubCities.includes(subCity) && !SUB_CITY_WOREDAS[subCity]?.includes(woreda)) errors.push(t('bulkRowInvalidWoreda', { row: rowNum, woreda, subCity }));
        if (!username) errors.push(t('bulkRowFieldEmpty', { row: rowNum, field: "Username" }));
        if (!password) errors.push(t('bulkRowFieldEmpty', { row: rowNum, field: "Password" }));
        else if (password.length < 4) errors.push(t('bulkRowPasswordMinLength', { row: rowNum }));
      });

      if (errors.length > 0) {
        setBulkErrors(errors.slice(0, 20));
        if (errors.length > 20) setBulkErrors((prev) => [...prev, t('bulkMoreErrors', { count: errors.length - 20 })]);
      }

      setBulkPreview(rows);
    } catch {
      setBulkErrors([t('bulkInvalidFile')]);
    }
  };

  const handleBulkImport = async () => {
    if (bulkPreview.length === 0) {
      toast.error(t('bulkNoDataToImport'));
      return;
    }
    if (bulkErrors.length > 0) {
      toast.error(t('bulkFixErrorsBeforeImport'));
      return;
    }
    try {
      setBulkImporting(true);
      const records = bulkPreview.map((row) => {
        const subCity = (row["Sub-City"] || "").trim();
        const woreda = (row["Woreda"] || "").trim();
        let type = (row["Type"] || "").trim();
        // type is already the enum value from the Excel
        const address = ["Bishoftu", subCity, woreda].filter(Boolean).join(", ");
        return {
          ownerName: (row["Full Name"] || "").trim(),
          phone: (row["Phone"] || "").trim(),
          email: (row["Email"] || "").trim(),
          name: (row["Guesthouse Name"] || "").trim(),
          type,
          licenseNo: (row["License No"] || "").trim(),
          address,
          username: (row["Username"] || "").trim(),
          password: (row["Password"] || "").trim(),
        };
      });
      const result = await apiSuperBulkImportProviders(records);
      const data = result as { success: number; failed: number; errors: string[] };
      toast.success(t('bulkImportSuccess', { success: data.success, failed: data.failed, failedPart: data.failed > 0 ? t('bulkImportFailed', { count: data.failed }) : '' }));
      setBulkImportOpen(false);
      setBulkFile(null);
      setBulkPreview([]);
      setBulkErrors([]);
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('bulkImportFailed'));
    } finally {
      setBulkImporting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const approvedCount = providers.filter((p) => p.status === "APPROVED").length;
  const pendingCount = providers.filter((p) => p.status === "PENDING").length;

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-slate-100">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-muted-foreground">{t('cardTotal')}</p>
              <p className="text-lg sm:text-2xl font-bold">{providers.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-muted-foreground">{t('cardApproved')}</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">{approvedCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-yellow-50">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-muted-foreground">{t('cardPending')}</p>
              <p className="text-lg sm:text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">
            {isSuperuser ? t('titleGuesthouses') : t('titleProviderApplications')}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isSuperuser
              ? t('subtitleGuesthouses')
              : t('subtitleProviderApplications')}
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperuser && (
            <>
              <Button size="sm" className="gap-1.5" onClick={() => setRegisterOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" /> {t('btnRegisterGuesthouse')}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setBulkImportOpen(true)}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> {t('btnBulkImport')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Providers Table/Cards */}
      <div className="rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4 sm:p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full sm:h-12" />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
            <Building2 className="mb-3 h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/40" />
            <p className="text-xs sm:text-sm text-muted-foreground">{t('emptyState')}</p>
          </div>
        ) : (
          <>
            {/* Mobile/Tablet: Card layout */}
            <div className="divide-y lg:hidden">
              {paginatedProviders.map((provider) => (
                <div key={provider.id} className={`p-3 sm:p-4 ${provider.status === "SUSPENDED" ? "bg-orange-50/60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <button className="min-w-0 flex-1 text-left" onClick={() => openDetail(provider)}>
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{provider.name}</p>
                        <StatusBadge status={provider.status} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {provider.ownerName}</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {provider.phone}</span>
                      </div>
                      {provider.address && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {provider.address}
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-[10px]">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">{getTypeLabel(provider.type)}</span>
                      </div>
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 border-t pt-2.5 flex-wrap">
                    <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100" onClick={() => openDetail(provider)}>
                      <Eye className="h-3.5 w-3.5" /> {t('btnDetails')}
                    </button>
                    {provider.status !== "APPROVED" && provider.status !== "SUSPENDED" && (
                      <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50" onClick={() => setConfirmAction({ provider, action: "APPROVED" })}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t('btnApprove')}
                      </button>
                    )}
                    {provider.status === "SUSPENDED" && (
                      <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50" onClick={() => setConfirmAction({ provider, action: "REACTIVATE" })}>
                        <RotateCcw className="h-3.5 w-3.5" /> {t('btnReactivate')}
                      </button>
                    )}
                    {provider.status !== "REJECTED" && provider.status !== "APPROVED" && provider.status !== "SUSPENDED" && (
                      <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50" onClick={() => openReject(provider)}>
                        <XCircle className="h-3.5 w-3.5" /> {t('btnReject')}
                      </button>
                    )}
                    {provider.status === "APPROVED" && (
                      <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50" onClick={() => openSuspend(provider)}>
                        <Ban className="h-3.5 w-3.5" /> {t('btnSuspend')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('thProviderName')}</TableHead>
                    <TableHead>{t('thAddress')}</TableHead>
                    <TableHead>{t('thOwner')}</TableHead>
                    <TableHead>{t('thPhone')}</TableHead>
                    <TableHead>{t('thStatus')}</TableHead>
                    <TableHead className="text-right">{t('thActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProviders.map((provider) => (
                    <TableRow key={provider.id} className={`cursor-pointer hover:bg-muted/50 ${provider.status === "SUSPENDED" ? "bg-orange-50/70 hover:bg-orange-100/60" : ""}`} onClick={() => openDetail(provider)}>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs">{provider.address || "—"}</TableCell>
                      <TableCell>{provider.ownerName}</TableCell>
                      <TableCell>{provider.phone}</TableCell>
                      <TableCell><StatusBadge status={provider.status} /></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {provider.status !== "APPROVED" && provider.status !== "SUSPENDED" && (
                            <Button size="sm" variant="ghost" className="h-8 text-emerald-600 hover:bg-emerald-50" onClick={() => setConfirmAction({ provider, action: "APPROVED" })}>
                              <CheckCircle2 className="mr-1 h-4 w-4" /> {t('btnApprove')}
                            </Button>
                          )}
                          {provider.status !== "REJECTED" && provider.status !== "APPROVED" && provider.status !== "SUSPENDED" && (
                            <Button size="sm" variant="ghost" className="h-8 text-red-600 hover:bg-red-50" onClick={() => openReject(provider)}>
                              <XCircle className="mr-1 h-4 w-4" /> {t('btnReject')}
                            </Button>
                          )}
                          {provider.status === "APPROVED" && (
                            <Button size="sm" variant="ghost" className="h-8 text-orange-600 hover:bg-orange-50" onClick={() => openSuspend(provider)}>
                              <Ban className="mr-1 h-4 w-4" /> {t('btnSuspend')}
                            </Button>
                          )}
                          {provider.status === "SUSPENDED" && (
                            <Button size="sm" variant="ghost" className="h-8 text-teal-600 hover:bg-teal-50" onClick={() => setConfirmAction({ provider, action: "REACTIVATE" })}>
                              <RotateCcw className="mr-1 h-4 w-4" /> {t('btnReactivate')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        pageSizeOptions={pagination.pageSizeOptions}
        totalItems={providers.length}
        rangeInfo={pagination.rangeInfo}
        goToPage={pagination.goToPage}
        setPageSize={pagination.setPageSize}
      />

      {/* Provider Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 w-[calc(100%-2rem)] sm:w-full p-0 gap-0">
          {selectedProvider && (<>
            {/* ── Header with gradient ── */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 px-6 pt-6 pb-5 rounded-t-lg">
              <div className="flex items-start gap-4 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <DialogTitle className="text-white text-lg font-bold leading-tight truncate">
                    {selectedProvider.name}
                  </DialogTitle>
                  <DialogDescription className="text-slate-300 text-xs mt-1">
                    {getTypeLabel(selectedProvider.type)} · {t('registered')} {formatDate(selectedProvider.createdAt)}
                  </DialogDescription>
                  <div className="flex items-center gap-2 mt-2.5">
                    <StatusBadge status={selectedProvider.status} />
                    {selectedProvider.approvedAt && (
                      <span className="text-[10px] text-slate-400">
                        {t('approved')} {selectedProvider.approvedBy ? t('approvedBy', { name: selectedProvider.approvedBy }) : ""} {formatDate(selectedProvider.approvedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* ── License Preview ── */}
              {selectedProvider.licenseFile && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('licenseDocument')}</p>
                  <div
                    className="relative cursor-pointer rounded-xl border border-slate-200 bg-slate-950 overflow-hidden group"
                    style={{ minHeight: "140px" }}
                    onClick={() => window.open(selectedProvider.licenseFile!, "_blank")}
                  >
                    {selectedProvider.licenseFile.startsWith("data:image") ? (
                      <>
                        <img src={selectedProvider.licenseFile} alt="License" className="h-auto w-full object-contain max-h-[280px]" loading="lazy" decoding="async" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-white">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                          <FileText className="h-7 w-7" />
                        </div>
                        <span className="text-sm font-medium opacity-80">{t('clickToOpenLicense')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Info Grid ── */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('providerInformation')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                  <InfoCard icon={<User className="h-4 w-4" />} label={t('labelOwner')} value={selectedProvider.ownerName} />
                  <InfoCard icon={<Phone className="h-4 w-4" />} label={t('labelPhone')} value={selectedProvider.phone} />
                  {selectedProvider.email && (
                    <InfoCard icon={<Mail className="h-4 w-4" />} label={t('labelEmail')} value={selectedProvider.email} />
                  )}
                  {selectedProvider.address && (
                    <InfoCard icon={<MapPin className="h-4 w-4" />} label={t('labelAddress')} value={selectedProvider.address} />
                  )}
                  {selectedProvider.licenseNo && (
                    <InfoCard icon={<FileText className="h-4 w-4" />} label={t('labelLicenseNo')} value={selectedProvider.licenseNo} mono />
                  )}
                  <InfoCard icon={<Calendar className="h-4 w-4" />} label={t('labelRegistered')} value={formatDate(selectedProvider.createdAt)} />
                  {selectedProvider.approvedAt && (
                    <InfoCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label={selectedProvider.approvedBy ? t('labelApprovedBy', { name: selectedProvider.approvedBy }) : t('labelApproved')} value={formatDate(selectedProvider.approvedAt)} />
                  )}
                </div>
              </div>

              {/* ── Action Buttons ── */}
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedProvider.status === "APPROVED" && (
                  <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => { setDetailOpen(false); openSuspend(selectedProvider); }}>
                    <Ban className="h-3.5 w-3.5" /> {t('btnSuspend')}
                  </Button>
                )}
                {selectedProvider.status === "SUSPENDED" && (
                  <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700" onClick={() => { setDetailOpen(false); setConfirmAction({ provider: selectedProvider, action: "REACTIVATE" }); }}>
                    <RotateCcw className="h-3.5 w-3.5" /> {t('btnReactivate')}
                  </Button>
                )}
                {selectedProvider.licenseFile && (
                  <a href={selectedProvider.licenseFile} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    <FileText className="h-4 w-4" /> {t('btnViewFullLicense')}
                  </a>
                )}
              </div>

              {selectedProvider.rejectionReason && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <Label className="text-red-700 text-xs font-semibold">{t('rejectionReason')}</Label>
                  </div>
                  <p className="text-sm text-red-800 leading-relaxed pl-6">{selectedProvider.rejectionReason}</p>
                </div>
              )}
              {selectedProvider.status === "SUSPENDED" && (selectedProvider as any).suspensionReason && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <Label className="text-orange-700 text-xs font-semibold">{t('suspensionReason')}</Label>
                  </div>
                  <p className="text-sm text-orange-800 leading-relaxed pl-6">{(selectedProvider as any).suspensionReason}</p>
                  <div className="pl-6 flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {(selectedProvider as any).suspendedBy && (
                      <p className="text-[11px] text-slate-500">{t('byLabel')}: {(selectedProvider as any).suspendedBy}</p>
                    )}
                    {(selectedProvider as any).suspendedAt && (
                      <p className="text-[11px] text-slate-500">{t('onLabel')}: {formatDate((selectedProvider as any).suspendedAt)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>)}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent className="max-w-md mx-4 sm:mx-0 w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg text-red-600">
              <XCircle className="h-5 w-5" /> {t('rejectProviderTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('rejectProviderDesc', { name: rejectDialog?.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-xs sm:text-sm">{t('rejectionReason')} *</Label>
            <Textarea id="reject-reason" placeholder={t('enterRejectionReason')} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="text-sm" />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setRejectDialog(null)} disabled={actioning} className="w-full sm:w-auto">{t('btnCancel')}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actioning || !rejectReason.trim()} className="w-full sm:w-auto">
              {actioning ? t('rejecting') : t('confirmRejection')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Approve/Suspend Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="mx-4 sm:mx-0 max-w-md w-[calc(100%-2rem)] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">
              {confirmAction?.action === "APPROVED" ? t('approveProviderTitle') : confirmAction?.action === "REACTIVATE" ? t('reactivateProviderTitle') : t('suspendProviderTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              {confirmAction?.action === "APPROVED"
                ? t('confirmApproveDesc', { name: confirmAction?.provider.name })
                : confirmAction?.action === "REACTIVATE"
                ? t('confirmReactivateDesc', { name: confirmAction?.provider.name })
                : t('confirmSuspendDesc', { name: confirmAction?.provider.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel disabled={actioning} className="w-full sm:w-auto">{t('btnCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && handleStatusAction(confirmAction.provider, confirmAction.action)}
              disabled={actioning}
              className={
                confirmAction?.action === "APPROVED"
                  ? "w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600"
                  : confirmAction?.action === "REACTIVATE"
                  ? "w-full sm:w-auto bg-teal-600 hover:bg-teal-700 focus:ring-teal-600"
                  : "w-full sm:w-auto bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
              }
            >
              {actioning ? t('processing') : confirmAction?.action === "APPROVED" ? t('btnApprove') : confirmAction?.action === "REACTIVATE" ? t('btnReactivate') : t('btnSuspend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Register Guesthouse Dialog (SUPERUSER) */}
      <Dialog open={registerOpen} onOpenChange={(open) => { if (!open) { setRegisterForm(emptyRegisterForm); } setRegisterOpen(open); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="h-5 w-5" /> {t('registerNewGuesthouse')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('registerNewGuesthouseDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Contact Information */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('contactInformation')}
              </p>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="reg-name" className="text-sm">{t('fullName')} <span className="text-rose-500">*</span></Label>
                  <Input
                    id="reg-name"
                    placeholder={t('placeholderOwnerName')}
                    value={registerForm.ownerName}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, ownerName: e.target.value }))}
                    className="bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="reg-phone" className="text-sm">{t('labelPhone')} <span className="text-rose-500">*</span></Label>
                    <Input
                      id="reg-phone"
                      type="tel"
                      placeholder={t('placeholderPhone')}
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, phone: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-email" className="text-sm">{t('labelEmail')} <span className="text-rose-500">*</span></Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder={t('placeholderEmail')}
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Guest House Details */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('guestHouseDetails')}
              </p>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="reg-gh-name" className="text-sm">{t('guestHouseName')} <span className="text-rose-500">*</span></Label>
                  <Input
                    id="reg-gh-name"
                    placeholder={t('placeholderGuestHouseName')}
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                    className="bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="reg-type" className="text-sm">{t('labelType')} <span className="text-rose-500">*</span></Label>
                    <Select value={registerForm.type} onValueChange={(v) => setRegisterForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger id="reg-type" className="w-full bg-white">
                        <SelectValue placeholder={t('selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {GUESTHOUSE_TYPES.map((gt) => (
                          <SelectItem key={gt.value} value={gt.value}>{getTypeLabel(gt.value)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-license" className="text-sm">{t('labelLicenseNo')} <span className="text-rose-500">*</span></Label>
                    <Input
                      id="reg-license"
                      placeholder={t('placeholderLicenseNo')}
                      value={registerForm.licenseNo}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, licenseNo: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm">{t('uploadLicenseDocument')}</Label>
                  {!registerForm.licenseFileData ? (
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 transition-colors hover:border-emerald-400 hover:bg-emerald-50/50">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                        <Upload className="size-4 text-slate-500" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-slate-700">
                          {t('clickToUploadLicense')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {t('fileFormatHint')}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          if (file && file.size > 5 * 1024 * 1024) {
                            toast.error(t('fileSizeExceeded'));
                            return;
                          }
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setRegisterForm((f) => ({
                                ...f,
                                licenseFileData: reader.result as string,
                                licenseFileName: file.name,
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <FileText className="h-8 w-8 shrink-0 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700">{registerForm.licenseFileName}</p>
                        <p className="text-[11px] text-emerald-600">{t('licenseUploaded')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRegisterForm((f) => ({ ...f, licenseFileData: "", licenseFileName: "" }))}
                        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('location')}
              </p>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label className="text-sm">{t('city')}</Label>
                  <Input value="Bishoftu" disabled className="bg-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="reg-subcity" className="text-sm">{t('subCity')} <span className="text-rose-500">*</span></Label>
                    <Select value={registerForm.subCity} onValueChange={(v) => setRegisterForm((f) => ({ ...f, subCity: v, woreda: "" }))}>
                      <SelectTrigger id="reg-subcity" className="w-full bg-white">
                        <SelectValue placeholder={t('selectSubCity')} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(SUB_CITY_WOREDAS).map((sc) => (
                          <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-woreda" className="text-sm">{t('woreda')} <span className="text-rose-500">*</span></Label>
                    <Select value={registerForm.woreda} onValueChange={(v) => setRegisterForm((f) => ({ ...f, woreda: v }))} disabled={!registerForm.subCity}>
                      <SelectTrigger id="reg-woreda" className="w-full bg-white">
                        <SelectValue placeholder={registerForm.subCity ? t('selectWoreda') : t('selectSubCityFirst')} />
                      </SelectTrigger>
                      <SelectContent>
                        {registerForm.subCity && SUB_CITY_WOREDAS[registerForm.subCity]?.map((w) => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Credentials */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('loginCredentials')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="reg-username" className="text-sm">{t('username')} <span className="text-rose-500">*</span></Label>
                  <Input
                    id="reg-username"
                    placeholder={t('placeholderUsername')}
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, username: e.target.value }))}
                    className="bg-white"
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reg-password" className="text-sm">{t('password')} <span className="text-rose-500">*</span></Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder={t('placeholderPassword')}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                    className="bg-white"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {/* Info banner */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-800">
                  {t('registerAutoApprovedInfo')}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setRegisterOpen(false); setRegisterForm(emptyRegisterForm); }}
                disabled={registering}
                className="w-full sm:w-auto"
              >
                {t('btnCancel')}
              </Button>
              <Button
                className="gap-1.5 w-full sm:w-auto"
                onClick={handleRegister}
                disabled={registering}
              >
                {registering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('registering')}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    {t('btnRegisterAndApprove')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Provider Dialog (with reason + notification) */}
      <Dialog open={!!suspendDialog} onOpenChange={(open) => { if (!open) setSuspendDialog(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto mx-4 sm:mx-0 w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Ban className="h-5 w-5" />
              {t('suspendGuesthouseTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('suspendGuesthouseDesc')}
            </DialogDescription>
          </DialogHeader>
          {suspendDialog && (
            <div className="space-y-4">
              {/* Provider info summary */}
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                    <Building2 className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{suspendDialog.name}</p>
                    <p className="text-xs text-slate-500">{suspendDialog.ownerName} &middot; {suspendDialog.phone}</p>
                    {suspendDialog.address && (
                      <p className="text-[11px] text-slate-400 truncate">{suspendDialog.address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Suspension Reason (required) */}
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  {t('reasonForSuspension')} <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder={t('placeholderSuspensionReason')}
                  className="min-h-[100px] resize-none"
                  maxLength={1000}
                />
                <p className="mt-1 text-[11px] text-slate-400 text-right">{suspensionReason.length}/1000</p>
              </div>

              {/* Short Message to Provider */}
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  {t('messageToProvider')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                </Label>
                <Textarea
                  value={providerMessage}
                  onChange={(e) => setProviderMessage(e.target.value)}
                  placeholder={t('placeholderProviderMessage')}
                  className="min-h-[80px] resize-none"
                  maxLength={500}
                />
                <p className="mt-1 text-[11px] text-slate-400 text-right">{providerMessage.length}/500</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('defaultNotificationInfo')}
                </p>
              </div>

              {/* Warning */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    {t('suspendWarningText')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSuspendDialog(null)}
                  disabled={suspending}
                  className="w-full sm:w-auto"
                >
                  {t('btnCancel')}
                </Button>
                <Button
                  variant="destructive"
                  className="gap-1.5 w-full sm:w-auto"
                  onClick={handleSuspend}
                  disabled={suspending || !suspensionReason.trim()}
                >
                  {suspending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('suspending')}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t('btnSuspendAndNotify')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog (SUPERUSER) */}
      <Dialog open={bulkImportOpen} onOpenChange={(open) => { if (!open) { setBulkFile(null); setBulkPreview([]); setBulkErrors([]); } setBulkImportOpen(open); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileSpreadsheet className="h-5 w-5" /> {t('bulkImportTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('bulkImportDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Step 1: Download template */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">1</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">{t('step1Title')}</p>
                  <p className="text-xs text-blue-700 mt-0.5">{t('step1Desc')}</p>
                  <Button size="sm" variant="outline" className="mt-2 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100" onClick={handleDownloadTemplate}>
                    <Download className="h-3.5 w-3.5" /> {t('btnDownloadTemplate')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: Upload file */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-sm">2</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{t('step2Title')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('step2Desc')}</p>
                  <div className="mt-3">
                    <input
                      ref={bulkFileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleBulkFileSelect}
                    />
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 transition-colors hover:border-primary/40 hover:bg-primary/5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                        <Upload className="size-5 text-slate-500" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-slate-700">
                          {bulkFile ? bulkFile.name : t('clickToSelectExcel')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {bulkFile ? `${(bulkFile.size / 1024).toFixed(1)} KB` : t('xlsxFilesOnly')}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation errors */}
            {bulkErrors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-700">{t('validationErrors')} ({bulkErrors.length})</p>
                    <ul className="mt-1.5 space-y-0.5 text-xs text-red-600 max-h-32 overflow-y-auto">
                      {bulkErrors.map((err, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="shrink-0 text-red-400">&bull;</span> {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Preview table */}
            {bulkPreview.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">3</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{t('step3Title')}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t('step3Desc', { count: bulkPreview.length })}</p>
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead className="text-xs font-semibold h-9">#</TableHead>
                        <TableHead className="text-xs font-semibold h-9">{t('bulkThFullName')}</TableHead>
                        <TableHead className="text-xs font-semibold h-9">{t('bulkThPhone')}</TableHead>
                        <TableHead className="text-xs font-semibold h-9">{t('bulkThGuesthouse')}</TableHead>
                        <TableHead className="text-xs font-semibold h-9">{t('labelType')}</TableHead>
                        <TableHead className="text-xs font-semibold h-9">{t('subCity')}</TableHead>
                        <TableHead className="text-xs font-semibold h-9">{t('woreda')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkPreview.map((row, idx) => (
                        <TableRow key={idx} className="text-xs">
                          <TableCell className="text-slate-400 font-medium">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{(row["Full Name"] || "").trim()}</TableCell>
                          <TableCell>{(row["Phone"] || "").trim()}</TableCell>
                          <TableCell>{(row["Guesthouse Name"] || "").trim()}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] px-1.5 py-0">{(row["Type"] || "").trim()}</Badge></TableCell>
                          <TableCell>{(row["Sub-City"] || "").trim()}</TableCell>
                          <TableCell>{(row["Woreda"] || "").trim()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Info banner */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-800">
                  {t('bulkAutoApprovedInfo')}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setBulkImportOpen(false); setBulkFile(null); setBulkPreview([]); setBulkErrors([]); if (bulkFileInputRef.current) bulkFileInputRef.current.value = ""; }}
                disabled={bulkImporting}
                className="w-full sm:w-auto"
              >
                {t('btnCancel')}
              </Button>
              <Button
                className="gap-1.5 w-full sm:w-auto"
                onClick={handleBulkImport}
                disabled={bulkImporting || bulkPreview.length === 0 || bulkErrors.length > 0}
              >
                {bulkImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('importingCount', { count: bulkPreview.length })}
                  </>
                ) : (
                  <>
                    <Table2 className="h-4 w-4" />
                    {bulkPreview.length > 0 ? t('btnImportCount', { count: bulkPreview.length }) : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
