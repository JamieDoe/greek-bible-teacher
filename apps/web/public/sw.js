// Service worker: offline app shell and recently read passages. Hand-written (no build step);
// see DECISIONS 020. Bump VERSION to drop old caches after a change to this file.
const VERSION = "v1";
const SHELL = `shell-${VERSION}`; // offline page and icons, cached on install
const STATIC = `static-${VERSION}`; // hashed build assets and fonts (immutable)
const PAGES = `pages-${VERSION}`; // HTML of recently visited pages (e.g. /read/1)
const DATA = `data-${VERSION}`; // public reading data: passages, token lookups, grammar
const CACHES = [SHELL, STATIC, PAGES, DATA];
const MAX_PAGES = 20;
const MAX_DATA = 300;

// Only public, non-user-specific API data is ever cached.
const CACHEABLE_API = [
  /^\/api\/passages(\/\d+)?$/,
  /^\/api\/tokens\/\d+$/,
  /^\/api\/grammar(\/[a-z0-9-]+)?$/,
  /^\/api\/sources$/,
];

/**
 * Caches the offline page and the build assets it references (read from its HTML), so it
 * still hydrates, and can list saved passages, when nothing else has been cached yet.
 */
async function precacheShell() {
  const shell = await caches.open(SHELL);
  await shell.addAll(["/icons/icon-192.png", "/manifest.webmanifest"]);
  const response = await fetch("/offline", { cache: "no-store" });
  if (!response.ok) throw new Error(`offline page: HTTP ${response.status}`);
  await shell.put("/offline", response.clone());
  const html = await response.text();
  const assets = [
    ...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1])),
  ];
  await (await caches.open(STATIC)).addAll(assets);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !CACHES.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Stores a response, moving it to the newest position, and keeps the cache under `max`. */
async function remember(cacheName, request, response, max) {
  const cache = await caches.open(cacheName);
  await cache.delete(request);
  await cache.put(request, response);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

async function networkFirst(request, cacheName, max) {
  try {
    const response = await fetch(request);
    if (response.ok) await remember(cacheName, request, response.clone(), max);
    return response;
  } catch (err) {
    const cached = await caches.match(request, { cacheName });
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { cacheName: STATIC });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC)).put(request, response.clone());
  return response;
}

// The reader asks for its own page to be kept: client-side navigations fetch RSC payloads,
// not HTML, so a passage opened by tapping a link would otherwise never be saved.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (data?.type !== "cache-page" || typeof data.path !== "string") return;
  if (!/^\/read\/\d+$/.test(data.path)) return;
  const request = new Request(new URL(data.path, self.location.origin), {
    credentials: "same-origin",
  });
  event.waitUntil(
    fetch(request)
      .then((response) => (response.ok ? remember(PAGES, request, response, MAX_PAGES) : undefined))
      .catch(() => undefined),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // React Server Component payloads vary per navigation; let Next fall back to a full page
  // load when they fail, which is then served from PAGES.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, PAGES, MAX_PAGES).catch(
        async () => (await caches.match("/offline", { cacheName: SHELL })) ?? Response.error(),
      ),
    );
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (CACHEABLE_API.some((re) => re.test(url.pathname))) {
    event.respondWith(networkFirst(request, DATA, MAX_DATA));
  }
});
