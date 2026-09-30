/**
 * Support contact helper — keeps the system admin's phone number in
 * localStorage so it survives page refreshes, and wraps sonner's
 * `toast.error` to automatically append a "For help, call: <number>"
 * second line whenever an error toast is shown.
 *
 * Lifecycle:
 * 1. Super-admin sets `general.supportPhone` in System Config → saved to
 *    Settings.configJson on the server.
 * 2. On login, /api/auth response includes `supportPhone` → login screen
 *    calls `setSupportPhone(phone)` to persist it to localStorage.
 * 3. Before login, the 3 login screens fetch `/api/config/public` (no
 *    auth required) so the toast wrapper has the phone available even
 *    on the login page itself.
 * 4. `initToastErrorWrapper()` is called once at app root — it wraps
 *    `toast.error` so EVERY call site in the app gets the support line
 *    for free, without needing to touch each `toast.error(...)` call.
 */

import { toast } from "sonner";

const STORAGE_KEY = "ghms_support_phone";
let cachedPhone: string | null = null;
let wrapperInstalled = false;

/**
 * Read the support phone from localStorage (with an in-memory cache
 * so we don't hit localStorage on every toast.error call).
 */
export function getSupportPhone(): string | null {
  if (cachedPhone !== null) return cachedPhone || null;
  if (typeof window === "undefined") return null; // SSR safety
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    cachedPhone = v && v.trim() ? v.trim() : "";
    return cachedPhone || null;
  } catch {
    return null;
  }
}

/**
 * Persist the support phone to localStorage. Called from:
 *   - login screens after fetching /api/config/public or after /api/auth
 *   - the System Config page after a successful save
 */
export function setSupportPhone(phone: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const trimmed = (phone || "").trim();
  cachedPhone = trimmed || "";
  try {
    if (trimmed) {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* no-op — localStorage may be blocked (private mode) */
  }
}

/**
 * Returns the original message with a support-line suffix appended on a
 * new line, when a support phone is configured. Returns the original
 * message unchanged otherwise.
 *
 * Plain string version — used when we want a string back (e.g. for
 * React state / inline error messages).
 */
export function withSupportLine(message: string): string {
  const phone = getSupportPhone();
  if (!phone) return message;
  // Use a newline so sonner renders it on a second visual line.
  return `${message}\n📞 For help, call: ${phone}`;
}

/**
 * One-time setup — wraps sonner's `toast.error` so every existing
 * `toast.error(msg)` call site in the codebase automatically gets the
 * support phone appended as a second line, without needing to modify
 * each call site.
 *
 * Safe to call multiple times — the wrapper is only installed once.
 * Idempotent because we check the `wrapperInstalled` flag.
 */
export function initToastErrorWrapper(): void {
  if (wrapperInstalled) return;
  if (typeof window === "undefined") return; // SSR safety

  // Sonner exposes `toast.error` as a property on the toast function.
  // We re-assign it to wrap the call.
  const original = toast.error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (toast as any).error = (
    msg: unknown,
    opts?: Parameters<typeof original>[1],
  ) => {
    let finalMsg: unknown = msg;
    const phone = getSupportPhone();
    if (phone) {
      // Only modify string messages — leave JSX/ReactNode alone so we
      // don't accidentally wrap a component in a string concatenation.
      if (typeof msg === "string") {
        finalMsg = withSupportLine(msg);
      }
      // For non-string messages (JSX, Error objects, etc.) we pass them
      // through unchanged — sonner will render them, and the support
      // line can be added explicitly via a description option if needed.
    }
    return original(finalMsg as Parameters<typeof original>[0], opts);
  };

  wrapperInstalled = true;
}
