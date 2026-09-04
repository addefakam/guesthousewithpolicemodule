"use client";

import "@/i18n/config";

import { useEffect, useSyncExternalStore } from "react";
import { useAppStore } from "@/lib/store";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";
import PoliceApp from "@/components/police-app/police-app";
import { PoliceLogin, PoliceRoleError } from "@/components/police-app/police-login";

const emptySubscribe = () => () => {};

export default function PoliceAppPage() {
  return (
    <I18nextProvider i18n={i18n}>
      <PoliceAppGate />
    </I18nextProvider>
  );
}

function PoliceAppGate() {
  const { currentUser } = useAppStore();

  // false during SSR + first hydration render, true afterwards —
  // avoids hydration mismatch when reading persisted zustand state,
  // without setState-in-effect (lint rule react-hooks/set-state-in-effect).
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // The police app defaults to English (unlike the operator mobile app which defaults to Amharic)
  useEffect(() => {
    if (mounted && i18n.language !== "en") {
      i18n.changeLanguage("en");
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#081426]">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-amber-400" fill="currentColor" aria-hidden="true">
            <path d="M12 1.8 21 5v6.2c0 5.2-3.6 9.4-9 11-5.4-1.6-9-5.8-9-11V5l9-3.2Z" opacity=".35" />
            <path d="m12 5.5 5.2 1.9v3.8c0 3.2-2.2 5.8-5.2 6.8-3-1-5.2-3.6-5.2-6.8V7.4L12 5.5Z" />
          </svg>
        </div>
        <div className="h-1 w-28 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <PoliceLogin />;
  }

  // This standalone app is strictly for police accounts
  if (currentUser.role !== "POLICE") {
    return <PoliceRoleError />;
  }

  return <PoliceApp user={currentUser} />;
}
