"use client";

// Force server-rendering on every request so the HTML shell always
// references the latest JS chunk URLs. Without this, Vercel serves a
// statically-prerendered HTML that points at OLD chunk URLs, and the
// browser happily serves both the old HTML and the old chunks from its
// HTTP cache — making deployed changes invisible until the cache
// expires or the user manually clears site data.
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import LoginPage from "@/components/ghms/login-page";
import Sidebar from "@/components/ghms/sidebar";
import PageRenderer from "@/components/ghms/page-renderer";
import { Bell } from "lucide-react";
import { useState, useCallback } from "react";
import { apiGetNotifications } from "@/lib/api";

/**
 * Bridge page for Chapa payment redirect.
 *
 * Chapa redirects to /my-subscription?chapa=success&sub=XXX after payment.
 * Since the app is a client-side SPA (all pages rendered via Zustand store),
 * this page reads the query params directly from window.location.search
 * (no useSearchParams needed — avoids Suspense/hydration issues),
 * stores the chapa result in sessionStorage, and renders the FULL app
 * with currentPage set to "my-subscription" — no redirect needed.
 */
export default function MySubscriptionBridgePage() {
  const { currentUser, currentPage, setCurrentPage } = useAppStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [chapaHandled, setChapaHandled] = useState(false);

  // Handle Chapa redirect params ONCE on mount
  useEffect(() => {
    if (chapaHandled) return;
    const params = new URLSearchParams(window.location.search);
    const chapa = params.get("chapa");
    const sub = params.get("sub");

    if (chapa === "success") {
      // Store for MySubscriptionPage component to pick up
      sessionStorage.setItem("chapa_result", "success");
      sessionStorage.setItem("chapa_sub", sub || "");
      sessionStorage.setItem("chapa_timestamp", String(Date.now()));
      // Navigate to my-subscription page within the SPA
      setCurrentPage("my-subscription");
      // Clean the URL without reload
      window.history.replaceState({}, "/my-subscription", "/my-subscription");
      setChapaHandled(true);
    }
  }, [chapaHandled, setCurrentPage]);

  // Fetch notifications (same as main page.tsx)
  const fetchNotifData = useCallback(async () => {
    try {
      const res = await apiGetNotifications();
      const raw = res as Record<string, unknown> | unknown[];
      const list = Array.isArray(raw) ? raw : raw?.notifications;
      const arr: Record<string, unknown>[] = Array.isArray(list) ? list : [];
      setUnreadCount(arr.filter((n) => !n.isRead).length);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchNotifData();
    const interval = setInterval(fetchNotifData, 15000);
    return () => clearInterval(interval);
  }, [currentUser, fetchNotifData]);

  // Show login if not authenticated
  if (!currentUser || currentPage === "login") {
    return <LoginPage />;
  }

  // Render the full app layout (same as page.tsx)
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-end px-4 md:px-6 h-12 shrink-0 bg-white border-b border-slate-100">
          <button
            onClick={() => setCurrentPage("notifications")}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto pl-4 md:pl-6">
          <PageRenderer />
        </main>
      </div>
    </div>
  );
}
