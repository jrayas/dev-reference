// The string below is replaced by build.ts with a content hash on every
// build, so a new deploy always busts the cache instead of serving stale assets.
const CACHE_VERSION = "__CACHE_VERSION__";
const STATIC_CACHE = `dev-reference-static-${CACHE_VERSION}`;
const DATA_CACHE = `dev-reference-data-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./fonts/inter-latin-wght-normal.woff2",
  "./fonts/inter-latin-ext-wght-normal.woff2",
  "./fonts/inter-latin-wght-italic.woff2",
  "./fonts/inter-latin-ext-wght-italic.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isTopicData(url) {
  return url.pathname.includes("/topics/") && url.pathname.endsWith(".json");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Network-first for topic JSON, so edits show up without a stale cache lingering.
  if (isTopicData(url)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // Cache-first for everything else (HTML shell, fonts, icons).
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          return res;
        }),
    ),
  );
});
