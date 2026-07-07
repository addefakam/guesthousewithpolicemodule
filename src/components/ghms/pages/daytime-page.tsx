'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Sun,
  Plus,
  Pencil,
  Trash2,
  CalendarPlus,
  Clock,
  Banknote,
  Tag,
  Loader2,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import * as api from '@/lib/api';
import { toast } from 'sonner';

interface DaytimeService {
  id: string;
  name: string;
  price: number;
  category: string;
  duration: string;
  description: string;
  active: boolean;
}

interface DaytimeBooking {
  id: string;
  serviceId: string;
  guestName: string;
  guestPhone: string;
  date: string;
  time: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  paidAmount: number;
  paymentStatus: string;
  paymentMethod: string | null;
  notes: string;
  service?: DaytimeService;
}

const today = new Date().toISOString().split('T')[0];

const PAYMENT_STATUS_VARIANT: Record<string, string> = {
  PAID: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PARTIAL: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  PENDING: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function DaytimePage() {
  const { refreshKey, triggerRefresh } = useAppStore();
  const [services, setServices] = useState<DaytimeService[]>([]);
  const [bookings, setBookings] = useState<DaytimeBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<DaytimeBooking | null>(null);
  const [editingService, setEditingService] = useState<DaytimeService | null>(null);

  // Booking form
  const [bookForm, setBookForm] = useState({
    serviceId: '',
    guestName: '',
    guestPhone: '',
    date: today,
    time: '',
    quantity: 1,
    unitPrice: 0,
    totalCost: 0,
    paidAmount: 0,
    paymentMethod: '',
    notes: '',
  });

  // Service form
  const [svcForm, setSvcForm] = useState({
    name: '',
    category: '',
    price: 0,
    duration: '',
    active: 'true',
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [svcRes, bookRes] = await Promise.all([
        api.getDaytimeServices(),
        api.getDaytimeBookings(),
      ]);
      setServices(svcRes);
      setBookings(bookRes);
    } catch {
      toast.error('Failed to load daytime data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Stats
  const activeServices = services.filter((s) => s.active).length;
  const todayBookings = bookings.filter((b) => b.date === today);
  const todayRevenue = todayBookings.reduce(
    (sum, b) => sum + b.paidAmount,
    0
  );
  const totalRevenue = bookings.reduce((sum, b) => sum + b.paidAmount, 0);

  // Booking dialog helpers
  const openBookDialog = (booking?: DaytimeBooking) => {
    if (booking) {
      setEditingBooking(booking);
      setBookForm({
        serviceId: booking.serviceId,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        date: booking.date,
        time: booking.time,
        quantity: booking.quantity,
        unitPrice: booking.unitPrice,
        totalCost: booking.totalCost,
        paidAmount: booking.paidAmount,
        paymentMethod: booking.paymentMethod || '',
        notes: booking.notes,
      });
    } else {
      setEditingBooking(null);
      setBookForm({
        serviceId: '',
        guestName: '',
        guestPhone: '',
        date: today,
        time: '',
        quantity: 1,
        unitPrice: 0,
        totalCost: 0,
        paidAmount: 0,
        paymentMethod: '',
        notes: '',
      });
    }
    setBookDialogOpen(true);
  };

  const handleServiceSelect = (serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (svc) {
      setBookForm((f) => ({
        ...f,
        serviceId,
        unitPrice: svc.price,
        totalCost: svc.price * f.quantity,
      }));
    }
  };

  const handleQtyChange = (qty: number) => {
    setBookForm((f) => ({
      ...f,
      quantity: qty,
      totalCost: f.unitPrice * qty,
    }));
  };

  const handleSubmitBooking = async () => {
    if (!bookForm.serviceId || !bookForm.guestName || !bookForm.date) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const paymentStatus =
        bookForm.paidAmount >= bookForm.totalCost
          ? 'PAID'
          : bookForm.paidAmount > 0
            ? 'PARTIAL'
            : 'PENDING';

      const data = {
        ...bookForm,
        paymentStatus,
        paymentMethod: bookForm.paymentMethod || null,
      };

      if (editingBooking) {
        await api.updateDaytimeBooking(editingBooking.id, data);
        toast.success('Booking updated');
      } else {
        await api.createDaytimeBooking(data);
        toast.success('Booking created');
      }
      setBookDialogOpen(false);
      triggerRefresh();
    } catch {
      toast.error('Failed to save booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm('Delete this booking?')) return;
    try {
      await api.deleteDaytimeBooking(id);
      toast.success('Booking deleted');
      triggerRefresh();
    } catch {
      toast.error('Failed to delete booking');
    }
  };

  // Service dialog helpers
  const openServiceDialog = (service?: DaytimeService) => {
    if (service) {
      setEditingService(service);
      setSvcForm({
        name: service.name,
        category: service.category,
        price: service.price,
        duration: service.duration,
        active: service.active ? 'true' : 'false',
        description: service.description,
      });
    } else {
      setEditingService(null);
      setSvcForm({
        name: '',
        category: '',
        price: 0,
        duration: '',
        active: 'true',
        description: '',
      });
    }
    setServiceDialogOpen(true);
  };

  const handleSubmitService = async () => {
    if (!svcForm.name || !svcForm.category || !svcForm.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        ...svcForm,
        price: Number(svcForm.price),
        active: svcForm.active === 'true',
      };
      if (editingService) {
        await api.updateDaytimeService(editingService.id, data);
        toast.success('Service updated');
      } else {
        await api.createDaytimeService(data);
        toast.success('Service created');
      }
      setServiceDialogOpen(false);
      triggerRefresh();
    } catch {
      toast.error('Failed to save service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    try {
      await api.deleteDaytimeService(id);
      toast.success('Service deleted');
      triggerRefresh();
    } catch {
      toast.error('Failed to delete service');
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(n);

  const categorySuggestions = [...new Set(services.map((s) => s.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Services Offered</p>
                <p className="text-xl font-bold">{activeServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
                <CalendarPlus className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today&apos;s Bookings</p>
                <p className="text-xl font-bold">{todayBookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Sun className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today&apos;s Revenue</p>
                <p className="text-xl font-bold text-amber-400">
                  {formatCurrency(todayRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Banknote className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-emerald-400">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="catalogue">Service Catalogue</TabsTrigger>
        </TabsList>

        {/* Tab 1: Bookings */}
        <TabsContent value="bookings">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Daytime Bookings</CardTitle>
              <Button size="sm" onClick={() => openBookDialog()}>
                <Plus className="mr-1 h-4 w-4" />
                Book Service
              </Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No bookings yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{b.guestName}</p>
                              <p className="text-xs text-muted-foreground">{b.guestPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{b.service?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">
                                {b.service?.category || ''}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{b.date}</TableCell>
                          <TableCell className="text-sm">{b.time || '—'}</TableCell>
                          <TableCell className="text-center">{b.quantity}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-amber-400">
                                {formatCurrency(b.totalCost)}
                              </p>
                              {b.paymentStatus !== 'PAID' && (
                                <p className="text-xs text-red-400">
                                  Balance: {formatCurrency(b.totalCost - b.paidAmount)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={PAYMENT_STATUS_VARIANT[b.paymentStatus] || ''}
                            >
                              {b.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openBookDialog(b)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-400 hover:text-red-300"
                                onClick={() => handleDeleteBooking(b.id)}
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
        </TabsContent>

        {/* Tab 2: Service Catalogue */}
        <TabsContent value="catalogue">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Service Catalogue</CardTitle>
              <Button size="sm" onClick={() => openServiceDialog()}>
                <Plus className="mr-1 h-4 w-4" />
                Add Service
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.length === 0 ? (
                  <p className="col-span-full py-8 text-center text-muted-foreground">
                    No services added yet
                  </p>
                ) : (
                  services.map((s) => (
                    <Card
                      key={s.id}
                      className="border-border/50 bg-card/50 transition-colors hover:bg-card"
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <Badge variant="outline" className="text-xs">
                            {s.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              s.active
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }
                          >
                            {s.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div>
                          <h3 className="font-semibold">{s.name}</h3>
                          {s.duration && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {s.duration}
                            </p>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-amber-400">
                          {formatCurrency(s.price)}
                        </p>
                        {s.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {s.description}
                          </p>
                        )}
                        <div className="flex gap-1 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => {
                              setBookForm({
                                serviceId: s.id,
                                guestName: '',
                                guestPhone: '',
                                date: today,
                                time: '',
                                quantity: 1,
                                unitPrice: s.price,
                                totalCost: s.price,
                                paidAmount: 0,
                                paymentMethod: '',
                                notes: '',
                              });
                              setEditingBooking(null);
                              setBookDialogOpen(true);
                            }}
                          >
                            <CalendarPlus className="mr-1 h-3 w-3" />
                            Book
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openServiceDialog(s)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteService(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Book Service Dialog */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBooking ? 'Edit Booking' : 'Book Service'}
            </DialogTitle>
            <DialogDescription>
              {editingBooking
                ? 'Update the booking details below.'
                : 'Fill in the details to book a daytime service.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>
                Service <span className="text-red-400">*</span>
              </Label>
              <Select
                value={bookForm.serviceId}
                onValueChange={handleServiceSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services
                    .filter((s) => s.active)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {formatCurrency(s.price)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Guest Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="Guest name"
                  value={bookForm.guestName}
                  onChange={(e) =>
                    setBookForm((f) => ({ ...f, guestName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Guest Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={bookForm.guestPhone}
                  onChange={(e) =>
                    setBookForm((f) => ({ ...f, guestPhone: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={bookForm.date}
                  onChange={(e) =>
                    setBookForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={bookForm.time}
                  onChange={(e) =>
                    setBookForm((f) => ({ ...f, time: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={bookForm.quantity}
                  onChange={(e) =>
                    handleQtyChange(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input
                  value={formatCurrency(bookForm.unitPrice)}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Total</Label>
                <Input
                  value={formatCurrency(bookForm.totalCost)}
                  readOnly
                  className="bg-amber-500/10 font-semibold text-amber-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount Paid</Label>
                <Input
                  type="number"
                  min={0}
                  value={bookForm.paidAmount}
                  onChange={(e) =>
                    setBookForm((f) => ({
                      ...f,
                      paidAmount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={bookForm.paymentMethod}
                  onValueChange={(v) =>
                    setBookForm((f) => ({ ...f, paymentMethod: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select method" />
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
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={bookForm.notes}
                onChange={(e) =>
                  setBookForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBookDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitBooking} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBooking ? 'Update Booking' : 'Create Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit Service' : 'Add Service'}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? 'Update the service details below.'
                : 'Create a new daytime service.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>
                Service Name <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="e.g. Ethiopian Coffee Ceremony"
                value={svcForm.name}
                onChange={(e) =>
                  setSvcForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Category <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="e.g. Spa, Food, Tour"
                  list="svc-categories"
                  value={svcForm.category}
                  onChange={(e) =>
                    setSvcForm((f) => ({ ...f, category: e.target.value }))
                  }
                />
                <datalist id="svc-categories">
                  {categorySuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>
                  Price (ETB) <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={svcForm.price || ''}
                  onChange={(e) =>
                    setSvcForm((f) => ({
                      ...f,
                      price: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  placeholder="e.g. 30 min, 1 hour"
                  value={svcForm.duration}
                  onChange={(e) =>
                    setSvcForm((f) => ({ ...f, duration: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={svcForm.active}
                  onValueChange={(v) =>
                    setSvcForm((f) => ({ ...f, active: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the service..."
                value={svcForm.description}
                onChange={(e) =>
                  setSvcForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setServiceDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitService} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingService ? 'Update Service' : 'Create Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}