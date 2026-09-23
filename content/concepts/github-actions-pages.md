# Concept: GitHub Actions + GitHub Pages

## Two separate systems, wired together by one workflow file

**GitHub Actions** runs arbitrary jobs (`npm ci`, `npm run validate`, ...) in response to repo events (here: `push` to `main`). **GitHub Pages** serves static files from a source you configure once in repo settings. `.github/workflows/deploy.yml` is the bridge: it's an Actions workflow whose *last* step hands its build output to Pages via a dedicated action, rather than Pages watching the repo directly.

## Why `actions/deploy-pages`, not a `gh-pages` branch push

There are two established patterns for "build then publish to Pages":

1. **Native Pages deployment** (what this project uses): `actions/upload-pages-artifact` packages `dist/` as a build artifact, `actions/deploy-pages` publishes it directly to Pages' own hosting. Requires Pages' source to be set to **"GitHub Actions"** in repo settings, and the workflow needs `permissions: { pages: write, id-token: write }`.
2. **Branch-push deployment**: a third-party action (commonly `peaceiris/actions-gh-pages`) force-pushes the build output to a `gh-pages` branch; Pages is configured to serve "Deploy from a branch" → `gh-pages`.

This project uses (1) because it needs no `GITHUB_TOKEN` write permission beyond what Actions grants automatically via OIDC (`id-token: write`), and there's no `gh-pages` branch cluttering the repo's branch list or git history with rebuilt-output commits. `prompt.md` describes the branch-push flavour specifically ("push dist/ to gh-pages branch... Pages serves it") — the commented-out alternative job at the bottom of `deploy.yml` is exactly that pattern, ready to swap in if you'd rather review deploys as real commits on a branch. See [[../decisions]] for the reasoning in full.

## Why `check-links` has `continue-on-error: true` but `validate` doesn't

A broken *link* in someone's docs isn't this site's fault and isn't something a redeploy can fix — failing the whole build over it would block every future content change until the third-party site comes back, which is disproportionate. A broken *schema* (bad language enum, missing field) is this repo's own mistake and should block the deploy every time — shipping invalid data to production is strictly worse than not shipping. Same asymmetry as running the scripts locally (`npm run validate` exits 1 on failure; `npm run check` always exits 0 unless you pass `--strict`).

## `.nojekyll`

GitHub Pages runs everything through Jekyll by default unless a `.nojekyll` file exists at the published root. Jekyll ignores any file/folder starting with an underscore — which would silently swallow `topics/_template/` if it were ever deployed, and more immediately, mangles files it doesn't recognize. `build.ts` writes an empty `dist/.nojekyll` on every build so this never becomes a surprise.

## Where to look in this repo

- `.github/workflows/deploy.yml` — the whole workflow, plus the commented alternative
- `src/build.ts` — the `.nojekyll` write
- `README.md` — the one-time repo setting to flip ("Settings → Pages → Source: GitHub Actions"), and the `gh api` command to do it from PowerShell instead
