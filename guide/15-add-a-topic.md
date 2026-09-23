# 15 — Add a topic

## What & why

The whole point of the architecture built across the previous 14 steps: adding real content should never require touching code. This step proves it, by adding a second topic end to end and watching every existing script (`validate.ts`, `build.ts`, the Tauri command, the site's own search index) pick it up with zero changes.

## Do this

Build a scaffolding script once, `src/new-topic.ts`, so this becomes a one-line command forever after:

```ts
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TOPICS_DIR } from "./lib/topics.js";

async function main() {
  const slug = process.argv[2];
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    console.error("Usage: npm run new-topic <slug>   (lowercase letters/numbers/hyphens only)");
    process.exit(1);
  }
  const destDir = path.join(TOPICS_DIR, slug);
  if (existsSync(destDir)) { console.error(`topics/${slug}/ already exists.`); process.exit(1); }

  const template = await readFile(path.join(TOPICS_DIR, "_template", "data.json"), "utf-8");
  await mkdir(destDir, { recursive: true });
  await writeFile(path.join(destDir, "data.json"), template.replace(/\$comment: URL-safe.*?'\)/, `"${slug}"`), "utf-8");
  console.log(`Created topics/${slug}/data.json — edit it, then run 'npm run validate'.`);
}

main();
```

(For this to work you need a `topics/_template/data.json` to copy from — a version of the schema from step 03 where every field's value is a `"$comment: ..."` string explaining what goes there, since JSON can't hold real comments. Write one now if you haven't; it doubles as documentation for anyone else adding a topic later.)

Add the script to `package.json`: `"new-topic": "tsx src/new-topic.ts"`.

Now actually add one:

```powershell
npm run new-topic stripe
```

Open `topics/stripe/data.json`, replace the placeholder `topic`/`description`/`cover` fields and the example task with real content — at least one task, at least 3 entries in it, matching the schema from step 03. Then:

```powershell
npm run validate    # will fail loudly if the template placeholders are still in there — that's intentional
npm run build
start dist\index.html
```

You should now see **two** topics in the sidebar, with zero changes to `src/`, `public/`, or `template.html`.

## How it works

This is the payoff of every earlier decision to keep the schema in exactly one place (`src/lib/topics.ts`, step 03) and to make topic *discovery* automatic rather than a registry you edit (`discoverTopicFiles()` just lists `topics/*/`, also step 03). Nothing in `build.ts`, `validate.ts`, `check-links.ts`, `app.js`'s search index, or the Tauri `list_topics` command has "Notion" hard-coded anywhere — they all iterate over *whatever* `discoverTopicFiles()` (or its Rust equivalent) returns. Adding a topic was never going to require a code change if the architecture from step 03 onward was actually followed consistently; this step is confirmation of that, not a special case requiring new logic.

The deliberately-broken template placeholders (`new-topic.ts` copies the template's `"$comment: ..."` strings mostly as-is) are a feature, not an oversight — see [`content/lessons-learned.md`](../content/lessons-learned.md) item 1. An unedited template should never silently validate as "fine," because that would mean it's shippable content-free junk; making `npm run validate` fail loudly and specifically on the placeholder text is what forces you to actually fill it in before it can reach `dist/`.
