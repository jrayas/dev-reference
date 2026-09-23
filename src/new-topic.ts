import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TOPICS_DIR } from "./lib/topics.js";

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npm run new-topic <slug>\n  e.g. npm run new-topic stripe");
    process.exit(1);
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error(`Invalid slug '${slug}': use lowercase letters, numbers and hyphens only.`);
    process.exit(1);
  }

  const destDir = path.join(TOPICS_DIR, slug);
  if (existsSync(destDir)) {
    console.error(`topics/${slug}/ already exists.`);
    process.exit(1);
  }

  const templatePath = path.join(TOPICS_DIR, "_template", "data.json");
  const templateRaw = await readFile(templatePath, "utf-8");
  const filled = templateRaw
    .replace('"topic": "$comment: Human-readable topic name shown in the sidebar and page header, e.g. \'Stripe\'"', `"topic": "${slug}"`)
    .replace('"slug": "$comment: URL-safe id, lowercase-kebab-case, must match the folder name, e.g. \'stripe\'"', `"slug": "${slug}"`);

  await mkdir(destDir, { recursive: true });
  await writeFile(path.join(destDir, "data.json"), filled, "utf-8");

  console.log(`Created topics/${slug}/data.json from the template.`);
  console.log(`Next: edit the topic/description/cover fields, replace the example tasks and entries,`);
  console.log(`then run 'npm run validate' (each task needs 3+ entries) and 'npm run build'.`);
}

main();
