"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { apiAuth } from "@/lib/api";

export function MobileLoginPage() {
  const { t, i18n } = useTranslation("mobile");
  const { setCurrentUser } = useAppStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await apiAuth({ username: username.trim(), password });
      if (res && res.user) {
        setCurrentUser(res.user);
      } else {
        setError(t("loginError"));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("role") || msg.includes("OPERATOR") || msg.includes("STAFF")) {
        setError(t("loginErrorRole"));
      } else {
        setError(msg || t("loginErrorGeneral"));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    const next = i18n.language === "am" ? "en" : "am";
    i18n.changeLanguage(next);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-slate-900">
      {/* Language toggle */}
      <div className="flex justify-end px-4 pt-[env(safe-area-inset-top)] pt-4">
        <button
          onClick={toggleLang}
          className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 active:bg-slate-700 transition-colors"
        >
          {i18n.language === "am" ? "EN" : "አማ"}
        </button>
      </div>

      {/* Centered content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* Logo */}
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-600 shadow-lg shadow-emerald-600/30">
          <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>

        <h1 className="mb-1 text-3xl font-bold text-white">{t("loginTitle")}</h1>
        <p className="mb-10 text-sm text-slate-400">{t("loginSubtitle")}</p>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("loginUsername")}</label>
            <input
              type="text"
              autoComplete="username"
              autoCapitalize="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("loginUsername")}
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("loginPassword")}</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("loginPassword")}
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="h-12 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 active:bg-emerald-700 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("loginLoading")}
              </span>
            ) : (
              t("loginBtn")
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[11px] text-slate-600">
          {t("loginSubtitle")}
        </p>
      </div>
    </div>
  );
}