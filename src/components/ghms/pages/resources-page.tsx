'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  PackageCheck,
  Boxes,
  Coins,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
import { useAppStore } from '@/lib/store';
import * as api from '@/lib/api';
import { toast } from 'sonner';

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

const today = new Date().toISOString().split('T')[0];

export default function ResourcesPage() {
  const { refreshKey, triggerRefresh } = useAppStore();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCat, setFilterCat] = useState('All');

  // Dialogs
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Resource | null>(null);
  const [restockItem, setRestockItem] = useState<Resource | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Item form
  const [itemForm, setItemForm] = useState({
    name: '',
    category: '',
    unit: '',
    quantity: 0,
    minLevel: 0,
    costPerUnit: 0,
    supplier: '',
  });

  // Restock form
  const [restockQty, setRestockQty] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getResources();
      setResources(res);
    } catch {
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // All categories
  const allCategories = useMemo(
    () => [...new Set(resources.map((r) => r.category))].sort(),
    [resources]
  );

  // Filtered resources
  const filteredResources = useMemo(() => {
    if (filterCat === 'All') return resources;
    return resources.filter((r) => r.category === filterCat);
  }, [resources, filterCat]);

  // Low stock items
  const lowStockItems = useMemo(
    () => resources.filter((r) => r.quantity <= r.minLevel),
    [resources]
  );

  // Stats
  const totalItems = resources.length;
  const lowStockCount = lowStockItems.length;
  const categoryCount = allCategories.length;
  const inventoryValue = resources.reduce(
    (s, r) => s + r.quantity * r.costPerUnit,
    0
  );

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(n);

  const getStockLevelColor = (qty: number, min: number) => {
    if (qty <= 0) return 'text-red-400';
    if (qty <= min) return 'text-red-400';
    if (qty <= min * 1.5) return 'text-orange-400';
    return 'text-emerald-400';
  };

  const getProgressColor = (qty: number, min: number) => {
    if (qty <= 0) return '[&>div]:bg-red-500';
    if (qty <= min) return '[&>div]:bg-red-500';
    if (qty <= min * 1.5) return '[&>div]:bg-orange-500';
    return '[&>div]:bg-emerald-500';
  };

  const getStockBadgeVariant = (qty: number, min: number) => {
    if (qty <= min) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return '';
  };

  // Item dialog
  const openItemDialog = (item?: Resource) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        minLevel: item.minLevel,
        costPerUnit: item.costPerUnit,
        supplier: item.supplier,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        category: '',
        unit: '',
        quantity: 0,
        minLevel: 0,
        costPerUnit: 0,
        supplier: '',
      });
    }
    setItemDialogOpen(true);
  };

  const handleSubmitItem = async () => {
    if (!itemForm.name || !itemForm.category || itemForm.quantity < 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      if (editingItem) {
        await api.updateResource(editingItem.id, itemForm);
        toast.success('Item updated');
      } else {
        await api.createResource(itemForm);
        toast.success('Item created');
      }
      setItemDialogOpen(false);
      triggerRefresh();
    } catch {
      toast.error('Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.deleteResource(id);
      toast.success('Item deleted');
      triggerRefresh();
    } catch {
      toast.error('Failed to delete item');
    }
  };

  // Restock dialog
  const openRestockDialog = (item: Resource) => {
    setRestockItem(item);
    setRestockQty(10);
    setRestockDialogOpen(true);
  };

  const handleRestock = async () => {
    if (!restockItem || restockQty <= 0) return;
    setSubmitting(true);
    try {
      await api.restockResource(restockItem.id, restockQty);
      toast.success(`Added ${restockQty} ${restockItem.unit}(s) to ${restockItem.name}`);
      setRestockDialogOpen(false);
      triggerRefresh();
    } catch {
      toast.error('Failed to restock');
    } finally {
      setSubmitting(false);
    }
  };

  // Max quantity for progress bar
  const maxQty = Math.max(...resources.map((r) => r.quantity), 1);

  const categorySuggestions = allCategories;

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
                <Boxes className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Low Stock Alerts</p>
                <p className="text-xl font-bold text-red-400">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
                <Package className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="text-xl font-bold">{categoryCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Coins className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inventory Value</p>
                <p className="text-xl font-bold text-amber-400">
                  {formatCurrency(inventoryValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertTitle className="text-amber-400">Low Stock Alert</AlertTitle>
          <AlertDescription className="text-amber-300/70">
            {lowStockItems.map((item) => (
              <span key={item.id}>
                <strong>{item.name}</strong> ({item.quantity} {item.unit} remaining, min: {item.minLevel})
                {item !== lowStockItems[lowStockItems.length - 1] ? ' · ' : ''}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Bar */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={filterCat === 'All' ? 'default' : 'outline'}
              onClick={() => setFilterCat('All')}
            >
              All
            </Button>
            {allCategories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={filterCat === cat ? 'default' : 'outline'}
                onClick={() => setFilterCat(cat)}
              >
                {cat}
              </Button>
            ))}
            <div className="ml-auto">
              <Button size="sm" onClick={() => openItemDialog()}>
                <Plus className="mr-1 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-center">Min Level</TableHead>
                  <TableHead className="min-w-[120px]">Stock Level</TableHead>
                  <TableHead>Cost/Unit</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Last Restocked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResources.map((r) => {
                    const isLow = r.quantity <= r.minLevel;
                    const progressPct = maxQty > 0 ? (r.quantity / maxQty) * 100 : 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.name}</span>
                            {isLow && (
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {r.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`text-lg font-bold ${getStockLevelColor(r.quantity, r.minLevel)}`}
                          >
                            {r.quantity}
                          </span>
                          <span className="ml-0.5 text-xs text-muted-foreground">
                            {r.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {r.minLevel} {r.unit}
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={progressPct}
                            className={`h-2 ${getProgressColor(r.quantity, r.minLevel)}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-amber-400">
                          {formatCurrency(r.costPerUnit)}
                        </TableCell>
                        <TableCell className="max-w-[100px] truncate text-sm text-muted-foreground">
                          {r.supplier || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.lastRestocked
                            ? new Date(r.lastRestocked).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-400 hover:text-emerald-300"
                              onClick={() => openRestockDialog(r)}
                              title="Restock"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openItemDialog(r)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={() => handleDeleteItem(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update the inventory item details below.'
                : 'Add a new item to inventory.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>
                Item Name <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="e.g. Bath Towel"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  placeholder="e.g. Linen, Toiletries"
                  list="res-categories"
                  value={itemForm.category}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, category: e.target.value }))
                  }
                />
                <datalist id="res-categories">
                  {categorySuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  placeholder="e.g. pcs, kg, ltr"
                  value={itemForm.unit}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, unit: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Quantity <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={itemForm.quantity || ''}
                  onChange={(e) =>
                    setItemForm((f) => ({
                      ...f,
                      quantity: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min Level</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={itemForm.minLevel || ''}
                  onChange={(e) =>
                    setItemForm((f) => ({
                      ...f,
                      minLevel: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost per Unit</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={itemForm.costPerUnit || ''}
                  onChange={(e) =>
                    setItemForm((f) => ({
                      ...f,
                      costPerUnit: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  placeholder="Supplier name"
                  value={itemForm.supplier}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, supplier: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitItem} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-400" />
              Restock Item
            </DialogTitle>
            <DialogDescription>
              Add stock for {restockItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Stock</span>
              <span className="text-3xl font-bold">
                {restockItem?.quantity}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  {restockItem?.unit}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Minimum Level</span>
              <span className="text-lg font-semibold text-orange-400">
                {restockItem?.minLevel} {restockItem?.unit}
              </span>
            </div>
            <div className="space-y-2">
              <Label>Add Quantity</Label>
              <Input
                type="number"
                min={1}
                value={restockQty}
                onChange={(e) =>
                  setRestockQty(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="text-center text-lg"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRestockDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500"
              onClick={handleRestock}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <RotateCcw className="mr-1 h-4 w-4" />
              Add Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}