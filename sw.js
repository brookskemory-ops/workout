/* Monster Mode service worker — offline-first caching.
   Bump CACHE when you change any cached asset to force an update. */
const CACHE = "monster-mode-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/exercises.js",
  "./js/generator.js",
  "./js/finance.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first, falling back to cache only when offline. The app is under
// active development, so freshness matters more than shaving a round trip —
// this guarantees an online user always gets the latest deploy instead of a
// stale cached copy, while offline use still works from the last-seen cache.
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
