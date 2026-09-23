# 16 — Next steps

You now have a working version of everything in [`FEATURES.md`](../FEATURES.md) marked ✅. That file also lists everything marked 🆕 — features added beyond the original spec (keyboard-navigable search, theme toggle, offline/update toasts, and more) that this guide's 15 steps only partially covered, since they're smaller additive polish on top of the foundations each step *did* build in full. Read the real source for those (`public/app.js`, `public/style.css`) once the fundamentals here feel solid — they're a natural next reading exercise, not a mystery.

## Reasonable things to build next, roughly in order of effort

1. **Fill out the seed data properly.** This guide's examples used 1–3 entries per task to keep things short. A real topic wants the full 3+ per task the schema requires, genuinely useful specialty descriptions, and — importantly — every `docs` URL actually checked (`npm run check`), not just assumed correct. See [`content/lessons-learned.md`](../content/lessons-learned.md) item 4 for concrete examples of how "surely this URL is right" turned out wrong in practice.

2. **Per-topic icons.** Step 12's icon pipeline hard-codes the Notion topic's 🗂️ cover emoji. Extending it to render each topic's own `cover` field (and choosing which topic's icon represents the *app* as a whole, for the PWA manifest and Tauri bundle, when there are several) is a natural next exercise in the same file.

3. **A second real topic**, following step 15 properly — not a placeholder. Building one for real is the best test of whether the schema (step 03) is actually general enough, or whether it quietly assumes something Notion-specific that needs loosening.

4. **Tauri auto-update.** `src-tauri` currently builds installers but doesn't wire up Tauri's updater plugin — worth adding once you're distributing the desktop app to anyone besides yourself, so they get new versions without manually re-downloading.

5. **Search relevance ranking.** The current search (step 08) returns matches in index order, capped at 40. A real ranking (exact name match first, then specialty, then task/language; shorter names ranked above longer ones for the same match) would make results feel sharper on larger datasets — worth revisiting once a topic has hundreds of entries and "which of these 12 matches is the one I meant" becomes a real question.

6. **Automated screenshot/visual testing.** This project's UI was verified manually with Playwright during development (see [`content/lessons-learned.md`](../content/lessons-learned.md) items 2–3 for what that caught) but there's no *repeatable* visual regression suite — a good addition once the design has stabilised and you want confidence that future CSS changes don't silently break the two-column entry grid or the mobile bottom sheet again.

## Where the real, finished versions of everything live

Every step in this guide built a simplified version of something. The actual project's finished files — with every validation rule, every polish feature, the full 120-entry seed dataset, and the complete Tauri live-reload watcher — are the source of truth this guide was extracted from. Read them side-by-side with the corresponding guide step when something here feels incomplete:

| Guide step | Real file(s) |
|---|---|
| 03–04 | `src/lib/topics.ts`, `src/validate.ts`, `topics/schema.json` |
| 05 | `src/build.ts`, `template.html` |
| 06–09 | `public/style.css`, `public/app.js` |
| 10 | `src/check-links.ts` |
| 11–12 | `public/manifest.webmanifest`, `public/sw.js`, `src/icons.ts` |
| 13 | `src-tauri/` (all files) |
| 14 | `.github/workflows/deploy.yml` |
| 15 | `src/new-topic.ts`, `topics/_template/data.json` |
