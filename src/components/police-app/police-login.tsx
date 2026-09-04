"use client";

// ── Standalone Police App login ──
// Reuses the shared /api/auth cookie session; rejects non-POLICE accounts.
// Same dark sign-in pattern as the /m operator app, with the police hero
// and amber accent as the module identity.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2, ShieldAlert, LogIn } from "lucide-react";
import { apiAuth, apiLogout } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { PoliceHouseHero, PoliceBadgeMark } from "@/components/police-app/visuals";

export function PoliceLogin() {
  const { t, i18n } = useTranslation("policeApp");
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleLang() {
    const next = i18n.language === "en" ? "am" : i18n.language === "am" ? "om" : "en";
    i18n.changeLanguage(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await apiAuth({ username: username.trim(), password });
      if (user?.role !== "POLICE") {
        // A non-police account just set the shared session cookie — clear it.
        await apiLogout();
        setCurrentUser(null);
        setError(t("login.notPolice"));
        return;
      }
      setCurrentUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B1D3A]">
      {/* Language toggle — same pill as /m */}
      <div className="flex justify-end px-4 pt-[env(safe-area-inset-top)] pt-4">
        <button
          type="button"
          onClick={toggleLang}
          className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 active:bg-slate-700 transition-colors"
        >
          {i18n.language === "en" ? "EN" : i18n.language === "am" ? "አማ" : "OM"}
        </button>
      </div>

      {/* Centered content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10">
        {/* Signature artwork: badge standing in front of the house */}
        <div className="w-full max-w-sm">
          <div className="relative overflow-hidden rounded-3xl border border-slate-700 shadow-lg shadow-black/30">
            <PoliceHouseHero className="h-auto w-full" />
          </div>
        </div>

        {/* Logo + title — same block pattern as /m login */}
        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/30">
            <PoliceBadgeMark className="h-7 w-7 text-[#0B1D3A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-white">{t("appName")}</h1>
            <p className="text-[11px] font-medium uppercase tracking-widest text-amber-400/90">{t("appTagline")}</p>
          </div>
        </div>

        {/* Login form — same input/button language as /m */}
        <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm space-y-4">
          <div>
            <label htmlFor="police-username" className="mb-1.5 block text-xs font-medium text-slate-400">
              {t("login.username")}
            </label>
            <input
              id="police-username"
              name="police-username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("login.usernamePlaceholder")}
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label htmlFor="police-password" className="mb-1.5 block text-xs font-medium text-slate-400">
              {t("login.password")}
            </label>
            <div className="relative">
              <input
                id="police-password"
                name="police-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 pr-12 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors active:bg-slate-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs ${
                error === t("login.notPolice")
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                  : "border-rose-500/20 bg-rose-500/10 text-rose-400"
              }`}
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !username.trim() || !password}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-semibold text-[#0B1D3A] shadow-lg shadow-amber-500/30 transition-all active:bg-amber-600 disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("login.signingIn")}
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {t("login.signIn")}
              </>
            )}
          </button>
        </form>

        <p className="mt-8 max-w-sm text-center text-[11px] leading-relaxed text-slate-600">
          {t("login.footerNote")}
        </p>
      </div>
    </div>
  );
}

/** Shown when a non-police account (operator/staff/superuser) opens this app. */
export function PoliceRoleError() {
  const { t } = useTranslation("policeApp");
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  async function handleSwitchAccount() {
    await apiLogout();
    setCurrentUser(null);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0B1D3A] px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800">
        <ShieldAlert className="h-10 w-10 text-amber-400" />
      </div>
      <h1 className="mt-6 text-lg font-bold text-white">{t("login.notPoliceTitle")}</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">{t("login.notPolice")}</p>
      <button
        type="button"
        onClick={handleSwitchAccount}
        className="mt-8 flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 text-sm font-semibold text-[#0B1D3A] shadow-lg shadow-amber-500/30 transition active:bg-amber-600 active:scale-[0.98]"
      >
        <LogIn className="h-4 w-4" />
        {t("login.switchAccount")}
      </button>
    </div>
  );
}
