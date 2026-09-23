# Dev Reference

A cross-platform developer reference site, styled after Notion's own product UI. It runs identically as a static website, an installable PWA, and a native Windows/Mac desktop app (Tauri). All content lives in JSON under `topics/`; adding a topic or page is a matter of dropping in a JSON file and pushing — GitHub Actions validates, builds and deploys it automatically.

The seed topic is **Notion** itself: 120 tools and SDKs across 15 tasks covering the Notion developer workflow.

See [`FEATURES.md`](FEATURES.md) for the full feature list (spec vs. added), [`content/`](content/) for the design decisions and lessons learned while building this, and [`guide/`](guide/) for a step-by-step walkthrough to rebuild the whole project from scratch and understand how it works.

## Quick start

```powershell
npm install
npm run all    # validate -> check links -> build -> dist/index.html
npm run dev    # serve dist/ locally at http://localhost:5173 and rebuild on change
```

## Scripts

| Command | What it does |
|---|---|
| `npm run validate` | Enforces the schema rules in every `topics/*/data.json` (exits non-zero on failure) |
| `npm run check` | HEAD-checks every `docs` URL across all topics; reports dead links, moved domains and sites that block automation |
| `npm run build` | Renders `template.html` + all topics into `dist/` (also writes per-topic JSON, the PWA manifest/service worker, icons and fonts) |
| `npm run all` | validate → check → build, in order |
| `npm run dev` | Builds once, serves `dist/` on port 5173, and rebuilds automatically when `topics/`, `src/`, `public/` or `template.html` change |
| `npm run icons` | Regenerates the PWA PNG icons from the vendored emoji SVG in `assets/` |
| `npm run new-topic <slug>` | Scaffolds `topics/<slug>/data.json` from the template |
| `npm run tauri <args>` | Passthrough to the Tauri CLI (`npm run tauri dev`, `npm run tauri build`, ...) |

## Adding a new topic

Run `npm run new-topic <slug>` (e.g. `npm run new-topic stripe`) to copy `topics/_template/data.json` into `topics/stripe/data.json`; fill in the `topic`, `slug`, `description` and `cover` emoji, then replace the example tasks with real ones — each task name must start with a recognised imperative verb (see `KNOWN_VERBS` in `src/lib/topics.ts`; unknown verbs fail validation with a clear message telling you where to add them) and needs at least 3 entries, each with a unique `name` (unique across the whole topic file, not just within its task), an `https://` `docs` URL, a non-empty `specialty`, and `language`/`flags` values from the allowed lists in `topics/schema.json`. Run `npm run validate` until it's clean, then `npm run build` — commit and push to `main` and GitHub Actions does the rest; no code changes are ever needed to add a topic.

## Deploying to GitHub Pages

1. Enable Pages once, from the repo's **Settings → Pages**, source **"GitHub Actions"** (or via CLI, see below).
2. Push to `main` — `.github/workflows/deploy.yml` validates, builds and deploys `dist/` automatically.
3. The workflow's `check-links` step never fails the build (`continue-on-error: true`); only `validate` (bad schema) blocks a deploy.

A commented-out alternative job in `deploy.yml` pushes `dist/` to a `gh-pages` branch instead (via `peaceiris/actions-gh-pages`), for repos that prefer "Deploy from a branch" over the native Pages action — swap it in if you'd rather review the built output as real commits.

### Windows PowerShell: push with GitHub CLI

```powershell
# One-time: install and authenticate the GitHub CLI
winget install --id GitHub.cli
gh auth login

# From this project's folder
git init
git add .
git commit -m "Initial commit"
gh repo create dev-reference --public --source=. --remote=origin --push

# Turn on Pages (Actions-based) for the new repo
gh api -X PUT "repos/:owner/dev-reference/pages" -f "build_type=workflow"

# Every subsequent update
git add .
git commit -m "Update topics"
git push
```

## Building and running the Tauri desktop app on Windows

Prerequisites: [Rust](https://rustup.rs) (MSVC toolchain) and the [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled on current Windows 10/11).

```powershell
npm install
npm run tauri dev      # launches a live window; edit topics/*.json and it reloads instantly, no rebuild
npm run tauri build    # produces installers in src-tauri/target/release/bundle/ (msi/ and nsis/)
```

In the dev-launched or installed app, the window reads `topics/*/data.json` directly from disk (resolved by walking up from the app's working directory, or from the `REFERENCE_TOPICS_DIR` environment variable if set) and live-reloads on file changes — no rebuild needed while iterating on content locally. Pushing to GitHub only updates the public website; the desktop app is a separate build/install step (`npm run tauri build`) whenever you want to ship a new version of it.

## Project structure

```
topics/                 Content — one folder per topic, data.json + schema.json + a commented _template
src/                     build.ts, validate.ts, check-links.ts, icons.ts, new-topic.ts, dev.ts
public/                  style.css, app.js, manifest.webmanifest, sw.js, 404.html, icons/
src-tauri/               Tauri desktop scaffold (Rust)
fonts/                   Self-hosted Inter variable woff2 (no external requests)
.github/workflows/       deploy.yml
content/                 Design decisions, architecture notes, lessons learned
guide/                   Step-by-step "rebuild this from scratch" walkthrough
```

## Licensing note

The card-index emoji (🗂️) icon artwork is vendored from [Twemoji](https://github.com/jdecked/twemoji) (`assets/emoji-1f5c2.svg`), licensed CC-BY 4.0.
