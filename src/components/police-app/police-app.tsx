"use client";

// ── Standalone Police App shell — Aurora light design system ──
// Simple, artistic, light: a soft #F6F7FB canvas, ONE uniform brand flow
// (indigo → violet) for every interactive state, aurora blur washes and
// slim gradient signature bars as the only decoration. No header icons,
// no artwork. Gentle fade-rise when switching tabs.

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

  // SUPERUSER (system admin) has no police rank — show the ADMIN badge for them
  const rank = (user.role === "SUPERUSER" ? "ADMIN" : user.policeRank || "OFFICER") as PoliceRank;

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
    <div className="relative flex min-h-dvh flex-col bg-[#F6F7FB] text-slate-900">
      {/* ── Header: light glass bar with a soft aurora wash (no icons) ── */}
      <header className="sticky top-0 z-30 overflow-hidden border-b border-slate-100 bg-white/85 backdrop-blur-xl">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-8 h-28 w-44 rounded-full bg-indigo-200/30 blur-2xl" />
          <div className="absolute -top-14 right-6 h-20 w-28 rounded-full bg-violet-200/25 blur-2xl" />
        </div>
        <div className="relative flex items-center justify-between gap-2 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">{t("appName")}</h1>
            <div aria-hidden="true" className="mt-1 h-0.5 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-violet-400" />
            <p className="mt-1.5 truncate text-[11px] text-slate-400">
              {user.name} &middot; <span className="uppercase tracking-wider">{t("appTagline")}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {i18n.exists(`rank.${rank}`) && (
              <span
                className={`hidden rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider sm:inline-flex ${RANK_BADGE_CLASSES[rank] || RANK_BADGE_CLASSES.OFFICER}`}
              >
                {t(`rank.${rank}`)}
              </span>
            )}
            <button
              type="button"
              onClick={cycleLanguage}
              aria-label={t("more.language")}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition-colors active:bg-slate-100"
            >
              {LANG_LABELS[i18n.language] || "EN"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Screens ── */}
      <main className="relative flex-1 pb-24">
        {/* aurora wash behind content */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-60 overflow-hidden">
          <div className="absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-indigo-100/60 blur-3xl" />
          <div className="absolute top-6 right-0 h-32 w-40 rounded-full bg-violet-100/50 blur-3xl" />
        </div>
        <div key={tab} className="pa-enter relative">
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
        </div>
      </main>

      {/* ── Bottom tab bar: light glass, gradient indicator on the active tab ── */}
      <nav
        aria-label={t("appName")}
        className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-100 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-4">
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setTab(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-16 w-full flex-col items-center justify-center gap-0.5 transition-colors ${
                    active ? "text-indigo-600" : "text-slate-400 active:text-slate-600"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-0 h-0.5 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                      active ? "bg-indigo-50" : ""
                    }`}
                  >
                    {item.icon}
                  </span>
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
