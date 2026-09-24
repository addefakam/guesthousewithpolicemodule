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

export default function GuestPage() {
  const { currentUser, setCurrentPage } = useAppStore();

  useEffect(() => {
    setCurrentPage("guests");
  }, [setCurrentPage]);

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto pl-4 md:pl-6">
          <PageRenderer />
        </main>
      </div>
    </div>
  );
}
