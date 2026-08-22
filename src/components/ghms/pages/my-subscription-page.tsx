import { useTranslation } from "react-i18next";
"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect, useCallback } from "react";
import {
  apiMySubscription,
  apiSubmitPayment,
  apiInitiateChapaPayment,
  apiChapaClientVerify,
} from "@/lib/api";
import {
  formatDaysRemaining,
  formatCycle,
  getStatusBadgeClasses,
} from "@/lib/subscription";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Building2,
  ChevronRight,
  IndianRupee,
  RefreshCw,
  Send,
  Info,
  XCircle,
  Banknote,
  Smartphone,
  Landmark,
  Receipt,
  Sparkles,
  Lock,
  Zap,
  ExternalLink,
} from "lucide-react";

// ── Types ──
interface SubData {
  subscription: {
    id: string;
    startDate: string;
    endDate: string;
    cycle: string;
    price: number;
    planId: string | null;
    status: string;
    daysRemaining: number;
  };
  provider: { name: string; ownerName: string; phone: string; status: string } | null;
  plans: {
    id: string;
    name: string;
    cycle: string;
    price: number;
    days: number;
    months: number;
    perMonth: number;
    subscribers: number;
  }[];
  payments: {
    id: string;
    amount: number;
    cycle: string;
    periodStart: string;
    periodEnd: string;
    notes: string;
    createdAt: string;
  }[];
  config: {
    currencySymbol: string;
    paymentMethod: string;
    paymentInstructions: string;
    pricePerBedPerDay: number;
    pricingEnabled: boolean;
    latePaymentPenalty: number;
  };
  totalBeds: number;
}

const PAYMENT_METHODS = [
  { value: "CHAPA", label: "Pay Online (Chapa)", icon: Zap, color: "text-violet-600" },
  { value: "CASH", label: "Cash", icon: Banknote, color: "text-green-600" },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Landmark, color: "text-blue-600" },
  { value: "TELEBIRR", label: "Telebirr", icon: Smartphone, color: "text-cyan-600" },
  { value: "CBE_BIRR", label: "CBE Birr", icon: Smartphone, color: "text-orange-600" },
  { value: "OTHER", label: "Other", icon: CreditCard, color: "text-slate-600" },
];

const CYCLE_COLORS: Record<string, string> = {
  MONTHLY: "border-blue-200 bg-blue-50 hover:bg-blue-100",
  QUARTERLY: "border-purple-200 bg-purple-50 hover:bg-purple-100",
  SEMI_ANNUAL: "border-amber-200 bg-amber-50 hover:bg-amber-100",
  YEARLY: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100",
};

const CYCLE_ICON_COLORS: Record<string, string> = {
  MONTHLY: "text-blue-600 bg-blue-100",
  QUARTERLY: "text-purple-600 bg-purple-100",
  SEMI_ANNUAL: "text-amber-600 bg-amber-100",
  YEARLY: "text-emerald-600 bg-emerald-100",
};

// ── Skeleton ──
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-60 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export default function MySubscriptionPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubData["plans"][0] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [chapaVerifying, setChapaVerifying] = useState(false);
  const [chapaVerifyResult, setChapaVerifyResult] = useState<string | null>(null);

  // Chapa result is passed via sessionStorage by the main page.tsx
  // (which reads URL params from Chapa redirect and stores them here)
  const [chapaResult, setChapaResult] = useState<string | null>(null);
  useEffect(() => {
    const stored = sessionStorage.getItem("chapa_result");
    if (stored) {
      setChapaResult(stored);
      sessionStorage.removeItem("chapa_result");
      sessionStorage.removeItem("chapa_sub");
      sessionStorage.removeItem("chapa_timestamp");
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiMySubscription();
      setData(res as SubData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to load subscription info: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Chapa payment callback — actively verify with Chapa API
  useEffect(() => {
    if (chapaResult === "success") {
      toast.success("Chapa payment completed! Verifying your payment...");
      setChapaVerifying(true);
      setChapaVerifyResult(null);

      // Wait a moment for Chapa to process, then actively verify
      const timer = setTimeout(async () => {
        try {
          const res = await apiChapaClientVerify() as any;
          if (res.verified > 0) {
            setChapaVerifyResult("success");
            toast.success(`Payment verified! ${res.results?.[0] || "Your subscription is now active."}`);
          } else if (res.alreadyVerified) {
            setChapaVerifyResult("success");
          } else {
            setChapaVerifyResult("pending");
            toast.info(res.results?.[0] || "Payment not yet confirmed by Chapa. We'll keep checking.");
          }
        } catch (err) {
          setChapaVerifyResult("error");
          toast.error(err instanceof Error ? err.message : "Verification failed. The webhook will process it shortly.");
        } finally {
          setChapaVerifying(false);
          fetchData();
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [chapaResult, fetchData]);

  const handleSelectPlan = (plan: SubData["plans"][0]) => {
    setSelectedPlan(plan);
    setPayAmount(String(plan.price));
    setPayMethod("");
    setPayRef("");
    setPayNotes("");
    setShowPayDialog(true);
  };

  const isChapaMethod = payMethod === "CHAPA";

  const handleChapaPayment = async () => {
    if (!selectedPlan || !payAmount || Number(payAmount) <= 0) {
      toast.error("Invalid payment details");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiInitiateChapaPayment({
        cycle: selectedPlan.cycle,
        amount: Number(payAmount),
        planId: selectedPlan.id,
      });
      if (res.checkoutUrl) {
        // Redirect to Chapa checkout page
        window.location.href = res.checkoutUrl;
      } else {
        toast.error("Failed to get Chapa checkout URL");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to initiate Chapa payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPayment = async () => {
    // If Chapa is selected, redirect to Chapa checkout
    if (isChapaMethod) {
      await handleChapaPayment();
      return;
    }

    if (!selectedPlan || !payMethod || !payAmount || Number(payAmount) <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!isChapaMethod && !payRef.trim()) {
      toast.error("Transfer reference number is required");
      return;
    }
    setSubmitting(true);
    try {
      await apiSubmitPayment({
        planId: selectedPlan.id,
        cycle: selectedPlan.cycle,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        referenceNo: payRef,
        notes: payNotes,
      });
      toast.success("Payment submitted! Awaiting verification.");
      setShowPayDialog(false);
      fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const sub = data?.subscription;
  const cur = data?.config.currencySymbol || "Br";
  const totalBeds = data?.totalBeds || 0;
  const pricePerBed = data?.config.pricePerBedPerDay || 0;
  const pricingLocked = data?.config.pricingEnabled === false;

  if (loading) return <LoadingSkeleton />;
  if (!data || !sub) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CreditCard className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-500">No subscription found</p>
        <p className="text-xs text-slate-400 mt-1">Contact the administrator</p>
      </div>
    );
  }

  const isTrial = sub.price === 0 && data.payments.length === 0;
  const isExpired = sub.status === "EXPIRED";
  const penaltyPercent = data.config.latePaymentPenalty || 10;
  const baseAmount = sub.price || 0;
  const penaltyAmount = isExpired && baseAmount > 0
    ? Math.round(baseAmount * (1 + penaltyPercent / 100))
    : 0;
  const statusColor = getStatusBadgeClasses(sub.status as "ACTIVE" | "WARNING" | "EXPIRED" | "SUSPENDED");

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Subscription & Payments</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your subscription, view plans, and submit payments
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="h-8 text-xs"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Pricing Info Banner */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 shrink-0">
          <Building2 className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-700">
            {cur}{pricePerBed} per bed/day x <span className="font-bold text-slate-900">{totalBeds} bed{totalBeds !== 1 ? "s" : ""}</span> = <span className="font-bold text-primary">{cur}{(pricePerBed * totalBeds).toLocaleString()}/day</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {totalBeds === 0
              ? "No rooms configured yet. Add rooms to see your subscription pricing."
              : `Your subscription is calculated based on ${totalBeds} total bed${totalBeds !== 1 ? "s" : ""} across all your rooms.`}
          </p>
        </div>
        {pricingLocked && (
          <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500 bg-slate-100 shrink-0">
            <Lock className="w-3 h-3 mr-1" />
            Rates Locked
          </Badge>
        )}
      </div>

      {/* ═══ Current Status Card ═══ */}
      <Card className={`overflow-hidden ${
        sub.status === "WARNING" ? "border-amber-300 bg-amber-50/30" :
        sub.status === "EXPIRED" ? "border-2 border-rose-400 bg-rose-50/30" :
        sub.status === "SUSPENDED" ? "border-slate-300" : ""
      }`}>
        <CardContent className="p-0">
          {/* Status bar */}
          <div className={`px-4 py-3 flex items-center justify-between ${
            sub.status === "ACTIVE" ? "bg-emerald-50" :
            sub.status === "WARNING" ? "bg-amber-50" :
            sub.status === "EXPIRED" ? "bg-rose-100" :
            "bg-slate-50"
          }`}>
            <div className="flex items-center gap-2">
              {sub.status === "ACTIVE" ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : sub.status === "WARNING" ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : sub.status === "EXPIRED" ? (
                <XCircle className="w-5 h-5 text-rose-600" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-400" />
              )}
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full border ${statusColor}`}>
                {sub.status}
              </span>
              {isTrial && (
                <Badge variant="outline" className="text-xs border-blue-200 text-blue-600 bg-blue-50">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Free Trial
                </Badge>
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {formatDaysRemaining(sub.daysRemaining)}
            </span>
          </div>

          {/* Details grid */}
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Current Plan</p>
              <p className="text-sm font-semibold mt-0.5">
                {isTrial ? "Free Trial" : formatCycle(sub.cycle)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Amount</p>
              <p className="text-sm font-semibold mt-0.5">
                {isTrial ? "Free" : `${Number(sub.price).toLocaleString()} ${cur}`}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Expires On</p>
              <p className="text-sm font-semibold mt-0.5">
                {new Date(sub.endDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Provider</p>
              <p className="text-sm font-semibold mt-0.5 truncate">
                {data.provider?.name || "—"}
              </p>
            </div>
          </div>

          {/* Payment instructions */}
          {data.config.paymentInstructions && (
            <div className="px-4 pb-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800 whitespace-pre-wrap leading-relaxed">
                  {data.config.paymentInstructions}
                </p>
              </div>
            </div>
          )}

          {/* Penalty alarm for EXPIRED */}
          {isExpired && baseAmount > 0 && (
            <div className="px-4 pb-4">
              <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-rose-300 bg-rose-50 animate-pulse">
                <div className="shrink-0 mt-0.5 animate-bounce">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-rose-800">PAYMENT OVERDUE</p>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Your subscription expired {Math.abs(sub.daysRemaining)} day{Math.abs(sub.daysRemaining) !== 1 ? "s" : ""} ago.
                    A <strong>{penaltyPercent}% late payment penalty</strong> has been applied.
                  </p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-rose-600">Base: <strong>{baseAmount.toLocaleString()} {cur}</strong></span>
                    <span className="text-rose-300">+</span>
                    <span className="text-xs text-rose-600">Penalty: <strong>{(penaltyAmount - baseAmount).toLocaleString()} {cur}</strong></span>
                    <span className="text-rose-300">=</span>
                    <span className="text-sm font-bold text-rose-900 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-lg">
                      TOTAL DUE: {penaltyAmount.toLocaleString()} {cur}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning message for WARNING status */}
          {sub.status === "WARNING" && (
            <div className="px-4 pb-4">
              <div className="flex items-start gap-2 p-3 rounded-lg border bg-amber-50 border-amber-200">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Subscription expiring soon!</p>
                  <p className="text-xs mt-1 text-amber-700">Please select a plan below and submit your payment to continue using the service.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Available Plans ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <IndianRupee className="w-4 h-4" />
            Available Plans
          </h3>
          <span className="text-[10px] text-muted-foreground">
            {data.plans.length} plan{data.plans.length !== 1 ? "s" : ""} available
          </span>
        </div>

        {data.plans.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No plans available yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Contact the administrator for payment instructions
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {data.plans.map((plan) => {
              const isSelected = selectedPlan?.id === plan.id;
              const isCurrentPlan = sub.planId === plan.id && !isTrial;
              const colorClass = CYCLE_COLORS[plan.cycle] || "border-slate-200 bg-white";
              const iconColor = CYCLE_ICON_COLORS[plan.cycle] || "text-slate-600 bg-slate-100";

              return (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all hover:shadow-md border-2 ${
                    isCurrentPlan
                      ? "border-emerald-300 ring-2 ring-emerald-100"
                      : colorClass
                  }`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${iconColor}`}>
                            <CalendarDays className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold">{plan.name}</h4>
                            <p className="text-[10px] text-muted-foreground">
                              {formatCycle(plan.cycle)} — {plan.days} days
                            </p>
                          </div>
                        </div>
                      </div>
                      {isCurrentPlan && (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                          Current
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-xl font-bold">
                          {Number(plan.price).toLocaleString()}
                          <span className="text-xs font-normal text-muted-foreground ml-1">{cur}</span>
                        </p>
                        {totalBeds > 0 && pricePerBed > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            {cur}{pricePerBed} x {totalBeds} beds x {plan.days} days
                          </p>
                        )}
                        {plan.months > 1 && (
                          <p className="text-[10px] text-muted-foreground">
                            ~{plan.perMonth.toLocaleString()} {cur}/month
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isCurrentPlan ? "outline" : "default"}
                        className="h-8 text-xs"
                        disabled={isCurrentPlan}
                      >
                        {isCurrentPlan ? "Active" : (
                          <>
                            Pay Now
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Payment History ═══ */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-slate-50/50 transition-colors py-3"
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Payment History
              {data.payments.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {data.payments.length}
                </Badge>
              )}
            </CardTitle>
            <ChevronRight
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                showHistory ? "rotate-90" : ""
              }`}
            />
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent className="pt-0">
            {data.payments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No payment records yet
              </p>
            ) : (
              <div className="space-y-2">
                {data.payments.map((payment) => {
                  const isProviderSubmitted = payment.notes.includes("[PROVIDER SUBMITTED]");
                  const isChapaPending = payment.notes.includes("[CHAPA PENDING]");
                  const isChapaVerified = payment.notes.includes("[CHAPA VERIFIED]");
                  const isPaymentOverdue = payment.notes.includes("[PAYMENT_OVERDUE]");
                  const isOverdueWillApply = isPaymentOverdue && payment.notes.includes("Will apply soon");
                  const isVerified = !isProviderSubmitted && !isChapaPending;
                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${
                          isChapaVerified ? "bg-emerald-100" :
                          isChapaPending ? "bg-violet-100" :
                          isPaymentOverdue && !isOverdueWillApply ? "bg-rose-100" :
                          isOverdueWillApply ? "bg-amber-100" :
                          isProviderSubmitted ? "bg-amber-100" : "bg-emerald-100"
                        }`}>
                          {isChapaPending ? (
                            <Zap className="w-3.5 h-3.5 text-violet-600" />
                          ) : isPaymentOverdue && !isOverdueWillApply ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          ) : isOverdueWillApply ? (
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          ) : isProviderSubmitted ? (
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {Number(payment.amount).toLocaleString()} {cur}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatCycle(payment.cycle)} &middot;{" "}
                            {new Date(payment.periodStart).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short",
                            })}{" "}
                            —{" "}
                            {new Date(payment.periodEnd).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            isChapaPending
                              ? "border-violet-200 text-violet-700"
                              : isPaymentOverdue && !isOverdueWillApply
                              ? "border-rose-200 text-rose-700"
                              : isOverdueWillApply
                              ? "border-amber-200 text-amber-700"
                              : isProviderSubmitted
                              ? "border-amber-200 text-amber-700"
                              : "border-emerald-200 text-emerald-700"
                          }`}
                        >
                          {isChapaPending ? "Chapa Pending" : isPaymentOverdue && !isOverdueWillApply ? "Payment Overdue" : isOverdueWillApply ? "Overdue (Will apply soon)" : isProviderSubmitted ? "Pending" : "Verified"}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(payment.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Chapa success banner (shown after redirect back) */}
      {(chapaResult === "success" || chapaVerifying || chapaVerifyResult) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${
          chapaVerifyResult === "success"
            ? "border-emerald-400 bg-emerald-50"
            : chapaVerifyResult === "error"
            ? "border-amber-400 bg-amber-50"
            : "border-blue-300 bg-blue-50"
        }`}>
          <div className="shrink-0">
            {chapaVerifying ? (
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            ) : chapaVerifyResult === "success" ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            ) : chapaVerifyResult === "error" ? (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            )}
          </div>
          <div className="flex-1">
            {chapaVerifying ? (
              <>
                <p className="text-sm font-bold text-blue-800">Verifying Payment with Chapa...</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Please wait while we confirm your payment with Chapa. This takes a few seconds.
                </p>
              </>
            ) : chapaVerifyResult === "success" ? (
              <>
                <p className="text-sm font-bold text-emerald-800">Payment Verified &amp; Active</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your Chapa payment has been confirmed. Your subscription is now active!
                </p>
              </>
            ) : chapaVerifyResult === "error" ? (
              <>
                <p className="text-sm font-bold text-amber-800">Verification Delayed</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Could not verify immediately. Don't worry — the payment will be confirmed automatically via our backend. No action needed.
                </p>
              </>
            ) : chapaVerifyResult === "pending" ? (
              <>
                <p className="text-sm font-bold text-blue-800">Payment Not Yet Confirmed</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Chapa hasn't confirmed the payment yet. It will be verified automatically once confirmed.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-emerald-800">Payment Processing</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your Chapa payment was received. We are verifying it now — your subscription will be activated shortly.
                </p>
              </>
            )}
          </div>
          {chapaVerifying && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
          {!chapaVerifying && chapaVerifyResult === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        </div>
      )}

      {/* ═══ Payment Dialog ═══ */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Pay for Subscription
            </DialogTitle>
            <DialogDescription>
              {isChapaMethod
                ? "You will be redirected to Chapa's secure payment page to complete payment online (Telebirr, CBE Birr, bank cards, etc.)."
                : "Complete your payment offline, then fill in the details below. Your subscription will be activated after verification."}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && data && (
            <div className="space-y-4">
              {/* Selected plan summary */}
              <div className="p-3 bg-slate-50 rounded-xl border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{selectedPlan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCycle(selectedPlan.cycle)} — {selectedPlan.days} days
                    </p>
                  </div>
                  <p className="text-lg font-bold">
                    {Number(selectedPlan.price).toLocaleString()} {cur}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div>
                <Label className="text-xs font-medium">
                  Amount ({cur})
                </Label>
                <Input
                  type="number"
                  value={payAmount}
                  readOnly
                  className="mt-1 bg-slate-50 text-slate-700 cursor-not-allowed"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Auto-calculated based on your total beds and selected plan
                </p>
              </div>

              {/* Payment method */}
              <div>
                <Label className="text-xs font-medium">
                  Payment Method <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    const isActive = payMethod === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setPayMethod(m.value)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          isActive
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                            : m.value === "CHAPA"
                            ? "border-violet-200 text-violet-700 hover:bg-violet-50"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? m.color : m.value === "CHAPA" ? "text-violet-400" : "text-slate-400"}`} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                {payMethod === "CHAPA" && (
                  <p className="text-[10px] text-violet-600 mt-1.5 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Pay securely via Telebirr, CBE Birr, bank cards, and more
                  </p>
                )}
              </div>

              {/* Manual payment fields (hidden when Chapa selected) */}
              {!isChapaMethod && (
                <>
                  {/* Reference number */}
                  <div>
                    <Label className="text-xs font-medium">
                      Reference / Transaction Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      placeholder="e.g., FT25632i5632k"
                      className="mt-1"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Enter the transaction/reference number from your payment receipt
                    </p>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>{t('lbladditionalNotes', 'Additional Notes')}</Label>
                    <Textarea
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="Any additional information (optional)"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {/* Chapa-specific info */}
              {isChapaMethod && (
                <div className="flex items-start gap-2 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                  <ExternalLink className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-violet-800 leading-relaxed">
                    Click "Pay with Chapa" below. You'll be redirected to Chapa's secure checkout to complete your payment. After paying, you'll return here and your subscription activates automatically.
                  </p>
                </div>
              )}

              {/* Payment instructions reminder */}
              {data.config.paymentInstructions && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-800 whitespace-pre-wrap leading-relaxed">
                    {data.config.paymentInstructions}
                  </p>
                </div>
              )}

              <Separator />

              <DialogFooter className="flex-row gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setShowPayDialog(false)}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPayment}
                  disabled={
                    isChapaMethod
                      ? !payAmount || Number(payAmount) <= 0 || submitting
                      : !payMethod || !payAmount || Number(payAmount) <= 0 || !payRef.trim() || submitting
                  }
                  className={isChapaMethod ? "flex-1 sm:flex-none bg-violet-600 hover:bg-violet-700" : "flex-1 sm:flex-none"}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {isChapaMethod ? "Redirecting..." : "Submitting..."}
                    </>
                  ) : isChapaMethod ? (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Pay with Chapa
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
