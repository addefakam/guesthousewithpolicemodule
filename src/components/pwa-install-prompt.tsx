"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MonitorDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CAPTURE_KEY = "__ghmsInstallPrompt" as const;
/** "Not now" suppresses the ask for 7 days (instead of forever). */
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** If the native dialog is still unavailable shortly after open, show manual steps. */
const MANUAL_HINT_DELAY_MS = 8000;

type InstallPlatform = "ios" | "chromium" | "other";

function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent || "";
  const iOSish =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iOSish) return "ios";
  if (/Chrom(e|ium)|Edg(e|A|iOS)|OPR\//.test(ua)) return "chromium";
  return "other";
}

function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

/**
 * A dismissal persists a timestamp. Old boolean flags ("1") are treated as
 * expired so users who dismissed a previous build get asked again.
 */
function isDismissed(storageKey: string): boolean {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || ts <= 0) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function persistDismissal(storageKey: string): void {
  try {
    localStorage.setItem(storageKey, String(Date.now()));
  } catch {
    /* private mode — ignore */
  }
}

interface PwaInstallPromptProps {
  /** i18n key (common namespace) for the card title */
  titleKey?: string;
  /** i18n key (common namespace) for the card description */
  descKey?: string;
  /** localStorage key persisting the dismissal (per app) */
  dismissStorageKey?: string;
  /** Also ask on phones (bottom sheet) — used by the mobile-first police app */
  showOnMobile?: boolean;
}

/**
 * Install promotion (PWA) for BOTH the main system and the police app.
 * - Registers the minimal service worker (/sw.js).
 * - Asks proactively as soon as the app opens in a browser tab — it no
 *   longer waits for `beforeinstallprompt`, which Chromium may delay for
 *   engagement reasons and Firefox/Safari never fire at all.
 * - "Install app" triggers the native dialog when the event is available;
 *   otherwise it remembers the intent (the dialog auto-opens as soon as
 *   the browser allows it) and falls back to manual steps (browser menu /
 *   iOS Add to Home Screen), which also appear automatically after seconds.
 * - Hidden in standalone mode, while installed, or for 7 days after the
 *   user dismisses it (persisted per app via localStorage).
 * - The police app passes its own title/desc keys + storage key and
 *   enables the mobile bottom sheet, so each app keeps its own dismissal.
 */
export default function PwaInstallPrompt({
  titleKey = "install.title",
  descKey = "install.desc",
  dismissStorageKey = "ghms_install_dismissed",
  showOnMobile = false,
}: PwaInstallPromptProps) {
  const { t } = useTranslation("common");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const [manualHint, setManualHint] = useState(false);
  // True when the user clicked "Install app" before the browser allowed the
  // native dialog — the dialog then auto-opens as soon as the event arrives.
  const installIntentRef = useRef(false);

  const captureEvent = useCallback(
    (evt: BeforeInstallPromptEvent) => {
      if (typeof evt.prompt !== "function") return;
      if (isStandalone()) return;
      if (isDismissed(dismissStorageKey)) return;
      setDeferred(evt);
      setManualHint(false);
      setVisible(true);
    },
    [dismissStorageKey]
  );

  const dismiss = useCallback(() => {
    setVisible(false);
    setDeferred(null);
    persistDismissal(dismissStorageKey);
  }, [dismissStorageKey]);

  useEffect(() => {
    // Register the passthrough service worker (PWA installability).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      (window as unknown as Record<string, unknown>)[CAPTURE_KEY] = evt;
      if (installIntentRef.current) {
        // The user asked to install before the browser allowed the native
        // dialog — open it right away (needs fresh user activation; if the
        // activation already expired, fall back to the shown manual steps).
        installIntentRef.current = false;
        setDeferred(evt);
        setManualHint(false);
        setVisible(true);
        evt.prompt()
          .then(() => dismiss())
          .catch(() => {
            installIntentRef.current = true;
          });
        return;
      }
      captureEvent(evt);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      persistDismissal(dismissStorageKey);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Proactive ask: show the card as soon as the app opens in a browser
    // tab, even before `beforeinstallprompt` arrives (async so we never
    // setState synchronously inside the effect body).
    queueMicrotask(() => {
      if (isStandalone()) return;
      if (isDismissed(dismissStorageKey)) return;

      const captured = (window as unknown as Record<string, unknown>)[
        CAPTURE_KEY
      ] as BeforeInstallPromptEvent | undefined;
      if (captured && typeof captured.prompt === "function") {
        setDeferred(captured);
        setVisible(true);
        return;
      }

      const platform = detectPlatform();
      if (platform === "ios") {
        // Safari has no native install dialog — show manual steps instead.
        setIosMode(true);
        setVisible(true);
      } else if (platform === "chromium") {
        setVisible(true);
      }
      // Other browsers stay quiet until the event actually fires.
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [captureEvent, dismissStorageKey, dismiss]);

  // Native dialog not captured yet? Point at the browser menu after a beat.
  useEffect(() => {
    if (!visible || deferred) return;
    const timer = setTimeout(() => setManualHint(true), MANUAL_HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible, deferred]);

  const onInstall = useCallback(async () => {
    if (!deferred) {
      // Native prompt not captured yet (engagement heuristics / other
      // browser) — remember the intent so the dialog auto-opens the moment
      // the browser allows it, and show the manual steps meanwhile.
      installIntentRef.current = true;
      setManualHint(true);
      return;
    }
    try {
      await deferred.prompt();
    } catch {
      /* user closed the native dialog */
    }
    dismiss();
  }, [deferred, dismiss]);

  if (!visible) return null;

  const showHint = manualHint && !deferred;

  return (
    <div
      role="dialog"
      aria-label={t(titleKey)}
      className={
        showOnMobile
          ? "fixed inset-x-3 bottom-3 z-50 md:inset-x-auto md:bottom-4 md:right-4 md:w-[340px]"
          : "fixed bottom-4 right-4 z-50 hidden w-[340px] md:block"
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <MonitorDown className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{t(titleKey)}</p>
            <p
              className={`mt-1 text-xs leading-relaxed ${
                showHint ? "font-medium text-slate-700" : "text-slate-500"
              }`}
            >
              {showHint ? t("install.menuHint") : t(descKey)}
            </p>
            {iosMode ? (
              <p className="mt-2 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs leading-relaxed text-indigo-700">
                {t("install.iosSteps")}
              </p>
            ) : null}
          </div>
          <button
            onClick={dismiss}
            aria-label={t("install.later")}
            className="-m-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {iosMode ? null : (
            <Button
              onClick={onInstall}
              className="h-9 flex-1 rounded-xl border-0 bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-medium text-white shadow-sm hover:from-indigo-500 hover:to-violet-500"
            >
              <MonitorDown className="mr-2 h-4 w-4" />
              {t("install.action")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={dismiss}
            className={`h-9 rounded-xl border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50 ${
              iosMode ? "flex-1" : ""
            }`}
          >
            {t("install.later")}
          </Button>
        </div>
      </div>
    </div>
  );
}
