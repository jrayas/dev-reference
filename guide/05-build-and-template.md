# 05 — Build & template

## What & why

This is the step where the project becomes a website. The idea: one HTML file (`template.html`) with a single placeholder for data, rendered once at build time via Handlebars into `dist/index.html` — with the topic data embedded right in the page (as a `<script type="application/json">` block) so the page works the instant it's opened, no fetch required.

## Do this

Install the templating engine if you haven't already (step 01 covered this): `npm install --save-dev handlebars`.

A minimal `template.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Dev Reference</title>
</head>
<body>
  <div id="app">Loading...</div>

  <script type="application/json" id="seed-data">{{{seedJson}}}</script>
  <script src="app.js" defer></script>
</body>
</html>
```

Note the triple-brace `{{{seedJson}}}` — Handlebars escapes HTML entities in `{{double}}` braces by default (turns `<` into `&lt;`, etc.), which would corrupt JSON. Triple braces mean "insert this raw, don't escape it."

`src/build.ts`:

```ts
import Handlebars from "handlebars";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { discoverTopicFiles, loadTopic, ROOT } from "./lib/topics.js";

const DIST = path.join(ROOT, "dist");

async function main() {
  const files = await discoverTopicFiles();
  const topics = await Promise.all(files.map((f) => loadTopic(f)));

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const templateSrc = await readFile(path.join(ROOT, "template.html"), "utf-8");
  const template = Handlebars.compile(templateSrc, { noEscape: true });
  const html = template({ seedJson: JSON.stringify(topics) });

  await writeFile(path.join(DIST, "index.html"), html, "utf-8");
  console.log(`✔ Built dist/index.html with ${topics.length} topic(s)`);
}

main();
```

A placeholder `public/app.js` just to prove data made it through:

```js
const seed = JSON.parse(document.getElementById("seed-data").textContent);
document.getElementById("app").textContent = `Loaded ${seed.length} topic(s): ${seed.map(t => t.topic).join(", ")}`;
```

(`public/` gets copied into `dist/` — add that copy step to `build.ts` now: `import { cp } from "node:fs/promises"` and `await cp(path.join(ROOT, "public"), DIST, { recursive: true });` right after writing `index.html`.)

Build it, then open the result:

```powershell
npx tsx src/build.ts
start dist\index.html
```

You should see "Loaded 1 topic(s): Notion" in the browser.

## How it works

`Handlebars.compile(templateSrc, { noEscape: true })` returns a *function*, not a string — compiling parses the template once into an executable form; calling that function with a data object (`template({ seedJson: ... })`) is what actually produces the final HTML string. This two-step split (compile once, call many times) matters more once you have multiple templates or call the same one repeatedly, but the shape is worth learning now: Handlebars templates are always "compile, then invoke," never "render directly from a string."

`JSON.stringify(topics)` turns the in-memory array of topic objects back into a JSON *string* — because a `<script>` tag's content is text, not a live JS value. The browser-side code (`JSON.parse(...)`) is the inverse operation. Every build does this full round-trip: read JSON off disk → parse into JS objects → validate/transform if needed → stringify back to JSON → embed as text → browser parses it again. That's not wasted work; it's the only way data crosses the boundary between "a build script running in Node" and "a page running in a browser," which are two completely separate processes with no shared memory.
