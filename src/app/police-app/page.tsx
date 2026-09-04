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
    // Light splash — soft canvas, gradient tile, loading shimmer
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#F6F7FB]">
        <div
          aria-hidden="true"
          className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25"
        />
        <div className="h-1 w-28 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-violet-400" />
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
