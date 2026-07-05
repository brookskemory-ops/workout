/* Keel service worker — offline-first caching.
   Bump CACHE on every release to force clients onto the new version. */
const CACHE = "keel-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/icons.js",
  "./js/data.js",
  "./js/state.js",
  "./js/ui.js",
  "./js/charts.js",
  "./js/bank.js",
  "./js/lock.js",
  "./js/views/quicklog.js",
  "./js/views/home.js",
  "./js/views/activity.js",
  "./js/views/importer.js",
  "./js/views/inbox.js",
  "./js/views/plan.js",
  "./js/views/bills.js",
  "./js/views/goals.js",
  "./js/views/invest.js",
  "./js/views/settings.js",
  "./js/views/onboarding.js",
  "./js/views/year.js",
  "./js/views/calendar.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

// Activating a new cache version deletes every old one — including the
// legacy "monster-mode-*" caches from this origin's previous app.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first with cache fallback: online users always get the latest
// deploy; offline use serves the last-seen version. Only same-origin
// responses are cached (price APIs are cached in app state instead).
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
