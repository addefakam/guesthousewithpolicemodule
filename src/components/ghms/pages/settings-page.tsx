"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { apiUpdateUser, apiUpdateSettings } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Loader2,
  User,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Phone,
  BadgeCheck,
  UserCog,
  ArrowRight,
  Globe,
  Building2,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { isValidPhone, isValidEmail } from "@/lib/utils";

// ═══════════════════════════════════════════════════════
// Shared helper
// ═══════════════════════════════════════════════════════

function getInitials(n: string | undefined | null) {
  if (!n) return "?";
  return n
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ═══════════════════════════════════════════════════════
// Provider Settings (OPERATOR / STAFF)
// Personal profile + password + link to staff management
// ═══════════════════════════════════════════════════════

function ProviderSettings() {
  const { t } = useTranslation("settings");
  const { currentUser, setCurrentUser, triggerRefresh, setCurrentPage } =
    useAppStore();

  // Profile form
  const [name, setName] = useState(currentUser?.name || "");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [saving, setSaving] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setUsername(currentUser.username);
    }
  }, [currentUser]);

  const handleProfileSave = async () => {
    if (!currentUser) return;
    if (!name.trim()) {
      toast.error(t("validNameRequired"));
      return;
    }
    if (!username.trim()) {
      toast.error(t("validUsernameRequired"));
      return;
    }
    if (username.length < 3) {
      toast.error(t("validUsernameShort"));
      return;
    }

    setSaving(true);
    try {
      await apiUpdateUser(currentUser.id, {
        name: name.trim(),
        username: username.trim(),
      });
      setCurrentUser({
        ...currentUser,
        name: name.trim(),
        username: username.trim(),
      });
      toast.success(t("toastProfileSaved"));
      triggerRefresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("toastProfileFailed");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentUser) return;
    if (!currentPassword) {
      toast.error(t("validCurrentPwRequired"));
      return;
    }
    if (!newPassword) {
      toast.error(t("validNewPwRequired"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("validNewPwShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("validPwMismatch"));
      return;
    }
    if (currentPassword === newPassword) {
      toast.error(t("validPwSame"));
      return;
    }

    setChangingPassword(true);
    try {
      await apiUpdateUser(currentUser.id, {
        password: newPassword,
      });
      toast.success(t("toastPwSaved"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrent(false);
      setShowNew(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("toastPwFailed");
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const roleLabel =
    currentUser?.role === "OPERATOR" ? t("roleOperator") : t("roleStaff");
  const roleBadgeClass =
    currentUser?.role === "OPERATOR"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div className="flex justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("providerSubtitle")}
          </p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("profileInfoTitle")}
            </CardTitle>
            <CardDescription>
              {t("profileInfoDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarFallback
                  className="bg-primary/10 text-lg font-bold text-primary"
                >
                  {getInitials(name || "OP")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">
                  {name || t("fallbackOperator")}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`${roleBadgeClass} text-xs font-semibold`}
                  >
                    <Shield className="mr-1 size-3" />
                    {roleLabel}
                  </Badge>
                  {currentUser?.providerName && (
                    <Badge variant="outline" className="text-xs">
                      {currentUser.providerName}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  @{currentUser?.username}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="op-name">
                  <User className="inline mr-1.5 size-3.5" />
                  {t("labelFullName")}
                </Label>
                <Input
                  id="op-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("placeholderFullName")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="op-username">
                  <BadgeCheck className="inline mr-1.5 size-3.5" />
                  {t("labelUsername")}
                </Label>
                <Input
                  id="op-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("placeholderUsername")}
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button onClick={handleProfileSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {t("btnSaveProfile")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t("passwordTitle")}
            </CardTitle>
            <CardDescription>
              {t("passwordDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="op-current-pw">{t("labelCurrentPw")}</Label>
              <div className="relative">
                <Input
                  id="op-current-pw"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t("placeholderCurrentPw")}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="op-new-pw">{t("labelNewPw")}</Label>
                <div className="relative">
                  <Input
                    id="op-new-pw"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("placeholderNewPw")}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="op-confirm-pw">{t("labelConfirmPw")}</Label>
                <Input
                  id="op-confirm-pw"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("placeholderConfirmPw")}
                />
              </div>
            </div>

            {newPassword &&
              confirmPassword &&
              newPassword !== confirmPassword && (
                <p className="text-xs text-rose-500 font-medium">
                  {t("pwMismatch")}
                </p>
              )}

            {newPassword &&
              newPassword.length > 0 &&
              newPassword.length < 6 && (
                <p className="text-xs text-rose-500 font-medium">
                  {t("pwTooShort")}
                </p>
              )}

            <div className="flex justify-end pt-1">
              <Button
                variant="outline"
                onClick={handlePasswordChange}
                disabled={
                  changingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {changingPassword ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                {t("btnUpdatePw")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Staff Account Management (OPERATOR only) */}
        {currentUser?.role === "OPERATOR" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                {t("staffTitle")}
              </CardTitle>
              <CardDescription>
                {t("staffDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setCurrentPage("users")}
              >
                <UserCog className="mr-2 h-4 w-4" />
                {t("btnGoToAccounts")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SUPERUSER Profile Settings
// ═══════════════════════════════════════════════════════

function SuperuserSettings() {
  const { t } = useTranslation("settings");
  const { currentUser, setCurrentUser, triggerRefresh } = useAppStore();

  const [name, setName] = useState(currentUser?.name || "");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [appName, setAppName] = useState("GHMS");
  const [defaultCurrency, setDefaultCurrency] = useState("ETB");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [savingSystem, setSavingSystem] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setUsername(currentUser.username);
    }
  }, [currentUser]);

  const handleProfileSave = async () => {
    if (!currentUser) return;
    if (!name.trim()) { toast.error(t("validNameRequired")); return; }
    if (!username.trim()) { toast.error(t("validUsernameRequired")); return; }
    if (username.length < 3) { toast.error(t("validUsernameShort")); return; }
    if (phone.trim() && !isValidPhone(phone)) {
      toast.error(t("validPhoneInvalid"));
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      toast.error(t("validEmailInvalid"));
      return;
    }

    setSaving(true);
    try {
      const data: Record<string, unknown> = { name: name.trim(), username: username.trim() };
      if (email.trim()) data.email = email.trim();
      if (phone.trim()) data.phone = phone.trim();
      await apiUpdateUser(currentUser.id, data);
      setCurrentUser({ ...currentUser, name: name.trim(), username: username.trim() });
      toast.success(t("toastProfileSaved"));
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toastProfileFailed");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentUser) return;
    if (!currentPassword) { toast.error(t("validCurrentPwRequired")); return; }
    if (!newPassword) { toast.error(t("validNewPwRequired")); return; }
    if (newPassword.length < 6) { toast.error(t("validNewPwShort")); return; }
    if (newPassword !== confirmPassword) { toast.error(t("validPwMismatch")); return; }
    if (currentPassword === newPassword) { toast.error(t("validPwSame")); return; }

    setChangingPassword(true);
    try {
      await apiUpdateUser(currentUser.id, { password: newPassword });
      toast.success(t("toastPwSaved"));
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setShowCurrent(false); setShowNew(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toastPwFailed");
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSystemSave = async () => {
    setSavingSystem(true);
    try {
      await apiUpdateSettings({ guestHouseName: appName, currency: defaultCurrency, language: defaultLanguage });
      toast.success(t("toastSysSaved"));
      triggerRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("toastSysFailed");
      toast.error(msg);
    } finally {
      setSavingSystem(false);
    }
  };

  return (
    <div className="flex justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("superSubtitle")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("profileInfoTitle")}
            </CardTitle>
            <CardDescription>{t("profileInfoDescSuper")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                  {getInitials(name || "SA")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">{name || t("fallbackSuperadmin")}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs font-semibold">
                    <Shield className="mr-1 size-3" />{t("badgeSuperuser")}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <BadgeCheck className="mr-1 size-3 text-emerald-500" />{t("badgeSysAdmin")}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400">@{currentUser?.username}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="su-name"><User className="inline mr-1.5 size-3.5" />{t("labelFullName")}</Label>
                <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("placeholderFullName")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="su-username"><BadgeCheck className="inline mr-1.5 size-3.5" />{t("labelUsername")}</Label>
                <Input id="su-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("placeholderUsername")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="su-email"><Mail className="inline mr-1.5 size-3.5" />{t("labelEmail")}</Label>
                <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("placeholderEmail")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="su-phone"><Phone className="inline mr-1.5 size-3.5" />{t("labelPhone")}</Label>
                <Input id="su-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("placeholderPhone")} />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={handleProfileSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t("btnSaveProfile")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />{t("passwordTitle")}</CardTitle>
            <CardDescription>{t("passwordDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="su-current-pw">{t("labelCurrentPw")}</Label>
              <div className="relative">
                <Input id="su-current-pw" type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t("placeholderCurrentPw")} className="pr-10" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="su-new-pw">{t("labelNewPw")}</Label>
                <div className="relative">
                  <Input id="su-new-pw" type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("placeholderNewPw")} className="pr-10" />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="su-confirm-pw">{t("labelConfirmPw")}</Label>
                <Input id="su-confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("placeholderConfirmPw")} />
              </div>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-rose-500 font-medium">{t("pwMismatch")}</p>
            )}
            {newPassword && newPassword.length > 0 && newPassword.length < 6 && (
              <p className="text-xs text-rose-500 font-medium">{t("pwTooShort")}</p>
            )}
            <div className="flex justify-end pt-1">
              <Button variant="outline" onClick={handlePasswordChange} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}>
                {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                {t("btnUpdatePw")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />{t("sysTitle")}</CardTitle>
            <CardDescription>{t("sysDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="su-appname"><Building2 className="inline mr-1.5 size-3.5" />{t("labelAppName")}</Label>
              <Input id="su-appname" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder={t("placeholderAppName")} />
              <p className="text-xs text-slate-400">{t("appNameHint")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="su-currency"><Clock className="inline mr-1.5 size-3.5" />{t("labelCurrency")}</Label>
                <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETB">{t("currencyETB")}</SelectItem>
                    <SelectItem value="USD">{t("currencyUSD")}</SelectItem>
                    <SelectItem value="EUR">{t("currencyEUR")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="su-language"><Globe className="inline mr-1.5 size-3.5" />{t("labelLanguage")}</Label>
                <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t("langEnglish")}</SelectItem>
                    <SelectItem value="am">{t("langAmharic")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={handleSystemSave} disabled={savingSystem}>
                {savingSystem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t("btnSaveSystem")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Settings Page — Role Router
// ═══════════════════════════════════════════════════════

export default function SettingsPage() {
  const currentUser = useAppStore((s) => s.currentUser);

  if (currentUser?.role === "SUPERUSER") {
    return <SuperuserSettings />;
  }

  return <ProviderSettings />;
}
