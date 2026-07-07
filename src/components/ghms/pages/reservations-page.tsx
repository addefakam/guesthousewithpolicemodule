'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  LogIn,
  LogOut,
  XCircle,
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Receipt,
  Printer,
  BedDouble,
  Users,
  DollarSign,
  Phone,
  CreditCard,
  Hash,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import {
  getReservations,
  createReservation,
  updateReservation,
  checkinReservation,
  checkoutReservation,
  cancelReservation,
  getRooms,
  getGuests,
  getSettings,
} from '@/lib/api';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  number: string;
  name: string;
  type: string;
  pricePerNight: number;
  capacity: number;
  status: string;
}

interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  idNumber: string;
  idType: string;
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
  createdAt: string;
  guest?: Guest;
  room?: Room;
}

interface Settings {
  guestHouseName: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-amber-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-violet-600',
  'bg-orange-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ReservationsPage() {
  const { refreshKey } = useAppStore();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [settings, setSettings] = useState<Settings | null>(null);

  // Dialogs
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptReservation, setReceiptReservation] = useState<Reservation | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    guestName: '',
    guestPhone: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    paidAmount: '',
    paymentMethod: 'CASH',
    notes: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomSearch, setRoomSearch] = useState('');

  // Stats
  const stats = useMemo(() => {
    const all = reservations.length;
    const active = reservations.filter((r) => r.status === 'ACTIVE').length;
    const upcoming = reservations.filter((r) => r.status === 'UPCOMING').length;
    const completed = reservations.filter((r) => r.status === 'COMPLETED').length;
    return { all, active, upcoming, completed };
  }, [reservations]);

  // Selected room details
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === form.roomId) || null,
    [rooms, form.roomId]
  );

  // Computed cost
  const nights = useMemo(() => calcNights(form.checkIn, form.checkOut), [form.checkIn, form.checkOut]);
  const totalCost = useMemo(
    () => (selectedRoom ? nights * selectedRoom.pricePerNight : 0),
    [nights, selectedRoom]
  );

  // Filtered reservations
  const filtered = useMemo(() => {
    if (filter === 'all') return reservations;
    return reservations.filter((r) => r.status === filter);
  }, [reservations, filter]);

  // Available rooms (not RESERVED or OCCUPIED)
  const availableRooms = useMemo(() => {
    let list = rooms.filter(
      (r) => r.status === 'AVAILABLE' || r.status === 'MAINTENANCE'
    );
    if (roomSearch) {
      const q = roomSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rooms, roomSearch]);

  // ── Fetch data ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resvs, rms, setts] = await Promise.all([
        getReservations(),
        getRooms(),
        getSettings(),
      ]);
      const resvList = Array.isArray(resvs) ? resvs : [];
      const roomList = Array.isArray(rms) ? rms : [];
      // Sort by createdAt desc
      resvList.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReservations(resvList);
      setRooms(roomList);
      if (setts) setSettings(setts as Settings);
    } catch {
      toast.error('Failed to load reservations');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const resetForm = () => {
    setForm({ guestName: '', guestPhone: '', roomId: '', checkIn: '', checkOut: '', paidAmount: '', paymentMethod: 'CASH', notes: '' });
    setRoomSearch('');
    setEditingReservation(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowFormDialog(true);
  };

  const openEditDialog = (resv: Reservation) => {
    setEditingReservation(resv);
    setForm({
      guestName: resv.guest?.name || '',
      guestPhone: resv.guest?.phone || '',
      roomId: resv.roomId,
      checkIn: resv.checkIn,
      checkOut: resv.checkOut,
      paidAmount: String(resv.paidAmount),
      paymentMethod: resv.paymentMethod || 'CASH',
      notes: resv.notes,
    });
    setShowFormDialog(true);
  };

  const handleSubmit = async () => {
    if (!form.guestName.trim()) {
      toast.error('Guest name is required');
      return;
    }
    if (!form.guestPhone.trim()) {
      toast.error('Guest phone is required');
      return;
    }
    if (!form.roomId) {
      toast.error('Please select a room');
      return;
    }
    if (!form.checkIn || !form.checkOut) {
      toast.error('Check-in and check-out dates are required');
      return;
    }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      toast.error('Check-out must be after check-in');
      return;
    }
    if (nights <= 0) {
      toast.error('Invalid date range');
      return;
    }

    try {
      setFormLoading(true);
      const payload: any = {
        guestName: form.guestName,
        guestPhone: form.guestPhone,
        roomId: form.roomId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        nights,
        roomRate: selectedRoom!.pricePerNight,
        totalCost,
        paidAmount: parseFloat(form.paidAmount) || 0,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      };
      if (editingReservation) {
        await updateReservation(editingReservation.id, payload);
        toast.success('Reservation updated');
      } else {
        await createReservation(payload);
        toast.success('Reservation created');
      }
      setShowFormDialog(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save reservation');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCheckin = async (id: string) => {
    try {
      await checkinReservation(id);
      toast.success('Guest checked in successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    }
  };

  const handleCheckout = async (id: string) => {
    try {
      await checkoutReservation(id);
      toast.success('Guest checked out successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Check-out failed');
    }
  };

  const confirmCancel = (id: string) => {
    setCancellingId(id);
    setShowCancelConfirm(true);
  };

  const handleCancel = async () => {
    if (!cancellingId) return;
    try {
      await cancelReservation(cancellingId);
      toast.success('Reservation cancelled');
      setShowCancelConfirm(false);
      setCancellingId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Cancel failed');
    }
  };

  const openReceipt = (resv: Reservation) => {
    setReceiptReservation(resv);
    setShowReceiptDialog(true);
  };

  // ── Filter buttons ────────────────────────────────────────────────────────

  const filterButtons = [
    { key: 'all', label: 'All', count: stats.all },
    { key: 'UPCOMING', label: 'Upcoming', count: stats.upcoming },
    { key: 'ACTIVE', label: 'Active', count: stats.active },
    { key: 'COMPLETED', label: 'Completed', count: stats.completed },
    { key: 'CANCELLED', label: 'Cancelled', count: reservations.filter((r) => r.status === 'CANCELLED').length },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage bookings, check-ins, check-outs, and receipts
          </p>
        </div>
        <Button onClick={openAddDialog} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.all}</p>
              <p className="text-xs text-muted-foreground">All Reservations</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CalendarCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
              <CalendarClock className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.upcoming}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map((fb) => (
          <Button
            key={fb.key}
            variant={filter === fb.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(fb.key)}
            className="gap-1.5"
          >
            {fb.label}
            <span className="text-xs opacity-70">{fb.count}</span>
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Guest</TableHead>
                  <TableHead className="hidden sm:table-cell">Room</TableHead>
                  <TableHead className="hidden md:table-cell">Check-in</TableHead>
                  <TableHead className="hidden md:table-cell">Check-out</TableHead>
                  <TableHead className="text-center">Nights</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-muted-foreground">
                        {filter !== 'all'
                          ? `No ${filter.toLowerCase()} reservations`
                          : 'No reservations yet'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((resv) => (
                    <TableRow key={resv.id} className="group">
                      {/* Guest */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${getAvatarColor(resv.guest?.name || '?')}`}
                          >
                            {getInitials(resv.guest?.name || '?')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[140px]">
                              {resv.guest?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {resv.guest?.phone || '—'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      {/* Room */}
                      <TableCell className="hidden sm:table-cell">
                        <p className="text-sm font-medium">
                          {resv.room?.number || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {resv.room?.type || ''}
                        </p>
                      </TableCell>
                      {/* Check-in */}
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatDate(resv.checkIn)}
                      </TableCell>
                      {/* Check-out */}
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatDate(resv.checkOut)}
                      </TableCell>
                      {/* Nights */}
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">
                          {resv.nights}
                        </Badge>
                      </TableCell>
                      {/* Total */}
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-bold text-amber-400">
                            {resv.totalCost.toLocaleString()}
                          </span>
                          {resv.balance > 0 && (
                            <span className="text-[11px] text-red-400">
                              Bal: {resv.balance.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {/* Payment */}
                      <TableCell className="hidden sm:table-cell">
                        <PaymentBadge status={resv.paymentStatus} />
                      </TableCell>
                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={resv.status} />
                      </TableCell>
                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openReceipt(resv)}
                            title="View Receipt"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                          {resv.status === 'UPCOMING' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-400 hover:text-emerald-400"
                              onClick={() => handleCheckin(resv.id)}
                              title="Check-in"
                            >
                              <LogIn className="h-4 w-4" />
                            </Button>
                          )}
                          {resv.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-400 hover:text-amber-400"
                              onClick={() => handleCheckout(resv.id)}
                              title="Check-out"
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          )}
                          {resv.status !== 'COMPLETED' && resv.status !== 'CANCELLED' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(resv)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-400 hover:text-red-400"
                                onClick={() => confirmCancel(resv.id)}
                                title="Cancel"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── New/Edit Reservation Dialog ──────────────────────────────────── */}
      <Dialog open={showFormDialog} onOpenChange={(open) => { setShowFormDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            {/* Left: Form */}
            <div className="lg:col-span-3 p-6 space-y-5">
              <DialogHeader className="px-0">
                <DialogTitle>
                  {editingReservation ? 'Edit Reservation' : 'New Reservation'}
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                {/* Guest */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="res-guest-name">Guest Name *</Label>
                    <Input
                      id="res-guest-name"
                      placeholder="Full name"
                      value={form.guestName}
                      onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="res-guest-phone">Guest Phone *</Label>
                    <Input
                      id="res-guest-phone"
                      placeholder="+251 9XX XXX XXX"
                      value={form.guestPhone}
                      onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Room select */}
                <div className="grid gap-2">
                  <Label htmlFor="res-room">Room *</Label>
                  <Select
                    value={form.roomId}
                    onValueChange={(v) => setForm({ ...form, roomId: v })}
                  >
                    <SelectTrigger id="res-room">
                      <SelectValue placeholder="Select a room..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.number} — {room.type} ({room.pricePerNight.toLocaleString()} ETB/night)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Room details panel */}
                {selectedRoom && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Room Details
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Type</p>
                        <p className="font-medium">{selectedRoom.type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Rate</p>
                        <p className="font-medium text-amber-400">
                          {selectedRoom.pricePerNight.toLocaleString()} ETB
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Capacity</p>
                        <p className="font-medium">{selectedRoom.capacity} guests</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="res-checkin">Check-in Date *</Label>
                    <Input
                      id="res-checkin"
                      type="date"
                      value={form.checkIn}
                      onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="res-checkout">Check-out Date *</Label>
                    <Input
                      id="res-checkout"
                      type="date"
                      value={form.checkOut}
                      onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                    />
                  </div>
                </div>

                {/* Cost summary */}
                {nights > 0 && selectedRoom && (
                  <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="text-xs text-amber-400/80 font-medium uppercase tracking-wider mb-2">
                      Cost Summary
                    </p>
                    <div className="flex items-center justify-center gap-2 text-lg">
                      <span className="font-mono font-bold">{nights}</span>
                      <span className="text-muted-foreground">×</span>
                      <span className="font-mono font-bold text-amber-400">
                        {selectedRoom.pricePerNight.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">=</span>
                      <span className="font-mono font-bold text-xl text-amber-400">
                        {totalCost.toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                )}

                {/* Payment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="res-paid">Amount Paid *</Label>
                    <Input
                      id="res-paid"
                      type="number"
                      placeholder="0"
                      value={form.paidAmount}
                      onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={form.paymentMethod}
                      onValueChange={(v) => setForm({ ...form, paymentMethod: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="TRANSFER">Transfer</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="MOBILE">Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notes */}
                <div className="grid gap-2">
                  <Label htmlFor="res-notes">Notes</Label>
                  <Textarea
                    id="res-notes"
                    placeholder="Special requests, preferences..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowFormDialog(false); resetForm(); }}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={formLoading}>
                  {formLoading
                    ? 'Saving...'
                    : editingReservation
                    ? 'Update Reservation'
                    : 'Create Reservation'}
                </Button>
              </div>
            </div>

            {/* Right: Available rooms panel */}
            <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-border bg-muted/20 p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BedDouble className="h-4 w-4" /> Available Rooms
              </h4>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search rooms..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {availableRooms.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No available rooms
                  </p>
                ) : (
                  availableRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setForm({ ...form, roomId: room.id })}
                      className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                        form.roomId === room.id
                          ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/30'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          Room {room.number}
                        </span>
                        <span className="text-xs text-amber-400 font-medium">
                          {room.pricePerNight.toLocaleString()} ETB
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>{room.type}</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {room.capacity}
                        </span>
                        <span>per night</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Receipt Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" id="receipt-content">
          {receiptReservation && settings && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Receipt</DialogTitle>
              </DialogHeader>

              <div className="print:p-0 space-y-5">
                {/* Header */}
                <div className="text-center">
                  <h2 className="text-xl font-bold text-primary">
                    {settings.guestHouseName || 'Guest House'}
                  </h2>
                  {settings.address && (
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {settings.address}
                    </p>
                  )}
                  {settings.phone && (
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Phone className="h-3 w-3" /> {settings.phone}
                    </p>
                  )}
                  <Separator className="my-3" />
                  <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    Receipt
                  </p>
                </div>

                {/* Receipt meta */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">Receipt #:</span>{' '}
                    {receiptReservation.id.slice(-8).toUpperCase()}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">Date:</span>{' '}
                    {formatDate(receiptReservation.createdAt)}
                  </span>
                </div>

                <Separator />

                {/* Guest details */}
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Guest Details
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{receiptReservation.guest?.name || '—'}</span>
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{receiptReservation.guest?.phone || '—'}</span>
                    {receiptReservation.guest?.idNumber && (
                      <>
                        <span className="text-muted-foreground">ID:</span>
                        <span className="font-medium">
                          {receiptReservation.guest.idType} — {receiptReservation.guest.idNumber}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Reservation details */}
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Reservation Details
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Room:</span>
                    <span className="font-medium">
                      {receiptReservation.room?.number} ({receiptReservation.room?.type})
                    </span>
                    <span className="text-muted-foreground">Check-in:</span>
                    <span>{formatDate(receiptReservation.checkIn)}</span>
                    <span className="text-muted-foreground">Check-out:</span>
                    <span>{formatDate(receiptReservation.checkOut)}</span>
                    <span className="text-muted-foreground">Nights:</span>
                    <span>{receiptReservation.nights}</span>
                    <span className="text-muted-foreground">Rate/Night:</span>
                    <span>{receiptReservation.roomRate?.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>

                <Separator />

                {/* Financial summary */}
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Financial Summary
                  </p>
                  <div className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{receiptReservation.totalCost.toLocaleString()} {settings.currency}</span>
                    </div>
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>Amount Paid</span>
                      <span className="font-medium">
                        {receiptReservation.paidAmount.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                    {receiptReservation.balance > 0 && (
                      <div className="flex justify-between text-sm text-red-400">
                        <span>Balance Due</span>
                        <span className="font-medium">
                          {receiptReservation.balance.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>TOTAL</span>
                      <span className="text-amber-400">
                        {receiptReservation.totalCost.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment status & method */}
                <div className="flex items-center gap-3">
                  <PaymentBadge status={receiptReservation.paymentStatus} />
                  {receiptReservation.paymentMethod && (
                    <Badge variant="outline" className="text-xs">
                      <CreditCard className="h-3 w-3 mr-1" />
                      {receiptReservation.paymentMethod}
                    </Badge>
                  )}
                </div>

                {/* Notes */}
                {receiptReservation.notes && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm mt-1">{receiptReservation.notes}</p>
                  </div>
                )}

                <Separator />

                {/* Footer */}
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground italic">
                    Thank you for staying with us!
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="print:hidden"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Receipt
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Cancel Confirm Dialog ─────────────────────────────────────────── */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Reservation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this reservation? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
              Keep Reservation
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    UPCOMING: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    COMPLETED: 'bg-muted text-muted-foreground border-border',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <Badge
      variant="outline"
      className={`text-[11px] whitespace-nowrap ${styles[status] || styles.COMPLETED}`}
    >
      {status || 'UNKNOWN'}
    </Badge>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    PARTIAL: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    PENDING: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge
      variant="outline"
      className={`text-[11px] capitalize whitespace-nowrap ${styles[status] || styles.PENDING}`}
    >
      {status?.toLowerCase() || 'pending'}
    </Badge>
  );
}