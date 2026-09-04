"use client";

// ── More — officer profile, language, about, sign out ──
// Light cards on gray-50, matching the /m operator app.

import { useTranslation } from "react-i18next";
import { ChevronRight, Globe, Info, LogOut } from "lucide-react";
import { apiLogout } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  RANK_BADGE_CLASSES,
  type PoliceRank,
} from "@/lib/police-permissions";
import { PoliceBadgeMark } from "@/components/police-app/visuals";

const LANGUAGES: { code: string; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "am", label: "Amharic", native: "አማርኛ" },
  { code: "om", label: "Oromo", native: "Afaan Oromoo" },
];

export default function MoreScreen({ onSignedOut }: { onSignedOut: () => void }) {
  const { t, i18n } = useTranslation("policeApp");
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  const user = currentUser;
  const rank = (user?.policeRank || "OFFICER") as PoliceRank;
  const initials = (user?.name || user?.username || "?")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await apiLogout();
    setCurrentUser(null);
    onSignedOut();
  }

  if (!user) return null;

  return (
    <div className="space-y-3 px-4 pt-4">
      <header className="px-1">
        <h1 className="text-lg font-bold leading-tight text-gray-900">{t("more.title")}</h1>
      </header>

      {/* Officer card */}
      <section className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0B1D3A] text-lg font-black text-amber-400 shadow-sm">
              {initials}
            </div>
            <PoliceBadgeMark className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-white p-0.5 text-amber-500 shadow-sm" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-gray-900">{user.name}</h2>
            <p className="truncate text-xs text-gray-500">@{user.username}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                {t("more.rolePolice")}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${RANK_BADGE_CLASSES[rank] || RANK_BADGE_CLASSES.OFFICER}`}
              >
                {t(`rank.${rank}`)}
              </span>
            </div>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300" />
        </div>
      </section>

      {/* Language */}
      <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          <Globe className="h-4 w-4" />
          {t("more.language")}
        </h3>
        <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label={t("more.language")}>
          {LANGUAGES.map((l) => {
            const active = i18n.language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => i18n.changeLanguage(l.code)}
                aria-pressed={active}
                className={`flex h-14 flex-col items-center justify-center rounded-xl border text-xs font-bold transition active:scale-95 ${
                  active
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                <span>{l.native}</span>
                <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider opacity-60">
                  {l.code}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* About */}
      <section className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          <Info className="h-4 w-4" />
          {t("more.about")}
        </h3>
        <p className="mt-2.5 text-xs leading-relaxed text-gray-500">{t("more.aboutText")}</p>
        <p className="mt-2 text-[10px] font-medium text-gray-400">
          {t("appName")} · v1.0.0 · /police-app
        </p>
      </section>

      {/* Sign out */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white py-3 text-sm font-semibold text-rose-600 transition active:bg-rose-50 active:scale-[0.98]"
      >
        <LogOut className="h-4 w-4" />
        {t("more.logout")}
      </button>
    </div>
  );
}
