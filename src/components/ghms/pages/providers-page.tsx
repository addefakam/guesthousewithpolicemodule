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

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  SUSPENDED: { label: "Suspended", variant: "outline" },
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200",
  APPROVED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
  SUSPENDED: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, variant: "secondary" as const };
  return (
    <Badge variant={cfg.variant} className={STATUS_BADGE_CLASS[status] || ""}>
      {cfg.label}
    </Badge>
  );
}

const GUESTHOUSE_TYPES = [
  { value: "GUEST_HOUSE", label: "Guest House" },
  { value: "HOTEL", label: "Hotel" },
  { value: "LODGE", label: "Lodge" },
  { value: "HOMESTAY", label: "Homestay" },
  { value: "RESORT", label: "Resort" },
  { value: "DHARAMSHALA", label: "Dharamshala" },
  { value: "OTHER", label: "Other" },
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
  const { refreshKey, triggerRefresh, currentUser } = useAppStore();
  const isSuperuser = currentUser?.role === "SUPERUSER";
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
      const message = err instanceof Error ? err.message : "Failed to load providers";
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
      toast.error("Rejection reason is required");
      return;
    }
    try {
      setActioning(true);
      await apiUpdateProvider(rejectDialog.id, { status: "REJECTED", rejectionReason: rejectReason.trim() });
      toast.success("Provider rejected");
      setRejectDialog(null);
      setRejectReason("");
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reject provider";
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
        toast.success(`"${provider.name}" has been reactivated`);
      } else {
        await apiUpdateProvider(provider.id, { status });
        toast.success(`Provider ${status.toLowerCase()}`);
      }
      setConfirmAction(null);
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update provider";
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
      toast.error("Please fill in all required fields.");
      return;
    }
    if (registerForm.password.trim().length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    if (!isValidPhone(registerForm.phone)) {
      toast.error("Invalid phone number. Use format like +251 9XX XXX XXX (7-15 digits)");
      return;
    }
    if (!isValidEmail(registerForm.email)) {
      toast.error("Invalid email address format");
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
      toast.success(`"${registerForm.name}" registered and approved successfully`);
      setRegisterOpen(false);
      setRegisterForm(emptyRegisterForm);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to register guesthouse");
    } finally {
      setRegistering(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendDialog) return;
    if (!suspensionReason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }
    try {
      setSuspending(true);
      await apiPoliceSuspendProvider({
        providerId: suspendDialog.id,
        suspensionReason: suspensionReason.trim(),
        providerMessage: providerMessage.trim() || undefined,
      });
      toast.success(`"${suspendDialog.name}" has been suspended. Notification sent to provider.`);
      setSuspendDialog(null);
      setSuspensionReason("");
      setProviderMessage("");
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to suspend provider");
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
      toast.success("Template downloaded");
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
        setBulkErrors(["The Excel file has no data rows."]);
        return;
      }

      // Validate columns
      const requiredCols = ["Full Name", "Phone", "Email", "Guesthouse Name", "Type", "License No", "Sub-City", "Woreda", "Username", "Password"];
      const firstRowKeys = Object.keys(rows[0]);
      const missingCols = requiredCols.filter((c) => !firstRowKeys.includes(c));
      if (missingCols.length > 0) {
        setBulkErrors([`Missing columns: ${missingCols.join(", ")}. Please download the template.`]);
        return;
      }

      // Validate rows
      const errors: string[] = [];
      const validSubCities = Object.keys(SUB_CITY_WOREDAS);
      const validTypes = GUESTHOUSE_TYPES.map((t) => t.value);
      const validTypeLabels = GUESTHOUSE_TYPES.map((t) => t.label);

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

        if (!fullName) errors.push(`Row ${rowNum}: Full Name is empty`);
        if (!phone) errors.push(`Row ${rowNum}: Phone is empty`);
        else if (!isValidPhone(phone)) errors.push(`Row ${rowNum}: Invalid phone format "${phone}"`);
        if (!email) errors.push(`Row ${rowNum}: Email is empty`);
        else if (!isValidEmail(email)) errors.push(`Row ${rowNum}: Invalid email format "${email}"`);
        if (!ghName) errors.push(`Row ${rowNum}: Guesthouse Name is empty`);
        if (!type) errors.push(`Row ${rowNum}: Type is empty`);
        else if (!validTypes.includes(type) && !validTypeLabels.includes(type)) errors.push(`Row ${rowNum}: Invalid type "${type}". Use: ${validTypes.join(", ")}`);
        if (!licenseNo) errors.push(`Row ${rowNum}: License No is empty`);
        if (!subCity) errors.push(`Row ${rowNum}: Sub-City is empty`);
        else if (!validSubCities.includes(subCity)) errors.push(`Row ${rowNum}: Invalid Sub-City "${subCity}". Use: ${validSubCities.join(", ")}`);
        if (!woreda) errors.push(`Row ${rowNum}: Woreda is empty`);
        else if (subCity && validSubCities.includes(subCity) && !SUB_CITY_WOREDAS[subCity]?.includes(woreda)) errors.push(`Row ${rowNum}: Woreda "${woreda}" is not valid for Sub-City "${subCity}"`);
        if (!username) errors.push(`Row ${rowNum}: Username is empty`);
        if (!password) errors.push(`Row ${rowNum}: Password is empty`);
        else if (password.length < 4) errors.push(`Row ${rowNum}: Password must be at least 4 characters`);
      });

      if (errors.length > 0) {
        setBulkErrors(errors.slice(0, 20));
        if (errors.length > 20) setBulkErrors((prev) => [...prev, `...and ${errors.length - 20} more errors`]);
      }

      setBulkPreview(rows);
    } catch {
      setBulkErrors(["Failed to read the Excel file. Please make sure it's a valid .xlsx file."]);
    }
  };

  const handleBulkImport = async () => {
    if (bulkPreview.length === 0) {
      toast.error("No data to import");
      return;
    }
    if (bulkErrors.length > 0) {
      toast.error("Please fix validation errors before importing");
      return;
    }
    try {
      setBulkImporting(true);
      const records = bulkPreview.map((row) => {
        const subCity = (row["Sub-City"] || "").trim();
        const woreda = (row["Woreda"] || "").trim();
        let type = (row["Type"] || "").trim();
        // Convert label to value if needed
        const typeMatch = GUESTHOUSE_TYPES.find((t) => t.label === type);
        if (typeMatch) type = typeMatch.value;
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
      toast.success(`Imported ${data.success} guesthouses successfully${data.failed > 0 ? `, ${data.failed} failed` : ""}`);
      setBulkImportOpen(false);
      setBulkFile(null);
      setBulkPreview([]);
      setBulkErrors([]);
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bulk import failed");
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
              <p className="text-[10px] sm:text-sm text-muted-foreground">Total</p>
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
              <p className="text-[10px] sm:text-sm text-muted-foreground">Approved</p>
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
              <p className="text-[10px] sm:text-sm text-muted-foreground">Pending</p>
              <p className="text-lg sm:text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">
            {isSuperuser ? "Guesthouses" : "Provider Applications"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isSuperuser
              ? "Register new guesthouses and manage existing ones."
              : "Manage registrations and licensing"}
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperuser && (
            <>
              <Button size="sm" className="gap-1.5" onClick={() => setRegisterOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" /> Register Guesthouse
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setBulkImportOpen(true)}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Bulk Import
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
            <p className="text-xs sm:text-sm text-muted-foreground">No providers registered yet</p>
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
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">{provider.type.replace(/_/g, " ")}</span>
                      </div>
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 border-t pt-2.5 flex-wrap">
                    <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100" onClick={() => openDetail(provider)}>
                      <Eye className="h-3.5 w-3.5" /> Details
                    </button>
                    {provider.status !== "APPROVED" && provider.status !== "SUSPENDED" && (
                      <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50" onClick={() => setConfirmAction({ provider, action: "APPROVED" })}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                    )}
                    {provider.status === "SUSPENDED" && (
                      <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50" onClick={() => setConfirmAction({ provider, action: "REACTIVATE" })}>
                        <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                      </button>
                    )}
                    {provider.status !== "REJECTED" && provider.status !== "APPROVED" && provider.status !== "SUSPENDED" && (
                      <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50" onClick={() => openReject(provider)}>
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    )}
                    {provider.status === "APPROVED" && (
                      <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50" onClick={() => openSuspend(provider)}>
                        <Ban className="h-3.5 w-3.5" /> Suspend
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
                    <TableHead>Provider Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                              <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                            </Button>
                          )}
                          {provider.status !== "REJECTED" && provider.status !== "APPROVED" && provider.status !== "SUSPENDED" && (
                            <Button size="sm" variant="ghost" className="h-8 text-red-600 hover:bg-red-50" onClick={() => openReject(provider)}>
                              <XCircle className="mr-1 h-4 w-4" /> Reject
                            </Button>
                          )}
                          {provider.status === "APPROVED" && (
                            <Button size="sm" variant="ghost" className="h-8 text-orange-600 hover:bg-orange-50" onClick={() => openSuspend(provider)}>
                              <Ban className="mr-1 h-4 w-4" /> Suspend
                            </Button>
                          )}
                          {provider.status === "SUSPENDED" && (
                            <Button size="sm" variant="ghost" className="h-8 text-teal-600 hover:bg-teal-50" onClick={() => setConfirmAction({ provider, action: "REACTIVATE" })}>
                              <RotateCcw className="mr-1 h-4 w-4" /> Reactivate
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
                    {selectedProvider.type.replace(/_/g, " ")} · Registered {formatDate(selectedProvider.createdAt)}
                  </DialogDescription>
                  <div className="flex items-center gap-2 mt-2.5">
                    <StatusBadge status={selectedProvider.status} />
                    {selectedProvider.approvedAt && (
                      <span className="text-[10px] text-slate-400">
                        Approved {selectedProvider.approvedBy ? `by ${selectedProvider.approvedBy}` : ""} {formatDate(selectedProvider.approvedAt)}
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
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">License Document</p>
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
                        <span className="text-sm font-medium opacity-80">Click to open license document</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Info Grid ── */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Provider Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                  <InfoCard icon={<User className="h-4 w-4" />} label="Owner" value={selectedProvider.ownerName} />
                  <InfoCard icon={<Phone className="h-4 w-4" />} label="Phone" value={selectedProvider.phone} />
                  {selectedProvider.email && (
                    <InfoCard icon={<Mail className="h-4 w-4" />} label="Email" value={selectedProvider.email} />
                  )}
                  {selectedProvider.address && (
                    <InfoCard icon={<MapPin className="h-4 w-4" />} label="Address" value={selectedProvider.address} />
                  )}
                  {selectedProvider.licenseNo && (
                    <InfoCard icon={<FileText className="h-4 w-4" />} label="License No" value={selectedProvider.licenseNo} mono />
                  )}
                  <InfoCard icon={<Calendar className="h-4 w-4" />} label="Registered" value={formatDate(selectedProvider.createdAt)} />
                  {selectedProvider.approvedAt && (
                    <InfoCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label={"Approved" + (selectedProvider.approvedBy ? ` by ${selectedProvider.approvedBy}` : "")} value={formatDate(selectedProvider.approvedAt)} />
                  )}
                </div>
              </div>

              {/* ── Action Buttons ── */}
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedProvider.status === "APPROVED" && (
                  <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => { setDetailOpen(false); openSuspend(selectedProvider); }}>
                    <Ban className="h-3.5 w-3.5" /> Suspend
                  </Button>
                )}
                {selectedProvider.status === "SUSPENDED" && (
                  <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700" onClick={() => { setDetailOpen(false); setConfirmAction({ provider: selectedProvider, action: "REACTIVATE" }); }}>
                    <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                  </Button>
                )}
                {selectedProvider.licenseFile && (
                  <a href={selectedProvider.licenseFile} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    <FileText className="h-4 w-4" /> View Full License
                  </a>
                )}
              </div>

              {selectedProvider.rejectionReason && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <Label className="text-red-700 text-xs font-semibold">Rejection Reason</Label>
                  </div>
                  <p className="text-sm text-red-800 leading-relaxed pl-6">{selectedProvider.rejectionReason}</p>
                </div>
              )}
              {selectedProvider.status === "SUSPENDED" && (selectedProvider as any).suspensionReason && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <Label className="text-orange-700 text-xs font-semibold">Suspension Reason</Label>
                  </div>
                  <p className="text-sm text-orange-800 leading-relaxed pl-6">{(selectedProvider as any).suspensionReason}</p>
                  <div className="pl-6 flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {(selectedProvider as any).suspendedBy && (
                      <p className="text-[11px] text-slate-500">By: {(selectedProvider as any).suspendedBy}</p>
                    )}
                    {(selectedProvider as any).suspendedAt && (
                      <p className="text-[11px] text-slate-500">On: {formatDate((selectedProvider as any).suspendedAt)}</p>
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
              <XCircle className="h-5 w-5" /> Reject Provider
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Rejecting <strong>{rejectDialog?.name}</strong>. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-xs sm:text-sm">Rejection Reason *</Label>
            <Textarea id="reject-reason" placeholder="Enter the reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="text-sm" />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setRejectDialog(null)} disabled={actioning} className="w-full sm:w-auto">Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actioning || !rejectReason.trim()} className="w-full sm:w-auto">
              {actioning ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Approve/Suspend Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="mx-4 sm:mx-0 max-w-md w-[calc(100%-2rem)] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">
              {confirmAction?.action === "APPROVED" ? "Approve Provider" : confirmAction?.action === "REACTIVATE" ? "Reactivate Provider" : "Suspend Provider"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              {confirmAction?.action === "APPROVED"
                ? `Are you sure you want to approve "${confirmAction?.provider.name}"?`
                : confirmAction?.action === "REACTIVATE"
                ? `Are you sure you want to reactivate "${confirmAction?.provider.name}"? The guesthouse will regain full access.`
                : `Are you sure you want to suspend "${confirmAction?.provider.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel disabled={actioning} className="w-full sm:w-auto">Cancel</AlertDialogCancel>
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
              {actioning ? "Processing..." : confirmAction?.action === "APPROVED" ? "Approve" : confirmAction?.action === "REACTIVATE" ? "Reactivate" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Register Guesthouse Dialog (SUPERUSER) */}
      <Dialog open={registerOpen} onOpenChange={(open) => { if (!open) { setRegisterForm(emptyRegisterForm); } setRegisterOpen(open); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="h-5 w-5" /> Register New Guesthouse
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add a new guesthouse. It will be automatically approved and an operator account will be created.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Contact Information */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contact Information
              </p>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="reg-name" className="text-sm">Full Name <span className="text-rose-500">*</span></Label>
                  <Input
                    id="reg-name"
                    placeholder="Owner full name"
                    value={registerForm.ownerName}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, ownerName: e.target.value }))}
                    className="bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="reg-phone" className="text-sm">Phone <span className="text-rose-500">*</span></Label>
                    <Input
                      id="reg-phone"
                      type="tel"
                      placeholder="Phone number"
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, phone: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-email" className="text-sm">Email <span className="text-rose-500">*</span></Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="Email address"
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
                Guest House Details
              </p>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="reg-gh-name" className="text-sm">Guest House Name <span className="text-rose-500">*</span></Label>
                  <Input
                    id="reg-gh-name"
                    placeholder="Name of the guest house"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                    className="bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="reg-type" className="text-sm">Type <span className="text-rose-500">*</span></Label>
                    <Select value={registerForm.type} onValueChange={(v) => setRegisterForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger id="reg-type" className="w-full bg-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {GUESTHOUSE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-license" className="text-sm">License No. <span className="text-rose-500">*</span></Label>
                    <Input
                      id="reg-license"
                      placeholder="License number"
                      value={registerForm.licenseNo}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, licenseNo: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm">Upload License Document</Label>
                  {!registerForm.licenseFileData ? (
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 transition-colors hover:border-emerald-400 hover:bg-emerald-50/50">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                        <Upload className="size-4 text-slate-500" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-slate-700">
                          Click to upload license document
                        </p>
                        <p className="text-xs text-slate-400">
                          PDF, JPG, or PNG (max 5MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          if (file && file.size > 5 * 1024 * 1024) {
                            toast.error("File size must be under 5MB.");
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
                        <p className="text-[11px] text-emerald-600">License uploaded</p>
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
                Location
              </p>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label className="text-sm">City</Label>
                  <Input value="Bishoftu" disabled className="bg-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="reg-subcity" className="text-sm">Sub-City <span className="text-rose-500">*</span></Label>
                    <Select value={registerForm.subCity} onValueChange={(v) => setRegisterForm((f) => ({ ...f, subCity: v, woreda: "" }))}>
                      <SelectTrigger id="reg-subcity" className="w-full bg-white">
                        <SelectValue placeholder="Select sub-city" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(SUB_CITY_WOREDAS).map((sc) => (
                          <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-woreda" className="text-sm">Woreda <span className="text-rose-500">*</span></Label>
                    <Select value={registerForm.woreda} onValueChange={(v) => setRegisterForm((f) => ({ ...f, woreda: v }))} disabled={!registerForm.subCity}>
                      <SelectTrigger id="reg-woreda" className="w-full bg-white">
                        <SelectValue placeholder={registerForm.subCity ? "Select woreda" : "Select sub-city first"} />
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
                Desired Login Credentials
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="reg-username" className="text-sm">Username <span className="text-rose-500">*</span></Label>
                  <Input
                    id="reg-username"
                    placeholder="Desired username"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, username: e.target.value }))}
                    className="bg-white"
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reg-password" className="text-sm">Password <span className="text-rose-500">*</span></Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Min 4 characters"
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
                  This guesthouse will be <strong>automatically approved</strong> since you are registering it as System Admin. The operator can log in immediately after registration.
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
                Cancel
              </Button>
              <Button
                className="gap-1.5 w-full sm:w-auto"
                onClick={handleRegister}
                disabled={registering}
              >
                {registering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Register & Approve
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
              Suspend Guesthouse
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Suspend this provider and send them a notification with the reason.
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
                  Reason for Suspension <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="Write the detailed reason for suspending this guesthouse..."
                  className="min-h-[100px] resize-none"
                  maxLength={1000}
                />
                <p className="mt-1 text-[11px] text-slate-400 text-right">{suspensionReason.length}/1000</p>
              </div>

              {/* Short Message to Provider */}
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Message to Provider <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={providerMessage}
                  onChange={(e) => setProviderMessage(e.target.value)}
                  placeholder="Short message that will be sent to the provider about their suspension..."
                  className="min-h-[80px] resize-none"
                  maxLength={500}
                />
                <p className="mt-1 text-[11px] text-slate-400 text-right">{providerMessage.length}/500</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  If empty, a default notification with the suspension reason will be sent automatically.
                </p>
              </div>

              {/* Warning */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    This action will immediately suspend the guesthouse. The provider will be notified via the notification system.
                    Suspended providers will be removed from room availability monitoring. Only the Police module can reactivate a suspended guesthouse.
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
                  Cancel
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
                      Suspending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Suspend &amp; Send Notification
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
              <FileSpreadsheet className="h-5 w-5" /> Bulk Import Guesthouses
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Import multiple guesthouses at once from an Excel file. All entries will be automatically approved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Step 1: Download template */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">1</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">Download Template</p>
                  <p className="text-xs text-blue-700 mt-0.5">Download the Excel template, fill in guesthouse data, then upload it below.</p>
                  <Button size="sm" variant="outline" className="mt-2 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100" onClick={handleDownloadTemplate}>
                    <Download className="h-3.5 w-3.5" /> Download Template (.xlsx)
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: Upload file */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-sm">2</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Upload Filled Template</p>
                  <p className="text-xs text-slate-500 mt-0.5">Select the filled Excel file to preview and import.</p>
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
                          {bulkFile ? bulkFile.name : "Click to select Excel file"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {bulkFile ? `${(bulkFile.size / 1024).toFixed(1)} KB` : ".xlsx files only"}
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
                    <p className="text-sm font-semibold text-red-700">Validation Errors ({bulkErrors.length})</p>
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
                    <p className="text-sm font-semibold text-slate-900">Preview Data</p>
                    <p className="text-xs text-slate-500 mt-0.5">Review the data before importing. {bulkPreview.length} guesthouse(s) found.</p>
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead className="text-xs font-semibold h-9">#</TableHead>
                        <TableHead className="text-xs font-semibold h-9">Full Name</TableHead>
                        <TableHead className="text-xs font-semibold h-9">Phone</TableHead>
                        <TableHead className="text-xs font-semibold h-9">Guesthouse</TableHead>
                        <TableHead className="text-xs font-semibold h-9">Type</TableHead>
                        <TableHead className="text-xs font-semibold h-9">Sub-City</TableHead>
                        <TableHead className="text-xs font-semibold h-9">Woreda</TableHead>
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
                  All imported guesthouses will be <strong>automatically approved</strong> and operator accounts will be created with the provided credentials.
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
                Cancel
              </Button>
              <Button
                className="gap-1.5 w-full sm:w-auto"
                onClick={handleBulkImport}
                disabled={bulkImporting || bulkPreview.length === 0 || bulkErrors.length > 0}
              >
                {bulkImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing {bulkPreview.length} guesthouses...
                  </>
                ) : (
                  <>
                    <Table2 className="h-4 w-4" />
                    Import {bulkPreview.length > 0 ? `${bulkPreview.length} Guesthouses` : ""}
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
