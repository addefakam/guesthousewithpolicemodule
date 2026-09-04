"use client";

// ── Standalone Police App login — Aurora light design system ──
// Reuses the shared /api/auth cookie session; rejects non-POLICE accounts.
// Soft light canvas with aurora washes, one white glass card, a single
// indigo→violet gradient action. No artwork, no dark theme.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2, ShieldAlert, LogIn } from "lucide-react";
import { apiAuth, apiLogout } from "@/lib/api";
import { useAppStore } from "@/lib/store";

/** Soft artistic backdrop shared by login / role-error states. */
function AuroraBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-violet-200/35 blur-3xl" />
      <div className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-sky-100/50 blur-3xl" />
    </div>
  );
}

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
    <div className="relative flex min-h-dvh flex-col bg-[#F6F7FB]">
      <AuroraBackdrop />

      {/* Language toggle */}
      <div className="relative flex justify-end px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          type="button"
          onClick={toggleLang}
          className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-500 backdrop-blur transition-colors active:bg-slate-100"
        >
          {i18n.language === "en" ? "EN" : i18n.language === "am" ? "አማ" : "OM"}
        </button>
      </div>

      {/* Centered glass card */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-5 pb-10">
        <div className="w-full max-w-sm rounded-3xl border border-white bg-white/90 p-6 shadow-xl shadow-indigo-100/70 backdrop-blur">
          {/* Brand block — typographic, no imagery */}
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-black text-white shadow-lg shadow-indigo-500/30"
            >
              G
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{t("appName")}</h1>
              <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-indigo-500">
                {t("appTagline")}
              </p>
            </div>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="police-username" className="mb-1.5 block text-xs font-medium text-slate-500">
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
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>

            <div>
              <label htmlFor="police-password" className="mb-1.5 block text-xs font-medium text-slate-500">
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
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors active:bg-slate-100"
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
                    ? "border-amber-100 bg-amber-50/80 text-amber-700"
                    : "border-rose-100 bg-rose-50/80 text-rose-700"
                }`}
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
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
        </div>

        <p className="mt-6 max-w-sm text-center text-[11px] leading-relaxed text-slate-400">
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
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[#F6F7FB] px-6 text-center">
      <AuroraBackdrop />
      <div className="relative w-full max-w-sm rounded-3xl border border-white bg-white/90 p-8 shadow-xl shadow-indigo-100/70 backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50/80">
          <ShieldAlert className="h-8 w-8 text-rose-400" />
        </div>
        <h1 className="mt-5 text-lg font-bold tracking-tight text-slate-900">{t("login.notPoliceTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{t("login.notPolice")}</p>
        <button
          type="button"
          onClick={handleSwitchAccount}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:opacity-95 active:scale-[0.99]"
        >
          <LogIn className="h-4 w-4" />
          {t("login.switchAccount")}
        </button>
      </div>
    </div>
  );
}
