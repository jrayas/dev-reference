# 02 — Project skeleton

## What & why

Before writing logic, lay out where things will live. Getting this right up front avoids reshuffling imports later — every script we write from step 03 onward assumes this exact shape.

## Do this

```powershell
mkdir topics, src, src\lib, public, fonts, assets
```

The plan for each folder (some won't get files until later steps — that's fine, create them now so the shape is visible):

```
topics/            content — one JSON file per topic (step 03)
src/                build/validate/check scripts, written in TypeScript (steps 04-05, 10)
src/lib/            code shared between those scripts (step 03)
public/             everything copied into the final site as-is: CSS, client JS, PWA files (steps 06-11)
fonts/              self-hosted font files (step 06)
assets/             source art for icon generation (step 12)
```

Add npm scripts as placeholders in `package.json` now — we'll fill in what they run as each script gets written, but having the *names* fixed early means every later step's instructions ("run `npm run validate`") already make sense:

```json
{
  "scripts": {
    "validate": "tsx src/validate.ts",
    "check": "tsx src/check-links.ts",
    "build": "tsx src/build.ts",
    "all": "npm run validate && npm run check && npm run build"
  }
}
```

(`npm run <name>` looks up `<name>` in this `scripts` block and runs the associated shell command — that's the entire mechanism; there's no magic beyond string lookup + shell execution.)

## How it works

There's no framework-imposed structure here (no `pages/` or `components/` directory some tool expects) — the folder names are a convention *we're* choosing, documented by this guide and by `README.md`'s "Project structure" section once you write it. The only folder name that later code actually depends on by string is `topics/` (hard-coded as `TOPICS_DIR` in `src/lib/topics.ts`, step 03) and `public/` (referenced in `src/build.ts`'s copy step, step 05) — rename either later and you'd need to update those references too.
