"use client";

import { useState, useRef, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Building2, KeyRound, UserPlus, LogIn, Upload } from "lucide-react";

import { useAppStore } from "@/lib/store";
import { apiAuth, apiRegisterProvider } from "@/lib/api";
import { isValidPhone, isValidEmail } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LoginPage() {
  const { t } = useTranslation("login");
  const { setCurrentUser, setCurrentPage } = useAppStore();

  const [activeTab, setActiveTab] = useState("login");

  // ── Login state ──
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Register state ──
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regGuestHouseName, setRegGuestHouseName] = useState("");
  const [regSubCity, setRegSubCity] = useState("");
  const [regWoreda, setRegWoreda] = useState("");

  const SUB_CITY_WOREDAS: Record<string, string[]> = {
    "Cheleleka": ["Erer", "Arsadee", "Kilolee"],
    "Dhibaayyuu": ["Dhaka Booraa", "Dirree", "Horaa", "Biiftuu"],
    "Dukam": ["Odaa Nabee", "Xaddachaa", "Malkaa", "Abbuu Seeraa"],
  };
  const [regType, setRegType] = useState("");
  const [regLicenseNo, setRegLicenseNo] = useState("");
  const [regLicenseFile, setRegLicenseFile] = useState<File | null>(null);
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Login handler ──
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      toast.error(t("errorEmptyCredentials"));
      return;
    }
    setLoginLoading(true);
    try {
      const resp = await apiAuth({
        username: loginUsername.trim(),
        password: loginPassword,
      });
      const userData = resp.user;
      setCurrentUser({ ...userData, providerName: resp.providerName });
      // Route based on role
      const page = userData.role === "POLICE" ? "police-dashboard" : userData.role === "SUPERUSER" ? "super-admin-dashboard" : "dashboard";
      setCurrentPage(page);
      toast.success(t("welcomeBack", { name: userData.name }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("loginFailed");
      toast.error(message);
    } finally {
      setLoginLoading(false);
    }
  }

  // ── Register handler ──
  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (
      !regName.trim() ||
      !regPhone.trim() ||
      !regEmail.trim() ||
      !regGuestHouseName.trim() ||
      !regType ||
      !regLicenseNo.trim() ||
      !regUsername.trim() ||
      !regPassword.trim() ||
      !regSubCity ||
      !regWoreda
    ) {
      toast.error(t("errorEmptyFields"));
      return;
    }
    if (!isValidPhone(regPhone)) {
      toast.error(t("errorInvalidPhone"));
      return;
    }
    if (!isValidEmail(regEmail)) {
      toast.error(t("errorInvalidEmail"));
      return;
    }
    setRegLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", regGuestHouseName.trim());   // backend 'name' = guest house name
      formData.append("ownerName", regName.trim());         // backend 'ownerName' = owner full name
      formData.append("phone", regPhone.trim());
      formData.append("email", regEmail.trim());
      const address = ["Bishoftu", regSubCity, regWoreda].filter(Boolean).join(", ");
      if (address) formData.append("address", address);
      if (regSubCity) formData.append("subCity", regSubCity);
      if (regWoreda) formData.append("woreda", regWoreda);
      formData.append("type", regType);
      formData.append("licenseNo", regLicenseNo.trim());
      formData.append("username", regUsername.trim());
      formData.append("password", regPassword);
      if (regLicenseFile) {
        formData.append("licenseFile", regLicenseFile);
      }

      await apiRegisterProvider(formData);
      toast.success(t("registrationSuccess"));
      // Reset form
      setRegName("");
      setRegPhone("");
      setRegEmail("");
      setRegGuestHouseName("");
      setRegSubCity("");
      setRegWoreda("");
      setRegType("");
      setRegLicenseNo("");
      setRegUsername("");
      setRegPassword("");
      setRegLicenseFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveTab("login");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t("registrationFailed");
      toast.error(message);
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      {/* Subtle decorative blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/5 blur-3xl" />

      <Card className="relative z-10 w-full max-w-lg border-0 shadow-2xl">
        <CardHeader className="space-y-2 pb-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
            <Building2 className="size-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            {t("title")}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {t("subtitle")}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="login" className="gap-1.5">
                <LogIn className="size-3.5" />
                {t("tabLogin")}
              </TabsTrigger>
              <TabsTrigger value="register" className="gap-1.5">
                <UserPlus className="size-3.5" />
                {t("tabRegister")}
              </TabsTrigger>
            </TabsList>

            {/* ─── Login Tab ─── */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="login-username">{t("username")}</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="login-username"
                      placeholder={t("usernamePlaceholder")}
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="pl-9"
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="login-password">{t("password")}</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder={t("passwordPlaceholder")}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-9"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="mt-1 w-full bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t("signingIn")}
                    </span>
                  ) : (
                    t("signIn")
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* ─── Register Tab ─── */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="grid gap-4">
                {/* Contact Information */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("contactInfo")}
                  </p>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="reg-name">{t("fullName")}</Label>
                      <Input
                        id="reg-name"
                        placeholder={t("fullNamePlaceholder")}
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="reg-phone">{t("phone")}</Label>
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder={t("phonePlaceholder")}
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="reg-email">{t("email")}</Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder={t("emailPlaceholder")}
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guest House Details */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("guestHouseDetails")}
                  </p>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="reg-gh-name">{t("guestHouseName")}</Label>
                      <Input
                        id="reg-gh-name"
                        placeholder={t("guestHouseNamePlaceholder")}
                        value={regGuestHouseName}
                        onChange={(e) => setRegGuestHouseName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="reg-type">{t("type")}</Label>
                        <Select value={regType} onValueChange={setRegType}>
                          <SelectTrigger id="reg-type" className="w-full">
                            <SelectValue placeholder={t("selectType")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GUEST_HOUSE">
                              {t("typeGuestHouse")}
                            </SelectItem>
                            <SelectItem value="HOTEL">{t("typeHotel")}</SelectItem>
                            <SelectItem value="LODGE">{t("typeLodge")}</SelectItem>
                            <SelectItem value="HOMESTAY">{t("typeHomestay")}</SelectItem>
                            <SelectItem value="RESORT">{t("typeResort")}</SelectItem>
                            <SelectItem value="DHARAMSHALA">
                              {t("typeDharamshala")}
                            </SelectItem>
                            <SelectItem value="OTHER">{t("typeOther")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="reg-license">{t("licenseNo")}</Label>
                        <Input
                          id="reg-license"
                          placeholder={t("licensePlaceholder")}
                          value={regLicenseNo}
                          onChange={(e) => setRegLicenseNo(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reg-license-file">
                        {t("uploadLicense")}
                      </Label>
                      <div
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 transition-colors hover:border-emerald-400 hover:bg-emerald-50/50"
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            fileInputRef.current?.click();
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                          <Upload className="size-4 text-slate-500" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium text-slate-700">
                            {regLicenseFile
                              ? regLicenseFile.name
                              : t("clickToUpload")}
                          </p>
                          <p className="text-xs text-slate-400">
                            {regLicenseFile
                              ? `${(regLicenseFile.size / 1024).toFixed(1)} KB`
                              : t("uploadHint")}
                          </p>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          if (file && file.size > 5 * 1024 * 1024) {
                            toast.error(t("errorFileTooLarge"));
                            return;
                          }
                          setRegLicenseFile(file);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Location — Bishoftu */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("location")}
                  </p>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label>{t("city")}</Label>
                      <Input value="Bishoftu" disabled className="bg-slate-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="reg-subcity">{t("subCity")}</Label>
                        <Select value={regSubCity} onValueChange={(v) => { setRegSubCity(v); setRegWoreda(""); }}>
                          <SelectTrigger id="reg-subcity" className="w-full">
                            <SelectValue placeholder={t("selectSubCity")} />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(SUB_CITY_WOREDAS).map((sc) => (
                              <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="reg-woreda">{t("woreda")}</Label>
                        <Select value={regWoreda} onValueChange={setRegWoreda} disabled={!regSubCity}>
                          <SelectTrigger id="reg-woreda" className="w-full">
                            <SelectValue placeholder={regSubCity ? t("selectWoreda") : t("selectSubCityFirst")} />
                          </SelectTrigger>
                          <SelectContent>
                            {regSubCity && SUB_CITY_WOREDAS[regSubCity]?.map((w) => (
                              <SelectItem key={w} value={w}>{w}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Login Credentials */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("desiredCredentials")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="reg-username">{t("username")} *</Label>
                      <Input
                        id="reg-username"
                        placeholder={t("desiredUsername")}
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reg-password">{t("password")} *</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder={t("passwordPlaceholder")}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="mt-1 w-full bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700"
                  disabled={regLoading}
                >
                  {regLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t("submitting")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus className="size-4" />
                      {t("registerGuestHouse")}
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-slate-400">
                  {t("reviewNotice")}
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}