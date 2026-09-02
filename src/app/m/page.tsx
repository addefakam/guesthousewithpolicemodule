"use client";

import "@/i18n/config";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { useTranslation, I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";
import MobileApp from "@/components/mobile/mobile-app";

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
      <div className="flex min-h-dvh items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (!currentUser) {
    // Redirect to main login
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-900">
        <p className="text-white text-sm">Redirecting to login...</p>
      </div>
    );
  }

  // Only OPERATOR and STAFF can use mobile app
  if (currentUser.role !== "OPERATOR" && currentUser.role !== "STAFF") {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-900">
        <p className="text-white text-sm">Redirecting...</p>
      </div>
    );
  }

  return <MobileApp />;
}
