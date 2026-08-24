"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, LogOut, Copy, Check } from "lucide-react";

const STORAGE_KEY = "ghms_session";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  // If the error is a session/data corruption issue, clear localStorage
  const isSessionError =
    error.message.includes("undefined") ||
    error.message.includes("null") ||
    error.message.includes("Cannot read") ||
    error.message.includes("split");

  const isObjectError =
    error.message.includes("Objects are not valid") ||
    error.message.includes("#310") ||
    error.message.includes("#418") ||
    error.message.includes("#425");

  useEffect(() => {
    if (isSessionError) {
      console.error("[ErrorBoundary] Session-related error detected, clearing corrupted session:", error.message);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    // Log full error details for debugging
    console.error("[ErrorBoundary] Full error:", error);
  }, [isSessionError, error]);

  function handleReset() {
    if (isSessionError) {
      window.location.href = "/";
    } else {
      reset();
    }
  }

  function handleCopy() {
    const details = [
      `Error: ${error.message}`,
      `Digest: ${error.digest || "N/A"}`,
      `Stack: ${error.stack || "N/A"}`,
      `URL: ${typeof window !== "undefined" ? window.location.href : "N/A"}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n---\n");
    navigator.clipboard.writeText(details).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div suppressHydrationWarning className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
          <AlertTriangle className="h-7 w-7 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-500">
          {isSessionError
            ? "Your session data was corrupted and has been cleared. Please sign in again."
            : isObjectError
              ? "A rendering error occurred. Try clearing your cache and reloading, or contact support."
              : error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <RotateCcw className="h-4 w-4" />
            {isSessionError ? "Sign In Again" : "Try Again"}
          </button>
          {isSessionError && (
            <button
              onClick={() => {
                try { localStorage.removeItem(STORAGE_KEY); } catch {}
                window.location.href = "/";
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Clear & Reload
            </button>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="mt-3 mx-auto inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy error details"}
        </button>
      </div>
    </div>
  );
}