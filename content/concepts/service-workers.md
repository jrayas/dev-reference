# Concept: service workers

## What they are

A service worker is a script the browser runs in a background thread, separate from any page, that can intercept every network request the page makes (`fetch` events) and decide how to answer it — from the network, from a local cache, or a mix of both. It's the mechanism that makes a website work offline and installable as a PWA: without one, "no internet" just means a broken page.

## The two caching strategies this project uses, and why they differ by content type

`public/sw.js` treats two kinds of request differently:

- **Static assets** (HTML shell, fonts, icons, CSS/JS) — **cache-first**: serve from cache immediately if present, only hit the network on a cache miss. These change rarely and byte-identically when they do (a new build produces a new `CACHE_VERSION`, see below), so there's no freshness to lose by preferring the cache.
- **Topic JSON** (`topics/*.json`) — **network-first**: try the network, fall back to cache only if the network fails. This is content that changes independently of a full site deploy in spirit (even though in practice this project rebuilds everything together) — network-first means a visitor sees an edited topic as soon as it's redeployed, without needing to understand cache invalidation.

## Cache busting via content hash, not a version number you remember to bump

`sw.js` ships with a literal placeholder, `__CACHE_VERSION__`. `build.ts` replaces it with a sha256 hash (truncated to 10 hex chars) of every topic file plus `template.html`, `app.js` and `style.css` — so *any* content change produces a different cache name (`dev-reference-static-<hash>`), and the `activate` handler deletes every cache that isn't the current one. Nobody has to remember to bump a version string by hand; forgetting to do so is the single most common reason real-world PWAs serve stale content indefinitely.

## Why it's disabled entirely inside Tauri

`initServiceWorker()` in `app.js` returns immediately if running inside Tauri. A Tauri webview isn't a normal browser tab with the origin/caching semantics the Service Worker spec assumes, and Tauri already has an equivalent freshness mechanism for its use case — the `notify` filesystem watcher (see [[tauri-ipc]]) — so registering a SW there would be a second, redundant freshness system with no benefit and a real chance of conflicting with the first.

## Where to look in this repo

- `public/sw.js` — the whole implementation (install/activate/fetch handlers)
- `src/build.ts` — the hashing + `__CACHE_VERSION__` substitution step
- `public/app.js`: `initServiceWorker()` — registration, and the "new version available, reload" toast wired to the SW's `updatefound` event
