# Concept: PWA installability

## The minimum bar

A browser only offers to "install" a site as an app when a handful of conditions are all true at once:

1. Served over HTTPS (or `localhost`)
2. A linked `manifest.webmanifest` with, at minimum, a `name`, `start_url`, `display` mode other than `browser`, and icons at (in practice) 192px and 512px
3. A registered, active service worker with a `fetch` handler
4. The icons the manifest references must actually load

Miss any one and the "Install" prompt simply never appears — there's no error message, which makes this class of bug easy to ship unnoticed.

## How each requirement is met here

- **Manifest** — `public/manifest.webmanifest`: `name`/`short_name`/`theme_color`/`background_color` per the spec, `display: "standalone"`, and three icon entries (192, 512, and a 512 `maskable` variant — see below).
- **Service worker** — `public/sw.js`, registered in `initServiceWorker()` (`public/app.js`), with both `install` and `fetch` handlers present (a SW that never calls `respondWith` in its `fetch` handler doesn't count for installability purposes, even if registered).
- **Icons** — generated at build time by `src/icons.ts` from a single vendored emoji SVG, not drawn by hand three times (see [[../decisions]] for why the source art is vendored rather than rendered from a system emoji font).

## What "maskable" means, specifically

Android (and some launchers) crop app icons into a shape they choose — a circle, a squircle, a rounded square — and *guarantee* they'll only crop within a centred "safe zone" that's roughly 80% of the icon's width. An icon designed for a hard-edged square (content right up to the edges) gets its corners clipped unpredictably across devices unless a **maskable** variant is provided: the same art, but redrawn with extra padding so nothing important sits outside that safe zone. `src/icons.ts`'s `tileSvg()` takes a `maskable` flag specifically to change the padding math (`pad = size * 0.2` vs `size * 0.12`) for this one variant — the maskable 512px icon is not just a duplicate of the regular one, it's redrawn with more breathing room.

## Splash screen

There's no separate "splash screen" file to design — browsers construct it automatically from the manifest's `background_color`, `theme_color`, `name` and largest available icon. Get those four right and the splash screen is correct for free; this is why `manifest.webmanifest`'s colours exactly match the CSS custom properties in `public/style.css` (`--bg: #FAFAF9`, `--accent: #2383E2`) rather than being chosen independently.

## Where to look in this repo

- `public/manifest.webmanifest`
- `src/icons.ts` — the icon generation pipeline, including the maskable safe-zone math
- `template.html` — the `<link rel="manifest">`, `<link rel="apple-touch-icon">` and `<meta name="theme-color">` tags (iOS/Safari doesn't read the manifest for install-prompt purposes the way Chrome/Edge do, hence the separate apple-specific tags)
