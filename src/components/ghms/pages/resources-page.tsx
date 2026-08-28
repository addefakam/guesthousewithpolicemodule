"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  apiGetResources,
  apiCreateResource,
  apiUpdateResource,
  apiDeleteResource,
  apiRestockResource,
} from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  Package,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  AlertTriangle,
  PackageCheck,
  RotateCcw,
  DollarSign,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Resource {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minLevel: number;
  costPerUnit: number;
  supplier: string;
  lastRestocked: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(price);

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
};

const emptyForm = {
  name: "", category: "", quantity: "", unit: "", minLevel: "0", costPerUnit: "0", supplier: "",
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const { t } = useTranslation(["operations", "common"]);
  const { refreshKey, triggerRefresh } = useAppStore();

  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete & Restock
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restockTarget, setRestockTarget] = useState<Resource | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restocking, setRestocking] = useState(false);

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGetResources(search);
      setResources(Array.isArray(data.resources) ? data.resources : []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastResLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchResources(), 300);
    return () => clearTimeout(timer);
  }, [fetchResources, refreshKey]);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const lowStockCount = useMemo(
    () => resources.filter((r) => r.quantity <= r.minLevel).length,
    [resources]
  );

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (res: Resource) => {
    setEditing(res);
    setForm({
      name: res.name,
      category: res.category,
      quantity: String(res.quantity),
      unit: res.unit,
      minLevel: String(res.minLevel),
      costPerUnit: String(res.costPerUnit),
      supplier: res.supplier,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category || !form.quantity || !form.unit) {
      toast.error(t("toastResRequiredFields"));
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        category: form.category,
        quantity: Number(form.quantity),
        unit: form.unit,
        minLevel: Number(form.minLevel) || 0,
        costPerUnit: Number(form.costPerUnit) || 0,
        supplier: form.supplier,
      };
      if (editing) {
        await apiUpdateResource(editing.id, payload);
        toast.success(t("toastResourceUpdated"));
      } else {
        await apiCreateResource(payload);
        toast.success(t("toastResourceCreated"));
      }
      setDialogOpen(false);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastResSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiDeleteResource(deleteTarget.id);
      toast.success(t("toastResourceDeleted"));
      setDeleteTarget(null);
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastResDeleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleRestock = async () => {
    if (!restockTarget || !restockQty || Number(restockQty) <= 0) {
      toast.error(t("toastRestockValidQty"));
      return;
    }
    try {
      setRestocking(true);
      await apiRestockResource(restockTarget.id, Number(restockQty));
      toast.success(t("toastRestockSuccess", { qty: restockQty, unit: restockTarget.unit, name: restockTarget.name }));
      setRestockTarget(null);
      setRestockQty("");
      triggerRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("toastRestockFailed"));
    } finally {
      setRestocking(false);
    }
  };

  const getStockStatus = (res: Resource) => {
    if (res.quantity <= 0) return { label: t("outOfStock"), cls: "bg-red-100 text-red-800 border-red-200", rowCls: "bg-red-50/50" };
    if (res.quantity <= res.minLevel) return { label: t("lowStock"), cls: "bg-amber-100 text-amber-800 border-amber-200", rowCls: "bg-amber-50/50" };
    return { label: t("inStock"), cls: "bg-emerald-100 text-emerald-800 border-emerald-200", rowCls: "" };
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading && resources.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-40" /><Skeleton className="mt-1 h-4 w-56" /></div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("resTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("resDesc")}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t("addResource")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50">
                <Package className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("totalItems")}</p>
                <p className="text-xl font-bold text-gray-900">{resources.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${lowStockCount > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                <AlertTriangle className={`h-5 w-5 ${lowStockCount > 0 ? "text-red-600" : "text-emerald-600"}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("lowStockAlerts")}</p>
                <p className={`text-xl font-bold ${lowStockCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {lowStockCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Package className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-lg font-medium text-gray-500">{t("noResourcesFound")}</p>
          <p className="mt-1 text-sm text-gray-400">
            {search ? t("tryDifferentSearch") : t("getStartedResource")}
          </p>
          {!search && (
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> {t("addResource")}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('thname')}</TableHead>
                  <TableHead>{t('thcategory')}</TableHead>
                  <TableHead>{t('thquantity')}</TableHead>
                  <TableHead>{t('thunit')}</TableHead>
                  <TableHead>{t('thminLevel')}</TableHead>
                  <TableHead>{t('thcostunit')}</TableHead>
                  <TableHead>{t('thsupplier')}</TableHead>
                  <TableHead>{t('thlastRestocked')}</TableHead>
                  <TableHead>{t('thactions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((res) => {
                  const stock = getStockStatus(res);
                  return (
                    <TableRow key={res.id} className={stock.rowCls}>
                      <TableCell>
                        <p className="font-medium text-gray-900">{res.name}</p>
                        <Badge variant="outline" className={`mt-1 text-xs ${stock.cls}`}>{stock.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{res.category}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold text-sm ${res.quantity <= res.minLevel ? (res.quantity <= 0 ? "text-red-600" : "text-amber-600") : "text-emerald-600"}`}>
                          {res.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{res.unit}</TableCell>
                      <TableCell className="text-right text-sm text-gray-500">{res.minLevel}</TableCell>
                      <TableCell className="text-right text-sm">{formatPrice(res.costPerUnit)}</TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-[120px] truncate">{res.supplier || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(res.lastRestocked)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(res)}>
                              <Pencil className="mr-2 h-4 w-4" /> {t("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setRestockTarget(res); setRestockQty(""); }}>
                              <RotateCcw className="mr-2 h-4 w-4" /> {t("restock")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-rose-600 focus:text-rose-600"
                              onClick={() => setDeleteTarget(res)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> {t("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ─── Create/Edit Dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("editResource") : t("addNewResource")}</DialogTitle>
            <DialogDescription>
              {editing ? t("updateResourceDesc") : t("addNewResourceDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("thname")} <span className="text-rose-500">*</span></Label>
                <Input placeholder={t("namePlaceholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("lblcategory")} <span className="text-rose-500">*</span></Label>
                <Input placeholder={t("categoryPlaceholder")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("lblquantity")} <span className="text-rose-500">*</span></Label>
                <Input type="number" placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("thunit")} <span className="text-rose-500">*</span></Label>
                <Input placeholder={t("unitPlaceholder")} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('lblminLevel')}</Label>
                <Input type="number" placeholder="0" value={form.minLevel} onChange={(e) => setForm({ ...form, minLevel: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('lblcostPerUnit')}</Label>
                <Input type="number" placeholder="0" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('lblsupplier')}</Label>
                <Input placeholder={t("supplierPlaceholder")} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("saving") : editing ? t("updateResource") : t("createResource")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Restock Dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!restockTarget} onOpenChange={() => setRestockTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("restockTitle", { name: restockTarget?.name })}</DialogTitle>
            <DialogDescription>
              {t("restockCurrentQty")} <strong>{restockTarget?.quantity} {restockTarget?.unit}(s)</strong>.
              {t("restockMinLevel")} {restockTarget?.minLevel} {restockTarget?.unit}(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("restockQtyToAdd")} <span className="text-rose-500">*</span></Label>
              <Input
                type="number"
                min="1"
                placeholder={t("restockQtyPlaceholder")}
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRestock()}
              />
              {restockTarget && restockQty && Number(restockQty) > 0 && (
                <p className="text-xs text-gray-500">
                  {t("restockNewQty")} <strong>{restockTarget.quantity + Number(restockQty)}</strong> {restockTarget.unit}(s)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockTarget(null)}>{t("cancel")}</Button>
            <Button onClick={handleRestock} disabled={restocking} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {restocking ? t("restocking") : t("restock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Alert ──────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteResourceTitle", { name: deleteTarget?.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteResourceDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
