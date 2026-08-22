import { useTranslation } from "react-i18next";
"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  apiGetGroupBookings,
  apiCreateGroupBooking,
  apiUpdateGroupBooking,
  apiDeleteGroupBooking,
  apiAutoAssignGroup,
  apiGetRooms,
  apiGetGuests,
  apiCreateReservation,
  apiCreateGuest,
  apiUpdateReservation,
  apiCheckin,
  apiGroupCheckout,
  apiGroupPayment,
} from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Users,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Phone,
  Mail,
  Building2,
  UserPlus,
  X,
  LogIn,
  LogOut,
  Wand2,
  CreditCard,
  DollarSign,
  Eye,
  Loader2,
  CheckCircle2,
  BedDouble,
  AlertCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { isValidPhone, isValidEmail } from "@/lib/utils";

interface GroupBooking {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  startDate: string;
  endDate: string;
  status: string;
  notes: string;
  totalRooms: number;
  totalGuests: number;
  totalCost: number;
  reservations?: Reservation[];
  _count?: { reservations: number };
  createdAt: string;
}

interface Reservation {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalCost: number;
  paidAmount?: number;
  balance?: number;
  paymentStatus?: string;
  nights?: number;
  roomRate?: number;
  guest?: { id: string; name: string; phone: string; email: string };
  room?: { id: string; number: string; name: string; type: string; pricePerNight: number };
}

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

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-emerald-100 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

const RESERVATION_STATUS_BADGE: Record<string, string> = {
  UPCOMING: "bg-sky-100 text-sky-800 border-sky-200",
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  COMPLETED: "bg-gray-100 text-gray-700 border-gray-200",
  CANCELLED: "bg-rose-100 text-rose-800 border-rose-200",
};

const GROUP_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export default function GroupBookingsPage() {
  const { t } = useTranslation();
  const { refreshKey } = useAppStore();

  const [groupBookings, setGroupBookings] = useState<GroupBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addReservationOpen, setAddReservationOpen] = useState(false);
  const [addReservationGroupId, setAddReservationGroupId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupBooking | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addingReservation, setAddingReservation] = useState(false);

  // Create group form
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // Add reservation form
  const [resGuestId, setResGuestId] = useState("");
  const [resRoomId, setResRoomId] = useState("");
  const [resCheckIn, setResCheckIn] = useState("");
  const [resCheckOut, setResCheckOut] = useState("");
  const [resSecondGuestName, setResSecondGuestName] = useState("");
  const [resSecondGuestPhone, setResSecondGuestPhone] = useState("");
  const [resSecondGuestIdNumber, setResSecondGuestIdNumber] = useState("");
  const [resExceptionallyReserved, setResExceptionallyReserved] = useState(false);
  const [resExceptionReason, setResExceptionReason] = useState("");

  // Inline guest registration
  const [showNewGuest, setShowNewGuest] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");
  const [newGuestIdNumber, setNewGuestIdNumber] = useState("");
  const [newGuestIdType, setNewGuestIdType] = useState("");
  const [registeringGuest, setRegisteringGuest] = useState(false);

  // Unlink reservation
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  // Auto-assign
  const [autoAssigning, setAutoAssigning] = useState<string | null>(null);

  // Group payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentGroupId, setPaymentGroupId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "CASH", referenceNo: "", notes: "" });
  const [paying, setPaying] = useState(false);

  // Group checkout confirmation
  const [checkoutTarget, setCheckoutTarget] = useState<GroupBooking | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // Reservation detail dialog
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);

  const [guests, setGuests] = useState<GuestOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);

  const fetchGroupBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGetGroupBookings(`page=${page}&limit=10`);
      setGroupBookings(res.data ?? []);
      setTotalPages(res.totalPages ?? 1);
    } catch {
      toast.error("Failed to load group bookings");
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchGuests = useCallback(async () => {
    try {
      const data = await apiGetGuests("");
      setGuests(Array.isArray(data) ? data : []);
    } catch {
      /* silent */
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await apiGetRooms();
      // apiGetRooms already unwraps { rooms: [...] } to array
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchGroupBookings();
  }, [fetchGroupBookings, refreshKey]);

  useEffect(() => {
    if (createOpen || addReservationOpen) {
      fetchGuests();
      fetchRooms();
    }
  }, [createOpen, addReservationOpen, fetchGuests, fetchRooms]);

  const resetCreateForm = () => {
    setName("");
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setStartDate("");
    setEndDate("");
    setNotes("");
  };

  const resetReservationForm = () => {
    setResGuestId("");
    setResRoomId("");
    setResCheckIn("");
    setResCheckOut("");
    setResSecondGuestName("");
    setResSecondGuestPhone("");
    setResSecondGuestIdNumber("");
    setResExceptionallyReserved(false);
    setResExceptionReason("");
    setShowNewGuest(false);
    setNewGuestName("");
    setNewGuestPhone("");
    setNewGuestIdNumber("");
    setNewGuestIdType("");
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Group name is required"); return; }
    if (!startDate || !endDate) { toast.error("Start and end dates are required"); return; }
    if (contactPhone.trim() && !isValidPhone(contactPhone)) {
      toast.error("Invalid contact phone number format (7-15 digits)");
      return;
    }
    if (contactEmail.trim() && !isValidEmail(contactEmail)) {
      toast.error("Invalid contact email address format");
      return;
    }
    try {
      setCreating(true);
      await apiCreateGroupBooking({
        name: name.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        startDate, endDate,
        notes: notes.trim(),
      });
      toast.success("Group booking created successfully");
      setCreateOpen(false);
      resetCreateForm();
      fetchGroupBookings();
    } catch {
      toast.error("Failed to create group booking");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiUpdateGroupBooking(id, { status });
      toast.success(`Status updated to ${status}`);
      fetchGroupBookings();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiDeleteGroupBooking(deleteTarget.id);
      toast.success("Group booking deleted");
      setDeleteTarget(null);
      if (detailId === deleteTarget.id) setDetailId(null);
      fetchGroupBookings();
    } catch {
      toast.error("Failed to delete group booking");
    } finally {
      setDeleting(false);
    }
  };

  const handleRegisterGuest = async () => {
    if (!newGuestName.trim()) { toast.error("Guest name is required"); return; }
    if (newGuestPhone.trim() && !isValidPhone(newGuestPhone)) {
      toast.error("Invalid phone number format (7-15 digits)");
      return;
    }
    try {
      setRegisteringGuest(true);
      const guest = await apiCreateGuest({
        name: newGuestName.trim(),
        phone: newGuestPhone.trim(),
        idNumber: newGuestIdNumber.trim(),
        idType: newGuestIdType || undefined,
      });
      const newGuest = { id: guest.id, name: guest.name, phone: guest.phone || "" };
      setGuests((prev) => [newGuest, ...prev]);
      setResGuestId(guest.id);
      setShowNewGuest(false);
      setNewGuestName("");
      setNewGuestPhone("");
      setNewGuestIdNumber("");
      setNewGuestIdType("");
      toast.success(`Guest "${guest.name}" registered`);
    } catch {
      toast.error("Failed to register guest");
    } finally {
      setRegisteringGuest(false);
    }
  };

  const handleAddReservation = async () => {
    if (!addReservationGroupId || !resGuestId || !resRoomId) {
      toast.error("Please select a guest and room");
      return;
    }
    if (!resCheckIn || !resCheckOut) {
      toast.error("Check-in and check-out dates are required");
      return;
    }
    // Validate DOUBLE/TWIN room requirements
    const selRoom = rooms.find((r) => r.id === resRoomId);
    const isDoubleRoom = selRoom && (selRoom.type === "DOUBLE" || selRoom.type === "TWIN");
    if (isDoubleRoom && !resExceptionallyReserved) {
      if (!resSecondGuestName.trim() || !resSecondGuestPhone.trim()) {
        toast.error("Second guest name and phone are required for double/twin rooms");
        return;
      }
      if (!isValidPhone(resSecondGuestPhone)) {
        toast.error("Invalid second guest phone number format (7-15 digits)");
        return;
      }
    }
    if (resExceptionallyReserved && !resExceptionReason.trim()) {
      toast.error("Please provide the exception reason");
      return;
    }
    try {
      setAddingReservation(true);
      await apiCreateReservation({
        guestId: resGuestId,
        roomId: resRoomId,
        checkIn: resCheckIn,
        checkOut: resCheckOut,
        groupBookingId: addReservationGroupId,
        secondGuestName: resSecondGuestName,
        secondGuestPhone: resSecondGuestPhone,
        secondGuestIdNumber: resSecondGuestIdNumber,
        exceptionallyReserved: resExceptionallyReserved,
        exceptionReason: resExceptionReason,
      });
      toast.success("Reservation added to group");
      setAddReservationOpen(false);
      resetReservationForm();
      setAddReservationGroupId(null);
      fetchGroupBookings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add reservation");
    } finally {
      setAddingReservation(false);
    }
  };

  const handleUnlinkReservation = async (reservationId: string) => {
    try {
      setUnlinkingId(reservationId);
      await apiUpdateReservation(reservationId, { groupBookingId: null });
      toast.success("Reservation removed from group");
      fetchGroupBookings();
    } catch {
      toast.error("Failed to remove reservation");
    } finally {
      setUnlinkingId(null);
    }
  };

  const handleAutoAssign = async (groupId: string) => {
    try {
      setAutoAssigning(groupId);
      const result = await apiAutoAssignGroup(groupId);
      const { assigned, unassigned } = result as { assigned: Array<{ guestName: string; roomNumber: string; roomName: string; roomType: string; pricePerNight: number; totalCost: number; isNew: boolean }>; unassigned: Array<{ guestName: string; reason: string }> };
      if (assigned.length > 0) {
        const newCount = assigned.filter((a) => a.isNew).length;
        toast.success(`Auto-assigned ${assigned.length} guest(s) to rooms${newCount > 0 ? ` (${newCount} new reservations created)` : ""}`);
      }
      if (unassigned.length > 0) {
        toast.warning(`${unassigned.length} guest(s) could not be assigned: ${unassigned.map((u) => u.guestName).join(", ")}`);
      }
      if (assigned.length === 0 && unassigned.length === 0) {
        toast.info("No unassigned guests found. All guests already have rooms.");
      }
      setDetailId(groupId);
      fetchGroupBookings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Auto-assign failed";
      if (msg.includes("NO_ROOMS")) {
        toast.error("No available rooms for the selected dates");
      } else {
        toast.error(msg);
      }
    } finally {
      setAutoAssigning(null);
    }
  };

  const handleGroupCheckin = async (group: GroupBooking) => {
    const upcomingReservations = group.reservations?.filter(
      (r) => r.status === "UPCOMING"
    ) || [];
    if (upcomingReservations.length === 0) {
      toast.info("No upcoming reservations to check in");
      return;
    }
    try {
      let checked = 0;
      for (const res of upcomingReservations) {
        try {
          await apiCheckin(res.id);
          checked++;
        } catch {
          /* skip failed ones */
        }
      }
      toast.success(`${checked} reservation(s) checked in`);
      fetchGroupBookings();
    } catch {
      toast.error("Bulk check-in failed");
    }
  };

  const handleGroupCheckout = async () => {
    if (!checkoutTarget) return;
    try {
      setCheckingOut(true);
      const result = await apiGroupCheckout(checkoutTarget.id);
      const r = result as { checkedOut: number; total: number; message: string };
      toast.success(r.message || `${r.checkedOut} reservation(s) checked out`);
      setCheckoutTarget(null);
      fetchGroupBookings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Group checkout failed";
      toast.error(msg);
    } finally {
      setCheckingOut(false);
    }
  };

  const openPaymentDialog = (group: GroupBooking) => {
    // Calculate total cost and total paid from reservations
    const totalCost = group.reservations?.reduce((s, r) => (s + (r.totalCost || 0)), 0) || 0;
    setPaymentGroupId(group.id);
    setPaymentForm({ amount: String(totalCost), method: "CASH", referenceNo: "", notes: "" });
    setPaymentOpen(true);
  };

  const handleGroupPayment = async () => {
    if (!paymentGroupId || !paymentForm.amount || !paymentForm.method) {
      toast.error("Amount and payment method are required");
      return;
    }
    try {
      setPaying(true);
      const result = await apiGroupPayment(paymentGroupId, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        referenceNo: paymentForm.referenceNo,
        notes: paymentForm.notes,
      });
      const r = result as { message: string };
      toast.success(r.message || "Payment recorded successfully");
      setPaymentOpen(false);
      setPaymentGroupId(null);
      fetchGroupBookings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      toast.error(msg);
    } finally {
      setPaying(false);
    }
  };

  const openAddReservation = (group: GroupBooking) => {
    setAddReservationGroupId(group.id);
    setResCheckIn(group.startDate);
    setResCheckOut(group.endDate);
    setAddReservationOpen(true);
  };

  const toggleDetail = (id: string) => {
    setDetailId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const selectedGroup = groupBookings.find((g) => g.id === addReservationGroupId);
  const groupRoomIds = new Set(selectedGroup?.reservations?.map((r) => r.roomId) || []);
  const availableRooms = rooms.filter(
    (r) => (!r.status || r.status === "AVAILABLE") && !groupRoomIds.has(r.id)
  );
  const resCount = (g: GroupBooking) =>
    g.reservations?.length ?? g._count?.reservations ?? 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Group Bookings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage teams, events, and bulk reservations
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Group Booking
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full max-w-md" />
                  <Skeleton className="h-4 w-3/4 max-w-sm" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && groupBookings.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              No group bookings yet
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first group booking to get started.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Group Booking
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Group Booking List */}
      {!loading && groupBookings.length > 0 && (
        <div className="space-y-4">
          {groupBookings.map((group) => {
            const isExpanded = detailId === group.id;
            const badgeClass = STATUS_COLORS[group.status] ?? "bg-gray-100 text-gray-700 border-gray-200";
            const numRes = resCount(group);
            const upcomingCount = group.reservations?.filter((r) => r.status === "UPCOMING").length ?? 0;

            return (
              <Card key={group.id} className="overflow-hidden">
                {/* Card Header */}
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <CardTitle className="text-base font-semibold truncate">
                        {group.name}
                      </CardTitle>
                      <Badge variant="outline" className={badgeClass}>
                        {group.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <Select
                        value={group.status}
                        onValueChange={(value) => handleStatusChange(group.id, value)}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GROUP_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {upcomingCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => handleGroupCheckin(group)}
                        >
                          <LogIn className="h-3.5 w-3.5 mr-1" />
                          Check-in All ({upcomingCount})
                        </Button>
                      )}
                      {group.reservations?.some((r) => r.status === "ACTIVE") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          onClick={() => setCheckoutTarget(group)}
                        >
                          <LogOut className="h-3.5 w-3.5 mr-1" />
                          <span className="hidden sm:inline">Check-out All</span>
                        </Button>
                      )}
                      {group.reservations?.some((r) => r.status !== "COMPLETED" && r.status !== "CANCELLED") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => openPaymentDialog(group)}
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          <span className="hidden sm:inline">Pay</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-violet-600 border-violet-200 hover:bg-violet-50"
                        disabled={autoAssigning === group.id}
                        onClick={() => handleAutoAssign(group.id)}
                      >
                        {autoAssigning === group.id ? (
                          <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                        ) : (
                          <Wand2 className="h-3.5 w-3.5 mr-1" />
                        )}
                        <span className="hidden sm:inline">Auto Assign</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddReservation(group)}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">Add Guest</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(group)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDetail(group.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Card Body */}
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {group.contactName && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{group.contactName}</span>
                      </div>
                    )}
                    {group.contactPhone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{group.contactPhone}</span>
                      </div>
                    )}
                    {group.contactEmail && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{group.contactEmail}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {formatDate(group.startDate)} — {formatDate(group.endDate)}
                      </span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-5 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{numRes} reservation{numRes !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{group.totalGuests || 0} guest{group.totalGuests !== 1 ? "s" : ""}</span>
                    </div>
                    {(group.totalCost ?? 0) > 0 && (
                      <span className="font-medium text-foreground">
                        {group.totalCost?.toLocaleString()} ETB
                      </span>
                    )}
                  </div>

                  {group.notes && (
                    <p className="mt-3 text-sm text-muted-foreground border-l-2 border-muted pl-3">
                      {group.notes}
                    </p>
                  )}

                  {/* Expanded: Linked Reservations */}
                  {isExpanded && (
                    <div className="mt-4 border rounded-lg overflow-hidden">
                      {numRes > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('thguest', 'Guest')}</TableHead>
                              <TableHead>{t('thassignedRoom', 'Assigned Room')}</TableHead>
                              <TableHead>{t('throomType', 'Room Type')}</TableHead>
                              <TableHead>{t('thcost', 'Cost')}</TableHead>
                              <TableHead>{t('thcheckin', 'Check-in')}</TableHead>
                              <TableHead>{t('thstatus', 'Status')}</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.reservations?.map((res) => (
                              <TableRow
                                key={res.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setDetailRes(res)}
                              >
                                <TableCell className="font-medium">
                                  <div>
                                    <div>{res.guest?.name ?? "Unknown"}</div>
                                    {res.guest?.phone && (
                                      <div className="text-xs text-muted-foreground">{res.guest.phone}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {res.room
                                    ? (
                                      <div>
                                        <div className="font-medium">{res.room.number}{res.room.name ? ` - ${res.room.name}` : ""}</div>
                                      </div>
                                    )
                                    : <span className="text-muted-foreground">Not assigned</span>}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {res.room?.type ? (
                                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">
                                      {res.room.type}
                                    </Badge>
                                  ) : "—"}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  {res.totalCost > 0 ? (
                                    <span className="text-sm font-medium">{res.totalCost.toLocaleString()} ETB</span>
                                  ) : "—"}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {formatDate(res.checkIn)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      RESERVATION_STATUS_BADGE[res.status] ??
                                      "bg-gray-100 text-gray-700 border-gray-200"
                                    }
                                  >
                                    {res.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    disabled={unlinkingId === res.id}
                                    onClick={(e) => { e.stopPropagation(); handleUnlinkReservation(res.id); }}
                                    title="Remove from group"
                                  >
                                    {unlinkingId === res.id ? (
                                      <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <X className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          No reservations yet. Add guests manually or use "Auto Assign" to assign rooms automatically.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Group Booking Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        if (!open) resetCreateForm();
        setCreateOpen(open);
      }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create Group Booking</DialogTitle>
            <DialogDescription>
              Add a new group booking for a team or event.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="group-name">
                Group Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="group-name"
                placeholder="e.g. ABC Company Training"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('lblcontactName', 'Contact Name')}</Label>
                <Input
                  id="contact-name"
                  placeholder="Full name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('lblcontactPhone', 'Contact Phone')}</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  placeholder="Phone number"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('lblcontactEmail', 'Contact Email')}</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="email@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-date">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-date">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('lblnotes', 'Notes')}</Label>
              <Input
                id="notes"
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setCreateOpen(false); resetCreateForm(); }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Group Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Guest / Reservation to Group Dialog */}
      <Dialog
        open={addReservationOpen}
        onOpenChange={(open) => {
          if (!open) { resetReservationForm(); setAddReservationGroupId(null); }
          setAddReservationOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Guest to Group</DialogTitle>
            <DialogDescription>
              Select an existing guest or register a new one, then assign a room.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Guest Selection with inline register toggle */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Guest <span className="text-destructive">*</span></Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowNewGuest(!showNewGuest)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {showNewGuest ? "Select existing" : "Register new guest"}
                </Button>
              </div>

              {!showNewGuest ? (
                /* Existing guest dropdown */
                <Select value={resGuestId} onValueChange={setResGuestId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a guest" />
                  </SelectTrigger>
                  <SelectContent>
                    {guests.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}{g.phone ? ` — ${g.phone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                /* Inline guest registration form */
                <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="new-guest-name" className="text-xs">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="new-guest-name"
                        placeholder="Guest full name"
                        value={newGuestName}
                        onChange={(e) => setNewGuestName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>{t('lblphoneNumber', 'Phone Number')}</Label>
                      <Input
                        id="new-guest-phone"
                        type="tel"
                        placeholder="Phone number"
                        value={newGuestPhone}
                        onChange={(e) => setNewGuestPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>{t('lblidType', 'ID Type')}</Label>
                      <Select value={newGuestIdType} onValueChange={setNewGuestIdType}>
                        <SelectTrigger id="new-guest-id-type">
                          <SelectValue placeholder="Select ID type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="National_ID">National ID</SelectItem>
                          <SelectItem value="Passport">Passport</SelectItem>
                          <SelectItem value="Driver_License">Driver License</SelectItem>
                          <SelectItem value="Military_ID">Military ID</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>{t('lblidNumber', 'ID Number')}</Label>
                      <Input
                        id="new-guest-id-number"
                        placeholder="ID number"
                        value={newGuestIdNumber}
                        onChange={(e) => setNewGuestIdNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleRegisterGuest}
                    disabled={registeringGuest || !newGuestName.trim()}
                    className="w-full"
                  >
                    {registeringGuest ? (
                      <>
                        <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Register & Select Guest
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Room Selection */}
            <div className="grid gap-2">
              <Label>Room <span className="text-destructive">*</span></Label>
              <Select value={resRoomId} onValueChange={(val) => { setResRoomId(val); setResSecondGuestName(""); setResSecondGuestPhone(""); setResSecondGuestIdNumber(""); setResExceptionallyReserved(false); setResExceptionReason(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an available room" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.length > 0 ? (
                    availableRooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.number}{r.name ? ` — ${r.name}` : ""}
                        {r.type ? ` (${r.type})` : ""}
                        {r.pricePerNight ? ` — ${r.pricePerNight} ETB/night` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No available rooms
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Second Guest — shown only for DOUBLE/TWIN rooms */}
            {rooms.find((r) => r.id === resRoomId) && (rooms.find((r) => r.id === resRoomId)!.type === "DOUBLE" || rooms.find((r) => r.id === resRoomId)!.type === "TWIN") && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <BedDouble className="h-4 w-4" />
                  <span className="text-xs font-semibold">Double Room — Second Guest Required</span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="grp-res-exception" checked={!resExceptionallyReserved} onChange={() => { setResExceptionallyReserved(false); setResExceptionReason(""); }} className="h-3.5 w-3.5 accent-emerald-600" />
                    <span className="text-xs font-medium">Two Guests</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="grp-res-exception" checked={resExceptionallyReserved} onChange={() => { setResExceptionallyReserved(true); setResSecondGuestName(""); setResSecondGuestPhone(""); setResSecondGuestIdNumber(""); }} className="h-3.5 w-3.5 accent-amber-600" />
                    <span className="text-xs font-medium text-amber-700">Exceptionally Reserved</span>
                  </label>
                </div>
                {!resExceptionallyReserved ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground">Enter the second guest details for this double room.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Second Guest Name <span className="text-rose-500">*</span></Label>
                        <Input placeholder="Full name" value={resSecondGuestName} onChange={(e) => setResSecondGuestName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Second Guest Phone <span className="text-rose-500">*</span></Label>
                        <Input type="tel" placeholder="Phone number" value={resSecondGuestPhone} onChange={(e) => setResSecondGuestPhone(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('lblsecondGuestIdNumber', 'Second Guest ID Number')}</Label>
                      <Input placeholder="ID number (optional)" value={resSecondGuestIdNumber} onChange={(e) => setResSecondGuestIdNumber(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <p className="text-[10px] font-medium">This room will be reserved for single occupancy with an exception.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Exception Reason <span className="text-rose-500">*</span></Label>
                      <Textarea placeholder="Explain why this double room is reserved for only one guest..." rows={2} value={resExceptionReason} onChange={(e) => setResExceptionReason(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('lblcheckinDate', 'Check-in Date')}</Label>
                <Input
                  type="date"
                  value={resCheckIn}
                  onChange={(e) => setResCheckIn(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('lblcheckoutDate', 'Check-out Date')}</Label>
                <Input
                  type="date"
                  value={resCheckOut}
                  onChange={(e) => setResCheckOut(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddReservationOpen(false);
                resetReservationForm();
                setAddReservationGroupId(null);
              }}
              disabled={addingReservation}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddReservation}
              disabled={addingReservation || !resGuestId || !resRoomId}
            >
              {addingReservation ? "Adding..." : "Add to Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>? All linked
              reservations will be unlinked (not deleted).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Group Checkout Confirmation Dialog */}
      <AlertDialog
        open={!!checkoutTarget}
        onOpenChange={(open) => { if (!open) setCheckoutTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-orange-500" />
              Group Check-out
            </AlertDialogTitle>
            <AlertDialogDescription>
              Check out <span className="font-semibold">all active reservations</span> for{" "}
              <span className="font-semibold">{checkoutTarget?.name}</span>?{" "}
              This will complete {checkoutTarget?.reservations?.filter((r) => r.status === "ACTIVE").length || 0} reservation(s)
              and free up the rooms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={checkingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGroupCheckout}
              disabled={checkingOut}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {checkingOut ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking out...
                </span>
              ) : (
                "Check-out All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Group Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={(open) => {
        if (!open) { setPaymentGroupId(null); setPaymentForm({ amount: "", method: "CASH", referenceNo: "", notes: "" }); }
        setPaymentOpen(open);
      }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Group Payment
            </DialogTitle>
            <DialogDescription>
              Record a payment for the entire group. It will be distributed proportionally across reservations.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Amount (ETB) <span className="text-destructive">*</span></Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="pl-9"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Payment Method <span className="text-destructive">*</span></Label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="MOBILE">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('lblreferenceNo', 'Reference No')}</Label>
              <Input
                value={paymentForm.referenceNo}
                onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                placeholder="Transaction reference (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('lblnotes', 'Notes')}</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Payment notes (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setPaymentOpen(false); setPaymentGroupId(null); }}
              disabled={paying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGroupPayment}
              disabled={paying || !paymentForm.amount || Number(paymentForm.amount) <= 0}
            >
              {paying ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" /> Record Payment
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reservation Detail Dialog */}
      <Dialog open={!!detailRes} onOpenChange={(open) => { if (!open) setDetailRes(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Reservation Detail
            </DialogTitle>
          </DialogHeader>
          {detailRes && (
            <div className="space-y-4">
              {/* Guest info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Guest</p>
                  <p className="text-sm font-medium">{detailRes.guest?.name ?? "Unknown"}</p>
                  {detailRes.guest?.phone && <p className="text-xs text-muted-foreground">{detailRes.guest.phone}</p>}
                  {detailRes.guest?.email && <p className="text-xs text-muted-foreground">{detailRes.guest.email}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Room</p>
                  <p className="text-sm font-medium">
                    {detailRes.room ? `${detailRes.room.number}${detailRes.room.name ? ` - ${detailRes.room.name}` : ""}` : "Not assigned"}
                  </p>
                  {detailRes.room?.type && (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">
                      {detailRes.room.type}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-in</p>
                  <p className="text-sm font-medium">{formatDate(detailRes.checkIn)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-out</p>
                  <p className="text-sm font-medium">{formatDate(detailRes.checkOut)}</p>
                </div>
              </div>

              {/* Cost and payment */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-lg border p-3 bg-muted/30">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-sm font-bold">{detailRes.totalCost?.toLocaleString() ?? 0} ETB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-sm font-medium text-emerald-600">{detailRes.paidAmount?.toLocaleString() ?? 0} ETB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className={`text-sm font-bold ${(detailRes.balance ?? detailRes.totalCost ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {Math.max(0, detailRes.balance ?? detailRes.totalCost ?? 0).toLocaleString()} ETB
                  </p>
                </div>
              </div>

              {/* Status row */}
              <div className="flex items-center gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={RESERVATION_STATUS_BADGE[detailRes.status] ?? "bg-gray-100 text-gray-700 border-gray-200"}
                  >
                    {detailRes.status}
                  </Badge>
                </div>
                {detailRes.paymentStatus && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <Badge
                      variant="outline"
                      className={
                        detailRes.paymentStatus === "PAID"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : detailRes.paymentStatus === "PARTIAL"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }
                    >
                      {detailRes.paymentStatus}
                    </Badge>
                  </div>
                )}
              </div>

              {detailRes.room?.pricePerNight && detailRes.nights && (
                <div className="text-xs text-muted-foreground border-l-2 border-muted pl-3">
                  {detailRes.nights} night(s) × {detailRes.room.pricePerNight.toLocaleString()} ETB/night = {detailRes.totalCost?.toLocaleString()} ETB
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
