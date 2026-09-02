"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import {
  apiGetRooms,
  apiCreateRoom,
  apiGetReservations,
  apiGetGuests,
  apiCreateReservation,
  apiCreateGuest,
  apiAuth,
  apiLogout,
  apiCheckin,
  apiCheckout,
  apiUpdateReservation,
  apiUpdateRoomStatus,
} from "@/lib/api";
import { isValidPhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  BedSingle,
  BedDouble,
  Hotel,
  Crown,
  Star,
  Search,
  CalendarPlus,
  LogIn,
  LogOut,
  Users,
  X,
  ChevronRight,
  ArrowLeft,
  ArrowUpDown,
  Clock,
  AlertTriangle,
  UserPlus,
  Building2,
  ExternalLink,
  Wifi,
  Tv,
  Wind,
  Coffee,
  ShowerHead,
  Car,
  Layers,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Power,
  Plus,
} from "lucide-react";

// ── Types ──
interface Room {
  id: string; number: string; name: string; type: string; status: string;
  pricePerNight: number; floor: number; capacity: number; amenities: string;
}

interface Guest {
  id: string; name: string; phone: string; idNumber: string; idType: string;
  nationality: string; email: string; vip: boolean;
}

interface Reservation {
  id: string; status: string; checkIn: string; checkOut: string; nights: number;
  totalCost: number; paidAmount: number; balance: number; paymentStatus: string;
  guest: { id: string; name: string; phone: string } | null;
  room: { id: string; number: string; name: string; type: string; pricePerNight: number } | null;
  roomId?: string;
  secondGuestName?: string; secondGuestPhone?: string; secondGuestIdNumber?: string;
  exceptionallyReserved?: boolean; exceptionReason?: string;
}

// ── Constants ──
type Tab = "rooms" | "reservations" | "guests" | "main";

const ROOM_TYPE_ICONS: Record<string, React.ReactNode> = {
  SINGLE: <BedSingle className="h-4 w-4" />,
  DOUBLE: <BedDouble className="h-4 w-4" />,
  TWIN: <Hotel className="h-4 w-4" />,
  SUITE: <Crown className="h-4 w-4" />,
  DELUXE: <Star className="h-4 w-4" />,
};

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  OCCUPIED: "bg-rose-100 text-rose-800 border-rose-200",
  MAINTENANCE: "bg-amber-100 text-amber-800 border-amber-200",
  RESERVED: "bg-sky-100 text-sky-800 border-sky-200",
};

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: "bg-emerald-500",
  OCCUPIED: "bg-rose-500",
  MAINTENANCE: "bg-amber-500",
  RESERVED: "bg-sky-500",
};

const RES_STATUS: Record<string, { color: string; label: string }> = {
  UPCOMING: { color: "bg-blue-100 text-blue-800", label: "Upcoming" },
  ACTIVE: { color: "bg-emerald-100 text-emerald-800", label: "Checked In" },
  COMPLETED: { color: "bg-slate-100 text-slate-700", label: "Completed" },
  CANCELLED: { color: "bg-red-100 text-red-800", label: "Cancelled" },
};

const DOUBLE_ROOM_TYPES = ["DOUBLE", "TWIN"];

const ROOM_FORM_DEFAULTS = {
  number: "", type: "SINGLE", pricePerNight: "", floor: "1", capacity: "1", amenities: "",
};

const RES_FORM_DEFAULTS = {
  guestId: "", roomId: "", checkIn: todayStr(), checkOut: addDays(todayStr(), 1),
  notes: "", secondGuestName: "", secondGuestPhone: "", secondGuestIdNumber: "",
  exceptionallyReserved: false, exceptionReason: "",
  // Direct guest fields
  guestMode: "registered" as "registered" | "direct",
  directName: "", directPhone: "", directIdNumber: "", directIdType: "NATIONAL", directNationality: "Ethiopian",
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi: <Wifi className="h-3 w-3" />,
  TV: <Tv className="h-3 w-3" />,
  AC: <Wind className="h-3 w-3" />,
  "Mini Bar": <Coffee className="h-3 w-3" />,
  "Hot Water": <ShowerHead className="h-3 w-3" />,
  Parking: <Car className="h-3 w-3" />,
};

// ── Helpers ──
function formatDate(d: string) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return d; }
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

function getFloorFromNumber(num: string): number | null {
  const match = num.match(/^\d/);
  return match ? parseInt(match[0], 10) : null;
}

function parseAmenities(amenitiesStr: string | null | undefined): string[] {
  if (!amenitiesStr) return [];
  try {
    const parsed = JSON.parse(amenitiesStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return amenitiesStr.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

// ── Component ──
export default function MobileApp() {
  const { t, i18n } = useTranslation("mobile");
  const { currentUser, setCurrentUser, triggerRefresh } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>("rooms");
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Add room
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomForm, setRoomForm] = useState(ROOM_FORM_DEFAULTS);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [roomResMap, setRoomResMap] = useState<Record<string, Reservation>>({});

  // Guest search
  const [guestSearch, setGuestSearch] = useState("");

  // Room detail sheet
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomReservations, setRoomReservations] = useState<Reservation[]>([]);
  const [roomResLoading, setRoomResLoading] = useState(false);

  // New reservation
  const [showNewRes, setShowNewRes] = useState(false);
  const [resForm, setResForm] = useState(RES_FORM_DEFAULTS);
  const [resGuestSearch, setResGuestSearch] = useState("");
  const [creatingRes, setCreatingRes] = useState(false);

  // Check-in / Check-out confirm
  const [confirmAction, setConfirmAction] = useState<{
    type: "checkin" | "checkout"; res: Reservation;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Extend stay
  const [showExtend, setShowExtend] = useState(false);
  const [extendRes, setExtendRes] = useState<Reservation | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [extending, setExtending] = useState(false);

  // Early checkout
  const [showEarlyCheckout, setShowEarlyCheckout] = useState(false);
  const [earlyCheckoutRes, setEarlyCheckoutRes] = useState<Reservation | null>(null);
  const [earlyCheckingOut, setEarlyCheckingOut] = useState(false);

  // Floor filter
  const [floorFilter, setFloorFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // ── Fetch all data ──
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rmRaw, upRes, acRes, gRaw] = await Promise.all([
        apiGetRooms(),
        apiGetReservations("status=UPCOMING&limit=100").catch(() => []),
        apiGetReservations("status=ACTIVE&limit=100").catch(() => []),
        apiGetGuests(),
      ]);

      const rmList = Array.isArray(rmRaw.rooms) ? rmRaw.rooms : Array.isArray(rmRaw) ? rmRaw : [];
      const statusOrder: Record<string, number> = { AVAILABLE: 0, RESERVED: 1, OCCUPIED: 2, MAINTENANCE: 3 };
      rmList.sort((a: Room, b: Room) => {
        const oa = statusOrder[a.status] ?? 9;
        const ob = statusOrder[b.status] ?? 9;
        if (oa !== ob) return oa - ob;
        const fa = getFloorFromNumber(a.number) ?? a.floor ?? 0;
        const fb = getFloorFromNumber(b.number) ?? b.floor ?? 0;
        return fa - fb;
      });
      setRooms(rmList);

      const allRes: Reservation[] = [
        ...(Array.isArray(upRes?.data) ? upRes.data : Array.isArray(upRes) ? upRes : []),
        ...(Array.isArray(acRes?.data) ? acRes.data : Array.isArray(acRes) ? acRes : []),
      ];
      setReservations(allRes);
      const map: Record<string, Reservation> = {};
      for (const r of allRes) {
        if (r.roomId && !map[r.roomId]) map[r.roomId] = r;
      }
      setRoomResMap(map);

      setGuests(Array.isArray(gRaw) ? gRaw : []);
    } catch {
      toast.error(t("toastFailedLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Room detail reservations
  const fetchRoomReservations = useCallback(async (roomId: string) => {
    try {
      setRoomResLoading(true);
      const data = await apiGetReservations(`roomId=${roomId}`);
      setRoomReservations(Array.isArray(data) ? data : []);
    } catch { setRoomReservations([]); }
    finally { setRoomResLoading(false); }
  }, []);

  // Open room detail
  const openRoomDetail = useCallback((room: Room) => {
    setSelectedRoom(room);
    fetchRoomReservations(room.id);
  }, [fetchRoomReservations]);

  // ── Computed ──
  const floors = useMemo(() => {
    const set = new Set<number>();
    rooms.forEach((r) => { const f = getFloorFromNumber(r.number); if (f !== null) set.add(f); });
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (statusFilter && room.status !== statusFilter) return false;
      if (floorFilter !== null && getFloorFromNumber(room.number) !== floorFilter) return false;
      return true;
    });
  }, [rooms, statusFilter, floorFilter]);

  const filteredGuests = useMemo(() => {
    if (!guestSearch || guestSearch.length < 1) return guests.slice(0, 20);
    const q = guestSearch.toLowerCase();
    return guests.filter((g) =>
      g.name.toLowerCase().includes(q) || g.phone.includes(q) || g.idNumber.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [guestSearch, guests]);

  const guestResMap = useMemo(() => {
    const map = new Map<string, Reservation>();
    for (const r of reservations) {
      if (r.guest?.id && !map.has(r.guest.id)) map.set(r.guest.id, r);
    }
    return map;
  }, [reservations]);

  const resGuestResults = useMemo(() => {
    if (!resGuestSearch || resGuestSearch.length < 2) return guests.slice(0, 10);
    const q = resGuestSearch.toLowerCase();
    return guests.filter((g) =>
      g.name.toLowerCase().includes(q) || g.phone.includes(q) || g.idNumber.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [resGuestSearch, guests]);

  const availableRooms = useMemo(() => rooms.filter((r) => r.status === "AVAILABLE"), [rooms]);

  const selectedRoomIsDouble = useMemo(() => {
    const rm = rooms.find((r) => r.id === resForm.roomId);
    return rm ? DOUBLE_ROOM_TYPES.includes(rm.type) : false;
  }, [resForm.roomId, rooms]);

  const resNights = useMemo(() => {
    if (!resForm.checkIn || !resForm.checkOut) return 0;
    return Math.max(1, Math.ceil((new Date(resForm.checkOut).getTime() - new Date(resForm.checkIn).getTime()) / 86400000));
  }, [resForm.checkIn, resForm.checkOut]);

  const resRate = useMemo(() => {
    const rm = rooms.find((r) => r.id === resForm.roomId);
    return rm ? rm.pricePerNight : 0;
  }, [resForm.roomId, rooms]);

  const stats = useMemo(() => ({
    total: rooms.length,
    available: rooms.filter((r) => r.status === "AVAILABLE").length,
    occupied: rooms.filter((r) => r.status === "OCCUPIED").length,
    reserved: rooms.filter((r) => r.status === "RESERVED").length,
    upcoming: reservations.filter((r) => r.status === "UPCOMING").length,
    checkedIn: reservations.filter((r) => r.status === "ACTIVE").length,
  }), [rooms, reservations]);

  // ── Handlers ──
  const handleCreateRes = async () => {
    if (resForm.guestMode === "direct") {
      if (!resForm.directName.trim() || !resForm.directPhone.trim()) {
        toast.error(t("toastFillRequired")); return;
      }
      if (!isValidPhone(resForm.directPhone)) {
        toast.error(t("toastInvalidPhone")); return;
      }
    } else {
      if (!resForm.guestId) {
        toast.error(t("toastFillRequired")); return;
      }
    }
    if (!resForm.roomId || !resForm.checkIn || !resForm.checkOut) {
      toast.error(t("toastFillRequired")); return;
    }
    if (selectedRoomIsDouble && !resForm.exceptionallyReserved) {
      if (!resForm.secondGuestName.trim() || !resForm.secondGuestPhone.trim()) {
        toast.error(t("toastSecondGuestRequired")); return;
      }
      if (!isValidPhone(resForm.secondGuestPhone)) {
        toast.error(t("toastInvalidPhone")); return;
      }
    }
    try {
      setCreatingRes(true);
      let guestId = resForm.guestId;

      // Direct guest: create guest first
      if (resForm.guestMode === "direct") {
        const newGuest = await apiCreateGuest({
          name: resForm.directName.trim(),
          phone: resForm.directPhone.trim(),
          idNumber: resForm.directIdNumber.trim() || undefined,
          idType: resForm.directIdType,
          nationality: resForm.directNationality.trim() || undefined,
        });
        guestId = newGuest?.id || newGuest?.guest?.id;
        if (!guestId) {
          toast.error(t("toastFailedCreateGuest")); return;
        }
      }

      await apiCreateReservation({
        guestId,
        roomId: resForm.roomId,
        checkIn: resForm.checkIn, checkOut: resForm.checkOut, notes: resForm.notes,
        secondGuestName: resForm.secondGuestName, secondGuestPhone: resForm.secondGuestPhone,
        secondGuestIdNumber: resForm.secondGuestIdNumber,
        exceptionallyReserved: resForm.exceptionallyReserved, exceptionReason: resForm.exceptionReason,
      });
      toast.success(resForm.guestMode === "direct" ? t("toastGuestCreated") : t("toastResCreated"));
      setShowNewRes(false);
      setResForm(RES_FORM_DEFAULTS);
      setResGuestSearch("");
      triggerRefresh();
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toastFailedCreateRes");
      toast.error(msg);
    } finally { setCreatingRes(false); }
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, res } = confirmAction;
    try {
      setActionLoading(true);
      if (type === "checkin") {
        await apiCheckin(res.id); toast.success(t("toastCheckedIn"));
      } else {
        await apiCheckout(res.id); toast.success(t("toastCheckedOut"));
      }
      setConfirmAction(null);
      triggerRefresh();
      await fetchData();
      if (selectedRoom) fetchRoomReservations(selectedRoom.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedAction"));
    } finally { setActionLoading(false); }
  };

  const handleExtendStay = async () => {
    if (!extendRes || !extendDate || extendDate <= extendRes.checkOut) {
      toast.error(t("toastInvalidDate")); return;
    }
    try {
      setExtending(true);
      await apiUpdateReservation(extendRes.id, { checkOut: extendDate });
      toast.success(t("toastExtended"));
      setShowExtend(false); setExtendRes(null); setExtendDate("");
      triggerRefresh(); await fetchData();
      if (selectedRoom) fetchRoomReservations(selectedRoom.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedExtend"));
    } finally { setExtending(false); }
  };

  const handleEarlyCheckout = async () => {
    if (!earlyCheckoutRes) return;
    try {
      setEarlyCheckingOut(true);
      await apiCheckout(earlyCheckoutRes.id);
      toast.success(t("toastCheckedOut"));
      setShowEarlyCheckout(false); setEarlyCheckoutRes(null); setSelectedRoom(null);
      triggerRefresh(); await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedAction"));
    } finally { setEarlyCheckingOut(false); }
  };

  const handleReserveFromRoom = (room: Room) => {
    setResForm((f) => ({ ...f, roomId: room.id }));
    setShowNewRes(true);
  };

  const toggleLang = () => {
    const next = i18n.language === "am" ? "en" : "am";
    i18n.changeLanguage(next);
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await apiLogout();
    setCurrentUser(null);
  };

  const handleCreateRoom = async () => {
    if (!roomForm.number.trim() || !roomForm.type || !roomForm.pricePerNight || !roomForm.floor || !roomForm.capacity) {
      toast.error(t("toastFillRequired")); return;
    }
    try {
      setCreatingRoom(true);
      await apiCreateRoom({
        number: roomForm.number.trim(),
        type: roomForm.type,
        pricePerNight: Number(roomForm.pricePerNight),
        floor: Number(roomForm.floor),
        capacity: Number(roomForm.capacity),
        amenities: roomForm.amenities || "[]",
      });
      toast.success(t("toastRoomCreated"));
      setShowAddRoom(false);
      setRoomForm(ROOM_FORM_DEFAULTS);
      triggerRefresh();
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toastFailedCreateRoom");
      toast.error(msg);
    } finally { setCreatingRoom(false); }
  };

  // ── Render: Loading ──
  if (loading) {
    return (
      <div className="pb-20 px-4 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white px-4 pt-[env(safe-area-inset-top)] pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight">GHMS</h1>
            <p className="text-[11px] text-slate-400">{currentUser?.name} &middot; {currentUser?.providerName || ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="rounded-full bg-slate-800 p-2 text-slate-400 active:bg-slate-700 transition-colors"
              title={t("logout")}
            >
              <Power className="h-4 w-4" />
            </button>
            <button
              onClick={toggleLang}
              className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 active:bg-slate-700 transition-colors"
            >
              {i18n.language === "am" ? "EN" : "አማ"}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { label: t("statAvailable"), value: stats.available, color: "bg-emerald-500" },
            { label: t("statReserved"), value: stats.reserved, color: "bg-sky-500" },
            { label: t("statOccupied"), value: stats.occupied, color: "bg-rose-500" },
            { label: t("statTotal"), value: stats.total, color: "bg-slate-500" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-slate-800 p-2 text-center">
              <div className={`mx-auto mb-1 h-1.5 w-1.5 rounded-full ${s.color}`} />
              <p className="text-lg font-bold leading-tight">{s.value}</p>
              <p className="text-[9px] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {activeTab === "rooms" && (
          <RoomsTab
            rooms={filteredRooms} roomResMap={roomResMap} floors={floors}
            floorFilter={floorFilter} setFloorFilter={setFloorFilter}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            onRoomTap={openRoomDetail} onReserve={handleReserveFromRoom}
            onAddRoom={() => setShowAddRoom(true)}
            t={t} formatDate={formatDate} formatCurrency={formatCurrency} parseAmenities={parseAmenities}
          />
        )}
        {activeTab === "reservations" && (
          <ReservationsTab
            reservations={reservations} onCheckin={(r) => setConfirmAction({ type: "checkin", res: r })}
            onCheckout={(r) => setConfirmAction({ type: "checkout", res: r })}
            onExtend={(r) => { setExtendRes(r); setExtendDate(addDays(r.checkOut, 1)); setShowExtend(true); }}
            onEarlyCheckout={(r) => { setEarlyCheckoutRes(r); setShowEarlyCheckout(true); }}
            t={t} formatDate={formatDate} formatCurrency={formatCurrency}
          />
        )}
        {activeTab === "guests" && (
          <GuestsTab
            guests={filteredGuests} search={guestSearch} setSearch={setGuestSearch}
            guestResMap={guestResMap} onReserve={handleReserveFromRoom}
            t={t} formatDate={formatDate} formatCurrency={formatCurrency}
          />
        )}
        {activeTab === "main" && (
          <MainSystemTab t={t} />
        )}
      </main>

      {/* Room Detail Sheet */}
      <Dialog open={!!selectedRoom} onOpenChange={(open) => { if (!open) setSelectedRoom(null); }}>
        <DialogContent className="max-w-md mx-4 w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          {selectedRoom && (
            <RoomDetailSheet
              room={selectedRoom} reservation={roomResMap[selectedRoom.id] || null}
              reservations={roomReservations} resLoading={roomResLoading}
              onReserve={() => handleReserveFromRoom(selectedRoom)}
              onExtend={(r) => { setExtendRes(r); setExtendDate(addDays(r.checkOut, 1)); setShowExtend(true); }}
              onEarlyCheckout={(r) => { setEarlyCheckoutRes(r); setShowEarlyCheckout(true); }}
              onClose={() => setSelectedRoom(null)}
              t={t} formatDate={formatDate} formatCurrency={formatCurrency} parseAmenities={parseAmenities}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* New Reservation Dialog */}
      <Dialog open={showNewRes} onOpenChange={(open) => {
        if (!open) { setShowNewRes(false); setResGuestSearch(""); }
      }}>
        <DialogContent className="max-w-md mx-4 w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5" /> {t("newResTitle")}</DialogTitle>
            <DialogDescription>{t("newResDesc")}</DialogDescription>
          </DialogHeader>
          <NewReservationForm
            form={resForm} onUpdate={(patch) => setResForm((f) => ({ ...f, ...patch }))}
            guests={guests} guestSearch={resGuestSearch} setGuestSearch={setResGuestSearch}
            guestResults={resGuestResults} availableRooms={availableRooms}
            isDouble={selectedRoomIsDouble}
            nights={resNights} rate={resRate}
            creating={creatingRes} onSubmit={handleCreateRes} onCancel={() => { setShowNewRes(false); setResGuestSearch(""); }}
            t={t} formatCurrency={formatCurrency}
          />
        </DialogContent>
      </Dialog>

      {/* Check-in / Check-out Confirm */}
      {confirmAction && (
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {confirmAction.type === "checkin" ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
                {confirmAction.type === "checkin" ? t("btnCheckIn") : t("btnCheckOut")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction.type === "checkin"
                  ? t("confirmCheckInDesc", { guest: confirmAction.res.guest?.name || "", room: confirmAction.res.room?.number || "" })
                  : t("confirmCheckOutDesc", { guest: confirmAction.res.guest?.name || "", room: confirmAction.res.room?.number || "" })
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className={confirmAction.type === "checkin" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-sky-600 hover:bg-sky-700"}
                onClick={handleAction} disabled={actionLoading}
              >{actionLoading ? t("processing") : (confirmAction.type === "checkin" ? t("btnCheckIn") : t("btnCheckOut"))}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Extend Stay Dialog */}
      <Dialog open={showExtend} onOpenChange={(open) => { if (!open) { setShowExtend(false); setExtendRes(null); } }}>
        <DialogContent className="max-w-sm mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>{t("extendTitle")}</DialogTitle>
            <DialogDescription>{t("extendDesc", { current: formatDate(extendRes?.checkOut || "") })}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>{t("newCheckoutDate")}</Label>
            <Input type="date" value={extendDate} min={extendRes?.checkOut || todayStr()} onChange={(e) => setExtendDate(e.target.value)} className="mt-1" />
            {extendDate && extendRes && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("extendNights", { nights: Math.max(1, Math.ceil((new Date(extendDate).getTime() - new Date(extendRes.checkOut).getTime()) / 86400000)), rate: formatCurrency(extendRes.room?.pricePerNight || 0) })}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowExtend(false); setExtendRes(null); }}>{t("cancel")}</Button>
            <Button size="sm" onClick={handleExtendStay} disabled={extending || !extendDate}>{extending ? t("processing") : t("btnExtend")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Early Checkout Dialog */}
      <AlertDialog open={showEarlyCheckout} onOpenChange={(open) => { if (!open) { setShowEarlyCheckout(false); setEarlyCheckoutRes(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("earlyCheckoutTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("earlyCheckoutDesc", { guest: earlyCheckoutRes?.guest?.name || "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={earlyCheckingOut}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={handleEarlyCheckout} disabled={earlyCheckingOut}>
              {earlyCheckingOut ? t("processing") : t("btnEarlyCheckout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirm Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={(open) => { if (!open) setShowLogoutConfirm(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logout")}</AlertDialogTitle>
            <AlertDialogDescription>{t("logoutConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={handleLogout}>{t("logout")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Room Dialog */}
      <Dialog open={showAddRoom} onOpenChange={(open) => { if (!open) { setShowAddRoom(false); setRoomForm(ROOM_FORM_DEFAULTS); } }}>
        <DialogContent className="max-w-md mx-4 w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> {t("addRoomTitle")}</DialogTitle>
            <DialogDescription>{t("addRoomDesc")}</DialogDescription>
          </DialogHeader>
          <AddRoomForm
            form={roomForm} onUpdate={(patch) => setRoomForm((f) => ({ ...f, ...patch }))}
            creating={creatingRoom} onSubmit={handleCreateRoom} onCancel={() => { setShowAddRoom(false); setRoomForm(ROOM_FORM_DEFAULTS); }}
            t={t} formatCurrency={formatCurrency}
          />
        </DialogContent>
      </Dialog>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 h-16">
          {([
            { key: "rooms" as Tab, icon: <BedSingle className="h-5 w-5" />, label: t("tabRooms") },
            { key: "reservations" as Tab, icon: <CalendarPlus className="h-5 w-5" />, label: t("tabReservations") },
            { key: "guests" as Tab, icon: <Users className="h-5 w-5" />, label: t("tabGuests") },
            { key: "main" as Tab, icon: <ExternalLink className="h-5 w-5" />, label: t("tabMainSystem") },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key === "main") {
                  if (typeof window !== "undefined") window.location.href = "/";
                  return;
                }
                setActiveTab(tab.key);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeTab === tab.key ? "text-slate-900" : "text-gray-400 active:text-gray-600"
              }`}
            >
              <div className={activeTab === tab.key ? "p-1 rounded-lg bg-slate-100" : ""}>{tab.icon}</div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ── Sub-components ──

function RoomsTab({ rooms, roomResMap, floors, floorFilter, setFloorFilter, statusFilter, setStatusFilter, onRoomTap, onReserve, onAddRoom, t, formatDate, formatCurrency, parseAmenities }: {
  rooms: Room[]; roomResMap: Record<string, Reservation>; floors: number[];
  floorFilter: number | null; setFloorFilter: (f: number | null) => void;
  statusFilter: string | null; setStatusFilter: (s: string | null) => void;
  onRoomTap: (r: Room) => void; onReserve: (r: Room) => void; onAddRoom: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
  formatDate: (d: string) => string; formatCurrency: (v: number) => string;
  parseAmenities: (a: string | null | undefined) => string[];
}) {
  return (
    <div className="px-4 pt-4 space-y-3">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">{t("tabRooms")} ({rooms.length})</h2>
        <button
          onClick={onAddRoom}
          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white active:bg-emerald-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> {t("addRoomBtn")}
        </button>
      </div>

      {/* Floor & Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => { setFloorFilter(null); setStatusFilter(null); }}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            !floorFilter && !statusFilter ? "bg-slate-900 text-white" : "bg-white text-gray-600 border"
          }`}
        >{t("filterAll")}</button>
        {floors.slice(0, 4).map((f) => (
          <button
            key={f} onClick={() => setFloorFilter(floorFilter === f ? null : f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              floorFilter === f ? "bg-slate-900 text-white" : "bg-white text-gray-600 border"
            }`}
          >{t("filterFloor", { floor: f })}</button>
        ))}
        <button
          onClick={() => setStatusFilter(statusFilter === "AVAILABLE" ? null : "AVAILABLE")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            statusFilter === "AVAILABLE" ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 border border-emerald-200"
          }`}
        >{t("statusAvailable")}</button>
        <button
          onClick={() => setStatusFilter(statusFilter === "RESERVED" ? null : "RESERVED")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            statusFilter === "RESERVED" ? "bg-sky-600 text-white" : "bg-white text-sky-700 border border-sky-200"
          }`}
        >{t("statusReserved")}</button>
      </div>

      {/* Room Grid */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <BedSingle className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">{t("noRooms")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {rooms.map((room) => {
            const amenities = parseAmenities(room.amenities);
            const res = roomResMap[room.id];
            return (
              <div
                key={room.id}
                className="rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
              >
                {/* Status dot bar */}
                <div className={`h-1.5 ${STATUS_DOT[room.status]}`} />

                <div className="p-3 space-y-2" onClick={() => onRoomTap(room)}>
                  {/* Room header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                        {ROOM_TYPE_ICONS[room.type] || <BedSingle className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-tight">{room.number}</p>
                        <p className="text-[10px] text-gray-400">{room.type}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status badge with tooltip for reserved/occupied */}
                  {(room.status === "RESERVED" || room.status === "OCCUPIED") && res ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[room.status]} cursor-help`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[room.status]}`} />
                          {t("status" + room.status.charAt(0) + room.status.slice(1).toLowerCase())}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-gray-900 text-white border-0">
                        <div className="text-[11px] space-y-0.5">
                          {res.guest && <p className="font-semibold">{res.guest.name}</p>}
                          <p>{t("tooltipFrom")} {formatDate(res.checkIn)}</p>
                          <p>{t("tooltipTo")} {formatDate(res.checkOut)}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[room.status]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[room.status]}`} />
                      {t("status" + room.status.charAt(0) + room.status.slice(1).toLowerCase())}
                    </div>
                  )}

                  {/* Price */}
                  <p className="text-xs text-gray-500">{formatCurrency(room.pricePerNight)}<span className="text-gray-400"> /{t("night")}</span></p>

                  {/* Guest name for occupied/reserved */}
                  {res?.guest && (room.status === "OCCUPIED" || room.status === "RESERVED") && (
                    <p className="text-[11px] text-gray-500 truncate">{res.guest.name}</p>
                  )}
                </div>

                {/* Action button */}
                <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
                  {room.status === "AVAILABLE" ? (
                    <button
                      onClick={() => onReserve(room)}
                      className="w-full rounded-xl bg-emerald-600 text-white py-2.5 text-xs font-semibold active:bg-emerald-700 transition-colors"
                    >{t("btnReserve")}</button>
                  ) : room.status === "RESERVED" ? (
                    <button
                      onClick={() => onRoomTap(room)}
                      className="w-full rounded-xl bg-sky-600 text-white py-2.5 text-xs font-semibold active:bg-sky-700 transition-colors"
                    >{t("btnManage")}</button>
                  ) : (
                    <button
                      onClick={() => {
                        if (res) {
                          toast.warning(t("toastRoomOccupied", { number: room.number, from: formatDate(res.checkIn), to: formatDate(res.checkOut), guest: res.guest?.name || "" }));
                        }
                      }}
                      className="w-full rounded-xl bg-gray-100 text-gray-500 py-2.5 text-xs font-semibold active:bg-gray-200 transition-colors"
                    >{t("btnViewDetail")}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReservationsTab({ reservations, onCheckin, onCheckout, onExtend, onEarlyCheckout, t, formatDate, formatCurrency }: {
  reservations: Reservation[];
  onCheckin: (r: Reservation) => void; onCheckout: (r: Reservation) => void;
  onExtend: (r: Reservation) => void; onEarlyCheckout: (r: Reservation) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
  formatDate: (d: string) => string; formatCurrency: (v: number) => string;
}) {
  const [filter, setFilter] = useState<string>("ALL");
  const filtered = filter === "ALL" ? reservations : reservations.filter((r) => r.status === filter);

  return (
    <div className="px-4 pt-4 space-y-3">
      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["ALL", "UPCOMING", "ACTIVE"].map((s) => (
          <button
            key={s} onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s ? "bg-slate-900 text-white" : "bg-white text-gray-600 border"
            }`}
          >{s === "ALL" ? t("filterAll") : s === "UPCOMING" ? t("statusUpcoming") : t("statusActive")}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <CalendarPlus className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">{t("noReservations")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((res) => (
            <div key={res.id} className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    res.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {(res.guest?.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{res.guest?.name || "—"}</p>
                    <p className="text-[11px] text-gray-400">{res.guest?.phone || ""}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${RES_STATUS[res.status]?.color || ""}`}>
                  {res.status === "UPCOMING" ? t("statusUpcoming") : t("statusActive")}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2 pl-[50px]">
                <BedSingle className="h-3 w-3" />
                <span>{res.room?.number || "—"}</span>
                <span>&middot;</span>
                <span>{formatDate(res.checkIn)} → {formatDate(res.checkOut)}</span>
              </div>

              <div className="flex items-center gap-2 pl-[50px]">
                {res.status === "UPCOMING" && (
                  <button
                    onClick={() => onCheckin(res)}
                    className="flex-1 rounded-xl bg-emerald-600 text-white py-2 text-xs font-semibold active:bg-emerald-700 transition-colors"
                  >{t("btnCheckIn")}</button>
                )}
                {res.status === "ACTIVE" && (
                  <>
                    <button
                      onClick={() => onEarlyCheckout(res)}
                      className="flex-1 rounded-xl bg-rose-100 text-rose-700 py-2 text-xs font-semibold active:bg-rose-200 transition-colors"
                    >{t("btnEarlyCheckout")}</button>
                    <button
                      onClick={() => onExtend(res)}
                      className="flex-1 rounded-xl bg-sky-100 text-sky-700 py-2 text-xs font-semibold active:bg-sky-200 transition-colors"
                    >{t("btnExtend")}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GuestsTab({ guests, search, setSearch, guestResMap, onReserve, t, formatDate, formatCurrency }: {
  guests: Guest[]; search: string; setSearch: (s: string) => void;
  guestResMap: Map<string, Reservation>; onReserve: (r: Room) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
  formatDate: (d: string) => string; formatCurrency: (v: number) => string;
}) {
  return (
    <div className="px-4 pt-4 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchGuests")}
          className="pl-9 h-11 rounded-xl bg-white border-gray-200 text-sm"
        />
      </div>

      {guests.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Users className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">{t("noGuests")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {guests.map((g) => {
            const res = guestResMap.get(g.id);
            return (
              <div key={g.id} className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    res?.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700"
                    : res?.status === "UPCOMING" ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                  }`}>
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{g.name}</p>
                    <p className="text-[11px] text-gray-400">{g.phone}{g.idNumber ? ` · ${g.idNumber}` : ""}</p>
                  </div>
                  {res && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${RES_STATUS[res.status]?.color || ""}`}>
                      {res.status === "UPCOMING" ? t("statusUpcoming") : t("statusActive")}
                    </span>
                  )}
                </div>
                {res && res.room && (
                  <div className="mt-2 pl-14 text-[11px] text-gray-500 flex items-center gap-1.5">
                    <BedSingle className="h-3 w-3" />
                    <span>{res.room.number}</span>
                    <span>&middot;</span>
                    <span>{formatDate(res.checkIn)} → {formatDate(res.checkOut)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MainSystemTab({ t }: { t: (k: string) => string }) {
  return (
    <div className="px-4 pt-12 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <ExternalLink className="h-8 w-8 text-slate-400" />
      </div>
      <h2 className="text-lg font-bold mb-2">{t("mainSystemTitle")}</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">{t("mainSystemDesc")}</p>
      <button
        onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }}
        className="rounded-xl bg-slate-900 text-white px-6 py-3 text-sm font-semibold active:bg-slate-800 transition-colors"
      >{t("btnOpenMain")}</button>
    </div>
  );
}

function RoomDetailSheet({ room, reservation, reservations, resLoading, onReserve, onExtend, onEarlyCheckout, onClose, t, formatDate, formatCurrency, parseAmenities }: {
  room: Room; reservation: Reservation | null; reservations: Reservation[];
  resLoading: boolean; onReserve: () => void; onExtend: (r: Reservation) => void;
  onEarlyCheckout: (r: Reservation) => void; onClose: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
  formatDate: (d: string) => string; formatCurrency: (v: number) => string;
  parseAmenities: (a: string | null | undefined) => string[];
}) {
  const amenities = parseAmenities(room.amenities);
  const activeRes = reservations.find((r) => r.status === "ACTIVE" || r.status === "UPCOMING");

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {ROOM_TYPE_ICONS[room.type] || <BedSingle className="h-5 w-5" />}
          {room.name ? `${room.number} — ${room.name}` : room.number}
        </DialogTitle>
        <DialogDescription>{t("roomType" + room.type.charAt(0) + room.type.slice(1).toLowerCase())} &middot; {t("floorLabel", { floor: getFloorFromNumber(room.number) ?? room.floor })}</DialogDescription>
      </DialogHeader>

      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[room.status]}`}>
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[room.status]}`} />
        {t("status" + room.status.charAt(0) + room.status.slice(1).toLowerCase())}
      </div>

      {/* Current reservation info */}
      {activeRes && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-800">{t("currentReservation")}</p>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">{activeRes.guest?.name || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(activeRes.checkIn)} → {formatDate(activeRes.checkOut)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <DollarSign className="h-3.5 w-3.5" />
            <span>{formatCurrency(activeRes.totalCost)}</span>
          </div>
          <div className="flex gap-2 pt-1">
            {activeRes.status === "UPCOMING" && (
              <button
                onClick={() => { onClose(); /* trigger checkin from parent */ }}
                className="flex-1 rounded-lg bg-emerald-600 text-white py-2 text-xs font-semibold"
              >{t("btnCheckIn")}</button>
            )}
            {activeRes.status === "ACTIVE" && (
              <>
                <button onClick={() => onEarlyCheckout(activeRes)} className="flex-1 rounded-lg bg-rose-100 text-rose-700 py-2 text-xs font-semibold">{t("btnEarlyCheckout")}</button>
                <button onClick={() => onExtend(activeRes)} className="flex-1 rounded-lg bg-sky-100 text-sky-700 py-2 text-xs font-semibold">{t("btnExtend")}</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 p-2.5">
          <p className="text-[10px] text-gray-400 mb-0.5">{t("pricePerNight")}</p>
          <p className="text-sm font-bold">{formatCurrency(room.pricePerNight)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2.5">
          <p className="text-[10px] text-gray-400 mb-0.5">{t("capacity")}</p>
          <p className="text-sm font-bold">{t("guest", { count: room.capacity })}</p>
        </div>
      </div>

      {/* Amenities */}
      {amenities.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">{t("amenities")}</p>
          <div className="flex flex-wrap gap-1.5">
            {amenities.slice(0, 6).map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">
                {AMENITY_ICONS[a] || <Layers className="h-3 w-3" />}{a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reservation history */}
      {!resLoading && reservations.length > 1 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">{t("reservationHistory")}</p>
          <div className="space-y-1.5">
            {reservations.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                <div>
                  <p className="font-medium">{r.guest?.name || "—"}</p>
                  <p className="text-gray-400">{formatDate(r.checkIn)} → {formatDate(r.checkOut)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RES_STATUS[r.status]?.color || ""}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reserve button for available rooms */}
      {room.status === "AVAILABLE" && (
        <Button onClick={onReserve} className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-sm font-semibold rounded-xl">
          <CalendarPlus className="mr-2 h-4 w-4" />{t("btnReserve")}
        </Button>
      )}
    </div>
  );
}

function NewReservationForm({ form, onUpdate, guests, guestSearch, setGuestSearch, guestResults, availableRooms, isDouble, nights, rate, creating, onSubmit, onCancel, t, formatCurrency }: {
  form: typeof RES_FORM_DEFAULTS; onUpdate: (patch: Partial<typeof RES_FORM_DEFAULTS>) => void;
  guests: Guest[]; guestSearch: string; setGuestSearch: (s: string) => void;
  guestResults: Guest[]; availableRooms: Room[]; isDouble: boolean;
  nights: number; rate: number; creating: boolean; onSubmit: () => void; onCancel: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string; formatCurrency: (v: number) => string;
}) {
  const isDirect = form.guestMode === "direct";
  const canSubmit = isDirect
    ? (form.directName.trim() && form.directPhone.trim() && form.roomId)
    : (form.guestId && form.roomId);

  return (
    <div className="space-y-4">
      {/* Guest Mode Toggle */}
      <div className="flex rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => onUpdate({ guestMode: "registered" })}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
            !isDirect ? "bg-white text-slate-900 shadow-sm" : "text-gray-500"
          }`}
        >{t("toggleRegistered")}</button>
        <button
          type="button"
          onClick={() => onUpdate({ guestMode: "direct" })}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
            isDirect ? "bg-white text-slate-900 shadow-sm" : "text-gray-500"
          }`}
        >{t("toggleNewGuest")}</button>
      </div>

      {/* Guest Section */}
      {isDirect ? (
        /* Direct guest entry */
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <UserPlus className="h-4 w-4" />
            <span className="text-xs font-semibold">{t("directResTitle")}</span>
          </div>
          <div>
            <Label className="text-xs font-semibold">{t("lblGuestName")} *</Label>
            <Input value={form.directName} onChange={(e) => onUpdate({ directName: e.target.value })} placeholder={t("phGuestName")} className="mt-1.5 h-11 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs font-semibold">{t("lblGuestPhone")} *</Label>
            <Input type="tel" value={form.directPhone} onChange={(e) => onUpdate({ directPhone: e.target.value })} placeholder={t("phGuestPhone")} className="mt-1.5 h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">{t("lblGuestIdType")}</Label>
              <Select value={form.directIdType} onValueChange={(v) => onUpdate({ directIdType: v })}>
                <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATIONAL">{t("idTypeNational")}</SelectItem>
                  <SelectItem value="PASSPORT">{t("idTypePassport")}</SelectItem>
                  <SelectItem value="DRIVER">{t("idTypeDriver")}</SelectItem>
                  <SelectItem value="OTHER">{t("idTypeOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">{t("lblGuestIdNumber")}</Label>
              <Input value={form.directIdNumber} onChange={(e) => onUpdate({ directIdNumber: e.target.value })} placeholder={t("phGuestIdNumber")} className="mt-1.5 h-11 rounded-xl" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">{t("lblGuestNationality")}</Label>
            <Input value={form.directNationality} onChange={(e) => onUpdate({ directNationality: e.target.value })} placeholder={t("phGuestNationality")} className="mt-1.5 h-11 rounded-xl" />
          </div>
        </div>
      ) : (
        /* Registered guest search */
        <div>
          <Label className="text-xs font-semibold">{t("lblGuest")}</Label>
          {form.guestId ? (
            <div className="mt-1.5 flex items-center justify-between rounded-xl border bg-gray-50 p-3">
              <span className="text-sm font-medium">{guests.find((g) => g.id === form.guestId)?.name || ""}</span>
              <button onClick={() => { onUpdate({ guestId: "" }); setGuestSearch(""); }} className="text-xs text-rose-500">{t("change")}</button>
            </div>
          ) : (
            <>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder={t("searchGuestPlaceholder")} className="pl-9 h-11 rounded-xl" />
              </div>
              {guestResults.length > 0 && !form.guestId && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded-xl border bg-white">
                  {guestResults.map((g) => (
                    <button key={g.id} className="w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 border-b last:border-b-0 flex justify-between items-center"
                      onClick={() => { onUpdate({ guestId: g.id }); setGuestSearch(g.name); }}>
                      <span className="font-medium">{g.name}</span>
                      <span className="text-gray-400">{g.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {/* Room Select */}
      <div>
        <Label className="text-xs font-semibold">{t("lblRoom")} *</Label>
        <Select value={form.roomId} onValueChange={(v) => onUpdate({ roomId: v })}>
          <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue placeholder={t("selectRoomPlaceholder")} /></SelectTrigger>
          <SelectContent>
            {availableRooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.number} — {r.type} — {formatCurrency(r.pricePerNight)}/{t("night")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold">{t("lblCheckIn")} *</Label>
          <Input type="date" value={form.checkIn} min={todayStr()}
            onChange={(e) => onUpdate({ checkIn: e.target.value, checkOut: form.checkOut < e.target.value ? addDays(e.target.value, 1) : form.checkOut })}
            className="mt-1.5 h-11 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs font-semibold">{t("lblCheckOut")} *</Label>
          <Input type="date" value={form.checkOut} min={form.checkIn || todayStr()}
            onChange={(e) => onUpdate({ checkOut: e.target.value })}
            className="mt-1.5 h-11 rounded-xl" />
        </div>
      </div>
      {/* Cost preview */}
      {nights > 0 && rate > 0 && (
        <div className="rounded-xl bg-gray-50 p-3 flex justify-between items-center">
          <span className="text-xs text-gray-500">{nights} {t("nights")} × {formatCurrency(rate)}</span>
          <span className="text-sm font-bold">{formatCurrency(nights * rate)}</span>
        </div>
      )}
      {/* Second guest for double rooms */}
      {isDouble && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <BedDouble className="h-4 w-4" />
            <span className="text-xs font-semibold">{t("doubleRoomSecondGuest")}</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="mob-exception" checked={!form.exceptionallyReserved}
                onChange={() => onUpdate({ exceptionallyReserved: false, exceptionReason: "" })} className="h-3.5 w-3.5 accent-emerald-600" />
              <span className="text-xs font-medium">{t("twoGuests")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="mob-exception" checked={form.exceptionallyReserved}
                onChange={() => onUpdate({ exceptionallyReserved: true, secondGuestName: "", secondGuestPhone: "", secondGuestIdNumber: "" })} className="h-3.5 w-3.5 accent-amber-600" />
              <span className="text-xs font-medium text-amber-700">{t("exceptionallyReserved")}</span>
            </label>
          </div>
          {!form.exceptionallyReserved ? (
            <div className="space-y-2">
              <Input value={form.secondGuestName} onChange={(e) => onUpdate({ secondGuestName: e.target.value })} placeholder={t("phSecondGuestName")} className="h-10 rounded-lg text-sm" />
              <Input type="tel" value={form.secondGuestPhone} onChange={(e) => onUpdate({ secondGuestPhone: e.target.value })} placeholder={t("phSecondGuestPhone")} className="h-10 rounded-lg text-sm" />
              <Input value={form.secondGuestIdNumber} onChange={(e) => onUpdate({ secondGuestIdNumber: e.target.value })} placeholder={t("phSecondGuestId")} className="h-10 rounded-lg text-sm" />
            </div>
          ) : (
            <Textarea value={form.exceptionReason} onChange={(e) => onUpdate({ exceptionReason: e.target.value })} placeholder={t("phExceptionReason")} className="min-h-[60px] text-sm rounded-lg" />
          )}
        </div>
      )}
      {/* Notes */}
      <div>
        <Label className="text-xs font-semibold">{t("lblNotes")}</Label>
        <Input value={form.notes} onChange={(e) => onUpdate({ notes: e.target.value })} placeholder={t("phNotes")} className="mt-1.5 h-11 rounded-xl" />
      </div>
      {/* Actions */}
      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={onCancel}>{t("cancel")}</Button>
        <Button size="lg" className="flex-1 rounded-xl" onClick={onSubmit} disabled={creating || !canSubmit}>
          {creating ? t("processing") : t("btnCreateReservation")}
        </Button>
      </DialogFooter>
    </div>
  );
}

function AddRoomForm({ form, onUpdate, creating, onSubmit, onCancel, t, formatCurrency }: {
  form: typeof ROOM_FORM_DEFAULTS; onUpdate: (patch: Partial<typeof ROOM_FORM_DEFAULTS>) => void;
  creating: boolean; onSubmit: () => void; onCancel: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string; formatCurrency: (v: number) => string;
}) {
  const canSubmit = form.number.trim() && form.type && form.pricePerNight && form.floor && form.capacity;
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold">{t("addRoomNumber")} *</Label>
        <Input value={form.number} onChange={(e) => onUpdate({ number: e.target.value })} placeholder={t("phRoomNumber")} className="mt-1.5 h-11 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold">{t("addRoomType")} *</Label>
          <Select value={form.type} onValueChange={(v) => {
            const cap = (v === "DOUBLE" || v === "TWIN") ? "2" : "1";
            onUpdate({ type: v, capacity: cap });
          }}>
            <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SINGLE">{t("roomTypeSINGLE")}</SelectItem>
              <SelectItem value="DOUBLE">{t("roomTypeDOUBLE")}</SelectItem>
              <SelectItem value="TWIN">{t("roomTypeTWIN")}</SelectItem>
              <SelectItem value="SUITE">{t("roomTypeSUITE")}</SelectItem>
              <SelectItem value="DELUXE">{t("roomTypeDELUXE")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold">{t("addRoomPrice")} *</Label>
          <Input type="number" value={form.pricePerNight} onChange={(e) => onUpdate({ pricePerNight: e.target.value })} placeholder="0" className="mt-1.5 h-11 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold">{t("addRoomFloor")} *</Label>
          <Input type="number" value={form.floor} onChange={(e) => onUpdate({ floor: e.target.value })} placeholder="1" className="mt-1.5 h-11 rounded-xl" />
        </div>
        <div>
          <Label className="text-xs font-semibold">{t("addRoomCapacity")} *</Label>
          <Input type="number" value={form.capacity} onChange={(e) => onUpdate({ capacity: e.target.value })} placeholder="1" className="mt-1.5 h-11 rounded-xl" />
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold">{t("amenities")}</Label>
        <Input value={form.amenities} onChange={(e) => onUpdate({ amenities: e.target.value })} placeholder={t("phAmenities")} className="mt-1.5 h-11 rounded-xl" />
        <p className="mt-1 text-[10px] text-gray-400">WiFi, TV, AC, Mini Bar, Hot Water, Parking</p>
      </div>
      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={onCancel}>{t("cancel")}</Button>
        <Button size="lg" className="flex-1 rounded-xl" onClick={onSubmit} disabled={creating || !canSubmit}>
          {creating ? t("processing") : t("addRoomBtn")}
        </Button>
      </DialogFooter>
    </div>
  );
}
