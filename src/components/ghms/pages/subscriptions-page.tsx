import { useTranslation } from "react-i18next";
"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  History,
  Loader2,
  Phone,
  CalendarDays,
  Filter,
  Tag,
  Clock,
  Eye,
  ShieldCheck,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

import {
  formatCycle,
  formatDaysRemaining,
  getStatusBadgeClasses,
  CYCLE_DAYS,
  type SubscriptionStatus,
} from "@/lib/subscription";
import {
  apiGetSubscriptions,
  apiUpdateSubscription,
  apiMarkPayment,
  apiGetSubscriptionPayments,
  apiVerifyPayment,
  apiGetPlans,
} from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface SubRow {
  providerId: string;
  providerName: string;
  ownerName: string;
  phone: string;
  email: string;
  subscriptionId: string;
  cycle: string;
  price: number;
  planId: string | null;
  planName: string | null;
  status: SubscriptionStatus;
  daysRemaining: number;
  startDate: string;
  endDate: string;
  totalPayments: number;
  hasPendingVerification: boolean;
}

interface PlanOption {
  id: string;
  name: string;
  cycle: string;
  price: number;
  isActive: boolean;
}

export default function SubscriptionsPage() {
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [plans, setPlans] = useState<PlanOption[]>([]);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<SubRow | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editCycle, setEditCycle] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payRow, setPayRow] = useState<SubRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payCycle, setPayCycle] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payPlanId, setPayPlanId] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  // Pending verification dialog
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyAction, setVerifyAction] = useState<"approve" | "reject" | null>(null);
  const [verifyReason, setVerifyReason] = useState("");
  const [verifyDeclineMode, setVerifyDeclineMode] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [currentPayIndex, setCurrentPayIndex] = useState(0);
  const [pendingRow, setPendingRow] = useState<SubRow | null>(null);

  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySubId, setHistorySubId] = useState("");
  const [historyProviderName, setHistoryProviderName] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGetSubscriptions();
      const list = Array.isArray(data) ? data : [];
      setAllSubscriptions(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await apiGetPlans();
      setPlans(Array.isArray(data) ? data.filter((p: PlanOption) => p.isActive) : []);
    } catch {
      // Non-critical — plans are optional for the payment flow
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, [fetchSubscriptions, fetchPlans]);

  // Summary counts (always from full list, not filtered)
  const counts = {
    active: allSubscriptions.filter((s) => s.status === "ACTIVE").length,
    warning: allSubscriptions.filter((s) => s.status === "WARNING").length,
    expired: allSubscriptions.filter((s) => s.status === "EXPIRED").length,
    suspended: allSubscriptions.filter((s) => s.status === "SUSPENDED").length,
    total: allSubscriptions.length,
  };

  // Filter client-side so summary stays accurate
  const filtered = statusFilter === "ALL"
    ? allSubscriptions
    : allSubscriptions.filter((s) => s.status === statusFilter);

  // ── Pending verification handlers ──
  async function openVerifyDialog(row: SubRow) {
    setPendingRow(row);
    setVerifyOpen(true);
    setVerifyLoading(true);
    setVerifyAction(null);
    setVerifyReason("");
    setVerifyDeclineMode(false);
    setCurrentPayIndex(0);
    try {
      const data = await apiGetSubscriptionPayments(row.subscriptionId);
      const list = Array.isArray(data) ? data : [];
      // Only show payments with [PROVIDER SUBMITTED] tag
      setPendingPayments(list.filter((p: any) => p.notes && p.notes.includes("[PROVIDER SUBMITTED]")));
    } catch {
      toast.error("Failed to load pending payments");
      setPendingPayments([]);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleVerifyAction(action: "approve" | "reject") {
    if (!pendingPayments.length) return;
    const currentPayment = pendingPayments[currentPayIndex];
    if (!currentPayment) return;
    setVerifyAction(action);
    try {
      await apiVerifyPayment(currentPayment.id, { action, reason: verifyReason || undefined });
      const label = action === "approve" ? "Approved" : "Rejected";
      // If more payments remain, advance to next
      if (currentPayIndex + 1 < pendingPayments.length) {
        toast.success(`${label} payment of ${currentPayment.amount.toLocaleString()} ETB — ${pendingPayments.length - currentPayIndex - 1} remaining`);
        setPendingPayments((prev) => prev.filter((_, i) => i !== currentPayIndex));
        // Don't increment index since we removed the current item
        setCurrentPayIndex(0);
        setVerifyReason("");
        setVerifyDeclineMode(false);
      } else {
        toast.success(`${label} payment for ${pendingRow?.providerName}`);
        setVerifyOpen(false);
        fetchSubscriptions();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} payment`);
    } finally {
      setVerifyAction(null);
    }
  }

  // ── Edit handlers ──
  function openEdit(row: SubRow) {
    setEditRow(row);
    setEditPrice(String(row.price));
    setEditCycle(row.cycle);
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editRow || !editPrice.trim()) return;
    setEditSaving(true);
    try {
      await apiUpdateSubscription(editRow.subscriptionId, {
        price: parseFloat(editPrice),
        cycle: editCycle,
      });
      toast.success(`Updated subscription for ${editRow.providerName}`);
      setEditOpen(false);
      fetchSubscriptions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Payment handlers ──
  function openPay(row: SubRow) {
    setPayRow(row);
    setPayAmount(String(row.price || ""));
    setPayCycle(row.cycle);
    setPayNotes("");
    setPayPlanId("");
    setPayOpen(true);
  }

  // When a plan is selected in the payment dialog, auto-fill amount and cycle
  function handlePayPlanChange(planId: string) {
    setPayPlanId(planId);
    if (planId) {
      const plan = plans.find((p) => p.id === planId);
      if (plan) {
        setPayAmount(String(plan.price));
        setPayCycle(plan.cycle);
      }
    }
  }

  async function handlePaymentConfirm() {
    if (!payRow || !payAmount.trim()) return;
    setPaySaving(true);
    try {
      const payload: Record<string, unknown> = {
        amount: parseFloat(payAmount),
        cycle: payCycle,
        notes: payNotes,
      };
      if (payPlanId) {
        payload.planId = payPlanId;
      }
      await apiMarkPayment(payRow.subscriptionId, payload);
      toast.success(`Payment recorded for ${payRow.providerName}`);
      setPayOpen(false);
      fetchSubscriptions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setPaySaving(false);
    }
  }

  // ── History handler ──
  async function openHistory(row: SubRow) {
    setHistorySubId(row.subscriptionId);
    setHistoryProviderName(row.providerName);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await apiGetSubscriptionPayments(row.subscriptionId);
      setPayments(data);
    } catch {
      toast.error("Failed to load payment history");
    } finally {
      setHistoryLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600" />
            Subscriptions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage provider subscriptions, payments, and service access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="WARNING">Warning (Expiring)</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchSubscriptions} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className={`cursor-pointer transition-shadow hover:shadow-md ${statusFilter === 'ALL' ? 'ring-2 ring-primary' : ''}`} onClick={() => setStatusFilter('ALL')}>
          <CardContent className="p-3">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-900">{counts.total}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-shadow hover:shadow-md border-emerald-200 ${statusFilter === 'ACTIVE' ? 'ring-2 ring-emerald-500' : ''}`} onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}>
          <CardContent className="p-3">
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Active
            </p>
            <p className="text-2xl font-bold text-emerald-700">{counts.active}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-shadow hover:shadow-md border-amber-200 ${statusFilter === 'WARNING' ? 'ring-2 ring-amber-500' : ''}`} onClick={() => setStatusFilter(statusFilter === 'WARNING' ? 'ALL' : 'WARNING')}>
          <CardContent className="p-3">
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Warning
            </p>
            <p className="text-2xl font-bold text-amber-700">{counts.warning}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-shadow hover:shadow-md border-rose-200 ${statusFilter === 'EXPIRED' ? 'ring-2 ring-rose-500' : ''}`} onClick={() => setStatusFilter(statusFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}>
          <CardContent className="p-3">
            <p className="text-xs text-rose-600 flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Grace
            </p>
            <p className="text-2xl font-bold text-rose-700">{counts.expired}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-shadow hover:shadow-md border-slate-300 ${statusFilter === 'SUSPENDED' ? 'ring-2 ring-slate-500' : ''}`} onClick={() => setStatusFilter(statusFilter === 'SUSPENDED' ? 'ALL' : 'SUSPENDED')}>
          <CardContent className="p-3">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Suspended
            </p>
            <p className="text-2xl font-bold text-slate-700">{counts.suspended}</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Provider</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Owner</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Phone</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Plan</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Cycle</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Price</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Ends</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Payments</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                      {allSubscriptions.length === 0
                        ? "No providers found."
                        : `No ${statusFilter === "ALL" ? "" : statusFilter + " "}subscriptions found.`}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.subscriptionId}
                      className={`border-b transition-colors ${
                        row.hasPendingVerification
                          ? "bg-orange-50 hover:bg-orange-100/70 border-l-4 border-l-orange-400 cursor-pointer"
                          : row.status === "SUSPENDED"
                          ? "bg-slate-50 hover:bg-slate-100"
                          : "hover:bg-slate-50"
                      }`}
                      onClick={row.hasPendingVerification ? () => openVerifyDialog(row) : undefined}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{row.providerName}</span>
                          {row.hasPendingVerification && (
                            <Badge
                              className="bg-orange-500 hover:bg-orange-600 text-white border-0 text-[10px] font-semibold gap-1 shrink-0 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); openVerifyDialog(row); }}
                            >
                              <Eye className="w-3 h-3" />
                              Pending Approval — Click to verify
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{row.ownerName}</td>
                      <td className="px-4 py-2.5 text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {row.phone}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {row.planName ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700"
                          >
                            <Tag className="mr-1 size-3" />
                            {row.planName}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">No plan</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {formatCycle(row.cycle)}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {row.price > 0 ? `${row.price.toLocaleString()} ETB` : "Trial"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${getStatusBadgeClasses(row.status)}`}
                        >
                          {row.status}
                        </Badge>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {formatDaysRemaining(row.daysRemaining)}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        <span className="inline-flex items-center gap-1 text-[12px]">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(row.endDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{row.totalPayments}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openHistory(row); }}
                            title="Payment history"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                            title="Edit price/cycle"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={(e) => { e.stopPropagation(); openPay(row); }}
                            title="Mark payment"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Edit Price/Cycle Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update price and billing cycle for <strong>{editRow?.providerName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t('lblpricePerCycleEtb', 'Price per Cycle (ETB)')}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="Enter price"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('lblbillingCycle', 'Billing Cycle')}</Label>
              <Select value={editCycle} onValueChange={setEditCycle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly (30 days)</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly (90 days)</SelectItem>
                  <SelectItem value="SEMI_ANNUAL">Semi-Annual (180 days)</SelectItem>
                  <SelectItem value="YEARLY">Yearly (365 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mark Payment Dialog ── */}
      <AlertDialog open={payOpen} onOpenChange={setPayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm payment for <strong>{payRow?.providerName}</strong>.
              This will extend their subscription by one{" "}
              <strong>{payRow ? formatCycle(payCycle || payRow.cycle) : ""}</strong> cycle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-2">
            {/* Plan selector */}
            {plans.length > 0 && (
              <div className="grid gap-2">
                <Label>{t('lblselectPlanOptional', 'Select Plan (optional)')}</Label>
                <Select value={payPlanId} onValueChange={handlePayPlanChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a plan to auto-fill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No plan (manual entry)</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} — {plan.price.toLocaleString()} ETB ({formatCycle(plan.cycle)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label>{t('lblamountEtb', 'Amount (ETB)')}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Payment amount"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('lblcycle', 'Cycle')}</Label>
              <Select value={payCycle} onValueChange={setPayCycle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly (30 days)</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly (90 days)</SelectItem>
                  <SelectItem value="SEMI_ANNUAL">Semi-Annual (180 days)</SelectItem>
                  <SelectItem value="YEARLY">Yearly (365 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('lblnotesOptional', 'Notes (optional)')}</Label>
              <Input
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g., Cash payment received"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paySaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePaymentConfirm}
              disabled={paySaving || !payAmount.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {paySaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Pending Payment Verification Dialog ── */}
      <Dialog open={verifyOpen} onOpenChange={(open) => { setVerifyOpen(open); if (!open) { setVerifyDeclineMode(false); setVerifyReason(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-orange-500" />
              Verify Payment
            </DialogTitle>
            <DialogDescription>
              Review the submitted payment and approve or decline.
            </DialogDescription>
          </DialogHeader>

          {/* Provider info card */}
          {pendingRow && (
            <div className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold text-sm">
                {(pendingRow.providerName || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 truncate">{pendingRow.providerName}</p>
                <p className="text-xs text-slate-500">{pendingRow.ownerName} &middot; {pendingRow.phone}</p>
              </div>
              <Badge className={pendingRow.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : pendingRow.status === "EXPIRED" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200"} variant="outline">
                {pendingRow.status}
              </Badge>
            </div>
          )}

          {verifyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : pendingPayments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No pending payments found.</p>
          ) : (
            <div className="space-y-3">
              {/* Counter: Payment 1 of 3 */}
              {pendingPayments.length > 1 && (
                <div className="flex items-center justify-center gap-2">
                  {pendingPayments.map((_: any, i: number) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${i === currentPayIndex ? "w-6 bg-orange-500" : i < currentPayIndex ? "w-1.5 bg-emerald-400" : "w-1.5 bg-slate-200"}`}
                    />
                  ))}
                  <span className="text-[10px] text-slate-400 ml-1">{currentPayIndex + 1} of {pendingPayments.length}</span>
                </div>
              )}

              {/* Single payment card */}
              {(() => {
                const p = pendingPayments[currentPayIndex];
                if (!p) return null;
                // Parse payment details from notes
                const noteParts = (p.notes || "").split(" | ").filter(Boolean);
                const methodPart = noteParts.find((n: string) => n.startsWith("Method:"));
                const refPart = noteParts.find((n: string) => n.startsWith("Ref:"));
                const overduePart = noteParts.find((n: string) => n.startsWith("Subscription was expired"));
                return (
                  <div key={p.id} className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-slate-900">
                        {p.amount.toLocaleString()} ETB
                      </p>
                      <Badge className="bg-orange-500 text-white border-0 text-[10px]">Pending</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Cycle</p>
                        <p className="font-medium text-slate-700">{formatCycle(p.cycle)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Submitted</p>
                        <p className="font-medium text-slate-700">{new Date(p.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Period Start</p>
                        <p className="font-medium text-slate-700">{new Date(p.periodStart).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Period End</p>
                        <p className="font-medium text-slate-700">{new Date(p.periodEnd).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {methodPart && (
                      <div className="text-sm">
                        <span className="text-slate-500">Payment Method: </span>
                        <span className="font-medium text-slate-700">{methodPart.replace("Method: ", "")}</span>
                      </div>
                    )}
                    {refPart && (
                      <div className="text-sm">
                        <span className="text-slate-500">Reference: </span>
                        <span className="font-mono font-medium text-slate-900">{refPart.replace("Ref: ", "")}</span>
                      </div>
                    )}
                    {overduePart && (
                      <div className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700 font-medium">
                        {overduePart}
                      </div>
                    )}
                    {p.notes && (
                      <p className="text-xs text-slate-500 italic leading-relaxed">{p.notes}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Decline reason — always shown, required for reject */}
          {!verifyLoading && pendingPayments.length > 0 && (
            <div className="grid gap-2">
              <Label className="text-sm font-medium">
                {verifyDeclineMode ? (
                  <span className="text-rose-600">Decline Reason (required)</span>
                ) : (
                  <span>Approval Note (optional)</span>
                )}
              </Label>
              <Textarea
                placeholder={verifyDeclineMode
                  ? "e.g., The reference number does not match our records. Please double-check and resubmit."
                  : "e.g., Verified via bank statement"}
                value={verifyReason}
                onChange={(e) => setVerifyReason(e.target.value)}
                className={verifyDeclineMode && !verifyReason.trim() ? "border-rose-300 focus-visible:ring-rose-400" : ""}
                rows={3}
              />
              {verifyDeclineMode && !verifyReason.trim() && (
                <p className="text-xs text-rose-500">You must provide a reason when declining a payment. The provider will receive this message.</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setVerifyOpen(false); setVerifyDeclineMode(false); setVerifyReason(""); }} disabled={!!verifyAction}>
              Cancel
            </Button>
            {!verifyDeclineMode ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setVerifyDeclineMode(true)}
                  disabled={!!verifyAction || pendingPayments.length === 0}
                  className="gap-1"
                >
                  <Ban className="h-4 w-4" />
                  Decline
                </Button>
                <Button
                  onClick={() => handleVerifyAction("approve")}
                  disabled={!!verifyAction || pendingPayments.length === 0}
                  className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {verifyAction === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Approve
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => { setVerifyDeclineMode(false); setVerifyReason(""); }}
                  disabled={!!verifyAction}
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleVerifyAction("reject")}
                  disabled={!!verifyAction || !verifyReason.trim()}
                  className="gap-1"
                >
                  {verifyAction === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  Confirm Decline
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Payment History Dialog ── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              All payments for <strong>{historyProviderName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No payments recorded.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p: any) => {
                  const isPending = p.notes && p.notes.includes("[PROVIDER SUBMITTED]");
                  const isOverdue = p.notes && p.notes.includes("[PAYMENT_OVERDUE]");
                  return (
                  <div key={p.id} className={`rounded-lg border p-3 ${isOverdue ? 'border-rose-200 bg-rose-50/50' : isPending ? 'border-amber-200 bg-amber-50/50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {p.amount.toLocaleString()} ETB
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCycle(p.cycle)} &middot;{" "}
                          {new Date(p.periodStart).toLocaleDateString()} →{" "}
                          {new Date(p.periodEnd).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            isOverdue
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : isPending
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {isOverdue ? "Payment Overdue" : isPending ? "Pending Verification" : "Paid"}
                        </Badge>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {new Date(p.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {p.notes && (
                      <p className="mt-1.5 text-xs text-slate-500 italic">{p.notes}</p>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
