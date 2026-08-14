// The Fay PM — minimal, auth-safe service worker for installability + offline.
//
// IMPORTANT: never cache or serve HTML documents/navigations. Clerk's dev-mode
// (and auth generally) embeds short-lived handshake state in the page; serving a
// stale cached document breaks sign-in ("host_invalid"). So navigations always go
// straight to the network, and we only fall back to a static /offline page when
// the network is unreachable. Only immutable static assets are cached.

const CACHE = "fay-pm-v2";
const STATIC_FALLBACK = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(STATIC_FALLBACK)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch Clerk/API/CDN

  // Documents: network-only. Never cache, never serve a stale page. Offline →
  // the static fallback page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () => (await caches.match(STATIC_FALLBACK)) || Response.error(),
      ),
    );
    return;
  }

  // Immutable static assets: cache-first.
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return res;
          }),
      ),
    );
  }
  // Everything else (API calls, etc.): passthrough — let the browser handle it.
});
