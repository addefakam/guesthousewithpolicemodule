"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Check, Mail, ExternalLink, Phone, MessageCircle } from "lucide-react";
import { apiRequestReset } from "@/lib/api";
import { useTranslation } from "react-i18next";

// Hardcoded per spec — the system admin's contact number that every
// reset request must display to the user. Pulled from i18n so the
// label/help text is translated, but the number itself is identical
// in every locale.
const ADMIN_PHONE = "+251913169652";

/**
 * ResetPasswordDialog — modal that lets a user request a password reset
 * by entering their email. Submits to /api/auth/reset-request.
 *
 * Since the platform has no SMTP integration yet, the API returns the
 * generated reset URL in the response. We display it in the dialog so
 * the user (or admin helping them) can copy it and open it.
 *
 * Usage:
 *   <ResetPasswordDialog open={open} onOpenChange={setOpen} />
 *
 * Optional props:
 *   - variant: "dark" (for the slate-900 operator mobile login) or
 *     "light" (for the cream/white police + admin logins). Default: "light".
 */
export function ResetPasswordDialog({
  open,
  onOpenChange,
  variant = "light",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "light" | "dark";
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | null
    | {
        sent: boolean;
        resetUrl?: string;
        userName?: string;
        username?: string;
        message?: string;
      }
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // i18n hook — the dialog is used by all three login screens (web, mobile,
  // police) which run under different i18n namespaces, so we use the
  // default namespace which falls back to the common translation files.
  const { t } = useTranslation();

  // The admin-contact message is shown both in the form state (before submit)
  // and in the result state (after submit). Defined here so both states can
  // share the same JSX block.
  const adminContactBlock = (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs">
      <div className="flex items-center gap-2 text-indigo-700 font-semibold">
        <Phone className="h-3.5 w-3.5" />
        <span>{t("common:resetPassword.adminContactLabel", "Call the system admin")}</span>
      </div>
      <p className="mt-1.5 text-indigo-600 leading-relaxed">
        {t(
          "common:resetPassword.adminContactHelp",
          "Tell the admin you requested a password reset. They will give you a reset link to set a new password.",
        )}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <a
          href={`tel:${ADMIN_PHONE}`}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <Phone className="h-3.5 w-3.5" />
          Call {ADMIN_PHONE}
        </a>
        <a
          href={`https://wa.me/${ADMIN_PHONE.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
            `Hello admin, I requested a password reset for my GHMS account. My email is: ${email || "(my email)"}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp {ADMIN_PHONE}
        </a>
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequestReset(email.trim());
      setResult({
        sent: !!res?.sent,
        resetUrl: res?.resetUrl,
        userName: res?.user?.name,
        username: res?.user?.username,
        message: res?.message,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to request reset");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.resetUrl) return;
    try {
      await navigator.clipboard.writeText(result.resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail on insecure origins — fall back to selecting
      // the input so the user can manually Ctrl+C.
    }
  };

  const handleClose = () => {
    setEmail("");
    setResult(null);
    setError(null);
    setCopied(false);
    onOpenChange(false);
  };

  // Input styling depends on variant
  const inputCls =
    variant === "dark"
      ? "h-11 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
      : "h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-sm mx-4 w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Enter your account email. After submitting, call the system admin
            to receive your reset link.
          </DialogDescription>
        </DialogHeader>

        {/* Admin contact — shown in BOTH the form and result state so the
            user sees the call-to-action message at every step of the reset
            flow, as required by the spec. */}
        {adminContactBlock}

        {result ? (
          // Success state — show the generated reset link
          <div className="space-y-3">
            {result.sent && result.resetUrl ? (
              <>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                  <p className="font-semibold mb-1">Reset link generated</p>
                  {result.userName && (
                    <p className="text-emerald-600">
                      Account: <strong>{result.userName}</strong>
                      {result.username && <span> (@{result.username})</span>}
                    </p>
                  )}
                  <p className="mt-1 text-emerald-600">
                    Copy this link and open it in your browser to set a new password.
                    The link expires in 1 hour.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={result.resetUrl}
                    className="text-xs font-mono h-10"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <a
                  href={result.resetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Reset Page
                </a>
              </>
            ) : (
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                {result.message ||
                  "If an account with that email exists, a reset link has been generated."}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Form state
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-500">
                Email Address
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className={`mt-1.5 ${inputCls}`}
              />
            </div>
            {error && (
              <p className="text-xs text-rose-600">{error}</p>
            )}
            <DialogFooter className="flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !email.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Generating…
                  </>
                ) : (
                  "Generate Link"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
