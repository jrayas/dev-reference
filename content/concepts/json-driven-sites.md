# Concept: JSON-driven sites

## What it means

Instead of hand-writing HTML per page, the content (what to show) is stored as plain data (`topics/*.json`), and a small amount of code (a **build script** + a **renderer**) turns that data into pages. Adding content means editing data, never touching code or markup.

## Why this project uses it

The requirement was "adding a new topic or page means dropping a JSON file into the repo and pushing." That's only possible if the site has exactly one rendering code path that any valid JSON file flows through — which is why `src/lib/topics.ts` (the loader), `src/validate.ts` (the gate) and `src/build.ts` (the renderer) all import the same `TopicData` shape, and why the client-side `app.js` renders from the *same* shape regardless of whether it arrived via Tauri, a network fetch, or inlined seed data (see [[architecture]]).

## The trade-off

JSON-driven content is rigid by design — you can only express what the schema allows (`topics/schema.json`: which languages, which flags, task/entry shape). That rigidity is the point: it's what makes `validate.ts` able to catch a mistake (`"language": "Ruby"`, not in the enum) before it ever reaches a page, and what makes a topic file safely author-able by someone who's never opened `src/`. The cost is that a genuinely new *kind* of content (say, a topic wanting a video embed per entry) needs a schema change in three places — `topics/schema.json`, the TypeScript types in `src/lib/topics.ts`, and the renderer in `public/app.js` — not just a JSON edit.

## Where to look in this repo

- `topics/schema.json` — the contract, as JSON Schema (for editor tooling)
- `src/lib/topics.ts` — the same contract, as TypeScript types + the enums/verb-list validation actually runs against
- `src/validate.ts` — enforces the contract
- `src/build.ts` — the one place that turns valid data into `dist/`
