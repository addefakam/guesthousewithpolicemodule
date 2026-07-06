'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Download,
  Upload,
  Trash2,
  Plus,
  XCircle,
  Loader2,
  Building2,
  Info,
  Tag,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { getSettings, updateSettings, getExpenseCategories, createExpenseCategory, deleteExpenseCategory, exportData, importData, getRooms, getUsers } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface SettingsData {
  id: string;
  guestHouseName: string;
  ownerName: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  taxRate: number;
  language: string;
  checkInTime: string;
  checkOutTime: string;
}

interface ExpenseCategoryRecord {
  id: string;
  name: string;
  nameAm: string;
  color: string;
  icon: string;
  createdAt: string;
}

const DEFAULT_SETTINGS: SettingsData = {
  id: 'main',
  guestHouseName: '',
  ownerName: '',
  address: '',
  phone: '',
  email: '',
  currency: 'ETB',
  taxRate: 0,
  language: 'en',
  checkInTime: '14:00',
  checkOutTime: '12:00',
};

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e',
];

export default function SettingsPage() {
  const { currentUser, triggerRefresh } = useAppStore();

  // Settings form
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Expense categories
  const [categories, setCategories] = useState<ExpenseCategoryRecord[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // System summary
  const [systemStats, setSystemStats] = useState({ rooms: 0, users: 0, categories: 0 });

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', nameAm: '', color: '#f59e0b', icon: 'Tag' });
  const [savingCat, setSavingCat] = useState(false);

  // Reset dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const data = await getSettings();
      setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await getExpenseCategories();
      setCategories(data);
    } catch {
      toast.error('Failed to load expense categories');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const fetchSystemStats = useCallback(async () => {
    try {
      const [rooms, users] = await Promise.all([getRooms(), getUsers()]);
      setSystemStats((prev) => ({ ...prev, rooms: rooms.length, users: users.length }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
    fetchSystemStats();
  }, [fetchSettings, fetchCategories, fetchSystemStats]);

  useEffect(() => {
    setSystemStats((prev) => ({ ...prev, categories: categories.length }));
  }, [categories]);

  // Save settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateSettings({
        guestHouseName: settings.guestHouseName,
        ownerName: settings.ownerName,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        currency: settings.currency,
        taxRate: Number(settings.taxRate),
        checkInTime: settings.checkInTime,
        checkOutTime: settings.checkOutTime,
      });
      triggerRefresh();
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Add category
  const openAddCategory = () => {
    setCatForm({ name: '', nameAm: '', color: '#f59e0b', icon: 'Tag' });
    setCatDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSavingCat(true);
    try {
      await createExpenseCategory(catForm);
      toast.success('Category added');
      setCatDialogOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (cat: ExpenseCategoryRecord) => {
    if (!confirm(`Delete expense category "${cat.name}"?`)) return;
    try {
      await deleteExpenseCategory(cat.id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  // Export data
  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ghms-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    }
  };

  // Import data
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Importing data will merge with existing records. Continue?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      toast.success('Data imported successfully');
      fetchSettings();
      fetchCategories();
      fetchSystemStats();
      triggerRefresh();
    } catch {
      toast.error('Failed to import data. Make sure the file is valid.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Reset data
  const handleReset = () => {
    setResetDialogOpen(false);
    toast.info('Please contact your system administrator to reset the database.');
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your guest house configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column — General Settings */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-primary" />
              General Settings
            </CardTitle>
            <CardDescription>Basic information and operational settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="s-name">Guest House Name</Label>
                <Input
                  id="s-name"
                  placeholder="e.g. Abyssinia Guest House"
                  value={settings.guestHouseName}
                  onChange={(e) => setSettings({ ...settings, guestHouseName: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="s-owner">Owner Name</Label>
                <Input
                  id="s-owner"
                  placeholder="Owner name"
                  value={settings.ownerName}
                  onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="s-address">Address</Label>
                <Input
                  id="s-address"
                  placeholder="Full address"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="s-phone">Phone</Label>
                  <Input
                    id="s-phone"
                    placeholder="+251 9..."
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="s-email">Email</Label>
                  <Input
                    id="s-email"
                    type="email"
                    placeholder="info@example.com"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>
              </div>

              <Separator className="my-2" />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="s-currency">Currency</Label>
                  <Input
                    id="s-currency"
                    placeholder="ETB"
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="s-tax">Tax Rate (%)</Label>
                  <Input
                    id="s-tax"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="s-checkin">Default Check-in Time</Label>
                  <Input
                    id="s-checkin"
                    type="time"
                    value={settings.checkInTime}
                    onChange={(e) => setSettings({ ...settings, checkInTime: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="s-checkout">Default Check-out Time</Label>
                  <Input
                    id="s-checkout"
                    type="time"
                    value={settings.checkOutTime}
                    onChange={(e) => setSettings({ ...settings, checkOutTime: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column — System Summary + Categories + Data Management */}
        <div className="space-y-6">
          {/* System Summary */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-5 w-5 text-primary" />
                System Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{systemStats.rooms}</p>
                  <p className="text-xs text-muted-foreground mt-1">Rooms</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{systemStats.users}</p>
                  <p className="text-xs text-muted-foreground mt-1">Users</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{systemStats.categories}</p>
                  <p className="text-xs text-muted-foreground mt-1">Exp. Categories</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current User</span>
                  <span className="text-foreground font-medium">{currentUser?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge variant="outline" className={
                    currentUser?.role === 'SUPERUSER' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                    currentUser?.role === 'OPERATOR' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }>
                    {currentUser?.role || '—'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="text-foreground font-medium">{settings.currency || 'ETB'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Rate</span>
                  <span className="text-foreground font-medium">{settings.taxRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expense Categories */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="h-5 w-5 text-primary" />
                  Expense Categories
                </CardTitle>
                <Button variant="outline" size="sm" onClick={openAddCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCategories ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : categories.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">No categories yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3.5 w-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || '#6b7280' }}
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{cat.name}</p>
                          {cat.nameAm && (
                            <p className="text-xs text-muted-foreground">{cat.nameAm}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(cat)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        title="Delete"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-5 w-5 text-primary" />
                Data Management
              </CardTitle>
              <CardDescription>Export, import, or reset your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
                {currentUser?.role === 'SUPERUSER' && (
                  <Button
                    variant="outline"
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 border-red-400/20"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Export creates a JSON backup. Import merges data into existing records.
                {currentUser?.role !== 'SUPERUSER' && ' Reset is only available to superusers.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="border-border/50 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense Category</DialogTitle>
            <DialogDescription>Create a new expense category for tracking costs.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Utilities"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-name-am">Name (Amharic)</Label>
              <Input
                id="cat-name-am"
                placeholder="Amharic name (optional)"
                value={catForm.nameAm}
                onChange={(e) => setCatForm({ ...catForm, nameAm: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      catForm.color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setCatForm({ ...catForm, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={savingCat}>
              {savingCat && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="border-border/50 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Reset Database
            </DialogTitle>
            <DialogDescription>
              This action will delete all data and reset the database to its initial state.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
            >
              Reset Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}