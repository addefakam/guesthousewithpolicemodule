"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import {
  apiGetReservations,
  apiCreateReservation,
  apiDeleteReservation,
  apiCheckin,
  apiCheckout,
  apiCancelReservation,
  apiCreatePayment,
  apiGetGuests,
  apiGetRooms,
  apiCreateGuest,
} from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  LogIn,
  LogOut,
  XCircle,
  CreditCard,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  User,
  BedDouble,
  Clock,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserPlus,
  UserCheck,
  ChevronsUpDown,
  CalendarPlus,
} from "lucide-react";
import AddressFields from "@/components/shared/address-fields";
import { isValidPhone, isValidEmail } from "@/lib/utils";

interface GuestOption {
  id: string;
  name: string;
  phone: string;
}

interface RoomOption {
  id: string;
  number: string;
  name: string;
  type: string;
  status: string;
  pricePerNight: number;
}

interface Reservation {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomRate: number;
  totalCost: number;
  paidAmount: number;
  balance: number;
  paymentStatus: string;
  paymentMethod: string | null;
  status: string;
  notes: string;
  taxAmount: number;
  discountAmount: number;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  createdAt: string;
  guest?: { id: string; name: string; phone: string };
  room?: { id: string; number: string; name: string; type: string };
  secondGuestName?: string;
  secondGuestPhone?: string;
  secondGuestIdNumber?: string;
  exceptionallyReserved?: boolean;
  exceptionReason?: string;
}

const STATUS_TABS = ["ALL", "UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED", "DELETED"] as const;

const STATUS_BADGE: Record<string, string> = {
  UPCOMING: "bg-sky-100 text-sky-800 border-sky-200",
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  COMPLETED: "bg-gray-100 text-gray-700 border-gray-200",
  CANCELLED: "bg-rose-100 text-rose-800 border-rose-200",
  DELETED: "bg-orange-100 text-orange-800 border-orange-200",
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PARTIAL: "bg-amber-100 text-amber-800 border-amber-200",
  PENDING: "bg-gray-100 text-gray-600 border-gray-200",
};

const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "MOBILE"] as const;

export default function ReservationsPage() {
  const { t } = useTranslation("reservations");
  const { refreshKey, triggerRefresh, preselectedRoom, setPreselectedRoom } = useAppStore();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allGuests, setAllGuests] = useState<GuestOption[]>([]);
  const [allRooms, setAllRooms] = useState<RoomOption[]>([]);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create dialog — 2-step wizard
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  // Step 1 — guest selection / creation
  const [guestMode, setGuestMode] = useState<"existing" | "new">("existing");
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [newGuestForm, setNewGuestForm] = useState({
    name: "",
    phone: "",
    email: "",
    idNumber: "",
    idType: "National ID",
    nationality: "",
    region: "",
    zone: "",
    woreda: "",
    kebele: "",
    houseNumber: "",
    streetName: "",
    plateNumber: "",
    weapon: "",
    notes: "",
  });

  // Step 2 — booking details
  const [createForm, setCreateForm] = useState({
    roomId: "",
    checkIn: "",
    checkOut: "",
    notes: "",
    secondGuestName: "",
    secondGuestPhone: "",
    secondGuestIdNumber: "",
    exceptionallyReserved: false,
    exceptionReason: "",
  });
  const [creating, setCreating] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Payment dialog
  const [paymentDialog, setPaymentDialog] = useState<Reservation | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    referenceNo: "",
    notes: "",
  });
  const [paying, setPaying] = useState(false);

  // Action confirmations
  const [confirmAction, setConfirmAction] = useState<{
    type: "checkin" | "checkout" | "cancel";
    reservation: Reservation;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Room conflict dialog
  const [conflictInfo, setConflictInfo] = useState<{ roomNumber: string; roomName: string; checkIn: string; checkOut: string } | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [resData, guestData, roomData] = await Promise.all([
        apiGetReservations(),
        apiGetGuests(),
        apiGetRooms(),
      ]);
      setReservations(Array.isArray(resData) ? resData : []);
      setAllGuests((Array.isArray(guestData) ? guestData : []).map((g: GuestOption) => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
      })));
      // apiGetRooms already unwraps { rooms: [...] } to a plain array
      const rawRooms = Array.isArray(roomData) ? roomData : [];
      setAllRooms(
        rawRooms.map((r: RoomOption) => ({
          id: r.id,
          number: r.number,
          name: r.name,
          type: r.type,
          status: r.status,
          pricePerNight: r.pricePerNight,
        }))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshKey]);

  // When a room is pre-selected from the Rooms page, highlight matching reservations
  const [highlightRoomId, setHighlightRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedRoom) {
      setHighlightRoomId(preselectedRoom.id);
    }
  }, [preselectedRoom]);

  // Clear highlight on user interaction (tab change, status filter, search)
  const clearHighlight = () => {
    setHighlightRoomId(null);
    setPreselectedRoom(null);
  };

  // Available rooms for new reservation (AVAILABLE, or null/undefined status treated as available)
  const availableRooms = useMemo(
    () => allRooms.filter((r) => !r.status || r.status === "AVAILABLE"),
    [allRooms]
  );

  // Computed nights and total for create form
  const createNights = useMemo(() => {
    if (!createForm.checkIn || !createForm.checkOut) return 0;
    const diff = new Date(createForm.checkOut).getTime() - new Date(createForm.checkIn).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [createForm.checkIn, createForm.checkOut]);

  const createRate = useMemo(() => {
    const room = allRooms.find((r) => r.id === createForm.roomId);
    return room ? room.pricePerNight : 0;
  }, [createForm.roomId, allRooms]);

  const createTotal = createNights * createRate;

  const step1Valid = useMemo(() => {
    if (guestMode === "existing") return !!selectedGuestId;
    return !!(
      newGuestForm.name.trim() &&
      newGuestForm.phone.trim() &&
      newGuestForm.nationality.trim() &&
      newGuestForm.idType
    );
  }, [guestMode, selectedGuestId, newGuestForm.name, newGuestForm.phone, newGuestForm.nationality, newGuestForm.idType]);

  // Filtered reservations
  const filtered = useMemo(() => {
    let list = reservations;
    if (statusFilter !== "ALL") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.guest?.name?.toLowerCase().includes(q) ||
          r.room?.number?.toLowerCase().includes(q) ||
          r.room?.name?.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }
    // Move COMPLETED and DELETED to bottom, active first
    list = [...list.filter((r) => r.status !== "COMPLETED" && r.status !== "DELETED"), ...list.filter((r) => r.status === "COMPLETED" || r.status === "DELETED")];
    return list;
  }, [reservations, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(val);

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return dateStr; }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleCreate = async () => {
    // ── All validation BEFORE setting creating=true ──
    if (!createForm.roomId || !createForm.checkIn || !createForm.checkOut) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (createNights < 1) {
      toast.error("Check-out must be after check-in");
      return;
    }
    if (guestMode === "new" && (!newGuestForm.name || !newGuestForm.name.trim())) {
      toast.error("Guest full name is required");
      return;
    }
    if (guestMode === "new" && (!newGuestForm.phone || !newGuestForm.phone.trim())) {
      toast.error("Guest phone is required");
      return;
    }
    if (guestMode === "new" && !isValidPhone(newGuestForm.phone)) {
      toast.error("Invalid guest phone number format (7-15 digits)");
      return;
    }
    if (guestMode === "new" && !isValidEmail(newGuestForm.email)) {
      toast.error("Invalid guest email address format");
      return;
    }
    if (guestMode === "new" && (!newGuestForm.nationality || !newGuestForm.nationality.trim())) {
      toast.error("Guest nationality is required");
      return;
    }
    if (guestMode === "new" && (!newGuestForm.idType || newGuestForm.idType === "")) {
      toast.error("Guest ID type is required");
      return;
    }
    if (guestMode !== "new" && !selectedGuestId) {
      toast.error("Please select or create a guest");
      return;
    }
    const selRoom = allRooms.find((r) => r.id === createForm.roomId);
    const isDoubleRoom = selRoom && (selRoom.type === "DOUBLE" || selRoom.type === "TWIN");
    if (isDoubleRoom && !createForm.exceptionallyReserved) {
      if (!createForm.secondGuestName.trim() || !createForm.secondGuestPhone.trim()) {
        toast.error("Second guest name and phone are required for double/twin rooms");
        return;
      }
      if (!isValidPhone(createForm.secondGuestPhone)) {
        toast.error("Invalid second guest phone number format (7-15 digits)");
        return;
      }
    }
    if (createForm.exceptionallyReserved && !createForm.exceptionReason.trim()) {
      toast.error("Please provide the exception reason");
      return;
    }

    // ── All validation passed — now make API calls ──
    try {
      setCreating(true);

      // Determine guestId: use existing or create new
      let guestId = selectedGuestId;
      if (guestMode === "new") {
        const created = await apiCreateGuest(newGuestForm);
        guestId = created.id;
      }

      if (!guestId) {
        toast.error("Please select or create a guest");
        return;
      }

      await apiCreateReservation({
        guestId,
        roomId: createForm.roomId,
        checkIn: createForm.checkIn,
        checkOut: createForm.checkOut,
        notes: createForm.notes,
        secondGuestName: createForm.secondGuestName,
        secondGuestPhone: createForm.secondGuestPhone,
        secondGuestIdNumber: createForm.secondGuestIdNumber,
        exceptionallyReserved: createForm.exceptionallyReserved,
        exceptionReason: createForm.exceptionReason,
      });

      toast.success("Guest and reservation created successfully");
      closeCreateDialog();
      triggerRefresh();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Failed to create reservation";
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch {}
      if (parsed?.code === "ROOM_CONFLICT" && parsed.conflict) {
        setCreateOpen(false);
        setWizardStep(1);
        setConflictInfo({ roomNumber: parsed.conflict.roomNumber, roomName: parsed.conflict.roomName || "", checkIn: parsed.conflict.checkIn, checkOut: parsed.conflict.checkOut });
        return;
      }
      toast.error(parsed?.error || raw || "Failed to create reservation");
    } finally {
      setCreating(false);
    }
  };

  const closeCreateDialog = () => {
    setCreateOpen(false);
    setWizardStep(1);
    setGuestMode("existing");
    setSelectedGuestId("");
    setNewGuestForm({ name: "", phone: "", email: "", idNumber: "", idType: "National ID", nationality: "", region: "", zone: "", woreda: "", kebele: "", houseNumber: "", streetName: "", plateNumber: "", weapon: "", notes: "" });
    setCreateForm({ roomId: "", checkIn: "", checkOut: "", notes: "", secondGuestName: "", secondGuestPhone: "", secondGuestIdNumber: "", exceptionallyReserved: false, exceptionReason: "" });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.status === "COMPLETED" || deleteTarget.status === "CANCELLED" || deleteTarget.status === "DELETED") {
      toast.error("Cannot delete a completed, cancelled, or already deleted reservation");
      setDeleteTarget(null);
      return;
    }
    try {
      setDeleting(true);
      await apiDeleteReservation(deleteTarget.id);
      toast.success("Reservation deleted and room released");
      setDeleteTarget(null);
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete reservation";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, reservation } = confirmAction;
    if (type === "cancel" && (reservation.status === "COMPLETED" || reservation.status === "CANCELLED" || reservation.status === "DELETED")) {
      toast.error("Cannot cancel a completed, cancelled, or deleted reservation");
      setConfirmAction(null);
      return;
    }
    try {
      setActionLoading(true);
      if (type === "checkin") {
        await apiCheckin(reservation.id);
        toast.success("Guest checked in successfully");
      } else if (type === "checkout") {
        await apiCheckout(reservation.id);
        toast.success("Guest checked out successfully");
      } else if (type === "cancel") {
        await apiCancelReservation(reservation.id);
        toast.success("Reservation cancelled");
      }
      setConfirmAction(null);
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to ${type}`;
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentDialog || !paymentForm.amount) {
      toast.error("Payment amount is required");
      return;
    }
    const amount = Number(paymentForm.amount);
    if (amount <= 0) {
      toast.error("Amount must be positive");
      return;
    }
    if (amount > paymentDialog.balance) {
      toast.error(`Amount exceeds balance of ${formatCurrency(paymentDialog.balance)}`);
      return;
    }
    try {
      setPaying(true);
      await apiCreatePayment({
        reservationId: paymentDialog.id,
        amount,
        method: paymentForm.method,
        referenceNo: paymentForm.referenceNo,
        notes: paymentForm.notes,
      });
      toast.success(`Payment of ${formatCurrency(amount)} recorded`);
      setPaymentDialog(null);
      setPaymentForm({ amount: "", method: "CASH", referenceNo: "", notes: "" });
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record payment";
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; className: string; description: string }> = {
    checkin: {
      label: "Check In",
      icon: <LogIn className="h-4 w-4" />,
      className: "bg-emerald-600 hover:bg-emerald-700",
      description: `Check in ${confirmAction?.reservation.guest?.name || "guest"} for Room ${confirmAction?.reservation.room?.number || ""}?`,
    },
    checkout: {
      label: "Check Out",
      icon: <LogOut className="h-4 w-4" />,
      className: "bg-sky-600 hover:bg-sky-700",
      description: `Check out ${confirmAction?.reservation.guest?.name || "guest"} from Room ${confirmAction?.reservation.room?.number || ""}?`,
    },
    cancel: {
      label: "Cancel Reservation",
      icon: <XCircle className="h-4 w-4" />,
      className: "bg-rose-600 hover:bg-rose-700",
      description: `Cancel reservation for ${confirmAction?.reservation.guest?.name || "guest"}? This action cannot be undone.`,
    },
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-1 h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("pageSubtitle")}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("btnNewReservation")}
        </Button>
      </div>

      {/* Status Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); clearHighlight(); }}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="text-xs sm:text-sm">
                {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                {tab !== "ALL" && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    ({reservations.filter((r) => tab === "ALL" || r.status === tab).length})
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
              clearHighlight();
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead>{t('thguest', 'Guest')}</TableHead>
                <TableHead>{t('throom', 'Room')}</TableHead>
                <TableHead>{t('thcheckin', 'Check-in')}</TableHead>
                <TableHead>{t('thcheckout', 'Check-out')}</TableHead>
                <TableHead>{t('thnights', 'Nights')}</TableHead>
                <TableHead>{t('thtotal', 'Total')}</TableHead>
                <TableHead>{t('thpaid', 'Paid')}</TableHead>
                <TableHead>{t('thbalance', 'Balance')}</TableHead>
                <TableHead>{t('thstatus', 'Status')}</TableHead>
                <TableHead>{t('thpayment', 'Payment')}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center">
                    <div className="flex flex-col items-center text-gray-400">
                      <CalendarRange className="h-8 w-8 mb-2" />
                      <p className="font-medium text-lg">
                        {search || statusFilter !== "ALL" ? t("emptyNoMatch") : t("emptyNoReservations")}
                      </p>
                      <p className="text-sm mt-1">
                        {search || statusFilter !== "ALL"
                          ? t("emptyNoMatchHint")
                          : t("emptyNoReservationsHint")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((res) => (
                  <TableRow key={res.id} className={highlightRoomId && res.room?.id === highlightRoomId ? "bg-sky-50 border-l-4 border-l-sky-500 transition-all duration-300" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-xs font-medium">
                          {res.guest?.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {res.guest?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-400">{res.guest?.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {res.room?.number || "—"}
                        </p>
                        <p className="text-xs text-gray-400">{res.room?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDate(res.checkIn)}</TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDate(res.checkOut)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{res.nights}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(res.totalCost)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-emerald-700 font-medium">
                      {formatCurrency(res.paidAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium ${res.balance > 0 ? "text-rose-600" : "text-gray-500"}`}>
                        {formatCurrency(res.balance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_BADGE[res.status] || ""}>
                        {res.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PAYMENT_STATUS_BADGE[res.paymentStatus] || ""}>
                        {res.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {res.status === "UPCOMING" && (
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: "checkin", reservation: res })}
                              className="text-emerald-700 focus:text-emerald-700"
                              disabled={new Date(res.checkIn) > new Date()}
                            >
                              <LogIn className="mr-2 h-4 w-4" />
                              Check In{new Date(res.checkIn) > new Date() ? ` (${formatDateShort(res.checkIn)})` : ""}
                            </DropdownMenuItem>
                          )}
                          {res.status === "ACTIVE" && (
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: "checkout", reservation: res })}
                              className="text-sky-700 focus:text-sky-700"
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              Check Out
                            </DropdownMenuItem>
                          )}
                          {(res.status === "UPCOMING" || res.status === "ACTIVE") && res.balance > 0 && (
                            <DropdownMenuItem
                              onClick={() => {
                                setPaymentDialog(res);
                                setPaymentForm({ amount: "", method: "CASH", referenceNo: "", notes: "" });
                              }}
                              className="text-amber-700 focus:text-amber-700"
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Record Payment
                            </DropdownMenuItem>
                          )}
                          {(res.status === "UPCOMING" || res.status === "ACTIVE") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setConfirmAction({ type: "cancel", reservation: res })}
                                className="text-rose-600 focus:text-rose-600"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          {res.status !== "COMPLETED" && res.status !== "CANCELLED" && res.status !== "DELETED" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600"
                                onClick={() => setDeleteTarget(res)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-500">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm text-gray-600">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
            <CalendarRange className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-500">No reservations</p>
          </div>
        ) : (
          paged.map((res) => (
            <div key={res.id} className={`rounded-xl border p-4 space-y-3 transition-all duration-300 ${highlightRoomId && res.room?.id === highlightRoomId ? "bg-sky-50 border-sky-400 border-l-4 shadow-md shadow-sky-100" : "bg-white"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600 font-semibold text-sm">
                    {res.guest?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-gray-900 text-sm">{res.guest?.name || "Unknown"}</h3>
                      <Badge variant="outline" className={`${STATUS_BADGE[res.status]} text-[10px] px-1.5 py-0`}>
                        {res.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      Room {res.room?.number} · {res.room?.name}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {res.status === "UPCOMING" && (
                      <DropdownMenuItem onClick={() => setConfirmAction({ type: "checkin", reservation: res })} disabled={new Date(res.checkIn) > new Date()}>
                        <LogIn className="mr-2 h-4 w-4" /> Check In{new Date(res.checkIn) > new Date() ? ` (${formatDateShort(res.checkIn)})` : ""}
                      </DropdownMenuItem>
                    )}
                    {res.status === "ACTIVE" && (
                      <DropdownMenuItem onClick={() => setConfirmAction({ type: "checkout", reservation: res })}>
                        <LogOut className="mr-2 h-4 w-4" /> Check Out
                      </DropdownMenuItem>
                    )}
                    {res.balance > 0 && (res.status === "UPCOMING" || res.status === "ACTIVE") && (
                      <DropdownMenuItem onClick={() => { setPaymentDialog(res); setPaymentForm({ amount: "", method: "CASH", referenceNo: "", notes: "" }); }}>
                        <CreditCard className="mr-2 h-4 w-4" /> Record Payment
                      </DropdownMenuItem>
                    )}
                    {(res.status === "UPCOMING" || res.status === "ACTIVE") && (
                      <DropdownMenuItem className="text-rose-600" onClick={() => setConfirmAction({ type: "cancel", reservation: res })}>
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                      </DropdownMenuItem>
                    )}
                    {res.status !== "COMPLETED" && res.status !== "CANCELLED" && res.status !== "DELETED" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-rose-600 focus:text-rose-600"
                          onClick={() => setDeleteTarget(res)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex items-center gap-1 text-gray-500">
                  <CalendarDays className="h-3 w-3" /> {formatDate(res.checkIn)} → {formatDate(res.checkOut)}
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock className="h-3 w-3" /> {res.nights} night{res.nights !== 1 ? "s" : ""}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-semibold">{formatCurrency(res.totalCost)}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={PAYMENT_STATUS_BADGE[res.paymentStatus]}>
                      {res.paymentStatus}
                    </Badge>
                  </div>
                  {res.balance > 0 && (
                    <p className="text-xs text-rose-600 font-medium mt-1">
                      Balance: {formatCurrency(res.balance)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <span className="text-sm text-gray-500">{page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* New Reservation Wizard Dialog */}
      <Dialog open={createOpen} onOpenChange={closeCreateDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {wizardStep === 1 ? (
                <><User className="h-5 w-5 text-violet-500" /> Step 1 of 2 — Guest Information</>
              ) : (
                <><BedDouble className="h-5 w-5 text-emerald-500" /> Step 2 of 2 — Booking Details</>
              )}
            </DialogTitle>
            <DialogDescription>
              {wizardStep === 1
                ? "Select an existing guest or register a new one."
                : "Choose a room and set the dates for this reservation."}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 py-1">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ wizardStep === 1 ? "bg-violet-600 text-white" : "bg-emerald-100 text-emerald-700" }`}>1</div>
            <div className={`h-0.5 flex-1 rounded ${ wizardStep === 2 ? "bg-emerald-400" : "bg-gray-200" }`} />
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ wizardStep === 2 ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-400" }`}>2</div>
          </div>

          {/* ── STEP 1: Guest ── */}
          {wizardStep === 1 && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Mode toggle */}
              <div className="flex p-1 rounded-full bg-gray-100 mb-4">
                <Button variant={guestMode === "existing" ? "default" : "ghost"} onClick={() => setGuestMode("existing")} className="flex-1 rounded-full shadow-sm">
                  <Search className="mr-2 h-4 w-4" />
                  {t("btnExistingGuest")}
                </Button>
                <Button variant={guestMode === "new" ? "default" : "ghost"} onClick={() => setGuestMode("new")} className="flex-1 rounded-full shadow-sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("btnNewGuest")}
                </Button>
              </div>

              {guestMode === "existing" ? (
                <div className="space-y-2">
                  <Label>{t("labelSearchGuest")} <span className="text-rose-500">*</span></Label>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={comboboxOpen} className="w-full justify-between font-normal">
                        {selectedGuestId ? allGuests.find((g) => g.id === selectedGuestId)?.name : t("placeholderSearchGuest")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={true}>
                        <CommandInput placeholder={t("placeholderSearchGuest")} />
                        <CommandList>
                          <CommandEmpty>{t("noGuestsFound")}</CommandEmpty>
                          <CommandGroup>
                            {allGuests.map((g) => (
                              <CommandItem key={g.id} value={`${g.name} ${g.phone}`} onSelect={() => { setSelectedGuestId(g.id); setComboboxOpen(false); }}>
                                <User className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="flex-1 truncate">{g.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{g.phone}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("labelFullName")} <span className="text-rose-500">*</span></Label>
                      <Input placeholder={t("placeholderFullName")} value={newGuestForm.name} onChange={(e) => setNewGuestForm({ ...newGuestForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("labelPhone")} <span className="text-rose-500">*</span></Label>
                      <Input type="tel" placeholder={t("placeholderPhone")} value={newGuestForm.phone} onChange={(e) => setNewGuestForm({ ...newGuestForm, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("labelEmail")}</Label>
                      <Input type="email" placeholder={t("placeholderEmail")} value={newGuestForm.email} onChange={(e) => setNewGuestForm({ ...newGuestForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("labelNationality")} <span className="text-rose-500">*</span></Label>
                      <Input placeholder={t("placeholderNationality")} value={newGuestForm.nationality} onChange={(e) => setNewGuestForm({ ...newGuestForm, nationality: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("labelIdType")} <span className="text-rose-500">*</span></Label>
                      <Select value={newGuestForm.idType} onValueChange={(v) => setNewGuestForm({ ...newGuestForm, idType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["National ID", "Passport", "Driver's License", "Other"].map((x) => (
                            <SelectItem key={x} value={x}>{x}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("labelIdNumber")}</Label>
                      <Input placeholder={t("placeholderIdNumber")} value={newGuestForm.idNumber} onChange={(e) => setNewGuestForm({ ...newGuestForm, idNumber: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("labelGuestAddress")}</Label>
                    <AddressFields
                      value={{
                        region: newGuestForm.region,
                        zone: newGuestForm.zone,
                        woreda: newGuestForm.woreda,
                        kebele: newGuestForm.kebele,
                        houseNumber: newGuestForm.houseNumber,
                        streetName: newGuestForm.streetName,
                      }}
                      onChange={(addr) => setNewGuestForm({ ...newGuestForm, ...addr })}
                      columns={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("labelPlateNumber")}</Label>
                      <Input placeholder={t("placeholderPlateNumber")} value={newGuestForm.plateNumber} onChange={(e) => setNewGuestForm({ ...newGuestForm, plateNumber: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("labelSecurityWeapon")}</Label>
                      <Input placeholder={t("placeholderSecurityWeapon")} value={newGuestForm.weapon} onChange={(e) => setNewGuestForm({ ...newGuestForm, weapon: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Booking ── */}
          {wizardStep === 2 && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Selected guest preview */}
              {(() => {
                const g = guestMode === "existing" ? allGuests.find((x) => x.id === selectedGuestId) : null;
                return (
                  <div className="flex items-center gap-2 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-200 text-violet-700 text-xs font-bold">
                      {guestMode === "new" ? newGuestForm.name.charAt(0).toUpperCase() || "N" : g?.name.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-violet-900">
                        {guestMode === "new" ? newGuestForm.name : g?.name}
                      </p>
                      <p className="text-xs text-violet-600">
                        {guestMode === "new" ? newGuestForm.phone : g?.phone}
                        {guestMode === "new" && ` · ${t("newGuestLabel")}`}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label>{t("labelRoom")} <span className="text-rose-500">*</span></Label>
                <Select value={createForm.roomId} onValueChange={(v) => setCreateForm({ ...createForm, roomId: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("placeholderSelectRoom")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="flex items-center gap-2">
                          <BedDouble className="h-3.5 w-3.5 text-gray-400" />
                          {r.name ? t("roomOptionWithName", { number: r.number, name: r.name, type: r.type, price: formatCurrency(r.pricePerNight) }) : t("roomOption", { number: r.number, type: r.type, price: formatCurrency(r.pricePerNight) })}
                        </span>
                      </SelectItem>
                    ))}
                    {availableRooms.length === 0 && (
                      <SelectItem value="__none" disabled>{t("noAvailableRooms")}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* ── Double/TWIN Room: Second Guest + Exception ── */}
              {(() => {
                const selRoom = allRooms.find((r) => r.id === createForm.roomId);
                const isDouble = selRoom && (selRoom.type === "DOUBLE" || selRoom.type === "TWIN");
                if (!isDouble) return null;
                return (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
                    <div className="flex items-center gap-2 text-amber-800">
                      <BedDouble className="h-4 w-4" />
                      <span className="text-xs font-semibold">{t("doubleRoomSecondGuestReq")}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="res-exception" checked={!createForm.exceptionallyReserved} onChange={() => setCreateForm({ ...createForm, exceptionallyReserved: false, exceptionReason: "" })} className="h-3.5 w-3.5 accent-emerald-600" />
                        <span className="text-xs font-medium">{t("twoGuests")}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="res-exception" checked={createForm.exceptionallyReserved} onChange={() => setCreateForm({ ...createForm, exceptionallyReserved: true, secondGuestName: "", secondGuestPhone: "", secondGuestIdNumber: "" })} className="h-3.5 w-3.5 accent-amber-600" />
                        <span className="text-xs font-medium text-amber-700">{t("labelExceptionallyReserved")}</span>
                      </label>
                    </div>
                    {!createForm.exceptionallyReserved ? (
                      <div className="space-y-2">
                        <p className="text-[10px] text-muted-foreground">{t("descSecondGuestDetails")}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>{t("labelSecondGuestName")} <span className="text-rose-500">*</span></Label>
                            <Input placeholder={t("placeholderSecondGuestName")} value={createForm.secondGuestName} onChange={(e) => setCreateForm({ ...createForm, secondGuestName: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>{t("labelSecondGuestPhone")} <span className="text-rose-500">*</span></Label>
                            <Input type="tel" placeholder={t("placeholderPhone")} value={createForm.secondGuestPhone} onChange={(e) => setCreateForm({ ...createForm, secondGuestPhone: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>{t("labelSecondGuestIdNumber")}</Label>
                          <Input placeholder={t("placeholderId")} value={createForm.secondGuestIdNumber} onChange={(e) => setCreateForm({ ...createForm, secondGuestIdNumber: e.target.value })} />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-700">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <p className="text-[10px] font-medium">{t("descSingleOccupancyException")}</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label>{t("labelExceptionReason")} <span className="text-rose-500">*</span></Label>
                          <Textarea placeholder={t("placeholderExceptionReason")} rows={2} value={createForm.exceptionReason} onChange={(e) => setCreateForm({ ...createForm, exceptionReason: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="check-in">{t("labelCheckIn")} <span className="text-rose-500">*</span></Label>
                  <Input id="check-in" type="date" value={createForm.checkIn} onChange={(e) => setCreateForm({ ...createForm, checkIn: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="check-out">{t("labelCheckOut")} <span className="text-rose-500">*</span></Label>
                  <Input id="check-out" type="date" value={createForm.checkOut} min={createForm.checkIn} onChange={(e) => setCreateForm({ ...createForm, checkOut: e.target.value })} />
                </div>
              </div>

              {/* Price summary */}
              {(createNights > 0 || createForm.roomId) && (
                <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t("priceSummary")}</p>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">{t("roomRate")}</span><span className="font-medium">{formatCurrency(createRate)}/night</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">{t("nights")}</span><span className="font-medium">{createNights}</span></div>
                  <Separator />
                  <div className="flex justify-between text-sm"><span className="font-semibold text-gray-900">{t("total")}</span><span className="font-bold text-gray-900">{formatCurrency(createTotal)}</span></div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="res-notes">{t("labelNotes")}</Label>
                <Textarea id="res-notes" placeholder={t("placeholderNotes")} rows={2} value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} />
              </div>
            </div>
          )}

          <DialogFooter className="flex-row gap-2">
            {wizardStep === 1 ? (
              <>
                <Button variant="outline" onClick={closeCreateDialog}>{t("btnCancel")}</Button>
                <Button onClick={() => setWizardStep(2)} disabled={!step1Valid} className="gap-1.5">
                  {t("btnNextBookingDetails")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setWizardStep(1)} className="gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  {t("btnBack")}
                </Button>
                <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
                  {creating ? t("btnCreating") : t("btnCreateReservation")}
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog (Check-in / Check-out / Cancel) */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmAction && ACTION_LABELS[confirmAction.type]?.icon}
              {confirmAction && ACTION_LABELS[confirmAction.type]?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && ACTION_LABELS[confirmAction.type]?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>{t("btnCancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction ? ACTION_LABELS[confirmAction.type]?.className : ""}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? t("btnProcessing") : confirmAction && ACTION_LABELS[confirmAction.type]?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-emerald-600" />
              {t("dialogRecordPaymentTitle")}
            </DialogTitle>
            <DialogDescription>
              {paymentDialog && (
                <>
                  {paymentDialog.guest?.name} — {t("labelRoom")} {paymentDialog.room?.number} · {t("descPaymentBalance")}{" "}
                  <span className="font-semibold text-rose-600">
                    {formatCurrency(paymentDialog.balance)}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {paymentDialog && (
            <div className="space-y-4 py-2">
              {/* Payment summary bar */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 p-2 border">
                  <p className="text-[10px] uppercase text-gray-500 tracking-wider">{t("labelTotalUpper")}</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(paymentDialog.totalCost)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                  <p className="text-[10px] uppercase text-emerald-600 tracking-wider">{t("labelPaidUpper")}</p>
                  <p className="text-sm font-bold text-emerald-700">{formatCurrency(paymentDialog.paidAmount)}</p>
                </div>
                <div className="rounded-lg bg-rose-50 p-2 border border-rose-100">
                  <p className="text-[10px] uppercase text-rose-600 tracking-wider">{t("labelBalanceUpper")}</p>
                  <p className="text-sm font-bold text-rose-700">{formatCurrency(paymentDialog.balance)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pay-amount">
                  {t("labelAmount")} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="pay-amount"
                  type="number"
                  placeholder="0"
                  min="0"
                  max={paymentDialog.balance}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
                {paymentForm.amount && Number(paymentForm.amount) > 0 && (
                  <p className="text-xs text-gray-500">
                    {t("afterPaymentRemaining", { amount: formatCurrency(paymentDialog.balance - Number(paymentForm.amount)) })}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("labelPaymentMethod")}</Label>
                <Select
                  value={paymentForm.method}
                  onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.charAt(0) + m.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pay-ref">{t("labelRefNumber")}</Label>
                <Input
                  id="pay-ref"
                  placeholder="Transaction reference"
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pay-notes">{t("labelNotes")}</Label>
                <Textarea
                  id="pay-notes"
                  placeholder="Payment notes..."
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>

              {/* Quick amount buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setPaymentForm({ ...paymentForm, amount: String(paymentDialog.balance) })}
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  {t("btnFullBalance")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setPaymentForm({ ...paymentForm, amount: String(paymentDialog.totalCost) })}
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  {t("btnFullTotal")}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>
              {t("btnCancel")}
            </Button>
            <Button onClick={handlePayment} disabled={paying} className="bg-amber-600 hover:bg-amber-700">
              {paying ? t("btnRecording") : t("btnRecordPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogDeleteDesc", { guest: deleteTarget?.guest?.name, room: deleteTarget?.room?.number })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btnCancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t("btnDeleting") : t("btnDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Room Conflict Dialog */}
      <Dialog open={!!conflictInfo} onOpenChange={(open) => { if (!open) setConflictInfo(null); }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {conflictInfo && (
            <>
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-rose-500 to-amber-500 px-6 py-8 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-black/5" />
                <div className="relative">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-4 ring-white/30">
                    <BedDouble className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">{t("dialogRoomConflictTitle")}</h2>
                  <p className="mt-1 text-sm text-white/80">{t("dialogRoomConflictDesc")}</p>
                </div>
              </div>
              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                {/* Room info card */}
                <div className="rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 font-bold text-lg">
                        {conflictInfo.roomNumber}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{conflictInfo.roomName || `${t("labelRoom")} ${conflictInfo.roomNumber}`}</p>
                        <p className="text-xs text-rose-500 font-medium">{t("unavailableForDates")}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Date range display */}
                <div className="rounded-xl bg-gray-50 border p-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">{t("reservedPeriod")}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-center">
                      <CalendarDays className="h-5 w-5 mx-auto text-rose-400 mb-1" />
                      <p className="text-xs text-gray-500">{t("from")}</p>
                      <p className="font-semibold text-gray-900 text-sm">{formatDate(conflictInfo.checkIn)}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-px w-8 bg-gray-300" />
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <div className="h-px w-8 bg-gray-300" />
                    </div>
                    <div className="flex-1 text-center">
                      <CalendarDays className="h-5 w-5 mx-auto text-rose-400 mb-1" />
                      <p className="text-xs text-gray-500">{t("to")}</p>
                      <p className="font-semibold text-gray-900 text-sm">{formatDate(conflictInfo.checkOut)}</p>
                    </div>
                  </div>
                </div>
                {/* Info note */}
                <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 leading-relaxed">
                    {t("conflictNote")}
                  </p>
                </div>
              </div>
              {/* Footer */}
              <div className="px-6 pb-6">
                <Button variant="outline" onClick={() => setConflictInfo(null)}>
                  {t("btnChooseAnotherRoom")}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
