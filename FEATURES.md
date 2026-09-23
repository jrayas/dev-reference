# Feature list

Legend: ✅ = specified in `prompt.md` · 🆕 = added beyond the spec (sensible choice, stated here)

## Content & data

| # | Feature | Status | Where |
|---|---|---|---|
| 1 | JSON-only content, one file per topic | ✅ | `topics/<slug>/data.json` |
| 2 | Auto-discovers all topics (no registry to edit) | ✅ | `discoverTopicFiles()` in `src/lib/topics.ts` |
| 3 | Notion seed topic: 15 verb-first tasks × 8 entries = 120 | ✅ | `topics/notion/data.json` |
| 4 | Commented `_template` topic for scaffolding | ✅ | `topics/_template/data.json` (`$comment` keys, since JSON has no native comments) |
| 5 | Allowed language enum (TS/JS/Python/Go/Rust/C/C++/Any) | ✅ | `ALLOWED_LANGUAGES` in `src/lib/topics.ts` |
| 6 | Allowed flag enum (paid/windows-only/mac-only/linux-only/deprecated) | ✅ | `ALLOWED_FLAGS` in `src/lib/topics.ts` |
| 7 | 💰 paid / revenue-capped licences flagged | ✅ | seed data `flags: ["paid"]` + `note` |
| 8 | Platform limits flagged | ✅ | e.g. 7-Zip → `windows-only` |
| 9 | `topics/schema.json` (JSON Schema) for editor autocomplete/validation | 🆕 | `topics/schema.json`, referenced via `$schema` in each topic file |
| 10 | `npm run new-topic <slug>` scaffolding CLI | 🆕 | `src/new-topic.ts` |

## Validation & tooling

| # | Feature | Status | Where |
|---|---|---|---|
| 11 | `validate.ts`: HTTPS-only docs, unique name-per-topic, allowed language, verb-first task, allowed flags, min 3 entries/task, non-empty specialty | ✅ | `src/validate.ts` |
| 12 | Extra checks: duplicate task names, slug-matches-folder, valid JSON | 🆕 | `src/validate.ts` |
| 13 | `check-links.ts`: HEAD (GET fallback) with a browser UA, follows redirects, reports 404s/moved domains/automation-blocked sites | ✅ | `src/check-links.ts` |
| 14 | `build.ts`: reads all topics, renders `template.html`, outputs `dist/` | ✅ | `src/build.ts` |
| 15 | tsx, no compile step | ✅ | `package.json` scripts |
| 16 | `npm run dev`: local static server + auto-rebuild on file change | 🆕 | `src/dev.ts` |

## UI — Notion-style layout

| # | Feature | Status | Where |
|---|---|---|---|
| 17 | Self-hosted Inter, no external requests | ✅ | `fonts/*.woff2`, `@font-face` in `public/style.css` |
| 18 | Notion type scale (14px base / 16px headings) | ✅ | `--text-base`, `--text-lg` in `public/style.css` |
| 19 | Light/dark colours matching the spec exactly | ✅ | `:root` / `:root[data-theme="dark"]` tokens |
| 20 | Collapsible 240px sidebar → icon rail | ✅ | `.sidebar`, `#sidebar-collapse-btn` |
| 21 | Sidebar lists topics with emoji + label, active highlighted | ✅ | `renderSidebarNav()` in `public/app.js` |
| 22 | Tablet: sidebar → slide-in drawer / Mobile: bottom sheet (swipe up) | ✅ | `.bottom-sheet`, touch handlers in `initSheet()` |
| 23 | Cover header: emoji, page-title size, one-line description | ✅ | `.cover` in `public/style.css` / `renderTopic()` |
| 24 | Search modal: Ctrl+K / Cmd+K / "/", Esc closes, word-start match across name/specialty/task/language, grouped results | ✅ | `initSearch()`, `runSearch()` in `public/app.js` |
| 25 | Language + task filter chips, removable active-filter badges, state in URL hash | ✅ | `renderToolbar()`, `parseHash()`/`writeHash()` |
| 26 | Collapsible task groups (open by default), badges, click-domain-opens-new-tab | ✅ | `renderTask()`, `renderEntry()` |
| 27 | Skeleton loaders while switching topics | ✅ | `renderSkeleton()`, `.skeleton` |
| 28 | Empty states (no results / no entries) | ✅ | `renderEmptyNoResults()` |
| 29 | Fade transition between topics | ✅ | `.main__inner` `fade-in` keyframes |
| 30 | Scroll position remembered per topic | ✅ | `state.scrollPositions` in `public/app.js` |
| 31 | Breadcrumb: Home → Topic → Task | ✅ | `.breadcrumb` in `renderTopic()` |
| 32 | Container queries (not media queries) for the 1200/768px breakpoints | ✅ | `@container shell (...)` in `public/style.css` |
| 33 | No fixed pixel widths; all spacing/colour/type as CSS custom properties | ✅ | `:root` tokens in `public/style.css` |
| 34 | Light/dark/system theme toggle, persisted | 🆕 | `#theme-toggle`, `initTheme()` |
| 35 | Keyboard-navigable search (↑/↓/Enter, match highlighting) | 🆕 | `updateActiveResult()`, `highlight()` |
| 36 | Focus trap + ARIA roles in modal/sheet, `prefers-reduced-motion` respected | 🆕 | `trapFocus()`, `role="dialog"`, `--duration` overridden under the media query |
| 37 | Entry counts on task headers + nav items; collapse-all/expand-all | 🆕 | `.task__count`, `.nav-item__count`, `#collapse-all-btn` |
| 38 | "Copy link" per task (URL-hash deep link) | 🆕 | `[data-copy-task]` handler |
| 39 | Offline indicator + "new version, reload" toast on SW update | 🆕 | `initConnectivity()`, `initServiceWorker()` |
| 40 | Print stylesheet | 🆕 | `@media print` in `public/style.css` |

## PWA

| # | Feature | Status | Where |
|---|---|---|---|
| 41 | `manifest.webmanifest`: name, short_name, theme/background colour | ✅ | `public/manifest.webmanifest` |
| 42 | Service worker: cache-first assets, network-first JSON | ✅ | `public/sw.js` |
| 43 | Icons: 192, 512, maskable 512 (generated from the cover emoji) | ✅ | `src/icons.ts` → `public/icons/` |
| 44 | Splash screen (manifest colours/icon + apple-touch-icon) | ✅ | `manifest.webmanifest`, `<link rel="apple-touch-icon">` |
| 45 | Installable on Windows/Mac/Android/iOS | ✅ | standard manifest + SW requirements met |
| 46 | `.nojekyll` + `404.html` for GitHub Pages | 🆕 | `public/404.html`, written by `build.ts` |

## Tauri desktop

| # | Feature | Status | Where |
|---|---|---|---|
| 47 | 1200×800 window, 800×600 minimum, resizable | ✅ | `src-tauri/tauri.conf.json` |
| 48 | Custom frameless titlebar (no OS chrome), Notion-desktop look | ✅ | `.titlebar` in template/CSS, `decorations: false` for all platforms |
| 49 | Reads `topics/*.json` from disk live, no rebuild needed | ✅ | `list_topics` command + `notify` watcher in `src-tauri/src/lib.rs` |
| 50 | Push to GitHub only updates the website; desktop is a separate build | ✅ | README "Building and running..." section |
| 51 | App icons: `.ico` (16/32/48/256+), `.icns`, 512px `.png` | ✅ | `src-tauri/icons/` (via `npx tauri icon`) |
| 52 | `src-tauri/` scaffold with `Cargo.toml` | ✅ | `src-tauri/Cargo.toml`, `build.rs`, `src/main.rs`, `src/lib.rs` |

## CI/CD

| # | Feature | Status | Where |
|---|---|---|---|
| 53 | Push-to-main workflow: install → validate → check-links (warn) → build → deploy | ✅ | `.github/workflows/deploy.yml` |
| 54 | Deploys to GitHub Pages | ✅ (via `actions/deploy-pages`, not a `gh-pages` branch push — see README) | `.github/workflows/deploy.yml` |

## Documentation

| # | Feature | Status | Where |
|---|---|---|---|
| 55 | README: add-a-topic, PowerShell + `gh` push, enable Pages, build/run Tauri | ✅ | `README.md` |
| 56 | Decisions/architecture/lessons-learned knowledge base | 🆕 (requested separately, see `user-tutorial.md`) | `content/` |
| 57 | Step-by-step rebuild-from-scratch guide | 🆕 (requested separately) | `guide/` |
| 58 | This feature list, kept up to date | 🆕 | `FEATURES.md` |
