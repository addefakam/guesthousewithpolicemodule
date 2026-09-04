"use client";

// ── Standalone Police App login ──
// Reuses the shared /api/auth cookie session; rejects non-POLICE accounts.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2, ShieldAlert, LogIn } from "lucide-react";
import { apiAuth, apiLogout } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { PoliceHouseHero, PoliceBadgeMark } from "@/components/police-app/visuals";

export function PoliceLogin() {
  const { t } = useTranslation("policeApp");
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-[#0B1D3A] via-[#0B1D3A] to-[#081426]">
      <main className="flex flex-1 flex-col px-5 pb-10 pt-10">
        {/* Brand + signature artwork */}
        <div className="mx-auto w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/40">
            <PoliceHouseHero className="h-auto w-full" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#081426] via-[#081426]/70 to-transparent px-5 pb-4 pt-10">
              <div className="flex items-center gap-2.5">
                <PoliceBadgeMark className="h-7 w-7 text-amber-400" />
                <div>
                  <h1 className="text-lg font-bold leading-tight tracking-tight text-white">{t("appName")}</h1>
                  <p className="text-[11px] font-medium uppercase tracking-widest text-amber-300/90">{t("appTagline")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sign-in card */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-6 w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur"
        >
          <h2 className="text-base font-semibold text-white">{t("login.title")}</h2>
          <p className="mt-1 text-sm text-slate-400">{t("login.subtitle")}</p>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="police-username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                className="h-12 w-full rounded-xl border border-white/10 bg-[#0B1D3A]/80 px-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            <div>
              <label htmlFor="police-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#0B1D3A]/80 px-4 pr-12 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm ${
                  error === t("login.notPolice")
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-200"
                }`}
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-sm font-bold text-[#0B1D3A] shadow-lg shadow-amber-500/25 transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
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
          </div>
        </form>

        <p className="mx-auto mt-6 max-w-md text-center text-[11px] leading-relaxed text-slate-500">
          {t("login.footerNote")}
        </p>
      </main>
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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#081426] px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-500/30 bg-amber-500/10">
        <ShieldAlert className="h-10 w-10 text-amber-400" />
      </div>
      <h1 className="mt-6 text-lg font-bold text-white">{t("login.notPoliceTitle")}</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">{t("login.notPolice")}</p>
      <button
        onClick={handleSwitchAccount}
        className="mt-8 flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-8 text-sm font-bold text-[#0B1D3A] shadow-lg shadow-amber-500/25 transition active:scale-[0.98]"
      >
        <LogIn className="h-4 w-4" />
        {t("login.switchAccount")}
      </button>
    </div>
  );
}
