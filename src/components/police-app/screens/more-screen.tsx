"use client";

// ── More — officer profile, language, about, sign out ──
// Aurora light design system: uniform white cards, gradient avatar tile,
// indigo language selection, one soft rose action.

import { useTranslation } from "react-i18next";
import { Globe, Info, LogOut } from "lucide-react";
import { apiLogout } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { BRAND } from "@/lib/police-app-status";

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
  const rankKey = `rank.${user?.policeRank || "OFFICER"}`;
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
        <h1 className="text-lg font-bold tracking-tight text-slate-900">{t("more.title")}</h1>
      </header>

      {/* Officer card */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-black text-white shadow-lg shadow-indigo-500/25"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">{user.name}</h2>
            <p className="truncate text-xs text-slate-400">@{user.username}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                {t("more.rolePolice")}
              </span>
              {i18n.exists(rankKey) && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {t(rankKey)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
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
                  active ? BRAND.activeSoft : "border-slate-200 bg-white text-slate-600"
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
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Info className="h-4 w-4" />
          {t("more.about")}
        </h3>
        <p className="mt-2.5 text-xs leading-relaxed text-slate-500">{t("more.aboutText")}</p>
        <div aria-hidden="true" className={`mt-3 h-0.5 w-10 rounded-full ${BRAND.gradientBar}`} />
        <p className="mt-2 text-[10px] font-medium text-slate-400">
          {t("appName")} · v1.0.0 · /police-app
        </p>
      </section>

      {/* Sign out */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-white py-3 text-sm font-semibold text-rose-600 transition active:bg-rose-50 active:scale-[0.98]"
      >
        <LogOut className="h-4 w-4" />
        {t("more.logout")}
      </button>
    </div>
  );
}
