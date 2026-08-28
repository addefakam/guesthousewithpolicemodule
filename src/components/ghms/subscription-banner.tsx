"use client";

import { useTranslation } from "react-i18next";
import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { type SubscriptionStatus } from "@/lib/subscription";

interface SubscriptionBannerProps {
  status: SubscriptionStatus;
  daysRemaining: number;
  providerName?: string;
  paymentMethod?: string;
  paymentInstructions?: string;
  penaltyAmount?: number;
  baseAmount?: number;
  penaltyPercent?: number;
  currencySymbol?: string;
}

export default function SubscriptionBanner({
  status,
  daysRemaining,
  paymentInstructions,
  penaltyAmount,
  baseAmount,
  penaltyPercent,
  currencySymbol,
}: SubscriptionBannerProps) {
  const { t } = useTranslation("subscription");

  if (status !== "WARNING" && status !== "EXPIRED") return null;

  const isExpired = status === "EXPIRED";
  const cur = currencySymbol || "Br";
  const absDays = Math.abs(daysRemaining);

  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-4 py-3 ${
        isExpired
          ? "border-2 border-rose-300 bg-rose-50 animate-pulse"
          : "border border-amber-200 bg-amber-50"
      }`}
    >
      <div className={`shrink-0 mt-0.5 ${isExpired ? "animate-bounce" : ""}`}>
        {isExpired ? (
          <XCircle className="h-5 w-5 text-rose-600" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${isExpired ? "text-rose-800" : "text-amber-800"}`}>
          {isExpired ? t("bannerExpiredTitle") : t("bannerWarningTitle")}
        </p>
        <p className={`text-xs mt-0.5 ${isExpired ? "text-rose-700" : "text-amber-700"}`}>
          {isExpired
            ? t("bannerExpiredDesc", { days: absDays, percent: penaltyPercent ?? 10 })
            : t("bannerWarningDesc", { days: absDays })}
        </p>

        {/* Penalty amount breakdown */}
        {isExpired && (baseAmount != null && baseAmount > 0) && (
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-rose-600">
              {t("penaltyBase")}: <strong>{baseAmount.toLocaleString()} {cur}</strong>
            </span>
            <span className="text-rose-300">+</span>
            <span className="text-xs text-rose-600">
              {t("penaltyLabel")} ({penaltyPercent ?? 10}%): <strong>{(penaltyAmount != null ? penaltyAmount - baseAmount : 0).toLocaleString()} {cur}</strong>
            </span>
            <span className="text-rose-300">=</span>
            <span className="text-sm font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
              {t("penaltyTotalDue")}: {(penaltyAmount ?? baseAmount).toLocaleString()} {cur}
            </span>
          </div>
        )}

        {paymentInstructions && (
          <p className={`text-xs mt-1 ${isExpired ? "text-rose-600" : "text-amber-600"}`}>
            {paymentInstructions}
          </p>
        )}
      </div>
      <div className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 ${
        isExpired
          ? "bg-rose-200 text-rose-900"
          : "bg-amber-100 text-amber-800"
      }`}>
        <Clock className="h-3.5 w-3.5" />
        <span className="text-xs font-bold">
          {isExpired
            ? t("bannerDaysOverdue", { days: absDays })
            : t("bannerDaysLeft", { days: absDays })}
        </span>
      </div>
    </div>
  );
}
