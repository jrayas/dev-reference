# Lessons learned

Concrete things that went wrong (or would have, unnoticed) while building this, and how they were caught. Ordered roughly by when they surfaced.

## 1. JSON has no comments — so the template topic fakes them

The first instinct for `topics/_template/data.json` was to write real guidance next to each field. JSON doesn't support comments, and stripping them at parse time is extra tooling for no benefit. The fix: every explanatory field is itself a string starting with `"$comment: ..."` (or a real top-level `"$comment"` key), and both `validate.ts`/`build.ts` treat the template folder as excluded entirely (`discoverTopicFiles()` skips any folder starting with `_`). Running `npm run new-topic <slug>` copies the template as-is — its placeholder values *deliberately* fail validation (see the "invalid language" / "non-HTTPS docs" errors it produces on purpose) so you can't accidentally ship an unedited template.

## 2. Container queries only see descendants — a sibling is invisible to them

Built the mobile top bar (`.mobile-bar`) as a sibling of `.app-shell`, with `.app-shell` as the element carrying `container-type: inline-size`. Shrunk the viewport in testing and the hamburger/search icons never appeared. Nothing was "broken" in the CSS rule itself (`@container shell (max-width: 48rem) { .mobile-bar { display: flex; } }` was syntactically fine) — the rule simply never had a chance to match, because `@container` scoping follows the DOM tree, not proximity or visual layout. The fix was structural: move `.mobile-bar` inside `.app-shell`, and split `.app-shell` into a flex column (`.mobile-bar` row, then a new `.shell-body` row holding the actual sidebar+main). See [[decisions]] for the reasoning, [[container-queries]] for the general mechanic.

**Takeaway:** when a `@container` rule "does nothing," check the DOM tree before the CSS — the element must be a *descendant* of the container, not just nearby in the layout.

## 3. Grid items don't shrink below their content size by default

The two-column task layout (`@container shell (min-width: 75rem) { .task__body { grid-template-columns: 1fr 1fr; } }`) rendered with the right-hand column's text overflowing past the page edge — `entry__specialty` (`overflow: hidden; text-overflow: ellipsis`) simply wasn't truncating. The CSS Grid spec gives grid items an implicit `min-width: auto`, which means "don't shrink below your content's intrinsic size" — so `.entry`, as a grid item, refused to shrink even though its own children asked to ellipsis. Ellipsis truncation requires the *shrinking* to actually happen first; it can't rescue an element that's already been given as much width as its content wants. Fix: `min-width: 0` on `.entry` (the grid item itself), plus explicit `max-width`/`flex-shrink` on the flex children inside it (`entry__name`, `entry__domain`) so the available space gets distributed sensibly rather than everything trying to keep its full natural width.

**Takeaway:** `text-overflow: ellipsis` failing silently in a grid or flex layout is almost always a missing `min-width: 0` on some ancestor, not a bug in the ellipsis rule itself.

## 4. "Well-maintained, nothing deprecated" is a claim that needs checking, not assuming

Populating the 120-entry seed list from memory/training data produced several entries that were subtly wrong as of build time:

- **`crates.io/crates/notion-client`** returned HTTP 404 on direct fetch despite the crate genuinely existing (confirmed via the crates.io *API* endpoint, which returned 200 with real version/download data). crates.io's web UI 404s certain direct requests to crate pages that don't go through its SPA router — the crate is real and actively maintained (v1.1.1, updated within the month), but the human-facing URL needed to point at its GitHub repo instead to pass a plain HTTP check.
- **`csv2notion`** (the original, `vzhd1701/csv2notion`) turned out to be discontinued in favour of a community fork, **`csv2notion-neo`** (`TheAcharya/csv2notion-neo`), which migrated to the official Notion API. Shipping the original as a seed entry would have directly violated "nothing deprecated or abandoned" — caught only by checking the fork's README, not by any automated link check (the original repo still resolves fine; it's just unmaintained).
- **`potion.so`**'s production TLS certificate had been expired for four months at build time (`notAfter=May 24 2026`, checked against a September 2026 build date) — the product is real and actively reviewed in 2026 buyer's-guide articles, but its main marketing domain was broken; `beta.potion.so` was the working substitute.
- **`usefeather.app`** silently redirected to an unrelated-looking domain (`feather.renmarkusa.com`) — the product rebranded its primary domain to `feather.so`; the old one was a dead giveaway once redirected, not before.
- **Popsy** (`popsy.co`) intermittently returned a Cloudflare 530 (origin unreachable) across repeated checks, despite being cited favourably in fresh 2026 "best Notion website builder" roundups — flaky infrastructure, not a dead product, but a link that can't be shipped as-is; swapped for `Bullet` (`bullet.so`), which passed consistently.

**Takeaway:** "widely used and well-maintained" is a research task, not a recall task — a tool being real and a tool's *specific URL* being currently reachable and non-deprecated are two different claims, and both need verifying (`npm run check`, plus manual lookups for anything the automated check can't categorise, like a fork replacing an abandoned original).

## 5. `spawn()` needs `shell: true` for `.cmd` files on Windows

`src/dev.ts` spawns `npx` to re-run the build on file changes. `spawn("npx.cmd", [...])` failed immediately with `EINVAL` on Windows — Node's `child_process.spawn` can't directly execute a `.cmd` batch-file shim the way it executes a real `.exe`; it needs the shell to interpret it. Fix: pass `shell: process.platform === "win32"` to the `spawn()` call.

**Takeaway:** any script that shells out to an npm-installed CLI (`npx <tool>`) needs to account for Windows resolving that CLI to a `.cmd`/`.ps1` shim, not a binary — this is invisible on macOS/Linux, where `npx` is a plain executable.

## 6. A real desktop build is the only way to catch config/permission mismatches

Cargo compiling cleanly (`cargo check`) said nothing about whether `tauri.conf.json`'s icon paths were correct, whether the bundler's Windows targets (MSI/NSIS) would actually invoke `candle`/`light`/`makensis` successfully, or whether `capabilities/default.json`'s permission list was sufficient for the window-control buttons to work at runtime. Only running `npm run tauri build --debug` end-to-end (which this project did — see the build log) surfaces that class of failure; a type-check is necessary but not sufficient for a packaging pipeline.

**Takeaway:** for anything involving a bundler/packager (Tauri, PWA installability, GitHub Pages deploy), "it compiles" and "it validates" are separate claims from "it actually packages and launches" — budget time to run the real thing at least once, not just its static checks.
