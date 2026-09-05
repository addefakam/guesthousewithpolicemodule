"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MonitorDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CAPTURE_KEY = "__ghmsInstallPrompt" as const;

interface PwaInstallPromptProps {
  /** i18n key (common namespace) for the card title */
  titleKey?: string;
  /** i18n key (common namespace) for the card description */
  descKey?: string;
  /** localStorage key persisting the dismissal (per app) */
  dismissStorageKey?: string;
}

/**
 * Desktop install promotion (PWA).
 * - Registers the minimal service worker (/sw.js).
 * - Listens for `beforeinstallprompt` (Chromium browsers) and shows a
 *   dismissible card at the bottom-right with an Install button.
 * - Hidden on mobile viewports, in standalone mode, once installed,
 *   or after the user dismisses it (persisted in localStorage).
 * - Mounted by BOTH the main system and the standalone police app
 *   (the police app passes its own title/desc keys + storage key, so
 *   each app keeps its own dismissal).
 */
export default function PwaInstallPrompt({
  titleKey = "install.title",
  descKey = "install.desc",
  dismissStorageKey = "ghms_install_dismissed",
}: PwaInstallPromptProps) {
  const { t } = useTranslation("common");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const maybeShow = useCallback((evt: BeforeInstallPromptEvent | null) => {
    if (!evt || typeof evt.prompt !== "function") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return;
    try {
      if (localStorage.getItem(dismissStorageKey) === "1") return;
    } catch {
      /* private mode — ignore */
    }
    setDeferred(evt);
    setVisible(true);
  }, [dismissStorageKey]);

  useEffect(() => {
    // Register the passthrough service worker (PWA installability).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as unknown as Record<string, unknown>)[CAPTURE_KEY] = e;
      maybeShow(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      try {
        localStorage.setItem(dismissStorageKey, "1");
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // The event may have fired before this component mounted (login page) —
    // pick up the captured event (async so we never setState synchronously
    // inside the effect body).
    const captured = (window as unknown as Record<string, unknown>)[CAPTURE_KEY];
    if (captured) {
      queueMicrotask(() => maybeShow(captured as BeforeInstallPromptEvent));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [maybeShow, dismissStorageKey]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setDeferred(null);
    try {
      localStorage.setItem(dismissStorageKey, "1");
    } catch {
      /* ignore */
    }
  }, [dismissStorageKey]);

  const onInstall = useCallback(async () => {
    try {
      await deferred?.prompt();
    } catch {
      /* user closed the native dialog */
    }
    dismiss();
  }, [deferred, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t(titleKey)}
      className="fixed bottom-4 right-4 z-50 hidden w-[340px] md:block"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <MonitorDown className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{t(titleKey)}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{t(descKey)}</p>
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
          <Button
            onClick={onInstall}
            className="h-9 flex-1 rounded-xl border-0 bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-medium text-white shadow-sm hover:from-indigo-500 hover:to-violet-500"
          >
            <MonitorDown className="mr-2 h-4 w-4" />
            {t("install.action")}
          </Button>
          <Button
            variant="outline"
            onClick={dismiss}
            className="h-9 rounded-xl border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50"
          >
            {t("install.later")}
          </Button>
        </div>
      </div>
    </div>
  );
}
