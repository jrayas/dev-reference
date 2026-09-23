# Architecture

## Data flow, end to end

```
topics/<slug>/data.json  (source of truth, hand-edited or generated)
        │
        ├─ npm run validate ──► src/validate.ts
        │                        reads every topics/*/data.json via
        │                        discoverTopicFiles() + loadTopic(),
        │                        checks schema rules, exits 1 on failure
        │
        ├─ npm run check ────► src/check-links.ts
        │                        loads the same topics, HEAD/GET-checks
        │                        every entry.docs URL, never fails the build
        │
        └─ npm run build ────► src/build.ts
                                 1. discoverTopicFiles() + loadTopic() again
                                    (build does NOT trust a prior validate run —
                                    it's a separate process invocation)
                                 2. Handlebars renders template.html with
                                    seedJson = JSON.stringify(all topics)
                                    → dist/index.html
                                 3. writes dist/topics/<slug>.json (one per
                                    topic) + dist/topics/index.json (manifest)
                                 4. copies public/ (style.css, app.js,
                                    manifest.webmanifest, sw.js, 404.html,
                                    icons/) and fonts/ into dist/
                                 5. stamps dist/sw.js's __CACHE_VERSION__
                                    with a sha256 of (all topic files +
                                    template.html + app.js + style.css)
                                 6. writes dist/.nojekyll
```

Both `validate.ts` and `build.ts` import the same `src/lib/topics.ts` module — the language/flag enums, the verb list, and the file-discovery logic exist in exactly one place. There is no schema definition duplicated between the two scripts (the JSON Schema at `topics/schema.json` is a *third*, independent representation, kept for editor tooling only — see [[decisions]] for why it isn't the single source of truth).

## Runtime: three ways to load topics, one code path to render them

`public/app.js`'s `loadTopics()` picks a source in priority order:

1. **Tauri**: `invoke("list_topics")` — Rust reads `topics/*/data.json` off disk directly (see [[tauri-ipc]]). This always wins when `window.__TAURI__` is present, in both `tauri dev` and an installed build.
2. **Browser, online**: `fetch("topics/index.json")` then `fetch("topics/<slug>.json")` for each — network-first, so a redeploy is visible without needing a hard refresh.
3. **Browser, offline / fetch failed**: the `<script id="seed-data">` JSON inlined into `index.html` at build time.

Whichever source wins, the result is the same shape — an array of `TopicData` objects — and every renderer downstream (`renderSidebarNav`, `renderTopic`, `buildSearchIndex`, ...) is agnostic to where it came from. This is the reason `list_topics` in Rust returns generic JSON rather than a typed struct: the contract is "produces the same shape `TopicData[]` describes," enforced by `src/lib/topics.ts` and `topics/schema.json`, not by Rust's type system.

## Client state

All UI state lives in one plain object, `state`, in `public/app.js`:

```js
state = {
  topics: [],                                    // loaded once at boot
  activeSlug: null,                               // current topic
  filters: { languages: Set, tasks: Set },        // mirrored to the URL hash
  collapsedTasks: Set,                            // per-topic-switch, not persisted
  scrollPositions: Map,                            // keyed by topic slug
}
```

The URL hash (`#topic/<slug>?lang=...&task=...`) is the *serialization* of `activeSlug` + `filters` — `parseHash()`/`writeHash()` are the only two functions that touch `location.hash`, so the rest of the app just reads/writes `state` and calls `renderTopic()`. This is what makes filtered views shareable/bookmarkable without any server-side routing.

## Build-time vs. runtime responsibilities

| Concern | Build-time (`src/*.ts`, Node) | Runtime (`public/app.js`, browser/Tauri) |
|---|---|---|
| Schema validation | ✅ `validate.ts` | — (trusts build-time validation) |
| Link health | ✅ `check-links.ts` (warn-only) | — |
| HTML shell, seed data inlining | ✅ `build.ts` + `template.html` | — |
| Rendering topics/tasks/entries into DOM | — | ✅ `app.js` |
| Search, filters, theme, modal/sheet | — | ✅ `app.js` |
| Service worker caching strategy | writes the cache-version stamp | ✅ `sw.js` implements it |
| Live topic reload | — | ✅ Tauri `notify` watcher → `topics-changed` event → `app.js` re-renders |

## Why the service worker and Tauri never run at the same time

`initServiceWorker()` in `app.js` bails out immediately if `IS_TAURI` is true. A Tauri window is not a browser tab with a network origin the SW spec assumes — and Tauri already has its own live-reload path (the `notify` watcher), which makes the SW's job (caching a static deploy, going network-first on JSON) redundant there. Two independent freshness mechanisms watching the same files would be a bug waiting to happen, not a redundancy win.
