"use client";

// ── More — officer profile, language, about, sign out ──

import { useTranslation } from "react-i18next";
import { Globe, Info, LogOut, ShieldCheck } from "lucide-react";
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
    <div className="space-y-4 px-4 pb-6 pt-3">
      <header className="flex items-center gap-2 px-1">
        <ShieldCheck className="h-5 w-5 text-amber-400" />
        <h1 className="text-lg font-bold leading-tight text-white">{t("more.title")}</h1>
      </header>

      {/* Officer card */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-lg shadow-black/20">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-lg font-black text-[#0B1D3A] shadow-lg shadow-amber-500/25">
              {initials}
            </div>
            <PoliceBadgeMark className="absolute -bottom-1.5 -right-1.5 h-6 w-6 text-amber-300 drop-shadow" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">{user.name}</h2>
            <p className="truncate text-xs text-slate-400">@{user.username}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                {t("more.rolePolice")}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${RANK_BADGE_CLASSES[rank] || RANK_BADGE_CLASSES.OFFICER}`}
              >
                {t(`rank.${rank}`)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-lg shadow-black/20">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
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
                    ? "border-amber-400 bg-amber-400/15 text-amber-300"
                    : "border-white/10 bg-white/[0.04] text-slate-300"
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
      <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-lg shadow-black/20">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Info className="h-4 w-4" />
          {t("more.about")}
        </h3>
        <p className="mt-2.5 text-xs leading-relaxed text-slate-400">{t("more.aboutText")}</p>
        <p className="mt-2 text-[10px] font-medium text-slate-600">
          {t("appName")} · v1.0.0 · /police-app
        </p>
      </section>

      {/* Sign out */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/15 py-3.5 text-sm font-bold text-rose-300 transition hover:bg-rose-500/25 active:scale-[0.98]"
      >
        <LogOut className="h-4 w-4" />
        {t("more.logout")}
      </button>
    </div>
  );
}
