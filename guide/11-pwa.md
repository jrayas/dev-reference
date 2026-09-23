# 11 — PWA

## What & why

Three files turn a plain website into an installable, offline-capable app: a **manifest** (metadata — name, colours, icons), a **service worker** (a background script that intercepts network requests and can answer them from a cache), and the icons themselves. Get all three right and browsers offer an "Install" prompt with zero extra configuration; miss one silently and the prompt just never appears, with no error to tell you why — so this step is worth doing carefully and checking in DevTools' Application tab afterward.

## Do this

**`public/manifest.webmanifest`:**

```json
{
  "name": "Dev Reference",
  "short_name": "Dev Ref",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAFAF9",
  "theme_color": "#2383E2",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**`public/sw.js`** — cache-first for static assets, network-first for topic JSON (so edited content shows up without needing to understand cache invalidation):

```js
const CACHE = "dev-reference-static-v1"; // bump this string (or better: a build-time content hash) on every deploy

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest"])));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith(".json")) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
```

**Register it and link the manifest**, in `template.html`'s `<head>` and `app.js`:

```html
<link rel="manifest" href="manifest.webmanifest" />
<meta name="theme-color" content="#2383E2" />
```

```js
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
```

## How it works

**Why network-first for JSON but cache-first for everything else.** These serve different goals. Static assets (HTML/CSS/JS/fonts) rarely change and are large-ish — cache-first means instant loads and offline support with no downside, since a new deploy is a new file anyway. Content (topic JSON) is exactly the thing you *want* to see update promptly after a redeploy — network-first tries live data first and only falls back to the cache if there's no network at all, so "offline" degrades gracefully to "last-seen data" instead of the page breaking outright.

**Why the cache name needs to change on every deploy.** `caches.open(CACHE)` — if `CACHE` never changes, the service worker keeps serving files from a cache created on day one, forever, no matter how many times you redeploy. This project's actual `build.ts` (step 05, extended) computes a content hash of every source file and substitutes it into `sw.js` at build time, so *every* build gets a fresh cache name automatically — see [`content/concepts/service-workers.md`](../content/concepts/service-workers.md) for the exact mechanism. The hand-rolled `-v1` string above is the simplest version of the same idea: it works, but only if you remember to bump it by hand every time, which is exactly the kind of thing that's easy to forget — automating it is worth doing as soon as this step feels solid.

**Maskable icons.** Android crops app icons into whatever shape the launcher wants (circle, squircle, ...), guaranteed to only crop within a centred ~80%-width "safe zone." A `purpose: "maskable"` icon needs to be drawn *specifically* with that safe zone in mind (more padding than a normal icon) — it's not just a duplicate of the regular icon, see step 12 for how this project generates it correctly.
