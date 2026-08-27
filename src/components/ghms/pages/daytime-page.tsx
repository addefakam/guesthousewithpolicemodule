"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  apiGetDaytimeServices,
  apiCreateDaytimeService,
  apiUpdateDaytimeService,
  apiDeleteDaytimeService,
  apiGetDaytimeBookings,
  apiCreateDaytimeBooking,
  apiUpdateDaytimeBooking,
  apiDeleteDaytimeBooking,
  apiCreatePayment,
} from "@/lib/api";
import { toast } from "sonner";
import { isValidPhone } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sun,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  DollarSign,
  Clock,
  CreditCard,
  CalendarDays,
  Tag,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  price: number;
  category: string;
  duration: string;
  description: string;
  active: boolean;
}

interface Booking {
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
  service?: { id: string; name: string; category: string };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(price);

const PAYMENT_STYLES: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PARTIAL: "bg-amber-100 text-amber-800 border-amber-200",
  PENDING: "bg-rose-100 text-rose-800 border-rose-200",
};

const CATEGORY_COLORS: Record<string, string> = {
  SPA: "bg-purple-50 text-purple-700 border-purple-200",
  FOOD: "bg-orange-50 text-orange-700 border-orange-200",
  LAUNDRY: "bg-sky-50 text-sky-700 border-sky-200",
  TOUR: "bg-teal-50 text-teal-700 border-teal-200",
  TRANSPORT: "bg-slate-50 text-slate-700 border-slate-200",
  GYM: "bg-rose-50 text-rose-700 border-rose-200",
  POOL: "bg-cyan-50 text-cyan-700 border-cyan-200",
  EVENT: "bg-amber-50 text-amber-700 border-amber-200",
  OTHER: "bg-gray-50 text-gray-700 border-gray-200",
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function DaytimePage() {
  const { t } = useTranslation(["daytime", "common"]);
  const { refreshKey, triggerRefresh } = useAppStore();
  const [activeTab, setActiveTab] = useState("services");

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [svcLoading, setSvcLoading] = useState(true);
  const [svcDialogOpen, setSvcDialogOpen] = useState(false);
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);
  const [svcForm, setSvcForm] = useState({ name: "", price: "", category: "", duration: "", description: "" });
  const [svcSaving, setSvcSaving] = useState(false);
  const [svcDeleteTarget, setSvcDeleteTarget] = useState<Service | null>(null);
  const [svcDeleting, setSvcDeleting] = useState(false);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bkLoading, setBkLoading] = useState(true);
  const [bkDialogOpen, setBkDialogOpen] = useState(false);
  const [editingBk, setEditingBk] = useState<Booking | null>(null);
  const [bkForm, setBkForm] = useState({
    serviceId: "", guestName: "", guestPhone: "", date: "", time: "", quantity: "1",
  });
  const [bkSaving, setBkSaving] = useState(false);
  const [bkDeleteTarget, setBkDeleteTarget] = useState<Booking | null>(null);
  const [bkDeleting, setBkDeleting] = useState(false);

  // Payment dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Booking | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: t("payMethodCash") });
  const [paySaving, setPaySaving] = useState(false);

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchServices = useCallback(async () => {
    try {
      setSvcLoading(true);
      const data = await apiGetDaytimeServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toastFailedLoadServices");
      toast.error(msg);
    } finally {
      setSvcLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      setBkLoading(true);
      const data = await apiGetDaytimeBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toastFailedLoadBookings");
      toast.error(msg);
    } finally {
      setBkLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices, refreshKey]);
  useEffect(() => { fetchBookings(); }, [fetchBookings, refreshKey]);

  // ─── Service CRUD ─────────────────────────────────────────────────────────

  const openCreateSvc = () => {
    setEditingSvc(null);
    setSvcForm({ name: "", price: "", category: "", duration: "", description: "" });
    setSvcDialogOpen(true);
  };

  const openEditSvc = (svc: Service) => {
    setEditingSvc(svc);
    setSvcForm({
      name: svc.name,
      price: String(svc.price),
      category: svc.category,
      duration: svc.duration,
      description: svc.description,
    });
    setSvcDialogOpen(true);
  };

  const handleSaveSvc = async () => {
    if (!svcForm.name || !svcForm.price) {
      toast.error(t("valNamePriceRequired"));
      return;
    }
    try {
      setSvcSaving(true);
      const payload = {
        name: svcForm.name,
        price: Number(svcForm.price),
        category: svcForm.category,
        duration: svcForm.duration,
        description: svcForm.description,
        active: editingSvc ? editingSvc.active : true,
      };
      if (editingSvc) {
        await apiUpdateDaytimeService(editingSvc.id, payload);
        toast.success(t("toastServiceUpdated"));
      } else {
        await apiCreateDaytimeService(payload);
        toast.success(t("toastServiceCreated"));
      }
      setSvcDialogOpen(false);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedSaveService"));
    } finally {
      setSvcSaving(false);
    }
  };

  const handleDeleteSvc = async () => {
    if (!svcDeleteTarget) return;
    try {
      setSvcDeleting(true);
      await apiDeleteDaytimeService(svcDeleteTarget.id);
      toast.success(t("toastServiceDeleted"));
      setSvcDeleteTarget(null);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedDeleteService"));
    } finally {
      setSvcDeleting(false);
    }
  };

  const handleToggleActive = async (svc: Service) => {
    try {
      await apiUpdateDaytimeService(svc.id, { active: !svc.active });
      toast.success(svc.active ? t("toastServiceDeactivated") : t("toastServiceActivated"));
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedToggleService"));
    }
  };

  // ─── Booking CRUD ─────────────────────────────────────────────────────────

  const selectedService = services.find((s) => s.id === bkForm.serviceId);

  const openCreateBk = () => {
    setEditingBk(null);
    setBkForm({ serviceId: "", guestName: "", guestPhone: "", date: "", time: "", quantity: "1" });
    setBkDialogOpen(true);
  };

  const openEditBk = (bk: Booking) => {
    setEditingBk(bk);
    setBkForm({
      serviceId: bk.serviceId,
      guestName: bk.guestName,
      guestPhone: bk.guestPhone,
      date: bk.date,
      time: bk.time,
      quantity: String(bk.quantity),
    });
    setBkDialogOpen(true);
  };

  const handleSaveBk = async () => {
    if (!bkForm.serviceId || !bkForm.guestName || !bkForm.date || !bkForm.time) {
      toast.error(t("valBookingRequired"));
      return;
    }
    const svc = services.find((s) => s.id === bkForm.serviceId);
    if (!svc) { toast.error(t("valServiceNotFound")); return; }
    if (bkForm.guestPhone.trim() && !isValidPhone(bkForm.guestPhone)) {
      toast.error(t("valInvalidPhone"));
      return;
    }

    try {
      setBkSaving(true);
      const qty = Number(bkForm.quantity) || 1;
      const unitPrice = editingBk ? editingBk.unitPrice : svc.price;
      const payload = {
        serviceId: bkForm.serviceId,
        guestName: bkForm.guestName,
        guestPhone: bkForm.guestPhone,
        date: bkForm.date,
        time: bkForm.time,
        quantity: qty,
        unitPrice,
        totalCost: unitPrice * qty,
      };
      if (editingBk) {
        await apiUpdateDaytimeBooking(editingBk.id, payload);
        toast.success(t("toastBookingUpdated"));
      } else {
        await apiCreateDaytimeBooking(payload);
        toast.success(t("toastBookingCreated"));
      }
      setBkDialogOpen(false);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedSaveBooking"));
    } finally {
      setBkSaving(false);
    }
  };

  const handleDeleteBk = async () => {
    if (!bkDeleteTarget) return;
    try {
      setBkDeleting(true);
      await apiDeleteDaytimeBooking(bkDeleteTarget.id);
      toast.success(t("toastBookingDeleted"));
      setBkDeleteTarget(null);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedDeleteBooking"));
    } finally {
      setBkDeleting(false);
    }
  };

  // ─── Payment Recording ────────────────────────────────────────────────────

  const openPayDialog = (bk: Booking) => {
    setPayTarget(bk);
    const remaining = bk.totalCost - bk.paidAmount;
    setPayForm({ amount: String(remaining), method: "CASH" });
    setPayDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!payTarget || !payForm.amount || Number(payForm.amount) <= 0) {
      toast.error(t("valValidAmount"));
      return;
    }
    try {
      setPaySaving(true);
      const amount = Number(payForm.amount);
      const newPaid = payTarget.paidAmount + amount;
      const newStatus = newPaid >= payTarget.totalCost ? "PAID" : "PARTIAL";

      await apiCreatePayment({
        daytimeBookingId: payTarget.id,
        amount,
        method: payForm.method,
      });

      await apiUpdateDaytimeBooking(payTarget.id, {
        paidAmount: newPaid,
        paymentStatus: newStatus,
        paymentMethod: payForm.method,
      });

      toast.success(t("toastPaymentRecorded", { amount: formatPrice(amount) }));
      setPayDialogOpen(false);
      setPayTarget(null);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastFailedRecordPayment"));
    } finally {
      setPaySaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("pageSubtitle")}
          </p>
        </div>
        <Button
          onClick={activeTab === "services" ? openCreateSvc : openCreateBk}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {activeTab === "services" ? t("btnAddService") : t("btnNewBooking")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="services" className="gap-2">
            <Sun className="h-4 w-4" />
            {t("tabServices")} ({services.length})
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            {t("tabBookings")} ({bookings.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── Services Tab ────────────────────────────────────────────────── */}
        <TabsContent value="services">
          {svcLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-xl" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
              <Sun className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-500">{t("noServicesYet")}</p>
              <p className="mt-1 text-sm text-gray-400">{t("noServicesYetDesc")}</p>
              <Button onClick={openCreateSvc} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> {t("btnAddService")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((svc) => {
                const catColor = CATEGORY_COLORS[svc.category.toUpperCase()] || CATEGORY_COLORS.OTHER;
                return (
                  <Card key={svc.id} className={`gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md ${!svc.active ? "opacity-60" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${catColor}`}>
                            <Sun className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 leading-tight">{svc.name}</h3>
                            {svc.category && (
                              <Badge variant="outline" className={`mt-1 text-xs ${catColor}`}>{svc.category}</Badge>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditSvc(svc)}>
                              <Pencil className="mr-2 h-4 w-4" /> {t("menuEdit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(svc)}>
                              {svc.active ? t("menuDeactivate") : t("menuActivate")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-rose-600 focus:text-rose-600"
                              onClick={() => setSvcDeleteTarget(svc)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> {t("menuDelete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                          {formatPrice(svc.price)}
                        </div>
                        {svc.duration && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            {svc.duration}
                          </div>
                        )}
                      </div>

                      {svc.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{svc.description}</p>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={svc.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}
                        >
                          {svc.active ? t("statusActive") : t("statusInactive")}
                        </Badge>
                        <Switch
                          checked={svc.active}
                          onCheckedChange={() => handleToggleActive(svc)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Bookings Tab ────────────────────────────────────────────────── */}
        <TabsContent value="bookings">
          {bkLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
              <CalendarDays className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-500">{t("noBookingsYet")}</p>
              <p className="mt-1 text-sm text-gray-400">{t("noBookingsYetDesc")}</p>
              <Button onClick={openCreateBk} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> {t("btnNewBooking")}
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("thguest")}</TableHead>
                      <TableHead>{t("thservice")}</TableHead>
                      <TableHead>{t("thdate")}</TableHead>
                      <TableHead>{t("thtime")}</TableHead>
                      <TableHead>{t("thqty")}</TableHead>
                      <TableHead>{t("thtotal")}</TableHead>
                      <TableHead>{t("thpayment")}</TableHead>
                      <TableHead>{t("thactions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((bk) => (
                      <TableRow key={bk.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{bk.guestName}</p>
                            {bk.guestPhone && (
                              <p className="text-xs text-gray-500">{bk.guestPhone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700">{bk.service?.name || t("dashFallback")}</span>
                        </TableCell>
                        <TableCell className="text-sm">{bk.date}</TableCell>
                        <TableCell className="text-sm">{bk.time}</TableCell>
                        <TableCell className="text-right text-sm">{bk.quantity}</TableCell>
                        <TableCell className="text-right font-medium text-sm">{formatPrice(bk.totalCost)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={PAYMENT_STYLES[bk.paymentStatus] || PAYMENT_STYLES.PENDING}>
                            {t("paymentStatus" + bk.paymentStatus.charAt(0) + bk.paymentStatus.slice(1).toLowerCase())}
                            {bk.paymentStatus === "PARTIAL" && (
                              <span className="ml-1 text-xs">({formatPrice(bk.paidAmount)})</span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditBk(bk)}>
                                <Pencil className="mr-2 h-4 w-4" /> {t("menuEdit")}
                              </DropdownMenuItem>
                              {bk.paymentStatus !== "PAID" && (
                                <DropdownMenuItem onClick={() => openPayDialog(bk)}>
                                  <CreditCard className="mr-2 h-4 w-4" /> {t("menuRecordPayment")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600"
                                onClick={() => setBkDeleteTarget(bk)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> {t("menuDelete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Service Create/Edit Dialog ────────────────────────────────────── */}
      <Dialog open={svcDialogOpen} onOpenChange={setSvcDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSvc ? t("dlgEditServiceTitle") : t("dlgAddServiceTitle")}</DialogTitle>
            <DialogDescription>
              {editingSvc ? t("dlgEditServiceDesc") : t("dlgAddServiceDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t("lblServiceName")} <span className="text-rose-500">*</span></Label>
              <Input placeholder={t("phServiceName")} value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("lblPrice")} <span className="text-rose-500">*</span></Label>
                <Input type="number" placeholder="0" value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("lblcategory")}</Label>
                <Select value={svcForm.category} onValueChange={(v) => setSvcForm({ ...svcForm, category: v })}>
                  <SelectTrigger><SelectValue placeholder={t("phSelectGeneric")} /></SelectTrigger>
                  <SelectContent>
                    {[
                      { value: "SPA", label: t("catSpa") },
                      { value: "FOOD", label: t("catFood") },
                      { value: "LAUNDRY", label: t("catLaundry") },
                      { value: "TOUR", label: t("catTour") },
                      { value: "TRANSPORT", label: t("catTransport") },
                      { value: "GYM", label: t("catGym") },
                      { value: "POOL", label: t("catPool") },
                      { value: "EVENT", label: t("catEvent") },
                      { value: "OTHER", label: t("catOther") },
                    ].map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("lblduration")}</Label>
              <Input placeholder={t("phDuration")} value={svcForm.duration} onChange={(e) => setSvcForm({ ...svcForm, duration: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("lbldescription")}</Label>
              <Textarea placeholder={t("phDescription")} rows={3} value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSvcDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSaveSvc} disabled={svcSaving}>
              {svcSaving ? t("btnSaving") : editingSvc ? t("btnUpdateService") : t("btnCreateService")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Booking Create/Edit Dialog ────────────────────────────────────── */}
      <Dialog open={bkDialogOpen} onOpenChange={setBkDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBk ? t("dlgEditBookingTitle") : t("dlgNewBookingTitle")}</DialogTitle>
            <DialogDescription>
              {editingBk ? t("dlgEditBookingDesc") : t("dlgNewBookingDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t("lblService")} <span className="text-rose-500">*</span></Label>
              <Select value={bkForm.serviceId} onValueChange={(v) => setBkForm({ ...bkForm, serviceId: v })}>
                <SelectTrigger><SelectValue placeholder={t("phSelectService")} /></SelectTrigger>
                <SelectContent>
                  {services.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-gray-400">{t("noServicesInSelect")}</div>
                  )}
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {formatPrice(s.price)}
                      {s.active === false && <span className="ml-1 text-amber-500 text-xs">{t("statusInactiveHint")}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("lblGuestName")} <span className="text-rose-500">*</span></Label>
                <Input placeholder={t("phGuestName")} value={bkForm.guestName} onChange={(e) => setBkForm({ ...bkForm, guestName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("lblphone")}</Label>
                <Input type="tel" placeholder={t("phPhoneNumber")} value={bkForm.guestPhone} onChange={(e) => setBkForm({ ...bkForm, guestPhone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("lblDate")} <span className="text-rose-500">*</span></Label>
                <Input type="date" value={bkForm.date} onChange={(e) => setBkForm({ ...bkForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("lblTime")} <span className="text-rose-500">*</span></Label>
                <Input type="time" value={bkForm.time} onChange={(e) => setBkForm({ ...bkForm, time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("lblquantity")}</Label>
                <Input type="number" min="1" value={bkForm.quantity} onChange={(e) => setBkForm({ ...bkForm, quantity: e.target.value })} />
              </div>
            </div>
            {selectedService && !editingBk && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <span className="font-medium text-gray-900">{t("estimatedTotal")}</span>
                {formatPrice(selectedService.price * (Number(bkForm.quantity) || 1))}
                <span className="text-gray-400 ml-1">{t("priceMultiply", { price: formatPrice(selectedService.price), qty: bkForm.quantity || 1 })}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBkDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSaveBk} disabled={bkSaving}>
              {bkSaving ? t("btnSaving") : editingBk ? t("btnUpdateBooking") : t("btnCreateBooking")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Payment Dialog ────────────────────────────────────────────────── */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dlgRecordPaymentTitle")}</DialogTitle>
            <DialogDescription>
              {payTarget && (
                <span>{t("dlgRecordPaymentDesc", { guestName: payTarget.guestName, serviceName: payTarget.service?.name || "", balance: formatPrice(payTarget.totalCost - payTarget.paidAmount) })}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t("lblAmount")} <span className="text-rose-500">*</span></Label>
              <Input
                type="number"
                placeholder={t("phAmountToPay")}
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("lblpaymentMethod")}</Label>
              <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t("payMethodCash")}</SelectItem>
                  <SelectItem value="TRANSFER">{t("payMethodTransfer")}</SelectItem>
                  <SelectItem value="CARD">{t("payMethodCard")}</SelectItem>
                  <SelectItem value="MOBILE">{t("payMethodMobile")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleRecordPayment} disabled={paySaving}>
              {paySaving ? t("btnRecording") : t("btnRecordPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Service Alert ──────────────────────────────────────────── */}
      <AlertDialog open={!!svcDeleteTarget} onOpenChange={() => setSvcDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alertDeleteServiceTitle", { name: svcDeleteTarget?.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("alertDeleteServiceDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={handleDeleteSvc} disabled={svcDeleting}>
              {svcDeleting ? t("btnDeleting") : t("btnDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete Booking Alert ──────────────────────────────────────────── */}
      <AlertDialog open={!!bkDeleteTarget} onOpenChange={() => setBkDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alertDeleteBookingTitle", { name: bkDeleteTarget?.guestName })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("alertDeleteBookingDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={handleDeleteBk} disabled={bkDeleting}>
              {bkDeleting ? t("btnDeleting") : t("btnDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
