"use client";

import "@/i18n/config";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useTranslation, I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";
import MobileApp from "@/components/mobile/mobile-app";
import { MobileLoginPage } from "@/components/mobile/mobile-login";

export default function MobilePage() {
  return (
    <I18nextProvider i18n={i18n}>
      <MobilePageContent />
    </I18nextProvider>
  );
}

function MobilePageContent() {
  const { currentUser } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Set Amharic as default for mobile
  useEffect(() => {
    if (mounted && i18n.language !== "am") {
      i18n.changeLanguage("am");
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (!currentUser) {
    return <MobileLoginPage />;
  }

  // Only OPERATOR and STAFF can use mobile app
  if (currentUser.role !== "OPERATOR" && currentUser.role !== "STAFF") {
    return <MobileLoginRoleError />;
  }

  return <MobileApp />;
}

function MobileLoginRoleError() {
  const { t, i18n } = useTranslation("mobile");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-900 px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10">
        <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-white">GHMS</h1>
      <p className="mb-6 text-sm text-slate-400">{t("loginErrorRole")}</p>
      <button
        onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }}
        className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 active:bg-slate-100 transition-colors"
      >Go to Full System</button>
    </div>
  );
}