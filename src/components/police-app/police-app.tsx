"use client";

// ── Standalone Police App shell ──
// Same look & feel as the /m operator app: gray-50 body, solid dark sticky
// header (text-only, no icons), and a flat white bottom tab bar. Police
// identity stays in the navy header (#0B1D3A) and the amber accents.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BedDouble,
  LayoutDashboard,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { useAppStore, type CurrentUser } from "@/lib/store";
import {
  RANK_BADGE_CLASSES,
  type PoliceRank,
} from "@/lib/police-permissions";
import HomeScreen from "@/components/police-app/screens/home-screen";
import RoomsScreen from "@/components/police-app/screens/rooms-screen";
import GuestsScreen from "@/components/police-app/screens/guests-screen";
import MoreScreen from "@/components/police-app/screens/more-screen";

type Tab = "home" | "rooms" | "guests" | "more";

const LANG_CYCLE = ["en", "am", "om"];
const LANG_LABELS: Record<string, string> = { en: "EN", am: "አማ", om: "OM" };

export default function PoliceApp({ user }: { user: CurrentUser }) {
  const { t, i18n } = useTranslation("policeApp");
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const [tab, setTab] = useState<Tab>("rooms"); // flagship screen first

  const rank = (user.policeRank || "OFFICER") as PoliceRank;

  function cycleLanguage() {
    const idx = LANG_CYCLE.indexOf(i18n.language);
    const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length] || "en";
    i18n.changeLanguage(next);
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "home", label: t("nav.home"), icon: <LayoutDashboard className="h-5 w-5" /> },
    { key: "rooms", label: t("nav.rooms"), icon: <BedDouble className="h-5 w-5" /> },
    { key: "guests", label: t("nav.guests"), icon: <Users className="h-5 w-5" /> },
    { key: "more", label: t("nav.more"), icon: <MoreHorizontal className="h-5 w-5" /> },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      {/* ── Header (same pattern as /m: solid dark bar) ── */}
      <header className="sticky top-0 z-30 bg-[#0B1D3A] text-white px-4 pt-[env(safe-area-inset-top)] pb-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight">{t("appName")}</h1>
            <p className="truncate text-[11px] text-slate-400">
              {user.name} &middot; <span className="uppercase tracking-wider">{t("appTagline")}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`hidden rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider sm:inline-flex ${RANK_BADGE_CLASSES[rank] || RANK_BADGE_CLASSES.OFFICER}`}
            >
              {t(`rank.${rank}`)}
            </span>
            <button
              type="button"
              onClick={cycleLanguage}
              aria-label={t("more.language")}
              className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 active:bg-slate-700 transition-colors"
            >
              {LANG_LABELS[i18n.language] || "EN"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Screens ── */}
      <main className="flex-1 pb-24">
        {tab === "home" && <HomeScreen onNavigate={setTab} />}
        {tab === "rooms" && <RoomsScreen />}
        {tab === "guests" && <GuestsScreen />}
        {tab === "more" && (
          <MoreScreen
            onSignedOut={() => {
              // Back to the main GHMS app entry point after sign-out
              setCurrentPage("dashboard");
            }}
          />
        )}
      </main>

      {/* ── Bottom tab bar (same pattern as /m: flat white bar) ── */}
      <nav
        aria-label={t("appName")}
        className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4 h-16">
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setTab(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 w-full flex-col items-center justify-center gap-0.5 transition-colors ${
                    active ? "text-slate-900" : "text-gray-400 active:text-gray-600"
                  }`}
                >
                  <div className={active ? "p-1 rounded-lg bg-slate-100" : ""}>{item.icon}</div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
