'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  CalendarDays,
  Pencil,
  RefreshCw,
  Trash2,
  BedDouble,
  DoorOpen,
  Wrench,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { getRooms, createRoom, updateRoom, deleteRoom, updateRoomStatus, getReservations } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'list' | 'calendar';
type FilterStatus = 'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

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

interface Reservation {
  id: string;
  guest: { name: string };
  room: { id: string; number: string };
  checkIn: string;
  checkOut: string;
  status: string;
}

interface RoomFormData {
  id?: string;
  number: string;
  name: string;
  type: string;
  pricePerNight: string;
  floor: string;
  capacity: string;
  amenities: string;
  description: string;
}

const emptyForm: RoomFormData = {
  number: '',
  name: '',
  type: 'SINGLE',
  pricePerNight: '',
  floor: '1',
  capacity: '1',
  amenities: '',
  description: '',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[11px]">Available</Badge>;
    case 'OCCUPIED':
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[11px]">Occupied</Badge>;
    case 'MAINTENANCE':
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[11px]">Maintenance</Badge>;
    case 'RESERVED':
      return <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-[11px]">Reserved</Badge>;
    default:
      return <Badge variant="outline" className="text-[11px]">{status}</Badge>;
  }
}

function getTypeBadge(type: string) {
  return (
    <Badge variant="secondary" className="text-[11px]">
      {type}
    </Badge>
  );
}

// Calendar helpers
function getWeekDays(offset: number = 0): Date[] {
  const days: Date[] = [];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + offset * 7); // Monday
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }
  return days;
}

function dateToStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

function isToday(d: Date): boolean {
  return dateToStr(d) === dateToStr(new Date());
}

export default function RoomsPage() {
  const { refreshKey, triggerRefresh } = useAppStore();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [search, setSearch] = useState('');

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RoomFormData>(emptyForm);
  const [formSaving, setFormSaving] = useState(false);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusRoom, setStatusRoom] = useState<Room | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Calendar state
  const [weekOffset, setWeekOffset] = useState(0);
  const [calendarDays, setCalendarDays] = useState<Date[]>(getWeekDays(0));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomsData, resData] = await Promise.all([
        getRooms(),
        getReservations(),
      ]);
      setRooms(roomsData);
      setReservations(resData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  useEffect(() => {
    setCalendarDays(getWeekDays(weekOffset));
  }, [weekOffset]);

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (filter !== 'ALL' && r.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.number.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: rooms.length,
    available: rooms.filter((r) => r.status === 'AVAILABLE').length,
    occupied: rooms.filter((r) => r.status === 'OCCUPIED').length,
    maintenance: rooms.filter((r) => r.status === 'MAINTENANCE').length,
  };

  // Form handlers
  const openAddForm = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (room: Room) => {
    setForm({
      id: room.id,
      number: room.number,
      name: room.name,
      type: room.type,
      pricePerNight: String(room.pricePerNight),
      floor: String(room.floor),
      capacity: String(room.capacity),
      amenities: room.amenities,
      description: room.description,
    });
    setFormOpen(true);
  };

  const handleSaveForm = async () => {
    if (!form.number || !form.type || !form.pricePerNight) {
      toast.error('Please fill in required fields (Number, Type, Price)');
      return;
    }
    try {
      setFormSaving(true);
      const payload = {
        number: form.number,
        name: form.name || form.number,
        type: form.type,
        pricePerNight: parseFloat(form.pricePerNight),
        floor: parseInt(form.floor) || 1,
        capacity: parseInt(form.capacity) || 1,
        amenities: form.amenities,
        description: form.description,
      };

      if (form.id) {
        await updateRoom(form.id, payload);
        toast.success('Room updated successfully');
      } else {
        await createRoom(payload);
        toast.success('Room created successfully');
      }
      setFormOpen(false);
      triggerRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save room');
    } finally {
      setFormSaving(false);
    }
  };

  const openStatusDialog = (room: Room) => {
    setStatusRoom(room);
    setStatusDialogOpen(true);
  };

  const handleStatusChange = async (status: string) => {
    if (!statusRoom || status === statusRoom.status) return;
    try {
      setStatusSaving(true);
      await updateRoomStatus(statusRoom.id, status);
      toast.success(`Room ${statusRoom.number} status changed to ${status}`);
      setStatusDialogOpen(false);
      triggerRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  };

  const openDeleteDialog = (roomId: string) => {
    setDeleteRoomId(roomId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteRoomId) return;
    try {
      setDeleteSaving(true);
      await deleteRoom(deleteRoomId);
      toast.success('Room deleted');
      setDeleteDialogOpen(false);
      triggerRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete room');
    } finally {
      setDeleteSaving(false);
    }
  };

  // Calendar helpers
  const getReservationForRoomOnDate = (roomId: string, date: string): Reservation | undefined => {
    return reservations.find(
      (r) => r.room.id === roomId && r.checkIn <= date && r.checkOut > date && r.status !== 'CANCELLED'
    );
  };

  // Skeleton loading
  if (loading && rooms.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <BedDouble className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Rooms</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <DoorOpen className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.available}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.occupied}</p>
              <p className="text-xs text-muted-foreground">Occupied</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-orange-500/10 p-2">
              <Wrench className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.maintenance}</p>
              <p className="text-xs text-muted-foreground">Maintenance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 pl-9"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-1.5">
            {(['ALL', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] as FilterStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? 'default' : 'outline'}
                className={
                  filter === s
                    ? 'h-8 text-xs'
                    : 'h-8 text-xs border-border/50 hover:border-primary/30'
                }
                onClick={() => setFilter(s)}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                {s !== 'ALL' && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    ({s === 'AVAILABLE' ? stats.available : s === 'OCCUPIED' ? stats.occupied : stats.maintenance})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-border/50 p-0.5">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Add Room */}
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={openAddForm}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Room
          </Button>
        </div>
      </div>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <BedDouble className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No rooms found</p>
            </div>
          ) : (
            filteredRooms.map((room) => (
              <Card
                key={room.id}
                className="group border-border/50 transition-all duration-200 hover:border-border hover:shadow-lg hover:-translate-y-0.5"
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-amber-500">{room.number}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{room.name}</p>
                    </div>
                    {getStatusBadge(room.status)}
                  </div>

                  {/* Details */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(room.type)}
                      <span className="text-xs text-muted-foreground">Floor {room.floor}</span>
                      <span className="text-xs text-muted-foreground">&middot;</span>
                      <span className="text-xs text-muted-foreground">
                        <Users className="inline h-3 w-3 mr-0.5" />
                        {room.capacity}
                      </span>
                    </div>

                    {/* Amenities */}
                    {room.amenities && (
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.split(',').slice(0, 3).map((a, i) => (
                          <span
                            key={i}
                            className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {a.trim()}
                          </span>
                        ))}
                        {room.amenities.split(',').length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{room.amenities.split(',').length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="mt-2">
                      <span className="text-lg font-bold text-amber-500">
                        {formatCurrency(room.pricePerNight)}
                      </span>
                      <span className="text-xs text-muted-foreground"> / night</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2 border-t border-border/30 pt-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 flex-1 text-xs gap-1"
                      onClick={() => openEditForm(room)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 flex-1 text-xs gap-1"
                      onClick={() => openStatusDialog(room)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Status
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      onClick={() => openDeleteDialog(room.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <Card className="border-border/50">
          <CardContent className="p-0">
            {filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BedDouble className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No rooms found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Number</TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Floor</TableHead>
                      <TableHead className="text-xs">Capacity</TableHead>
                      <TableHead className="text-xs">Price/Night</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-bold text-amber-500">{room.number}</TableCell>
                        <TableCell className="text-sm">{room.name}</TableCell>
                        <TableCell>{getTypeBadge(room.type)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{room.floor}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{room.capacity}</TableCell>
                        <TableCell className="text-sm font-medium text-amber-500">
                          {formatCurrency(room.pricePerNight)}
                        </TableCell>
                        <TableCell>{getStatusBadge(room.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => openEditForm(room)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => openStatusDialog(room)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              onClick={() => openDeleteDialog(room.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Room Availability Calendar</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 border-border/50"
                  onClick={() => setWeekOffset((w) => w - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-32 text-center">
                  {weekOffset === 0
                    ? 'This Week'
                    : `${calendarDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${calendarDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 border-border/50"
                  onClick={() => setWeekOffset((w) => w + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {weekOffset !== 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setWeekOffset(0)}
                  >
                    Today
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto">
              {/* Legend */}
              <div className="mb-3 flex flex-wrap gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                  <span className="text-[11px] text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-blue-500/30 border border-blue-500/50" />
                  <span className="text-[11px] text-muted-foreground">Occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-orange-500/30 border border-orange-500/50" />
                  <span className="text-[11px] text-muted-foreground">Maintenance</span>
                </div>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left text-xs font-medium text-muted-foreground min-w-[100px]">
                      Room
                    </th>
                    {calendarDays.map((day, i) => (
                      <th
                        key={i}
                        className={`px-2 py-2 text-center font-medium min-w-[120px] ${
                          isToday(day) ? 'text-amber-400' : 'text-muted-foreground'
                        }`}
                      >
                        {getDayLabel(day)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map((room) => (
                    <tr key={room.id} className="border-t border-border/30">
                      <td className="sticky left-0 z-10 bg-card px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-500">{room.number}</span>
                          <span className="text-muted-foreground hidden sm:inline">{room.type}</span>
                        </div>
                      </td>
                      {calendarDays.map((day, dayIdx) => {
                        const dateStr = dateToStr(day);
                        const reservation = getReservationForRoomOnDate(room.id, dateStr);
                        const isTodayCol = isToday(day);

                        let cellClass = 'bg-emerald-500/10 border-emerald-500/30';
                        let content: React.ReactNode = '';

                        if (room.status === 'MAINTENANCE') {
                          cellClass = 'bg-orange-500/15 border-orange-500/30';
                          content = <span className="text-orange-400/70 text-[10px]">Maint.</span>;
                        } else if (reservation) {
                          cellClass = 'bg-blue-500/15 border-blue-500/30';
                          content = (
                            <span className="text-[10px] text-blue-300 truncate block max-w-[100px]">
                              {reservation.guest.name}
                            </span>
                          );
                        }

                        return (
                          <td
                            key={dayIdx}
                            className={`px-1 py-1 text-center border border-transparent rounded-sm mx-0.5 ${cellClass} ${
                              isTodayCol ? 'ring-1 ring-amber-500/50' : ''
                            }`}
                          >
                            <div className="py-1">{content}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRooms.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No rooms to display</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Room Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Room' : 'Add New Room'}</DialogTitle>
            <DialogDescription>
              {form.id ? 'Update room details below.' : 'Fill in the details to create a new room.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="room-number">
                  Room Number <span className="text-rose-400">*</span>
                </Label>
                <Input
                  id="room-number"
                  placeholder="e.g. 101"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-type">
                  Type <span className="text-rose-400">*</span>
                </Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">Single</SelectItem>
                    <SelectItem value="DOUBLE">Double</SelectItem>
                    <SelectItem value="TWIN">Twin</SelectItem>
                    <SelectItem value="SUITE">Suite</SelectItem>
                    <SelectItem value="DELUXE">Deluxe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-price">
                Price Per Night (ETB) <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="room-price"
                type="number"
                placeholder="0"
                value={form.pricePerNight}
                onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="room-floor">Floor</Label>
                <Input
                  id="room-floor"
                  type="number"
                  placeholder="1"
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-capacity">Capacity</Label>
                <Input
                  id="room-capacity"
                  type="number"
                  placeholder="1"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-amenities">Amenities</Label>
              <Input
                id="room-amenities"
                placeholder="WiFi, TV, AC, Mini Bar (comma separated)"
                value={form.amenities}
                onChange={(e) => setForm({ ...form, amenities: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-description">Description</Label>
              <Textarea
                id="room-description"
                placeholder="Optional description..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} className="border-border/50">
              Cancel
            </Button>
            <Button onClick={handleSaveForm} disabled={formSaving}>
              {formSaving ? 'Saving...' : 'Save Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Room Status</DialogTitle>
            <DialogDescription>
              Room <span className="font-semibold text-amber-500">{statusRoom?.number}</span> — currently{' '}
              <span className="font-medium">{statusRoom?.status}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] as const).map((status) => {
              const isCurrent = statusRoom?.status === status;
              const colorMap: Record<string, string> = {
                AVAILABLE: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
                OCCUPIED: 'border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
                MAINTENANCE: 'border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20',
              };
              return (
                <Button
                  key={status}
                  variant="outline"
                  className={`h-10 justify-start gap-2 font-medium ${colorMap[status]} ${
                    isCurrent ? 'ring-2 ring-foreground/20' : ''
                  }`}
                  disabled={isCurrent || statusSaving}
                  onClick={() => handleStatusChange(status)}
                >
                  {isCurrent && (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                  {isCurrent && (
                    <span className="ml-auto text-[10px] opacity-60">(current)</span>
                  )}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Room</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this room? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-border/50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteSaving}
            >
              {deleteSaving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}