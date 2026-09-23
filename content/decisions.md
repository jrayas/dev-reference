# Decisions

An ADR-style log of the non-obvious choices made while building this, and why. Ordered by area, not chronology.

---

## Rendering: inline seed data + per-topic JSON, not a pure static dump

`build.ts` does two things with the same data: it inlines every topic as a `<script type="application/json">` block in `index.html`, **and** it writes each topic to `dist/topics/<slug>.json` plus a manifest.

**Why:** a single `dist/index.html` with everything inlined means the first paint never needs a network round-trip — open the file straight off disk and it works. But a service worker can't cache-bust *part* of an inline script; it can only replace the whole HTML file. Shipping topics as separate JSON files too means the service worker can go network-first on just the data (see [[pwa-and-service-workers]]) while the HTML shell stays cache-first, so editing a topic and redeploying doesn't require every visitor to wait for a full page reload before they see it — the SW fetches the fresh JSON on next load, HTML update follows on its own cadence. In Tauri, neither path is used: `list_topics()` reads straight off disk (see [[tauri-ipc]]).

**How to apply:** if you add new data (say, a "changelog" per topic), decide whether it belongs in the inlined seed (needed for first paint) or as a separate fetched file (safe to go stale by a few minutes). Don't just inline everything by default.

---

## Handlebars over a JS framework

`template.html` is rendered once at build time with Handlebars, then all interactivity is a single `public/app.js` with no framework, no bundler, no virtual DOM.

**Why:** the entire app is one page with one piece of client state (which topic + which filters). React/Vue's value is managing complex, deeply nested state across many components — that overhead buys nothing here and would add a build step (`prompt.md` explicitly asks for "no compile step needed" via `tsx`). Handlebars' job is narrow: drop the seed JSON into a `<script>` tag and nothing else — the actual UI is rendered client-side from that JSON so there's exactly one rendering code path, not two (server-template + client-JS) that could drift apart.

**How to apply:** resist reaching for a framework here even if the app grows. If per-topic interactivity gets meaningfully more complex (e.g. inline editing), that's the point to reconsider — not before.

---

## Entry names unique *per topic*, not *per task*

`validate.ts` tracks `seenEntryNames` across the whole topic file, not reset between tasks — so the same tool can't appear under two different tasks in one topic.

**Why:** `name unique within a topic` in the spec is ambiguous (task-scoped or file-scoped), but file-scoped is the safer and more useful reading: it's what makes the search index and the badge/filename lookups in the UI unambiguous. It also forced better curation of the seed data — e.g. `Zapier`, `Zapier Platform CLI` and `Zapier AI Actions` had to be listed as three distinct, precisely-scoped entries instead of the same "Zapier" row copy-pasted under three tasks.

**How to apply:** when adding a topic where one tool genuinely spans multiple tasks (common — e.g. `curl` could fit half the tasks in any API-driven topic), pick its best-fitting task once and cross-reference it in another entry's `note` field instead of duplicating the name.

---

## Verb-first task names checked against an explicit verb list, not a regex/NLP heuristic

`KNOWN_VERBS` in `src/lib/topics.ts` is a plain `Set<string>` of ~140 imperative verbs, checked by lowercasing and matching the task name's first word.

**Why:** a "is this an imperative verb" check has no cheap, dependency-free general solution — a real one needs a POS tagger, which is a heavy dependency for one validation rule and contradicts the "no compile step, `tsx`-only" tooling goal. An explicit list is auditable (grep it, see exactly what's allowed) and the failure mode is a clear, actionable error message ("does not start with a recognised imperative verb ... add it to KNOWN_VERBS") rather than a silent false negative from a probabilistic tagger.

**How to apply:** when a legitimate task name fails validation because its verb isn't listed, add the verb to `KNOWN_VERBS` — don't work around it by rewording the task name into something clunkier just to dodge the list.

---

## Container queries scoped to `.app-shell`, with `.mobile-bar` moved *inside* it

Original layout had `.mobile-bar` as a sibling of `.app-shell`. It never appeared at narrow widths, because a `@container` query only affects descendants of the element with `container-type` set — a sibling is invisible to it no matter how narrow the viewport gets.

**Why this shape, not just "move the CSS":** the fix wasn't a CSS tweak, it was restructuring the DOM so *everything* that needs to respond to shell width sits inside the queried container. `.app-shell` became a flex **column** (`.mobile-bar` row, then `.shell-body` row containing sidebar+main) instead of a flex row directly containing sidebar+main.

**How to apply:** any new UI element that needs to respond to the `shell` container's width must be a descendant of `.app-shell`, full stop — this bit in testing (see [[lessons-learned]]) and will bite again if a future element is added as a sibling out of convenience.

---

## Rust `list_topics` returns `serde_json::Value`, not typed structs

The Tauri command deserializes each `data.json` into a generic `serde_json::Value` and hands it back to JS as-is, rather than defining `#[derive(Deserialize)] struct Topic { ... }` in Rust matching `TopicData` in `src/lib/topics.ts`.

**Why:** the schema is owned by `topics/schema.json` and `src/lib/topics.ts` — duplicating it as Rust structs means every schema change (a new optional field, a new flag value) needs to be made in three places instead of two, and a mismatch would silently strip fields rather than error, which is worse than the generic-passthrough approach where the frontend JS applies the one true schema understanding.

**How to apply:** don't "properly type" the Rust side later without a reason — if you do, generate the Rust struct from `topics/schema.json` rather than hand-writing a second copy of the schema.

---

## Desktop titlebar: frameless on every platform, no macOS-native traffic lights

The plan going in was `decorations: false` on Windows/Linux but `titleBarStyle: "Overlay"` (native traffic lights, transparent bar) on macOS via a `tauri.macos.conf.json` override. It shipped as `decorations: false` everywhere instead, with no per-platform override file.

**Why the change:** `prompt.md` asks for "Custom frameless titlebar (removes OS default chrome)" without carving out an exception for macOS, and the traffic-lights approach would have meant *two* sets of window controls doing the same job (native ones plus our custom minimize/maximize/close buttons, since those buttons are shown for every Tauri build via `body.is-tauri`) unless the custom bar were conditionally hidden per-OS — which needs a platform-detection dependency (`@tauri-apps/plugin-os`) for a purely cosmetic difference nobody asked for. One code path, tested on the platform actually available (Windows), beats an untestable dual path.

**How to apply:** if someone later wants native macOS traffic lights back, that's a deliberate feature request, not a bug — implement it with the OS plugin and hide `.titlebar__controls` conditionally, don't half-do it by just flipping the config flag.
