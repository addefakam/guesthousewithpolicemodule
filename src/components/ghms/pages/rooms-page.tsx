"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  apiGetRooms,
  apiCreateRoom,
  apiUpdateRoom,
  apiDeleteRoom,
  apiUpdateRoomStatus,
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
  Pencil,
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
  Tv,
  Wind,
  Coffee,
  ShowerHead,
  Car,
  DollarSign,
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

const emptyForm = {
  number: "",
  name: "",
  type: "SINGLE",
  pricePerNight: "",
  floor: "",
  capacity: "",
  amenities: "[]",
  description: "",
};

export default function RoomsPage() {
  const { refreshKey, triggerRefresh } = useAppStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGetRooms(search);
      setRooms(data.rooms || []);
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

  const openCreate = () => {
    setEditingRoom(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    setForm({
      number: room.number,
      name: room.name,
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
    if (!form.number || !form.name || !form.pricePerNight || !form.floor || !form.capacity) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        number: form.number,
        name: form.name,
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

  const parseAmenities = (amenitiesStr: string): string[] => {
    try {
      const parsed = JSON.parse(amenitiesStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return amenitiesStr.split(",").map((s) => s.trim()).filter(Boolean);
    }
  };

  const filteredRooms = rooms.filter((room) => {
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
          <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your {rooms.length} room{rooms.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Room
        </Button>
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

      {/* Room Grid */}
      {filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Building2 className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-lg font-medium text-gray-500">No rooms found</p>
          <p className="mt-1 text-sm text-gray-400">
            {search ? "Try a different search term" : "Get started by adding your first room"}
          </p>
          {!search && (
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
            const amenities = parseAmenities(room.amenities);
            return (
              <Card key={room.id} className="gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
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
                        <p className="text-sm text-gray-500">{room.name}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(room)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const nextStatus = room.status === "AVAILABLE" ? "MAINTENANCE" : "AVAILABLE";
                            handleStatusChange(room, nextStatus);
                          }}
                        >
                          <Layers className="mr-2 h-4 w-4" />
                          Toggle Availability
                        </DropdownMenuItem>
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
                      <span>Floor {room.floor}</span>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRoom ? "Edit Room" : "Add New Room"}</DialogTitle>
            <DialogDescription>
              {editingRoom
                ? "Update room details below."
                : "Fill in the details to create a new room."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-number">
                  Room Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="room-number"
                  placeholder="e.g. 101"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-name">
                  Room Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="room-name"
                  placeholder="e.g. Ocean View"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-type">Room Type</Label>
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
                          {type}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-price">
                  Price/Night <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="room-price"
                  type="number"
                  placeholder="0"
                  value={form.pricePerNight}
                  onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-floor">
                  Floor <span className="text-rose-500">*</span>
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
                  Capacity <span className="text-rose-500">*</span>
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
              <Label htmlFor="room-amenities">Amenities (comma-separated)</Label>
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
              <Label htmlFor="room-description">Description</Label>
              <Textarea
                id="room-description"
                placeholder="Describe the room..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingRoom ? "Update Room" : "Create Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room {deleteDialog?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete room &quot;{deleteDialog?.name}&quot; and all
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}