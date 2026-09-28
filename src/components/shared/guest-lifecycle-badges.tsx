"use client";

/**
 * GuestLifecycleBadges
 * ────────────────────
 * Compact pill badges summarizing the status-change history of a guest
 * (early exit, extended stay, room shifted, cancelled, etc.).
 *
 * Used on the guest search table (operator + police + mobile) to give
 * operators a quick at-a-glance indicator that something notable
 * happened to this guest — without needing to open the detail dialog.
 *
 * Badges are derived from the `summary` object returned by
 * GET /api/guests/[id]/lifecycle.
 */

import { Clock, ArrowRightLeft, Ban, CalendarPlus, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface GuestLifecycleSummary {
  totalReservations: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  hasEarlyCheckout: boolean;
  hasExtension: boolean;
  hasRoomShift: boolean;
  hasCancellation: boolean;
  hasUpdate: boolean;
  lastEventAt: string | null;
  lastEventType: string | null;
}

interface Props {
  summary: GuestLifecycleSummary | null | undefined;
  /** i18n namespace to use — caller chooses (accommodation, policeGuests, mobile, policeApp) */
  namespace?: string;
  /** Compact = single-line icon-only badges; full = icon + text */
  compact?: boolean;
  className?: string;
}

const BADGE_STYLES: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  early: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: Clock },
  extended: { bg: "bg-sky-50 border-sky-200", text: "text-sky-700", icon: CalendarPlus },
  shifted: { bg: "bg-violet-50 border-violet-200", text: "text-violet-700", icon: ArrowRightLeft },
  cancelled: { bg: "bg-rose-50 border-rose-200", text: "text-rose-700", icon: Ban },
  updated: { bg: "bg-slate-50 border-slate-200", text: "text-slate-700", icon: RefreshCw },
};

export default function GuestLifecycleBadges({
  summary,
  compact = false,
  className = "",
}: Props) {
  const { t } = useTranslation();

  if (!summary) return null;

  const badges: { key: string; styleKey: keyof typeof BADGE_STYLES; label: string; }[] = [];

  if (summary.hasEarlyCheckout) {
    badges.push({ key: "early", styleKey: "early", label: t("guestBadgeEarlyCheckout") || "Early exit" });
  }
  if (summary.hasExtension) {
    badges.push({ key: "extended", styleKey: "extended", label: t("guestBadgeExtended") || "Extended" });
  }
  if (summary.hasRoomShift) {
    badges.push({ key: "shifted", styleKey: "shifted", label: t("guestBadgeRoomShift") || "Room shifted" });
  }
  if (summary.hasCancellation) {
    badges.push({ key: "cancelled", styleKey: "cancelled", label: t("guestBadgeCancelled") || "Cancelled" });
  }
  // Only show the generic "updated" badge if there are no specific ones
  // (otherwise it's redundant noise — extension/cancellation are also updates)
  if (badges.length === 0 && summary.hasUpdate) {
    badges.push({ key: "updated", styleKey: "updated", label: t("guestBadgeUpdated") || "Updated" });
  }

  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {badges.map((b) => {
        const style = BADGE_STYLES[b.styleKey];
        const Icon = style.icon;
        return (
          <span
            key={b.key}
            className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold leading-none ${style.bg} ${style.text}`}
            title={b.label}
          >
            <Icon className="h-2.5 w-2.5" />
            {!compact && <span>{b.label}</span>}
          </span>
        );
      })}
    </div>
  );
}
