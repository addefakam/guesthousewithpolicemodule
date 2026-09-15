"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { apiAuth, apiRegisterProvider } from "@/lib/api";
import { isValidPhone, isValidEmail } from "@/lib/utils";
import { ResetPasswordDialog } from "@/components/shared/reset-password-dialog";

// ── Constants (shared with the web login-page.tsx registration form) ──
const GUESTHOUSE_TYPES = [
  { value: "GUEST_HOUSE" },
  { value: "HOTEL" },
  { value: "LODGE" },
  { value: "RESORT" },
  { value: "OTHER" },
];

const SUB_CITY_WOREDAS: Record<string, string[]> = {
  "Cheleleka": ["Erer", "Arsadee", "Kilolee"],
  "Dhibaayyuu": ["Dhaka Booraa", "Dirree", "Horaa", "Biiftuu"],
  "Dukam": ["Odaa Nabee", "Xaddachaa", "Malkaa", "Abbuu Seeraa"],
};

const TYPE_LABELS: Record<string, string> = {
  GUEST_HOUSE: "Guest House",
  HOTEL: "Hotel",
  LODGE: "Lodge",
  RESORT: "Resort",
  OTHER: "Other",
  // Kept for backward-compatibility: existing guesthouses with these types
  // still display their label correctly if they were created before removal.
  HOMESTAY: "Homestay",
  DHARAMSHALA: "Dharamshala",
};

export function MobileLoginPage() {
  const { t, i18n } = useTranslation("mobile");
  const { setCurrentUser } = useAppStore();

  // ── Tab: "login" or "register" ──
  const [mode, setMode] = useState<"login" | "register">("login");

  // ── Login state ──
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  // ── Register state ──
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regGuestHouseName, setRegGuestHouseName] = useState("");
  const [regType, setRegType] = useState("");
  const [regSubCity, setRegSubCity] = useState("");
  const [regWoreda, setRegWoreda] = useState("");
  const [regLicenseNo, setRegLicenseNo] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    // Required fields validation (email + licenseNo are optional).
    if (
      !regName.trim() ||
      !regPhone.trim() ||
      !regGuestHouseName.trim() ||
      !regType ||
      !regUsername.trim() ||
      !regPassword.trim() ||
      !regSubCity ||
      !regWoreda
    ) {
      setRegError(t("regErrorEmptyFields") || "Please fill all required fields.");
      return;
    }
    if (regPassword.trim().length < 4) {
      setRegError(t("regErrorPasswordShort") || "Password must be at least 4 characters.");
      return;
    }
    if (!isValidPhone(regPhone)) {
      setRegError(t("regErrorInvalidPhone") || "Invalid phone number format.");
      return;
    }
    // Email is OPTIONAL — only validate format if the user provided one.
    if (regEmail.trim() && !isValidEmail(regEmail)) {
      setRegError(t("regErrorInvalidEmail") || "Invalid email format.");
      return;
    }

    setRegLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", regGuestHouseName.trim());
      formData.append("ownerName", regName.trim());
      formData.append("phone", regPhone.trim());
      if (regEmail.trim()) {
        formData.append("email", regEmail.trim());
      }
      const address = ["Bishoftu", regSubCity, regWoreda].filter(Boolean).join(", ");
      if (address) formData.append("address", address);
      if (regSubCity) formData.append("subCity", regSubCity);
      if (regWoreda) formData.append("woreda", regWoreda);
      formData.append("type", regType);
      // License No is OPTIONAL.
      if (regLicenseNo.trim()) {
        formData.append("licenseNo", regLicenseNo.trim());
      }
      formData.append("username", regUsername.trim());
      formData.append("password", regPassword);

      await apiRegisterProvider(formData);
      setRegSuccess(true);
      // Reset form on success — keep it tidy in case the user wants to register another.
      setRegName("");
      setRegPhone("");
      setRegEmail("");
      setRegGuestHouseName("");
      setRegType("");
      setRegSubCity("");
      setRegWoreda("");
      setRegLicenseNo("");
      setRegUsername("");
      setRegPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (t("regErrorGeneral") || "Registration failed.");
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  };

  // 3-way language cycle: EN → AM → OM → EN (matches the web admin's
  // full trilingual support). The button label shows the NEXT language
  // the user will switch to, so they can tap once to switch.
  const LANG_CYCLE = ["en", "am", "om"] as const;
  const LANG_LABELS: Record<string, string> = { en: "EN", am: "አማ", om: "OM" };
  const toggleLang = () => {
    if (!i18n || typeof i18n.changeLanguage !== "function") return;
    const current = (i18n.language || "en").slice(0, 2).toLowerCase();
    const idx = LANG_CYCLE.indexOf(current as typeof LANG_CYCLE[number]);
    const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length] || "en";
    i18n.changeLanguage(next);
  };
  const nextLangLabel = () => {
    const current = (i18n.language || "en").slice(0, 2).toLowerCase();
    const idx = LANG_CYCLE.indexOf(current as typeof LANG_CYCLE[number]);
    const nextCode = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length] || "en";
    return LANG_LABELS[nextCode] || "EN";
  };

  const inputClass = "h-11 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors";
  const labelClass = "mb-1 block text-[11px] font-medium text-slate-400";
  const selectTriggerClass = "h-11 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors";

  return (
    <div className="flex min-h-dvh flex-col bg-slate-900">
      {/* Language toggle */}
      <div className="flex justify-end px-4 pt-[env(safe-area-inset-top)] pt-4">
        <button
          onClick={toggleLang}
          className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 active:bg-slate-700 transition-colors"
        >
          {/* Label shows the NEXT language in the cycle: EN→AM→OM→EN */}
          {nextLangLabel()}
        </button>
      </div>

      {/* Centered content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-6">
        {/* Logo */}
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-600 shadow-lg shadow-emerald-600/30">
          <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>

        <h1 className="mb-1 text-3xl font-bold text-white">{t("loginTitle")}</h1>
        <p className="mb-8 text-sm text-slate-400">{t("loginSubtitle")}</p>

        {/* Mode tabs */}
        <div className="mb-6 flex w-full max-w-sm rounded-xl bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              mode === "login" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400"
            }`}
          >
            {t("tabSignIn") || "Sign In"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setRegError(""); setRegSuccess(false); }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              mode === "register" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400"
            }`}
          >
            {t("tabRegister") || "Register"}
          </button>
        </div>

        {mode === "login" ? (
          <>
            {/* ── Login form ── */}
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
              <div>
                <label className={labelClass}>{t("loginUsername")}</label>
                <input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("loginUsername")}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t("loginPassword")}</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("loginPassword")}
                  className={inputClass}
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

            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="mt-4 text-center text-xs font-medium text-emerald-400 hover:text-emerald-300 active:text-emerald-200 transition-colors"
            >
              {t("resetPassword")}
            </button>
          </>
        ) : (
          <>
            {/* ── Registration form ── */}
            {regSuccess ? (
              <div className="w-full max-w-sm rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/20">
                  <svg className="h-6 w-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-emerald-300 mb-1">
                  {t("regSuccessTitle") || "Registration Submitted"}
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  {t("regSuccessDesc") || "Your guesthouse registration has been submitted. An admin will review and activate your account. You can sign in once approved."}
                </p>
                <button
                  type="button"
                  onClick={() => { setRegSuccess(false); setMode("login"); }}
                  className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white active:bg-emerald-700 transition-colors"
                >
                  {t("tabSignIn") || "Sign In"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="w-full max-w-sm space-y-3">
                {/* Owner name */}
                <div>
                  <label className={labelClass}>{t("regOwnerName") || "Owner Full Name"} <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    autoComplete="name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder={t("regOwnerNamePh") || "Abebe Bekele"}
                    className={inputClass}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className={labelClass}>{t("regPhone") || "Phone"} <span className="text-rose-400">*</span></label>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+251 9XX XXX XXX"
                    className={inputClass}
                  />
                </div>

                {/* Email (optional) */}
                <div>
                  <label className={labelClass}>
                    {t("regEmail") || "Email"} <span className="text-slate-500 text-[10px]">(optional)</span>
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="abebe@example.com"
                    className={inputClass}
                  />
                </div>

                {/* Organization name */}
                <div>
                  <label className={labelClass}>{t("regGuestHouseName") || "Organization Name"} <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    value={regGuestHouseName}
                    onChange={(e) => setRegGuestHouseName(e.target.value)}
                    placeholder={t("regGuestHouseNamePh") || "Bishoftu Lodge"}
                    className={inputClass}
                  />
                </div>

                {/* Type */}
                <div>
                  <label className={labelClass}>{t("regType") || "Type"} <span className="text-rose-400">*</span></label>
                  <select
                    value={regType}
                    onChange={(e) => setRegType(e.target.value)}
                    className={selectTriggerClass}
                  >
                    <option value="" disabled>{t("regTypePh") || "Select type"}</option>
                    {GUESTHOUSE_TYPES.map((gt) => (
                      <option key={gt.value} value={gt.value} className="bg-slate-800 text-white">
                        {TYPE_LABELS[gt.value] || gt.value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-city + Woreda */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>{t("regSubCity") || "Sub-City"} <span className="text-rose-400">*</span></label>
                    <select
                      value={regSubCity}
                      onChange={(e) => { setRegSubCity(e.target.value); setRegWoreda(""); }}
                      className={selectTriggerClass}
                    >
                      <option value="" disabled>{t("regSubCityPh") || "Select"}</option>
                      {Object.keys(SUB_CITY_WOREDAS).map((sc) => (
                        <option key={sc} value={sc} className="bg-slate-800 text-white">{sc}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t("regWoreda") || "Woreda"} <span className="text-rose-400">*</span></label>
                    <select
                      value={regWoreda}
                      onChange={(e) => setRegWoreda(e.target.value)}
                      disabled={!regSubCity}
                      className={`${selectTriggerClass} disabled:opacity-40`}
                    >
                      <option value="" disabled>{t("regWoredaPh") || "Select"}</option>
                      {regSubCity && SUB_CITY_WOREDAS[regSubCity]?.map((w) => (
                        <option key={w} value={w} className="bg-slate-800 text-white">{w}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* License No (optional) */}
                <div>
                  <label className={labelClass}>
                    {t("regLicenseNo") || "License No"} <span className="text-slate-500 text-[10px]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={regLicenseNo}
                    onChange={(e) => setRegLicenseNo(e.target.value)}
                    placeholder={t("regLicenseNoPh") || "GH/2024/0001"}
                    className={inputClass}
                  />
                </div>

                {/* Divider */}
                <div className="my-1 border-t border-slate-700/60" />

                {/* Account credentials */}
                <div>
                  <label className={labelClass}>{t("regUsername") || "Username"} <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    autoComplete="username"
                    autoCapitalize="off"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder={t("regUsernamePh") || "abebe_bekele"}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("regPassword") || "Password"} <span className="text-rose-400">*</span></label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••"
                    className={inputClass}
                  />
                </div>

                {regError && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs text-rose-400">
                    {regError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={regLoading}
                  className="h-12 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 active:bg-emerald-700 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  {regLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {t("regSubmitting") || "Submitting..."}
                    </span>
                  ) : (
                    t("regBtn") || "Register Guesthouse"
                  )}
                </button>

                <p className="text-center text-[10px] text-slate-500 leading-relaxed">
                  {t("regHelperText") || "After registration, an admin will review and activate your account before you can sign in."}
                </p>
              </form>
            )}
          </>
        )}

        <p className="mt-8 text-center text-[11px] text-slate-600">
          {t("loginSubtitle")}
        </p>
      </div>

      <ResetPasswordDialog open={resetOpen} onOpenChange={setResetOpen} variant="dark" />
    </div>
  );
}
