"use client";

// ── Standalone Police App shell ──
// Navy police theme, sticky header, bottom tab bar with the Rooms tab
// elevated as the flagship (Room Availability) destination.

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
import { PoliceBadgeMark } from "@/components/police-app/visuals";
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

  const tabs: { key: Tab; label: string; icon: React.ReactNode; elevated?: boolean }[] = [
    { key: "home", label: t("nav.home"), icon: <LayoutDashboard className="h-5 w-5" /> },
    { key: "rooms", label: t("nav.rooms"), icon: <BedDouble className="h-6 w-6" />, elevated: true },
    { key: "guests", label: t("nav.guests"), icon: <Users className="h-5 w-5" /> },
    { key: "more", label: t("nav.more"), icon: <MoreHorizontal className="h-5 w-5" /> },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-[#0B1D3A] to-[#081426]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0B1D3A]/85 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <PoliceBadgeMark className="h-8 w-8 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold leading-tight text-white">{t("appName")}</h1>
            <p className="truncate text-[10px] font-medium uppercase tracking-widest text-amber-300/80">
              {t("appTagline")}
            </p>
          </div>
          <button
            type="button"
            onClick={cycleLanguage}
            aria-label={t("more.language")}
            className="flex h-9 min-w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-2.5 text-[11px] font-bold text-slate-200 transition active:scale-95"
          >
            {LANG_LABELS[i18n.language] || "EN"}
          </button>
          <div className="flex flex-col items-end leading-none">
            <span className="max-w-24 truncate text-[11px] font-semibold text-slate-200">
              {user.name}
            </span>
            <span
              className={`mt-1 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${RANK_BADGE_CLASSES[rank] || RANK_BADGE_CLASSES.OFFICER}`}
            >
              {t(`rank.${rank}`)}
            </span>
          </div>
        </div>
      </header>

      {/* ── Screens ── */}
      <main className="flex-1 pb-28">
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

      {/* ── Bottom tab bar ── */}
      <nav
        aria-label={t("appName")}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0B1D3A]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map((item) => {
            const active = tab === item.key;
            if (item.elevated) {
              return (
                <li key={item.key} className="relative flex justify-center">
                  <button
                    type="button"
                    onClick={() => setTab(item.key)}
                    aria-current={active ? "page" : undefined}
                    className="group -mt-6 flex flex-col items-center"
                  >
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition active:scale-95 ${
                        active
                          ? "bg-gradient-to-br from-amber-400 to-amber-600 text-[#0B1D3A] shadow-amber-500/40"
                          : "bg-[#16305A] text-amber-300 shadow-black/40 ring-1 ring-white/15"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`mt-1 text-[10px] font-bold ${active ? "text-amber-300" : "text-slate-400"}`}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            }
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setTab(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 w-full flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    active ? "text-amber-300" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.icon}
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
