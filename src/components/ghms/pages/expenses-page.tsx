'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  TrendingDown,
  CalendarRange,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor: string;
  paymentMethod: string;
  receiptNo: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  nameAm: string;
  color: string;
  icon: string;
}

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = today.slice(0, 8) + '01';

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  CASH: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  TRANSFER: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  CARD: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  MOBILE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const CATEGORY_COLORS = [
  '#f59e0b', '#ef4444', '#10b981', '#6366f1',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
  '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9',
];

export default function ExpensesPage() {
  const { refreshKey, triggerRefresh } = useAppStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCat, setFilterCat] = useState('All');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    date: today,
    category: '',
    description: '',
    amount: 0,
    paymentMethod: 'CASH',
    vendor: '',
    receiptNo: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        api.getExpenses(),
        api.getExpenseCategories(),
      ]);
      setExpenses(expRes);
      setCategories(catRes);
    } catch {
      toast.error('Failed to load expenses data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    if (dateFrom) result = result.filter((e) => e.date >= dateFrom);
    if (dateTo) result = result.filter((e) => e.date <= dateTo);
    if (filterCat !== 'All')
      result = result.filter((e) => e.category === filterCat);

    result.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    return result;
  }, [expenses, dateFrom, dateTo, filterCat]);

  // Stats
  const todayExpenses = expenses
    .filter((e) => e.date === today)
    .reduce((s, e) => s + e.amount, 0);

  const monthExpenses = expenses
    .filter((e) => e.date >= firstOfMonth)
    .reduce((s, e) => s + e.amount, 0);

  const filteredTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  // Category data for chart
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    for (const e of filteredExpenses) {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    }
    return Object.entries(catMap)
      .map(([name, value]) => {
        const cat = categories.find((c) => c.name === name);
        return {
          name,
          value,
          color: cat?.color || '#6b7280',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, categories]);

  const maxCatAmount = Math.max(...categoryData.map((c) => c.value), 1);

  const openDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setForm({
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        vendor: expense.vendor,
        receiptNo: expense.receiptNo,
      });
    } else {
      setEditingExpense(null);
      setForm({
        date: today,
        category: categories[0]?.name || '',
        description: '',
        amount: 0,
        paymentMethod: 'CASH',
        vendor: '',
        receiptNo: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.date || !form.category || !form.description || !form.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      if (editingExpense) {
        await api.updateExpense(editingExpense.id, form);
        toast.success('Expense updated');
      } else {
        await api.createExpense(form);
        toast.success('Expense created');
      }
      setDialogOpen(false);
      triggerRefresh();
    } catch {
      toast.error('Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.deleteExpense(id);
      toast.success('Expense deleted');
      triggerRefresh();
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(n);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today&apos;s Expenses</p>
                <p className="text-xl font-bold text-red-400">
                  {formatCurrency(todayExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <CalendarRange className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Month&apos;s Expenses</p>
                <p className="text-xl font-bold text-orange-400">
                  {formatCurrency(monthExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Filter className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Filtered Total</p>
                <p className="text-xl font-bold text-purple-400">
                  {formatCurrency(filteredTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Category Summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No expense data to display
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, idx) => (
                        <Cell key={entry.name} fill={entry.color || CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-xs text-muted-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {categoryData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No data available
                </p>
              ) : (
                categoryData.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color || '#6b7280' }}
                        />
                        <span>{cat.name}</span>
                      </div>
                      <span className="font-medium text-amber-400">
                        {formatCurrency(cat.value)}
                      </span>
                    </div>
                    <Progress
                      value={(cat.value / maxCatAmount) * 100}
                      className="h-2"
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date From</Label>
              <Input
                type="date"
                className="h-9 w-40"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date To</Label>
              <Input
                type="date"
                className="h-9 w-40"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={filterCat === 'All' ? 'default' : 'outline'}
                onClick={() => setFilterCat('All')}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={filterCat === cat.name ? 'default' : 'outline'}
                  onClick={() => setFilterCat(cat.name)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Expenses
          </CardTitle>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="mr-1 h-4 w-4" />
            Add Expense
          </Button>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((e) => {
                    const cat = categories.find((c) => c.name === e.category);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.date}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: cat?.color ? `${cat.color}4D` : undefined,
                              color: cat?.color || undefined,
                              backgroundColor: cat?.color ? `${cat.color}1A` : undefined,
                            }}
                          >
                            {e.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {e.description}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {e.vendor || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              PAYMENT_METHOD_COLORS[e.paymentMethod] || ''
                            }
                          >
                            {e.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-400">
                          {formatCurrency(e.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openDialog(e)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(e.id)}
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

      {/* Add/Edit Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? 'Update the expense details below.'
                : 'Record a new expense entry.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Category <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Description <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="What was the expense for?"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Amount (ETB) <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.amount || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, paymentMethod: v }))
                  }
                >
                  <SelectTrigger className="w-full">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input
                  placeholder="Vendor or supplier"
                  value={form.vendor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vendor: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Receipt Number</Label>
                <Input
                  placeholder="Receipt #"
                  value={form.receiptNo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, receiptNo: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingExpense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}