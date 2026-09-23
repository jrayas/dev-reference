# 14 — GitHub Actions deploy

## What & why

The last mile: push to `main`, and a few minutes later the site is live, automatically — validated first, so a broken topic file can never reach production.

## Do this

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx tsx src/validate.ts
      - run: npx tsx src/check-links.ts
        continue-on-error: true
      - run: npx tsx src/build.ts
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Push it, then flip one repo setting (once): **Settings → Pages → Source → GitHub Actions**. Or via PowerShell with the GitHub CLI:

```powershell
winget install --id GitHub.cli
gh auth login
gh repo create dev-reference --public --source=. --remote=origin --push
gh api -X PUT "repos/:owner/dev-reference/pages" -f "build_type=workflow"
```

Every subsequent `git push` to `main` redeploys automatically — check progress under the repo's **Actions** tab.

## How it works

**Two jobs, not one — `build` then `deploy`.** They *could* be a single job; splitting them lets `deploy` declare its own `environment: github-pages`, which is what makes the deployment show up as a trackable "Environment" in GitHub's UI (with its own history and the live URL surfaced right there) rather than being just a step buried in a longer job's log. `needs: build` is what sequences them — `deploy` won't start until `build` finishes successfully.

**Why `validate` blocks the deploy but `check-links` doesn't (`continue-on-error: true`).** A bad schema is this repository's own bug, and shipping it would mean broken badges or crashed rendering in production — that should stop the pipeline every time. A dead third-party link is information about the *world*, not a defect in this repo; failing every future deploy until some unrelated company's server comes back online would be actively harmful to shipping velocity for no correctness benefit. See [`content/concepts/github-actions-pages.md`](../content/concepts/github-actions-pages.md) for more on this distinction, including the alternative `gh-pages`-branch deployment pattern if you'd rather review builds as real commits than use the native Pages action shown here.

**`permissions: { pages: write, id-token: write }`.** GitHub Actions grants a workflow *no* permissions by default beyond reading the repo — `pages: write` is what allows `deploy-pages` to actually publish, and `id-token: write` lets the workflow mint a short-lived OIDC token to authenticate that publish, instead of needing a long-lived secret token stored in repo settings. Forgetting either line is the most common reason this exact workflow shape fails on a fresh repo — the error message ("Resource not accessible by integration") doesn't obviously point at "add a permissions block," so it's worth remembering this cause specifically.
