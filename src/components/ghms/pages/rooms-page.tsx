"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { formatDaysRemaining, formatCycle } from "@/lib/subscription";
import {
  apiGetRooms,
  apiCreateRoom,
  apiUpdateRoom,
  apiDeleteRoom,
  apiUpdateRoomStatus,
  apiImportRooms,
  apiGetReservations,
  apiUpdateReservation,
  apiCheckout,
} from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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
  ChevronDown,
  Pencil,
  User,
  CalendarDays,
  CreditCard,
  Clock,
  Trash2,
  Users,
  BedSingle,
  BedDouble,
  Hotel,
  Crown,
  Star,
  Building2,
  Layers,
  Wifi,
  Info,
  CalendarPlus,
  CalendarClock,
  LogOut,
  ArrowRightLeft,
  Tv,
  Wind,
  Coffee,
  ShowerHead,
  Car,
  DollarSign,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ClipboardList,
} from "lucide-react";

interface Room {
  id: string;
  number: string;
  name: string;
  type: string;
  pricePerNight: number;
  floor: number;
  capacity: number;
  status: string;
  amenities: string;
  description: string;
  image: string | null;
}

interface ImportResult {
  number: string;
  status: string;
  error?: string;
}

interface RoomReservation {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomRate: number;
  totalCost: number;
  paidAmount: number;
  balance: number;
  paymentStatus: string;
  guest: { id: string; name: string; phone: string } | null;
}

const ROOM_TYPES = ["SINGLE", "DOUBLE", "TWIN", "SUITE", "DELUXE"] as const;

const ROOM_TYPE_ICONS: Record<string, React.ReactNode> = {
  SINGLE: <BedSingle className="h-4 w-4" />,
  DOUBLE: <BedDouble className="h-4 w-4" />,
  TWIN: <Hotel className="h-4 w-4" />,
  SUITE: <Crown className="h-4 w-4" />,
  DELUXE: <Star className="h-4 w-4" />,
};

const ROOM_TYPE_COLORS: Record<string, string> = {
  SINGLE: "bg-sky-50 text-sky-700 border-sky-200",
  DOUBLE: "bg-violet-50 text-violet-700 border-violet-200",
  TWIN: "bg-teal-50 text-teal-700 border-teal-200",
  SUITE: "bg-amber-50 text-amber-700 border-amber-200",
  DELUXE: "bg-rose-50 text-rose-700 border-rose-200",
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

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi: <Wifi className="h-3 w-3" />,
  TV: <Tv className="h-3 w-3" />,
  AC: <Wind className="h-3 w-3" />,
  "Mini Bar": <Coffee className="h-3 w-3" />,
  "Hot Water": <ShowerHead className="h-3 w-3" />,
  Parking: <Car className="h-3 w-3" />,
};

// Derive floor from first digit of room number (e.g. "102" → 1, "201" → 2)
const getFloorFromNumber = (num: string): number | null => {
  const match = num.match(/^\d/);
  return match ? parseInt(match[0], 10) : null;
};

const emptyForm = {
  number: "",
  type: "SINGLE",
  pricePerNight: "",
  floor: "",
  capacity: "",
  amenities: "[]",
  description: "",
};

// ── Excel template columns ───────────────────────────────────────────────────
const TEMPLATE_COLUMNS = ["number", "type", "pricePerNight", "floor", "capacity", "amenities", "description"];
const TEMPLATE_EXAMPLE = [
  { number: "101", type: "SINGLE", pricePerNight: 500, floor: 1, capacity: 1, amenities: "WiFi, TV", description: "Standard single room" },
  { number: "102", type: "DOUBLE", pricePerNight: 900, floor: 1, capacity: 2, amenities: "WiFi, TV, AC", description: "Comfortable double room" },
  { number: "201", type: "SUITE",  pricePerNight: 1800, floor: 2, capacity: 3, amenities: "WiFi, TV, AC, Mini Bar", description: "Luxury suite" },
];

async function downloadTemplate() {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(TEMPLATE_EXAMPLE, { header: TEMPLATE_COLUMNS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rooms");
  XLSX.writeFile(wb, "rooms_import_template.xlsx");
}

// ── Subscription Status Badge (for Rooms page header) ──
function SubscriptionBadge() {
  const { currentUser, subscription } = useAppStore();

  // Only show for OPERATOR/STAFF
  if (!currentUser || (currentUser.role !== "OPERATOR" && currentUser.role !== "STAFF")) return null;
  if (!subscription) return null;

  const isActive = subscription.status === "ACTIVE";
  const isWarning = subscription.status === "WARNING";
  const isExpired = subscription.status === "EXPIRED";
  const isSuspended = subscription.status === "SUSPENDED";

  const badgeClass = isActive
    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
    : isSuspended || isExpired
    ? "border-rose-300 bg-rose-50 text-rose-700"
    : "border-amber-300 bg-amber-50 text-amber-700";

  const dotClass = isActive
    ? "bg-emerald-500"
    : isSuspended || isExpired
    ? "bg-rose-500"
    : "bg-amber-500";

  const label = isActive
    ? "Active"
    : isSuspended
    ? "Suspended"
    : isExpired
    ? "Expired"
    : "Expiring";

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass} animate-subtle-pulse`}>
      <span className={`relative flex h-2 w-2`}>
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotClass}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`} />
      </span>
      <span>{label}</span>
      <span className="font-mono text-[11px] opacity-70">{Math.abs(subscription.daysRemaining)}d</span>
    </div>
  );
}

export default function RoomsPage() {
  const { t } = useTranslation("rooms");
  const { refreshKey, triggerRefresh, setCurrentPage, setPreselectedRoom } = useAppStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState("");
  const [floorFilter, setFloorFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // single-room dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // delete
  const [deleteDialog, setDeleteDialog] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);

  // room info detail
  const [infoRoom, setInfoRoom] = useState<Room | null>(null);
  const [roomReservations, setRoomReservations] = useState<RoomReservation[]>([]);
  const [roomResLoading, setRoomResLoading] = useState(false);

  // extend stay dialog
  const [extendDialog, setExtendDialog] = useState<RoomReservation | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [extending, setExtending] = useState(false);

  // early checkout dialog
  const [earlyCheckoutDialog, setEarlyCheckoutDialog] = useState<RoomReservation | null>(null);
  const [earlyCheckingOut, setEarlyCheckingOut] = useState(false);

  // room shift dialog
  const [shiftDialog, setShiftDialog] = useState<RoomReservation | null>(null);
  const [shiftTargetRoomId, setShiftTargetRoomId] = useState("");
  const [shifting, setShifting] = useState(false);

  // excel import
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await apiGetRooms(search);
      const list = Array.isArray(raw.rooms) ? raw.rooms : Array.isArray(raw) ? raw : [];
      // Sort: AVAILABLE first, then RESERVED, then others; within each group by floor
      const statusOrder: Record<string, number> = { AVAILABLE: 0, RESERVED: 1, OCCUPIED: 2, MAINTENANCE: 3 };
      list.sort((a, b) => {
        const oa = statusOrder[a.status] ?? 9;
        const ob = statusOrder[b.status] ?? 9;
        if (oa !== ob) return oa - ob;
        const fa = getFloorFromNumber(a.number) ?? a.floor ?? 0;
        const fb = getFloorFromNumber(b.number) ?? b.floor ?? 0;
        return fa - fb;
      });
      setRooms(list);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load rooms";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchRooms(), 300);
    return () => clearTimeout(timer);
  }, [fetchRooms, refreshKey]);

  // Fetch reservations for the room when info dialog opens
  useEffect(() => {
    if (!infoRoom) {
      setRoomReservations([]);
      return;
    }
    (async () => {
      try {
        setRoomResLoading(true);
        const data = await apiGetReservations(`roomId=${infoRoom.id}`);
        setRoomReservations(Array.isArray(data) ? data : []);
      } catch {
        setRoomReservations([]);
      } finally {
        setRoomResLoading(false);
      }
    })();
  }, [infoRoom]);

  const openCreate = () => {
    setEditingRoom(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    setForm({
      number: room.number,
      type: room.type,
      pricePerNight: String(room.pricePerNight),
      floor: String(room.floor),
      capacity: String(room.capacity),
      amenities: room.amenities,
      description: room.description,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.number || !form.pricePerNight || !form.floor || !form.capacity) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        number: form.number,
        type: form.type,
        pricePerNight: Number(form.pricePerNight),
        floor: Number(form.floor),
        capacity: Number(form.capacity),
        amenities: form.amenities || "[]",
        description: form.description,
      };

      if (editingRoom) {
        await apiUpdateRoom(editingRoom.id, payload);
        toast.success("Room updated successfully");
      } else {
        await apiCreateRoom(payload);
        toast.success("Room created successfully");
      }

      setDialogOpen(false);
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save room";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      setDeleting(true);
      await apiDeleteRoom(deleteDialog.id);
      toast.success("Room deleted successfully");
      setDeleteDialog(null);
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete room";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (room: Room, newStatus: string) => {
    try {
      await apiUpdateRoomStatus(room.id, newStatus);
      toast.success(`Room ${room.number} status changed to ${newStatus}`);
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      toast.error(message);
    }
  };

  const handleReserveFromRoom = (room: Room) => {
    setInfoRoom(null);
    setPreselectedRoom({
      id: room.id,
      number: room.number,
      name: room.name,
      type: room.type,
      pricePerNight: room.pricePerNight,
    });
    setCurrentPage("reservations");
  };

  // ── Extend Stay ──
  const openExtendDialog = (res: RoomReservation) => {
    setExtendDialog(res);
    // Default to 1 day after current check-out
    const nextDay = new Date(res.checkOut);
    nextDay.setDate(nextDay.getDate() + 1);
    setExtendDate(nextDay.toISOString().split("T")[0]);
  };

  const handleExtendStay = async () => {
    if (!extendDialog || !extendDate) return;
    if (extendDate <= extendDialog.checkOut) {
      toast.error("New check-out must be after the current check-out date");
      return;
    }
    try {
      setExtending(true);
      await apiUpdateReservation(extendDialog.id, { checkOut: extendDate });
      toast.success("Stay extended successfully");
      setExtendDialog(null);
      setExtendDate("");
      triggerRefresh();
      // Re-fetch room reservations
      if (infoRoom) {
        const data = await apiGetReservations(`roomId=${infoRoom.id}`);
        setRoomReservations(Array.isArray(data) ? data : []);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to extend stay");
    } finally {
      setExtending(false);
    }
  };

  // ── Early Checkout ──
  const handleEarlyCheckout = async () => {
    if (!earlyCheckoutDialog) return;
    try {
      setEarlyCheckingOut(true);
      await apiCheckout(earlyCheckoutDialog.id);
      toast.success("Guest checked out successfully");
      setEarlyCheckoutDialog(null);
      setInfoRoom(null);
      setRoomReservations([]);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to check out");
    } finally {
      setEarlyCheckingOut(false);
    }
  };

  // ── Room Shift ──
  const openShiftDialog = (res: RoomReservation) => {
    setShiftDialog(res);
    setShiftTargetRoomId("");
  };

  const handleRoomShift = async () => {
    if (!shiftDialog || !shiftTargetRoomId || !infoRoom) return;
    if (shiftTargetRoomId === infoRoom.id) {
      toast.error("Cannot shift to the same room");
      return;
    }
    try {
      setShifting(true);
      // Update reservation to the new room
      await apiUpdateReservation(shiftDialog.id, { roomId: shiftTargetRoomId });
      // Free the old room
      await apiUpdateRoomStatus(infoRoom.id, "AVAILABLE");
      // Occupy the new room
      await apiUpdateRoomStatus(shiftTargetRoomId, "OCCUPIED");
      toast.success("Guest shifted to new room successfully");
      setShiftDialog(null);
      setShiftTargetRoomId("");
      setInfoRoom(null);
      setRoomReservations([]);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to shift room");
    } finally {
      setShifting(false);
    }
  };

  // Available rooms for shift (exclude current room)
  const shiftAvailableRooms = useMemo(() => {
    if (!shiftDialog || !infoRoom) return [];
    return rooms.filter((r) => r.status === "AVAILABLE" && r.id !== infoRoom.id);
  }, [shiftDialog, infoRoom, rooms]);

  // Extend cost calculation
  const extendNights = useMemo(() => {
    if (!extendDialog || !extendDate) return 0;
    const diff = new Date(extendDate).getTime() - new Date(extendDialog.checkOut).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [extendDialog, extendDate]);

  const extendExtraCost = extendNights * (extendDialog?.roomRate || 0);

  // ── Excel import ────────────────────────────────────────────────────────────
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportFile(e.target.files?.[0] ?? null);
    setImportResults(null);
  };

  const handleImport = async () => {
    if (!importFile) { toast.error("Please select an Excel file first"); return; }
    setImportLoading(true);
    try {
      const buffer = await importFile.arrayBuffer();
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      if (rows.length === 0) { toast.error("No data rows found in the file"); return; }

      const result = await apiImportRooms(rows as Record<string, unknown>[]);
      setImportResults(result.results);
      toast.success(`Import complete: ${result.imported} created, ${result.skipped} skipped`);
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Import failed";
      toast.error(message);
    } finally {
      setImportLoading(false);
    }
  };

  const closeImportDialog = () => {
    setImportDialogOpen(false);
    setImportFile(null);
    setImportResults(null);
    if (importFileRef.current) importFileRef.current.value = "";
  };

  const parseAmenities = (amenitiesStr: string | null | undefined): string[] => {
    if (!amenitiesStr) return [];
    try {
      const parsed = JSON.parse(amenitiesStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return amenitiesStr.split(",").map((s) => s.trim()).filter(Boolean);
    }
  };

  const floors = useMemo(() => {
    const set = new Set<number>();
    rooms.forEach((r) => {
      const f = getFloorFromNumber(r.number);
      if (f !== null) set.add(f);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  const filteredRooms = rooms.filter((room) => {
    if (statusFilter && room.status !== statusFilter) return false;
    if (floorFilter !== null && getFloorFromNumber(room.number) !== floorFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      room.number.toLowerCase().includes(q) ||
      room.name.toLowerCase().includes(q) ||
      room.type.toLowerCase().includes(q)
    );
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(price);

  const formatDate = (str: string): string => {
    try {
      const date = new Date(str);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return str;
    }
  };

  const calculateNightsStayed = (checkIn: string): number => {
    try {
      const checkInDate = new Date(checkIn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkInDate.setHours(0, 0, 0, 0);
      const diff = today.getTime() - checkInDate.getTime();
      return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  const calculateNightsRemaining = (checkOut: string): number => {
    try {
      const checkOutDate = new Date(checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkOutDate.setHours(0, 0, 0, 0);
      const diff = checkOutDate.getTime() - today.getTime();
      return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  const daysUntil = (date: string): number => {
    try {
      const targetDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      const diff = targetDate.getTime() - today.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  if (loading && rooms.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-1 h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
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
        <div className="flex gap-2 items-center flex-wrap">
          {/* Subscription status badge */}
          <SubscriptionBadge />

          <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </Button>
          <Button variant="outline" onClick={() => setCurrentPage("reservations")} className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Reservations
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Room
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search rooms by number, name, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Floor & Status Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Floor:</span>
        <div className="flex gap-1.5">
          <Button
            variant={floorFilter === null && statusFilter === null ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs px-3 shrink-0"
            onClick={() => { setFloorFilter(null); setStatusFilter(null); }}
          >
            All
          </Button>
          {floors.slice(0, 3).map((f) => (
            <Button
              key={f}
              variant={floorFilter === f ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs px-3 shrink-0"
              onClick={() => setFloorFilter(floorFilter === f ? null : f)}
            >
              <Building2 className="h-3.5 w-3.5 mr-1" />
              {f}
            </Button>
          ))}
          {floors.length > 3 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={floorFilter !== null && floors.slice(3).includes(floorFilter) ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs px-3 shrink-0 gap-1"
                >
                  Others
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {floors.slice(3).map((f) => (
                  <DropdownMenuItem
                    key={f}
                    className="text-xs"
                    onClick={() => setFloorFilter(f)}
                  >
                    <Building2 className="h-3.5 w-3.5 mr-2" />
                    Floor {f}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Status:</span>
        <div className="flex gap-1.5">
          <Button
            variant={statusFilter === "AVAILABLE" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs px-3 shrink-0"
            onClick={() => setStatusFilter(statusFilter === "AVAILABLE" ? null : "AVAILABLE")}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Available
          </Button>
          <Button
            variant={statusFilter === "OCCUPIED" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs px-3 shrink-0"
            onClick={() => setStatusFilter(statusFilter === "OCCUPIED" ? null : "OCCUPIED")}
          >
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            Occupied
          </Button>
        </div>
      </div>
      {/* Room Grid */}
      {filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Building2 className="h-12 w-12 text-gray-300 mb-3" />
          <p className="font-medium text-lg">
            {search || floorFilter || statusFilter ? t("emptyNoMatch") : t("emptyNoRooms")}
          </p>
          <p className="text-sm mt-1 text-gray-400">
            {search || floorFilter || statusFilter
              ? t("emptyNoMatchHint")
              : t("emptyNoRoomsHint")}
          </p>
          {!search && (
            <div className="mt-4 flex gap-2">
              <Button onClick={openCreate} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Room
              </Button>
              <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Import Excel
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
            const amenities = parseAmenities(room.amenities);
            return (
              <Card key={room.id} className="gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md cursor-pointer" onClick={() => setInfoRoom(room)}>
                {/* Status Bar */}
                <div className={`h-1.5 w-full ${STATUS_DOT[room.status]}`} />

                <CardContent className="p-4">
                  {/* Room Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${ROOM_TYPE_COLORS[room.type]}`}>
                        {ROOM_TYPE_ICONS[room.type]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 leading-tight">
                          Room {room.number}
                        </h3>
                        <p className="text-sm text-gray-500">{room.type}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {room.status === "OCCUPIED" ? (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setInfoRoom(room); }}>
                              <CalendarClock className="mr-2 h-4 w-4" />
                              Extend Stay / Early Checkout
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setInfoRoom(room); }}>
                              <ArrowRightLeft className="mr-2 h-4 w-4" />
                              Room Shift
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem onClick={() => openEdit(room)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {room.status !== "OCCUPIED" && (
                          <DropdownMenuItem
                            onClick={() => {
                              const nextStatus = room.status === "AVAILABLE" ? "MAINTENANCE" : "AVAILABLE";
                              handleStatusChange(room, nextStatus);
                            }}
                          >
                            <Layers className="mr-2 h-4 w-4" />
                            Toggle Availability
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-rose-600 focus:text-rose-600"
                          onClick={() => setDeleteDialog(room)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <Badge variant="outline" className={ROOM_TYPE_COLORS[room.type]}>
                      {room.type}
                    </Badge>
                    <Badge variant="outline" className={STATUS_STYLES[room.status]}>
                      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[room.status]}`} />
                      {room.status}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                      <span>{formatPrice(room.pricePerNight)}</span>
                      <span className="text-gray-400">/night</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span>{room.capacity} guest{room.capacity !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      <span>Floor {getFloorFromNumber(room.number) ?? room.floor}</span>
                    </div>
                  </div>

                  {/* Amenities */}
                  {amenities.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex flex-wrap gap-2">
                        {amenities.slice(0, 5).map((amenity) => (
                          <div
                            key={amenity}
                            className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600 border border-gray-100"
                          >
                            {AMENITY_ICONS[amenity] || <Layers className="h-3 w-3" />}
                            {amenity}
                          </div>
                        ))}
                        {amenities.length > 5 && (
                          <span className="flex items-center px-2 py-1 text-xs text-gray-400">
                            +{amenities.length - 5} more
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Action Buttons */}
                  <Separator className="my-3" />
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => setInfoRoom(room)}
                    >
                      <Info className="h-3.5 w-3.5" />
                      Info
                    </Button>
                    {room.status === "AVAILABLE" ? (
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleReserveFromRoom(room)}
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Reserve
                      </Button>
                    ) : room.status === "RESERVED" ? (
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 text-xs bg-sky-600 hover:bg-sky-700"
                        onClick={() => { setPreselectedRoom({ id: room.id, number: room.number, name: room.name, type: room.type, pricePerNight: room.pricePerNight }); setCurrentPage("reservations"); }}
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        Manage Reservations
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 text-xs"
                        disabled
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Reserve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog — no Room Name field */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRoom ? t("dialogEditRoomTitle") : t("dialogAddRoomTitle")}</DialogTitle>
            <DialogDescription>
              {editingRoom
                ? t("dialogEditRoomDesc")
                : t("dialogAddRoomDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-number">
                  {t("labelRoomNumber")} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="room-number"
                  placeholder="e.g. 101"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-type">{t("labelRoomType")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          {ROOM_TYPE_ICONS[type]}
                          {t("roomType" + (type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()))}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-price">
                  {t("labelPriceNight")} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="room-price"
                  type="number"
                  placeholder="0"
                  value={form.pricePerNight}
                  onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-floor">
                  {t("labelFloor")} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="room-floor"
                  type="number"
                  placeholder="1"
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-capacity">
                  {t("labelCapacity")} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="room-capacity"
                  type="number"
                  placeholder="2"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-amenities">{t("labelAmenities")}</Label>
              <Input
                id="room-amenities"
                placeholder="WiFi, TV, AC, Mini Bar, Hot Water"
                value={
                  (() => {
                    try {
                      const parsed = JSON.parse(form.amenities);
                      return Array.isArray(parsed) ? parsed.join(", ") : form.amenities;
                    } catch {
                      return form.amenities;
                    }
                  })()
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    amenities: JSON.stringify(
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    ),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-description">{t("labelDescription")}</Label>
              <Textarea
                id="room-description"
                placeholder={t("placeholderDescription")}
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("btnCancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("btnSaving") : editingRoom ? t("btnUpdateRoom") : t("btnCreateRoom")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={closeImportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              {t("dialogImportTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("dialogImportDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Template download */}
            <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800 mb-1">{t("importRequiredColumns")}</p>
              <p className="text-xs text-emerald-700 mb-3 font-mono">
                number · type · pricePerNight · floor · capacity · amenities · description
              </p>
              <p className="text-xs text-emerald-600 mb-3">
                <strong>type</strong> must be one of: SINGLE, DOUBLE, TWIN, SUITE, DELUXE<br />
                <strong>amenities</strong> — comma-separated, e.g. <em>WiFi, TV, AC</em>
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 border-emerald-400 text-emerald-700 hover:bg-emerald-100">
                <Download className="h-3.5 w-3.5" />
                {t("btnDownloadTemplate")}
              </Button>
            </div>

            {/* File picker */}
            <div className="space-y-2">
              <Label htmlFor="excel-file">{t("labelSelectExcel")}</Label>
              <div className="flex gap-2">
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  ref={importFileRef}
                  onChange={handleImportFileChange}
                  className="flex-1"
                />
              </div>
              {importFile && (
                <p className="text-xs text-gray-500">
                  Selected: <strong>{importFile.name}</strong> ({(importFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Import results */}
            {importResults && (
              <div className="rounded-lg border bg-gray-50 p-3 max-h-48 overflow-y-auto space-y-1">
                <p className="text-xs font-semibold text-gray-600 mb-2">{t("importResults")}</p>
                {importResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {r.status === "created" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : r.status === "skipped" ? (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    )}
                    <span className="font-medium">Room {r.number}</span>
                    <span className={r.status === "created" ? "text-emerald-600" : "text-amber-600"}>
                      {r.status === "created" ? "Created" : r.error}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeImportDialog}>
              {importResults ? t("btnClose") : t("btnCancel")}
            </Button>
            {!importResults && (
              <Button onClick={handleImport} disabled={importLoading || !importFile} className="gap-2">
                <Upload className="h-4 w-4" />
                {importLoading ? t("btnImporting") : t("btnImportRooms")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogDeleteTitle")} {deleteDialog?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogDeleteDesc", { name: deleteDialog?.name || deleteDialog?.number })}
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

      {/* Room Handover Detail Dialog */}
      <Dialog open={!!infoRoom} onOpenChange={(open) => { if (!open) { setInfoRoom(null); setRoomReservations([]); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {infoRoom && (() => {
            const amenities = parseAmenities(infoRoom.amenities);
            const activeRes = roomReservations.find((r) => r.status === "ACTIVE" || r.status === "CHECKED_IN");
            const upcomingRes = roomReservations.filter((r) => r.status === "UPCOMING");

            return (
              <>
                {/* Header */}
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${ROOM_TYPE_COLORS[infoRoom.type]}`}>
                      {ROOM_TYPE_ICONS[infoRoom.type]}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Room {infoRoom.number}</span>
                      {infoRoom.name && <span className="text-gray-400 font-normal">· {infoRoom.name}</span>}
                      <Badge variant="outline" className={STATUS_STYLES[infoRoom.status]}>
                        <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[infoRoom.status]}`} />
                        {infoRoom.status}
                      </Badge>
                    </div>
                  </DialogTitle>
                  <DialogDescription>{t("dialogHandoverTitle")}</DialogDescription>
                </DialogHeader>

                {/* Room Image */}
                {infoRoom.image && (
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={infoRoom.image}
                      alt={`Room ${infoRoom.number}`}
                      className="w-full h-48 object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}

                {/* Description */}
                {infoRoom.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{infoRoom.description}</p>
                )}

                {/* Room Info Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 bg-muted/50">
                    <p className="text-xs text-gray-500 mb-1">Room Type</p>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      {ROOM_TYPE_ICONS[infoRoom.type]} {infoRoom.type}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/50">
                    <p className="text-xs text-gray-500 mb-1">Price per Night</p>
                    <p className="text-sm font-semibold text-gray-900">{formatPrice(infoRoom.pricePerNight)}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/50">
                    <p className="text-xs text-gray-500 mb-1">Capacity</p>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-gray-400" /> {infoRoom.capacity} guest{infoRoom.capacity !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/50">
                    <p className="text-xs text-gray-500 mb-1">Floor</p>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-gray-400" /> Floor {infoRoom.floor}
                    </p>
                  </div>
                </div>

                {/* Amenities */}
                {amenities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {amenities.map((amenity) => (
                        <div
                          key={amenity}
                          className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 border border-gray-200"
                        >
                          {AMENITY_ICONS[amenity] || <Layers className="h-3.5 w-3.5" />}
                          {amenity}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Current Status Section — Handover Info */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" /> {t("currentStatus")}
                  </p>

                  {roomResLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                      <Clock className="h-4 w-4 animate-spin" /> {t("loadingReservations")}
                    </div>
                  ) : infoRoom.status === "OCCUPIED" ? (
                    activeRes ? (
                      <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </span>
                            <Badge className="bg-emerald-600 text-white text-xs">{t("currentGuest")}</Badge>
                          </div>
                          <span className="text-xs text-emerald-600 font-medium">{t("occupied")}</span>
                        </div>

                        {activeRes.guest && (
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                              <User className="h-5 w-5 text-emerald-700" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{activeRes.guest.name}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {activeRes.guest.phone}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 text-xs sm:text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <CalendarDays className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>{t("checkIn")} <strong>{formatDate(activeRes.checkIn)}</strong></span>
                            <span className="text-gray-300">→</span>
                            <span>{t("checkOut")} <strong>{formatDate(activeRes.checkOut)}</strong></span>
                          </div>

                          {(() => {
                            const stayed = calculateNightsStayed(activeRes.checkIn);
                            const remaining = calculateNightsRemaining(activeRes.checkOut);
                            return (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <BedDouble className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                {remaining === 0 ? (
                                  <span className="font-medium text-amber-700">
                                    Stayed {stayed} night{stayed !== 1 ? "s" : ""} — <span className="text-amber-600">Check-out today</span>
                                  </span>
                                ) : (
                                  <span>
                                    Stayed <strong className="text-emerald-700">{stayed}</strong> night{stayed !== 1 ? "s" : ""}, <strong className="text-amber-700">{remaining}</strong> night{remaining !== 1 ? "s" : ""} remaining
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          <Separator className="my-2" />

                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <CreditCard className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span>Total: <strong className="text-gray-900">{formatPrice(activeRes.totalCost)}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {activeRes.paymentStatus === "PAID" ? (
                                <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> {activeRes.paymentStatus}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" /> {activeRes.paymentStatus}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50 p-4 text-center">
                        <AlertCircle className="h-8 w-8 text-rose-400 mx-auto mb-2" />
                        <p className="text-sm text-rose-700 font-medium">Marked as occupied</p>
                        <p className="text-xs text-rose-500 mt-1">No active reservation found for this room</p>
                      </div>
                    )
                  ) : infoRoom.status === "RESERVED" ? (
                    upcomingRes.length > 0 ? (
                      <div className="rounded-lg border-2 border-sky-200 bg-sky-50 p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-sky-600" />
                            <Badge className="bg-sky-600 text-white text-xs">Upcoming Guest</Badge>
                          </div>
                          <span className="text-xs text-sky-600 font-medium">Reserved</span>
                        </div>

                        {upcomingRes[0].guest && (
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                              <User className="h-5 w-5 text-sky-700" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{upcomingRes[0].guest.name}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {upcomingRes[0].guest.phone}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 text-xs sm:text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <CalendarDays className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>Check-in: <strong>{formatDate(upcomingRes[0].checkIn)}</strong></span>
                            <span className="text-gray-300">→</span>
                            <span>Check-out: <strong>{formatDate(upcomingRes[0].checkOut)}</strong></span>
                          </div>

                          <div className="flex items-center gap-2 text-gray-600">
                            <BedDouble className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>{upcomingRes[0].nights} night{upcomingRes[0].nights !== 1 ? "s" : ""} reserved</span>
                          </div>

                          {(() => {
                            const days = daysUntil(upcomingRes[0].checkIn);
                            return (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                                {days <= 0 ? (
                                  <span className="font-medium text-sky-700">Check-in today!</span>
                                ) : (
                                  <span className="font-medium text-sky-700">Check-in in {days} day{days !== 1 ? "s" : ""}</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-sky-200 bg-sky-50 p-4 text-center">
                        <CalendarClock className="h-8 w-8 text-sky-400 mx-auto mb-2" />
                        <p className="text-sm text-sky-700 font-medium">Marked as reserved</p>
                        <p className="text-xs text-sky-500 mt-1">No upcoming reservation found for this room</p>
                      </div>
                    )
                  ) : infoRoom.status === "AVAILABLE" ? (
                    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-700">Room is available and ready for check-in</span>
                      </div>
                      {upcomingRes.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-xs text-emerald-600 font-medium">Upcoming reservations:</p>
                          {upcomingRes.slice(0, 3).map((res) => (
                            <div key={res.id} className="flex items-center justify-between rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs">
                              <span className="text-gray-700">
                                {res.guest?.name || "Guest"} · {formatDate(res.checkIn)} → {formatDate(res.checkOut)}
                              </span>
                              <span className="text-emerald-600 font-medium">in {Math.max(0, daysUntil(res.checkIn))}d</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : infoRoom.status === "MAINTENANCE" ? (
                    <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3 sm:p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-700">Room is under maintenance</span>
                      </div>
                      <p className="text-xs text-amber-600 mt-1">This room is not available for booking until maintenance is complete.</p>
                    </div>
                  ) : null}
                </div>

                <Separator />

                {/* Reservations History Section */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" /> Reservations History
                  </p>
                  {roomResLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                      <Clock className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  ) : roomReservations.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center">
                      <p className="text-sm text-gray-400">No reservations found for this room</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {roomReservations.map((res) => (
                        <div key={res.id} className="flex items-center justify-between rounded-lg border p-2.5 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 shrink-0">
                              <User className="h-3.5 w-3.5 text-gray-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{res.guest?.name || "—"}</p>
                              <p className="text-gray-500">{formatDate(res.checkIn)} → {formatDate(res.checkOut)}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[res.status] || ""}`}>
                              {res.status}
                            </Badge>
                            <p className="font-medium text-gray-900 mt-0.5">{formatPrice(res.totalCost)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => { setInfoRoom(null); setRoomReservations([]); }}>
                    Close
                  </Button>
                  {infoRoom.status === "AVAILABLE" ? (
                    <Button
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleReserveFromRoom(infoRoom)}
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Reserve This Room
                    </Button>
                  ) : infoRoom.status === "RESERVED" ? (
                    <Button
                      className="gap-2 bg-sky-600 hover:bg-sky-700"
                      onClick={() => { setPreselectedRoom({ id: infoRoom.id, number: infoRoom.number, name: infoRoom.name, type: infoRoom.type, pricePerNight: infoRoom.pricePerNight }); setInfoRoom(null); setRoomReservations([]); setCurrentPage("reservations"); }}
                    >
                      <ClipboardList className="h-4 w-4" />
                      Manage Reservations
                    </Button>
                  ) : infoRoom.status === "OCCUPIED" ? (
                    <div className="flex gap-2">
                      <Button
                        className="gap-2 bg-amber-600 hover:bg-amber-700"
                        onClick={() => {
                          const active = roomReservations.find((r) => r.status === "ACTIVE");
                          if (active) openExtendDialog(active);
                          else toast.error("No active reservation found for this room");
                        }}
                      >
                        <CalendarClock className="h-4 w-4" />
                        Extend Stay
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          const active = roomReservations.find((r) => r.status === "ACTIVE");
                          if (active) setEarlyCheckoutDialog(active);
                          else toast.error("No active reservation found for this room");
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Early Out
                      </Button>
                      <Button
                        className="gap-2 bg-violet-600 hover:bg-violet-700"
                        onClick={() => {
                          const active = roomReservations.find((r) => r.status === "ACTIVE");
                          if (active) openShiftDialog(active);
                          else toast.error("No active reservation found for this room");
                        }}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Shift
                      </Button>
                    </div>
                  ) : null}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Extend Stay Dialog ── */}
      <Dialog open={!!extendDialog} onOpenChange={(open) => { if (!open) { setExtendDialog(null); setExtendDate(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-amber-600" /> Extend Stay
            </DialogTitle>
            <DialogDescription>Extend the guest's stay in this room</DialogDescription>
          </DialogHeader>
          {extendDialog && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <p className="text-sm font-medium">{extendDialog.guest?.name || "Guest"}</p>
                <p className="text-xs text-muted-foreground">
                  Current check-out: <strong>{formatDate(extendDialog.checkOut)}</strong>
                  <span className="mx-1">·</span>
                  {extendDialog.roomRate > 0 && <span>{formatPrice(extendDialog.roomRate)}/night</span>}
                </p>
              </div>
              <div>
                <Label>{t('lblnewCheckoutDate', 'New Check-out Date')} *</Label>
                <Input
                  type="date"
                  value={extendDate}
                  min={extendDialog.checkOut}
                  onChange={(e) => setExtendDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              {extendNights > 0 && (
                <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-700">Extra {extendNights} night{extendNights !== 1 ? "s" : ""}</span>
                    <span className="font-bold text-amber-800">+{formatPrice(extendExtraCost)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setExtendDialog(null); setExtendDate(""); }}>Cancel</Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={handleExtendStay} disabled={extending || !extendDate || extendDate <= (extendDialog?.checkOut || "")}>
              {extending ? "Extending..." : "Extend Stay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Early Checkout Dialog ── */}
      <AlertDialog open={!!earlyCheckoutDialog} onOpenChange={(open) => { if (!open) setEarlyCheckoutDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-rose-600" /> Early Checkout
            </AlertDialogTitle>
            <AlertDialogDescription>
              {earlyCheckoutDialog && (
                <span>
                  Check out <strong>{earlyCheckoutDialog.guest?.name || "this guest"}</strong> now?
                  {earlyCheckoutDialog.paymentStatus !== "PAID" && (
                    <span className="block mt-2 text-amber-600 font-medium">
                      Note: This guest has an outstanding balance of {formatPrice(earlyCheckoutDialog.balance)}.
                    </span>
                  )}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={earlyCheckingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleEarlyCheckout}
              disabled={earlyCheckingOut}
            >
              {earlyCheckingOut ? "Checking out..." : "Confirm Checkout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Room Shift Dialog ── */}
      <Dialog open={!!shiftDialog} onOpenChange={(open) => { if (!open) { setShiftDialog(null); setShiftTargetRoomId(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-violet-600" /> Room Shift
            </DialogTitle>
            <DialogDescription>Move the guest to a different available room</DialogDescription>
          </DialogHeader>
          {shiftDialog && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <p className="text-sm font-medium">{shiftDialog.guest?.name || "Guest"}</p>
                <p className="text-xs text-muted-foreground">
                  Current: Room {infoRoom?.number} → Shifting to a new room
                </p>
              </div>
              <div>
                <Label>{t('lbltargetRoom', 'Target Room')} *</Label>
                {shiftAvailableRooms.length > 0 ? (
                  <Select value={shiftTargetRoomId} onValueChange={setShiftTargetRoomId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select available room" /></SelectTrigger>
                    <SelectContent>
                      {shiftAvailableRooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          Room {r.number}{r.name ? ` (${r.name})` : ""} — {r.type} — {formatPrice(r.pricePerNight)}/night
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="mt-1 text-sm text-amber-600">No available rooms to shift to</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShiftDialog(null); setShiftTargetRoomId(""); }}>Cancel</Button>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={handleRoomShift} disabled={shifting || !shiftTargetRoomId}>
              {shifting ? "Shifting..." : "Confirm Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}