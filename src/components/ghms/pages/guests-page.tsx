'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  UserPlus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Users,
  Star,
  Crown,
  X,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Globe,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  getGuests,
  createGuest,
  updateGuest,
  deleteGuest,
  getReservations,
  getReviews,
} from '@/lib/api';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  idNumber: string;
  idType: string;
  nationality: string;
  address: string;
  notes: string;
  vip: boolean;
  totalSpent: number;
  totalStays: number;
  createdAt: string;
  updatedAt: string;
}

interface Reservation {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalCost: number;
  paidAmount: number;
  balance: number;
  paymentStatus: string;
  status: string;
  room?: { number: string; type: string };
}

interface Review {
  id: string;
  reservationId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-amber-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-violet-600',
  'bg-orange-600',
  'bg-teal-600',
  'bg-pink-600',
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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

// ── Component ──────────────────────────────────────────────────────────────────

export default function GuestsPage() {
  const { refreshKey } = useAppStore();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Dialogs
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileGuest, setProfileGuest] = useState<Guest | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingGuest, setDeletingGuest] = useState<Guest | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    idType: 'National ID',
    idNumber: '',
    nationality: '',
    address: '',
    notes: '',
    vip: false,
  });
  const [formLoading, setFormLoading] = useState(false);

  // Profile data
  const [profileReservations, setProfileReservations] = useState<Reservation[]>([]);
  const [profileReviews, setProfileReviews] = useState<Review[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  // ── Fetch guests ───────────────────────────────────────────────────────────

  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getGuests(debouncedSearch || undefined);
      setGuests(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load guests');
      setGuests([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests, refreshKey]);

  // ── Debounced search ──────────────────────────────────────────────────────

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', idType: 'National ID', idNumber: '', nationality: '', address: '', notes: '', vip: false });
    setEditingGuest(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowFormDialog(true);
  };

  const openEditDialog = (guest: Guest) => {
    setEditingGuest(guest);
    setForm({
      name: guest.name,
      phone: guest.phone,
      email: guest.email,
      idType: guest.idType || 'National ID',
      idNumber: guest.idNumber,
      nationality: guest.nationality,
      address: guest.address,
      notes: guest.notes,
      vip: guest.vip,
    });
    setShowFormDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Guest name is required');
      return;
    }
    if (!form.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    try {
      setFormLoading(true);
      if (editingGuest) {
        await updateGuest(editingGuest.id, form);
        toast.success('Guest updated successfully');
      } else {
        await createGuest(form);
        toast.success('Guest added successfully');
      }
      setShowFormDialog(false);
      resetForm();
      fetchGuests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save guest');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const confirmDelete = (guest: Guest) => {
    setDeletingGuest(guest);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deletingGuest) return;
    try {
      await deleteGuest(deletingGuest.id);
      toast.success('Guest deleted');
      setShowDeleteConfirm(false);
      setDeletingGuest(null);
      fetchGuests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete guest');
    }
  };

  // ── Profile ───────────────────────────────────────────────────────────────

  const openProfile = async (guest: Guest) => {
    setProfileGuest(guest);
    setShowProfileDialog(true);
    setProfileLoading(true);
    try {
      const [resvs, revs] = await Promise.all([
        getReservations({ guestId: guest.id }),
        getReviews(guest.id),
      ]);
      setProfileReservations(Array.isArray(resvs) ? resvs : []);
      setProfileReviews(Array.isArray(revs) ? revs : []);
    } catch {
      setProfileReservations([]);
      setProfileReviews([]);
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Filtered guests ───────────────────────────────────────────────────────

  const filteredGuests = useMemo(() => {
    if (!debouncedSearch) return guests;
    const q = debouncedSearch.toLowerCase();
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.phone.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.idNumber.toLowerCase().includes(q)
    );
  }, [guests, debouncedSearch]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guest Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your guest directory, track stays, and view profiles
          </p>
        </div>
        <Button onClick={openAddDialog} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Guest
        </Button>
      </div>

      {/* Search */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email, or ID number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="hidden md:table-cell">ID Number</TableHead>
                  <TableHead className="hidden lg:table-cell">Nationality</TableHead>
                  <TableHead className="text-center">Stays</TableHead>
                  <TableHead className="hidden sm:table-cell">Last Stay</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredGuests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-muted-foreground">
                        {searchQuery ? 'No guests match your search' : 'No guests yet'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGuests.map((guest) => (
                    <TableRow key={guest.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${getAvatarColor(guest.name)}`}
                          >
                            {getInitials(guest.name)}
                            {guest.vip && (
                              <Crown className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 text-amber-400 drop-shadow" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground truncate">
                                {guest.name}
                              </span>
                              {guest.vip && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                                  VIP
                                </Badge>
                              )}
                            </div>
                            {guest.email && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {guest.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{guest.phone}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {guest.idNumber || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {guest.nationality || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">
                          {guest.totalStays}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {guest.updatedAt ? formatDate(guest.updatedAt) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openProfile(guest)}
                            title="View profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(guest)}
                            title="Edit guest"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => confirmDelete(guest)}
                            title="Delete guest"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* ── Add/Edit Guest Dialog ─────────────────────────────────────────── */}
      <Dialog open={showFormDialog} onOpenChange={(open) => { setShowFormDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGuest ? 'Edit Guest' : 'Add New Guest'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="guest-name">Full Name *</Label>
              <Input
                id="guest-name"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="guest-phone">Phone *</Label>
              <Input
                id="guest-phone"
                placeholder="+251 9XX XXX XXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="guest-email">Email</Label>
              <Input
                id="guest-email"
                type="email"
                placeholder="guest@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>ID Type</Label>
                <Select
                  value={form.idType}
                  onValueChange={(v) => setForm({ ...form, idType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="National ID">National ID</SelectItem>
                    <SelectItem value="Passport">Passport</SelectItem>
                    <SelectItem value="Driving License">Driving License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guest-id-number">ID Number</Label>
                <Input
                  id="guest-id-number"
                  placeholder="ID number"
                  value={form.idNumber}
                  onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="guest-nationality">Nationality</Label>
              <Input
                id="guest-nationality"
                placeholder="Ethiopian"
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="guest-address">Address</Label>
              <Input
                id="guest-address"
                placeholder="Bole, Addis Ababa"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="guest-notes">Notes</Label>
              <Textarea
                id="guest-notes"
                placeholder="Special requests, preferences..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="guest-vip" className="text-sm font-medium">
                  VIP Guest
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mark for priority service and special treatment
                </p>
              </div>
              <Switch
                id="guest-vip"
                checked={form.vip}
                onCheckedChange={(checked) => setForm({ ...form, vip: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowFormDialog(false); resetForm(); }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={formLoading}>
              {formLoading ? 'Saving...' : editingGuest ? 'Update Guest' : 'Save Guest'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Profile Dialog ───────────────────────────────────────────── */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {profileGuest && (
            <>
              <DialogHeader>
                <DialogTitle>Guest Profile</DialogTitle>
              </DialogHeader>

              {/* Profile header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-2">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${getAvatarColor(profileGuest.name)} relative`}
                >
                  {getInitials(profileGuest.name)}
                  {profileGuest.vip && (
                    <Crown className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-400 drop-shadow" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold truncate">{profileGuest.name}</h3>
                    {profileGuest.vip && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        VIP
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {profileGuest.phone}
                    </span>
                    {profileGuest.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> {profileGuest.email}
                      </span>
                    )}
                    {profileGuest.nationality && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" /> {profileGuest.nationality}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profileGuest.idType && profileGuest.idNumber && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">ID</p>
                    <p className="text-sm font-medium mt-0.5">
                      {profileGuest.idType}: {profileGuest.idNumber}
                    </p>
                  </div>
                )}
                {profileGuest.address && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Address
                    </p>
                    <p className="text-sm font-medium mt-0.5">{profileGuest.address}</p>
                  </div>
                )}
                {profileGuest.notes && (
                  <div className="rounded-lg border border-border p-3 col-span-2 sm:col-span-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Notes
                    </p>
                    <p className="text-sm font-medium mt-0.5">{profileGuest.notes}</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{profileGuest.totalStays}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Stays</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-4 text-center border border-amber-500/20">
                  <p className="text-2xl font-bold text-amber-400">
                    {profileGuest.totalSpent.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Total Spent (ETB)</p>
                </div>
              </div>

              <Separator />

              {/* Reservation History */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Reservation History
                </h4>
                {profileLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-8 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : profileReservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No reservation history
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                    <div className="overflow-x-auto"><Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Room</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Check-out</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profileReservations.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm">
                              {r.room ? `${r.room.number} (${r.room.type})` : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(r.checkIn)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(r.checkOut)}
                            </TableCell>
                            <TableCell className="text-sm text-right font-medium text-amber-400">
                              {r.totalCost.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={r.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table></div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Reviews */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4" /> Reviews
                </h4>
                {profileLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : profileReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No reviews yet
                  </p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {profileReviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatDate(rev.createdAt)}
                          </span>
                        </div>
                        {rev.comment && (
                          <p className="text-sm text-muted-foreground">{rev.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────────────────── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Guest</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{deletingGuest?.name}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Status Badge Sub-component ─────────────────────────────────────────────────

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
      className={`text-[11px] ${styles[status] || styles.COMPLETED}`}
    >
      {status || 'UNKNOWN'}
    </Badge>
  );
}