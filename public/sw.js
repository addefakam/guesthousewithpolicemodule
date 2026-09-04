/* GHMS service worker — minimal navigation-only worker.
 * Exists so the main system satisfies PWA installability criteria
 * (a fetch handler is required by some browsers). It deliberately
 * handles ONLY top-level navigations with a network-first passthrough
 * (offline fallback: cached shell if present, otherwise 503). API calls,
 * assets and everything else are left untouched. */
const CACHE = "ghms-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous versions, then take control immediately.
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate") return;

  event.respondWith(
    fetch(req).catch(async () => {
      const shell = await caches.match("/", { ignoreSearch: true });
      if (shell) return shell;
      return new Response("", { status: 503, statusText: "Offline" });
    })
  );
});
