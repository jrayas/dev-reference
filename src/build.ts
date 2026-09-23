import Handlebars from "handlebars";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { discoverTopicFiles, loadTopic, ROOT } from "./lib/topics.js";

const DIST = path.join(ROOT, "dist");
const PUBLIC_DIR = path.join(ROOT, "public");

async function copyDir(src: string, dest: string) {
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true });
}

async function main() {
  console.log("Building dev-reference...\n");

  // 1. Load + validate is a separate step (npm run validate); build re-reads discovered topics.
  const files = await discoverTopicFiles();
  if (files.length === 0) {
    console.error("No topics found under topics/*/data.json — nothing to build.");
    process.exit(1);
  }
  const topics = await Promise.all(files.map((f) => loadTopic(f)));

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  // 2. Render template.html with the seed data inlined for offline-first / no-JS-fetch first paint.
  const templateSrc = await readFile(path.join(ROOT, "template.html"), "utf-8");
  const template = Handlebars.compile(templateSrc, { noEscape: true });
  const html = template({ seedJson: JSON.stringify(topics) });
  await writeFile(path.join(DIST, "index.html"), html, "utf-8");
  console.log(`  wrote dist/index.html (${topics.length} topic(s) inlined)`);

  // 3. Per-topic JSON + manifest, served network-first by the service worker.
  const topicsDir = path.join(DIST, "topics");
  await mkdir(topicsDir, { recursive: true });
  for (const topic of topics) {
    await writeFile(path.join(topicsDir, `${topic.slug}.json`), JSON.stringify(topic), "utf-8");
  }
  const manifest = topics.map((t) => ({ slug: t.slug, topic: t.topic, cover: t.cover }));
  await writeFile(path.join(topicsDir, "index.json"), JSON.stringify(manifest), "utf-8");
  console.log(`  wrote dist/topics/*.json (${topics.length} file(s) + index.json)`);

  // 4. Static assets: everything in public/ (manifest, icons, 404, app.js, style.css) plus fonts/.
  await copyDir(PUBLIC_DIR, DIST);
  await copyDir(path.join(ROOT, "fonts"), path.join(DIST, "fonts"));
  console.log("  copied public/ and fonts/");

  // 5. Stamp the service worker with a content hash so every deploy busts old caches.
  const hashInputs = await Promise.all(
    [...files, path.join(ROOT, "template.html"), path.join(PUBLIC_DIR, "app.js"), path.join(PUBLIC_DIR, "style.css")].map((f) =>
      readFile(f, "utf-8"),
    ),
  );
  const cacheVersion = createHash("sha256").update(hashInputs.join("\n")).digest("hex").slice(0, 10);
  const swPath = path.join(DIST, "sw.js");
  const swSrc = await readFile(swPath, "utf-8");
  await writeFile(swPath, swSrc.replace("__CACHE_VERSION__", cacheVersion), "utf-8");
  console.log(`  stamped sw.js with cache version ${cacheVersion}`);

  // 6. GitHub Pages needs .nojekyll so it serves the _-free structure verbatim (and our dot-prefixed files, if any).
  await writeFile(path.join(DIST, ".nojekyll"), "");

  const totalEntries = topics.reduce((s, t) => s + t.tasks.reduce((s2, task) => s2 + task.entries.length, 0), 0);
  console.log(`\n✔ Build complete: ${topics.length} topic(s), ${totalEntries} entries → dist/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
