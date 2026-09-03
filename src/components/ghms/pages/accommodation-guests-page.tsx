"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import {
  apiGetGuests,
  apiGetReservations,
  apiCheckin,
  apiCheckout,
  apiGetRooms,
  apiCreateReservation,
} from "@/lib/api";
import { toast } from "sonner";
import { isValidPhone } from "@/lib/utils";
import RoomAvailabilityCalendar from "@/components/ghms/room-availability-calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, LogIn, LogOut, Users, BedDouble, CalendarDays, AlertTriangle, UserPlus,
} from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/pagination-controls";

// ── Types ──
interface Guest {
  id: string; name: string; phone: string; idNumber: string; idType: string;
  nationality: string; email: string; vip: boolean; totalStays: number; totalSpent: number;
  createdAt: string;
}

interface Room { id: string; number: string; name: string; type: string; status: string; pricePerNight: number; }

interface Reservation {
  id: string; status: string; checkIn: string; checkOut: string; nights: number;
  totalCost: number; paidAmount: number; balance: number; paymentStatus: string;
  guest?: { id: string; name: string; phone: string; idNumber: string };
  room?: { id: string; number: string; name: string; type: string };
  secondGuestName?: string; secondGuestPhone?: string; secondGuestIdNumber?: string;
  exceptionallyReserved?: boolean; exceptionReason?: string;
  createdAt: string;
}

// ── Constants ──
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  OCCUPIED: "bg-blue-100 text-blue-800",
  MAINTENANCE: "bg-amber-100 text-amber-800",
  RESERVED: "bg-purple-100 text-purple-800",
};

const RES_STATUS: Record<string, { color: string; label: string }> = {
  UPCOMING: { color: "bg-blue-100 text-blue-800", label: "Upcoming" },
  ACTIVE: { color: "bg-emerald-100 text-emerald-800", label: "Checked In" },
  COMPLETED: { color: "bg-slate-100 text-slate-700", label: "Completed" },
  CANCELLED: { color: "bg-red-100 text-red-800", label: "Cancelled" },
};

const DOUBLE_ROOM_TYPES = ["DOUBLE", "TWIN"];

const emptyResForm = {
  guestId: "", roomId: "", checkIn: "", checkOut: "", notes: "",
  secondGuestName: "", secondGuestPhone: "", secondGuestIdNumber: "",
  exceptionallyReserved: false, exceptionReason: "",
};

// ── Helpers ──
function formatDate(d: string) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return d; }
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(v);
}

function todayStr() { return new Date().toISOString().split("T")[0]; }

function addDays(d: string, n: number) {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
}

// ── Component ──
export default function AccommodationGuestsPage() {
  const { t } = useTranslation("accommodation");
  const { refreshKey, triggerRefresh } = useAppStore();

  function resStatusLabel(status: string) {
    const key = `resStatus${status.charAt(0)}${status.slice(1).toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : status;
  }

  // Data
  const [guests, setGuests] = useState<Guest[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New reservation dialog
  const [resDialogOpen, setResDialogOpen] = useState(false);
  const [resForm, setResForm] = useState(emptyResForm);
  const [resGuestSearch, setResGuestSearch] = useState("");
  const [creatingRes, setCreatingRes] = useState(false);

  // Check-in / Check-out confirm
  const [confirmAction, setConfirmAction] = useState<{
    type: "checkin" | "checkout"; reservation: Reservation;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination
  const pagination = usePagination({ totalItems: 0, initialPageSize: 10, pageSizeOptions: [10, 20, 50] });

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [gData, rData, rmData] = await Promise.all([
        apiGetGuests(),
        apiGetReservations(),
        apiGetRooms(),
      ]);
      setGuests(Array.isArray(gData) ? gData : []);
      const rArr = Array.isArray(rData?.data) ? rData.data : Array.isArray(rData) ? rData : [];
      setReservations(rArr);
      // apiGetRooms already unwraps { rooms: [...] } to a plain array
      const raw = Array.isArray(rmData) ? rmData : Array.isArray(rmData?.rooms) ? rmData.rooms : [];
      setRooms(raw);
    } catch {
      toast.error(t("toastFailedLoadGuests"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  // ── Computed: active guests (have ACTIVE reservation) ──
  const activeReservations = useMemo(() =>
    reservations.filter((r) => r.status === "ACTIVE" || r.status === "UPCOMING"),
    [reservations]
  );

  const activeGuestIds = useMemo(() =>
    new Set(activeReservations.map((r) => r.guest?.id).filter(Boolean)),
    [activeReservations]
  );

  // Merge guests with their active reservation info
  const enrichedGuests = useMemo(() => {
    const activeMap = new Map<string, Reservation>();
    for (const r of activeReservations) {
      if (r.guest?.id && !activeMap.has(r.guest.id)) activeMap.set(r.guest.id, r);
    }
    return guests.map((g) => ({
      ...g,
      activeReservation: activeMap.get(g.id) || null,
    }));
  }, [guests, activeReservations]);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    let list = enrichedGuests;
    if (statusFilter === "CHECKED_IN") list = list.filter((g) => g.activeReservation?.status === "ACTIVE");
    else if (statusFilter === "UPCOMING") list = list.filter((g) => g.activeReservation?.status === "UPCOMING");
    else if (statusFilter === "NO_RESERVATION") list = list.filter((g) => !g.activeReservation);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.phone.toLowerCase().includes(q) ||
          g.idNumber.toLowerCase().includes(q)
      );
    }
    // Sort: checked-in first, then upcoming, then others. Within each, latest first.
    return [...list].sort((a, b) => {
      const aPri = a.activeReservation?.status === "ACTIVE" ? 2 : a.activeReservation?.status === "UPCOMING" ? 1 : 0;
      const bPri = b.activeReservation?.status === "ACTIVE" ? 2 : b.activeReservation?.status === "UPCOMING" ? 1 : 0;
      if (bPri !== aPri) return bPri - aPri;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [enrichedGuests, statusFilter, search]);

  // Update pagination total
  useEffect(() => { pagination.setTotalItems(filtered.length); }, [filtered.length, pagination]);
  const paginated = useMemo(() => pagination.paginate(filtered), [filtered, pagination]);

  // Available rooms for reservation
  const availableRooms = useMemo(() => rooms.filter((r) => r.status === "AVAILABLE"), [rooms]);

  // Guest search for reservation dialog
  const resGuestResults = useMemo(() => {
    if (!resGuestSearch || resGuestSearch.length < 2) return guests.slice(0, 10);
    const q = resGuestSearch.toLowerCase();
    return guests
      .filter((g) => g.name.toLowerCase().includes(q) || g.phone.includes(q) || g.idNumber.toLowerCase().includes(q))
      .slice(0, 10);
  }, [resGuestSearch, guests]);

  const resNights = useMemo(() => {
    if (!resForm.checkIn || !resForm.checkOut) return 0;
    return Math.max(1, Math.ceil((new Date(resForm.checkOut).getTime() - new Date(resForm.checkIn).getTime()) / 86400000));
  }, [resForm.checkIn, resForm.checkOut]);

  const resRate = useMemo(() => {
    const rm = rooms.find((r) => r.id === resForm.roomId);
    return rm ? rm.pricePerNight : 0;
  }, [resForm.roomId, rooms]);

  // Is the selected room a DOUBLE or TWIN?
  const selectedRoomIsDouble = useMemo(() => {
    const rm = rooms.find((r) => r.id === resForm.roomId);
    return rm ? DOUBLE_ROOM_TYPES.includes(rm.type) : false;
  }, [resForm.roomId, rooms]);

  // ── Handlers ──
  const handleCreateRes = async () => {
    if (!resForm.guestId || !resForm.roomId || !resForm.checkIn || !resForm.checkOut) {
      toast.error(t("toastFillRequired")); return;
    }
    // Client-side validation for double rooms
    if (selectedRoomIsDouble && !resForm.exceptionallyReserved) {
      if (!resForm.secondGuestName.trim() || !resForm.secondGuestPhone.trim()) {
        toast.error(t("toastSecondGuestRequired"));
        return;
      }
      if (!isValidPhone(resForm.secondGuestPhone)) {
        toast.error(t("toastInvalidSecondGuestPhone"));
        return;
      }
    }
    if (resForm.exceptionallyReserved && !resForm.exceptionReason.trim()) {
      toast.error(t("toastProvideExceptionReason")); return;
    }
    try {
      setCreatingRes(true);
      await apiCreateReservation({
        guestId: resForm.guestId, roomId: resForm.roomId,
        checkIn: resForm.checkIn, checkOut: resForm.checkOut, notes: resForm.notes,
        secondGuestName: resForm.secondGuestName,
        secondGuestPhone: resForm.secondGuestPhone,
        secondGuestIdNumber: resForm.secondGuestIdNumber,
        exceptionallyReserved: resForm.exceptionallyReserved,
        exceptionReason: resForm.exceptionReason,
      });
      toast.success(t("toastReservationCreated"));
      setResDialogOpen(false);
      setResForm(emptyResForm);
      setResGuestSearch("");
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toastFailedCreateReservation");
      toast.error(msg);
    } finally { setCreatingRes(false); }
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, reservation } = confirmAction;
    try {
      setActionLoading(true);
      if (type === "checkin") { await apiCheckin(reservation.id); toast.success(t("toastGuestCheckedIn")); }
      else { await apiCheckout(reservation.id); toast.success(t("toastGuestCheckedOut")); }
      setConfirmAction(null);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : (type === "checkin" ? t("toastFailedCheckIn") : t("toastFailedCheckOut")));
    } finally { setActionLoading(false); }
  };

  const quickCheckin = (r: Reservation) => setConfirmAction({ type: "checkin", reservation: r });
  const quickCheckout = (r: Reservation) => setConfirmAction({ type: "checkout", reservation: r });

  // ── Stats ──
  const stats = useMemo(() => ({
    total: guests.length,
    checkedIn: activeReservations.filter((r) => r.status === "ACTIVE").length,
    upcoming: activeReservations.filter((r) => r.status === "UPCOMING").length,
    availableRooms: rooms.filter((r) => r.status === "AVAILABLE").length,
  }), [guests, activeReservations, rooms]);

  // ── Render ──
  if (loading) {
    return (
      <div className="space-y-4 p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      </div>
    );
  }

  const actionInfo = confirmAction
    ? { label: confirmAction.type === "checkin" ? t("btnCheckIn") : t("btnCheckOut"), icon: confirmAction.type === "checkin" ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />, cls: confirmAction.type === "checkin" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-sky-600 hover:bg-sky-700", desc: confirmAction.type === "checkin" ? t("confirmCheckInDesc", { guest: confirmAction.reservation.guest?.name || "", room: confirmAction.reservation.room?.number || "" }) : t("confirmCheckOutDesc", { guest: confirmAction.reservation.guest?.name || "", room: confirmAction.reservation.room?.number || "" }) }
    : null;

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">{t("manageGuests", "Manage Guests")}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{t("manageGuestsDesc", "Manage guest check-in & check-out and reservations")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setResDialogOpen(true)} className="h-8 text-xs gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> {t("newReservation", "New Reservation")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("totalGuests", "Total Guests"), value: stats.total, icon: <Users className="h-4 w-4" />, color: "text-slate-700 bg-slate-50" },
          { label: t("checkedIn", "Checked In"), value: stats.checkedIn, icon: <BedDouble className="h-4 w-4" />, color: "text-emerald-700 bg-emerald-50" },
          { label: t("upcoming", "Upcoming"), value: stats.upcoming, icon: <CalendarDays className="h-4 w-4" />, color: "text-blue-700 bg-blue-50" },
          { label: t("availableRooms", "Available Rooms"), value: stats.availableRooms, icon: <BedDouble className="h-4 w-4" />, color: "text-purple-700 bg-purple-50" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-md ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-lg font-bold leading-tight">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("searchGuests", "Search by name, phone, or ID...")} value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); pagination.resetToFirst(); }}>
          <SelectTrigger className="h-9 w-full sm:w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allGuests", "All Guests")}</SelectItem>
            <SelectItem value="CHECKED_IN">{t("checkedIn", "Checked In")}</SelectItem>
            <SelectItem value="UPCOMING">{t("upcoming", "Upcoming")}</SelectItem>
            <SelectItem value="NO_RESERVATION">{t("noReservation", "No Reservation")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Guest List */}
      <div className="rounded-xl border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-3 h-10 w-10 text-muted--foreground/40" />
            <p className="text-sm text-muted-foreground">{t("noGuestsFound")}</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="divide-y md:hidden">
              {paginated.map((g) => (
                <div key={g.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${g.activeReservation?.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : g.activeReservation?.status === "UPCOMING" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium">{g.name}</p>
                          {g.vip && <span className="text-[9px] text-amber-600 font-semibold">VIP</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{g.phone}{g.idNumber ? ` | ${g.idNumber}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {g.activeReservation?.exceptionallyReserved && (
                        <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-300">{t("exceptionBadge")}</Badge>
                      )}
                      {g.activeReservation && (
                        <Badge variant="outline" className={`text-[9px] shrink-0 ${RES_STATUS[g.activeReservation.status]?.color || ""}`}>
                          {resStatusLabel(g.activeReservation.status)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {g.activeReservation && g.activeReservation.room && (
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-10">
                      <span>{g.activeReservation.room.name ? t("roomWithName", { number: g.activeReservation.room.number, name: g.activeReservation.room.name }) : t("roomPrefix", { number: g.activeReservation.room.number })}</span>
                      <span>{formatDate(g.activeReservation.checkIn)} → {formatDate(g.activeReservation.checkOut)}</span>
                    </div>
                  )}
                  {g.activeReservation?.secondGuestName && (
                    <div className="text-[10px] text-muted-foreground pl-10 flex items-center gap-1">
                      <UserPlus className="h-3 w-3" /> {t("secondGuestPrefix")} {g.activeReservation.secondGuestName}{g.activeReservation.secondGuestPhone ? ` (${g.activeReservation.secondGuestPhone})` : ""}
                    </div>
                  )}
                  {g.activeReservation && (
                    <div className="flex gap-2 pl-10">
                      {g.activeReservation.status === "UPCOMING" && (
                        <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => quickCheckin(g.activeReservation!)}>
                          <LogIn className="h-3 w-3" /> {t("btnCheckIn")}
                        </Button>
                      )}
                      {g.activeReservation.status === "ACTIVE" && (
                        <Button size="sm" className="h-7 text-[10px] gap-1 bg-sky-600 hover:bg-sky-700" onClick={() => quickCheckout(g.activeReservation!)}>
                          <LogOut className="h-3 w-3" /> {t("btnCheckOut")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("thGuest", "Guest")}</TableHead>
                    <TableHead>{t("thPhoneId", "Phone / ID")}</TableHead>
                    <TableHead>{t("thStatus", "Status")}</TableHead>
                    <TableHead>{t("thRoom", "Room")}</TableHead>
                    <TableHead>{t("thSecondGuest", "Second Guest")}</TableHead>
                    <TableHead>{t("thStayPeriod", "Stay Period")}</TableHead>
                    <TableHead>{t("thAmount", "Amount")}</TableHead>
                    <TableHead className="text-right">{t("thActions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((g) => (
                    <TableRow key={g.id} className={g.activeReservation?.status === "ACTIVE" ? "bg-emerald-50/30" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${g.activeReservation?.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : g.activeReservation?.status === "UPCOMING" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                            {g.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium">{g.name}{g.vip ? " \u2605" : ""}</p>
                              {g.activeReservation?.exceptionallyReserved && (
                                <Badge variant="outline" className="text-[8px] bg-amber-50 text-amber-700 border-amber-300 px-1 py-0">{t("exceptionBadge")}</Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{t("staysAndTotal", { stays: g.totalStays, total: formatCurrency(g.totalSpent) })}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs">{g.phone || "—"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{g.idNumber || "—"}</p>
                      </TableCell>
                      <TableCell>
                        {g.activeReservation ? (
                          <Badge variant="outline" className={`text-[10px] ${RES_STATUS[g.activeReservation.status]?.color || ""}`}>
                            {resStatusLabel(g.activeReservation.status)}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {g.activeReservation?.room ? (
                          <span>{g.activeReservation.room.name ? t("roomWithName", { number: g.activeReservation.room.number, name: g.activeReservation.room.name }) : t("roomPrefix", { number: g.activeReservation.room.number })}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {g.activeReservation?.secondGuestName ? (
                          <div>
                            <p className="font-medium">{g.activeReservation.secondGuestName}</p>
                            <p className="text-[10px] text-muted-foreground">{g.activeReservation.secondGuestPhone || ""}</p>
                          </div>
                        ) : g.activeReservation?.exceptionallyReserved ? (
                          <span className="text-[10px] text-amber-600">{t("naException")}</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {g.activeReservation ? `${formatDate(g.activeReservation.checkIn)} → ${formatDate(g.activeReservation.checkOut)}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {g.activeReservation ? formatCurrency(g.activeReservation.totalCost) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {g.activeReservation?.status === "UPCOMING" && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => quickCheckin(g.activeReservation!)}>
                              <LogIn className="h-3 w-3" /> {t("btnCheckIn", "Check In")}
                            </Button>
                          )}
                          {g.activeReservation?.status === "ACTIVE" && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-sky-700 border-sky-300 hover:bg-sky-50" onClick={() => quickCheckout(g.activeReservation!)}>
                              <LogOut className="h-3 w-3" /> {t("btnCheckOut", "Check Out")}
                            </Button>
                          )}
                          {!g.activeReservation && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => { setResDialogOpen(true); setResForm({ ...emptyResForm, guestId: g.id }); setResGuestSearch(g.name); }}>
                              <CalendarDays className="h-3 w-3" /> {t("btnReserve")}
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

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <PaginationControls
          currentPage={pagination.currentPage} totalPages={pagination.totalPages}
          pageSize={pagination.pageSize} pageSizeOptions={pagination.pageSizeOptions}
          totalItems={pagination.rangeInfo.total} rangeInfo={pagination.rangeInfo}
          goToPage={pagination.goToPage} setPageSize={pagination.setPageSize}
        />
      )}

      {/* ── New Reservation Dialog ── */}
      <Dialog open={resDialogOpen} onOpenChange={(open) => { if (!open) { setResDialogOpen(false); setResForm(emptyResForm); setResGuestSearch(""); } }}>
        <DialogContent className="max-w-lg mx-4 w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> {t("dlgNewReservationTitle")}</DialogTitle>
            <DialogDescription>{t("dlgNewReservationDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Guest Select */}
            <div>
              <Label>{t('lblguest', 'Guest')} *</Label>
              {resForm.guestId ? (
                <div className="flex items-center gap-2 mt-1 p-2 rounded-md border bg-muted/30">
                  <span className="text-sm font-medium flex-1">{guests.find((g) => g.id === resForm.guestId)?.name || t("selected")}</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setResForm({ ...resForm, guestId: "" }); setResGuestSearch(""); }}>{t("change")}</Button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={resGuestSearch} onChange={(e) => setResGuestSearch(e.target.value)} placeholder={t("phSearchGuest")} className="h-9 pl-8 text-sm" />
                </div>
              )}
              {!resForm.guestId && resGuestResults.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded-md border">
                  {resGuestResults.map((g) => (
                    <button key={g.id} className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 border-b last:border-b-0 flex justify-between items-center" onClick={() => { setResForm({ ...resForm, guestId: g.id }); setResGuestSearch(g.name); }}>
                      <span className="font-medium">{g.name}</span>
                      <span className="text-muted-foreground">{g.phone}{g.idNumber ? ` | ${g.idNumber}` : ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Room Select */}
            <div>
              <Label>{t('lblroom', 'Room')} *</Label>
              <Select value={resForm.roomId} onValueChange={(v) => setResForm({ ...resForm, roomId: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t("phSelectRoom")} /></SelectTrigger>
                <SelectContent>
                  {availableRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name ? t("roomWithName", { number: r.number, name: r.name }) : t("roomPrefix", { number: r.number })} — {r.type} — {formatCurrency(r.pricePerNight)}/night</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Double/TWIN Room: Second Guest + Exception ── */}
            {selectedRoomIsDouble && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <BedDouble className="h-4 w-4" />
                  <span className="text-xs font-semibold">{t("doubleRoomSecondGuestRequired")}</span>
                </div>

                {/* Exception toggle */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exceptionallyReserved"
                      checked={!resForm.exceptionallyReserved}
                      onChange={() => setResForm({ ...resForm, exceptionallyReserved: false, exceptionReason: "" })}
                      className="h-3.5 w-3.5 text-emerald-600 accent-emerald-600"
                    />
                    <span className="text-xs font-medium">{t("twoGuests")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exceptionallyReserved"
                      checked={resForm.exceptionallyReserved}
                      onChange={() => setResForm({ ...resForm, exceptionallyReserved: true, secondGuestName: "", secondGuestPhone: "", secondGuestIdNumber: "" })}
                      className="h-3.5 w-3.5 text-amber-600 accent-amber-600"
                    />
                    <span className="text-xs font-medium text-amber-700">{t("exceptionallyReserved")}</span>
                  </label>
                </div>

                {!resForm.exceptionallyReserved ? (
                  /* Second guest fields */
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground">{t("secondGuestDetailsHint")}</p>
                    <div>
                      <Label>{t('lblsecondGuestName', 'Second Guest Name')} *</Label>
                      <Input
                        value={resForm.secondGuestName}
                        onChange={(e) => setResForm({ ...resForm, secondGuestName: e.target.value })}
                        placeholder={t("phSecondGuestName")}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label>{t('lblsecondGuestPhone', 'Second Guest Phone')} *</Label>
                      <Input
                        type="tel"
                        value={resForm.secondGuestPhone}
                        onChange={(e) => setResForm({ ...resForm, secondGuestPhone: e.target.value })}
                        placeholder={t("phSecondGuestPhone")}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label>{t('lblsecondGuestIdNumber', 'Second Guest ID Number')}</Label>
                      <Input
                        value={resForm.secondGuestIdNumber}
                        onChange={(e) => setResForm({ ...resForm, secondGuestIdNumber: e.target.value })}
                        placeholder={t("phSecondGuestId")}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  /* Exception reason field */
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <p className="text-[10px] font-medium">{t("singleOccupancyException")}</p>
                    </div>
                    <div>
                      <Label>{t('lblexceptionReason', 'Exception Reason')} *</Label>
                      <Textarea
                        value={resForm.exceptionReason}
                        onChange={(e) => setResForm({ ...resForm, exceptionReason: e.target.value })}
                        placeholder={t("phExceptionReason")}
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Availability calendar — occupied days are disabled (not clickable);
                a checkout day stays open as the next arrival */}
            <RoomAvailabilityCalendar
              roomId={resForm.roomId || undefined}
              checkIn={resForm.checkIn}
              checkOut={resForm.checkOut}
              onChange={(v) => setResForm((f) => ({ ...f, ...v }))}
            />
            {resNights > 0 && resRate > 0 && (
              <div className="rounded-md bg-muted/50 p-2 flex justify-between text-xs">
                <span>{t("nightsTimes", { nights: resNights, rate: formatCurrency(resRate) })}</span>
                <span className="font-bold">{formatCurrency(resNights * resRate)}</span>
              </div>
            )}
            <div><Label>{t('lblnotes', 'Notes')}</Label><Input value={resForm.notes} onChange={(e) => setResForm({ ...resForm, notes: e.target.value })} placeholder={t("phNotes")} className="h-9 text-sm" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setResDialogOpen(false); setResForm(emptyResForm); setResGuestSearch(""); }}>{t("cancel")}</Button>
            <Button size="sm" onClick={handleCreateRes} disabled={creatingRes || !resForm.guestId || !resForm.roomId}>{creatingRes ? t("btnCreating") : t("btnCreateReservation")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Check-in / Check-out Confirm ── */}
      {actionInfo && confirmAction && (
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">{actionInfo.icon} {actionInfo.label}</AlertDialogTitle>
              <AlertDialogDescription>{actionInfo.desc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction className={actionInfo.cls} onClick={handleAction} disabled={actionLoading}>{actionLoading ? t("btnProcessing") : actionInfo.label}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
