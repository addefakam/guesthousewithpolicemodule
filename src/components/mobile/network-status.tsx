"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { WifiOff, Wifi } from "lucide-react";

/**
 * Network status hook + banner component for the guest mobile app.
 *
 * 3 features:
 * 1. Online/offline detection — listens to window online/offline events
 * 2. Auto-retry on reconnect — calls onReconnect when the network comes back
 * 3. Request timeout — exported as fetchWithTimeout() helper
 *
 * Usage in the page:
 *   <NetworkStatusBanner onReconnect={fetchData} />
 *
 * The banner shows a red "You are offline" bar at the top when the
 * network is down, and auto-disappears when connectivity returns (after
 * triggering the onReconnect callback).
 */

/**
 * Fetch with a timeout. If the request takes longer than `timeoutMs`,
 * it throws an Error("Request timed out"). Useful for detecting
 * slow/hung networks instead of waiting forever.
 *
 * @example
 *   const res = await fetchWithTimeout("/api/rooms", {}, 10000);
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out — please check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Hook that tracks online/offline status.
 * Returns { isOnline, wasOffline }.
 * - isOnline: current status
 * - wasOffline: true if the app was offline at some point and just came back
 *   (useful for triggering a re-fetch)
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    // Initialize from navigator (SSR-safe)
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      // If we were offline before, set wasOffline so the caller can re-fetch
      if (wasOfflineRef.current) {
        setWasOffline(true);
        wasOfflineRef.current = false;
        // Reset wasOffline after a tick so it doesn't fire repeatedly
        setTimeout(() => setWasOffline(false), 100);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}

/**
 * Sticky red banner that appears when the network is offline.
 * Auto-hides when connectivity returns. Calls onReconnect when the
 * network comes back online (so the parent can re-fetch data).
 *
 * Also auto-retries the onReconnect callback after a 2-second delay
 * when the network comes back — gives the server a moment to be ready.
 */
export function NetworkStatusBanner({ onReconnect }: { onReconnect?: () => void | Promise<void> }) {
  const { isOnline, wasOffline } = useNetworkStatus();

  // When the network comes back after being offline, auto-trigger a re-fetch
  useEffect(() => {
    if (isOnline && wasOffline && onReconnect) {
      // Small delay so the server has a moment to be reachable
      const timer = setTimeout(() => {
        onReconnect();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, onReconnect]);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-rose-600 px-4 py-2 text-center text-xs font-semibold text-white shadow-md"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>You are offline. Changes won't sync until you reconnect.</span>
    </div>
  );
}

/**
 * Simpler hook that wraps any async function with a timeout.
 * If the function takes longer than timeoutMs, it rejects with a
 * "Request timed out" error.
 *
 * @example
 *   const { runWithTimeout } = useTimeout();
 *   const data = await runWithTimeout(() => apiGetRooms(), 10000);
 */
export function useTimeout() {
  const runWithTimeout = useCallback(async <T,>(
    fn: () => Promise<T>,
    timeoutMs = 10000
  ): Promise<T> => {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out — please check your connection and try again.")), timeoutMs)
      ),
    ]);
  }, []);

  return { runWithTimeout };
}
