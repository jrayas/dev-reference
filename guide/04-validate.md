# 04 — Validate

## What & why

JSON has no schema enforcement of its own — `"language": "Ruby"` (not in our allowed list) parses just fine, and would silently render as a broken badge with no error anywhere. `validate.ts` is the gate: it reads every topic file and checks it against every rule the project cares about, printing exactly what's wrong and exiting with a non-zero status code if anything fails — which is what lets GitHub Actions block a bad deploy later (step 14), and what lets you catch a typo the moment you make it rather than after it's live.

## Do this

`src/validate.ts`:

```ts
import {
  ALLOWED_FLAGS, ALLOWED_LANGUAGES, discoverTopicFiles, loadTopic, type TopicData,
} from "./lib/topics.js";
import path from "node:path";

const problems: { file: string; message: string }[] = [];
function fail(file: string, message: string) { problems.push({ file, message }); }

function validateTopic(file: string, data: TopicData) {
  const rel = path.relative(process.cwd(), file);
  if (!data.topic) fail(rel, "missing 'topic'");
  if (!data.slug) fail(rel, "missing 'slug'");
  if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
    fail(rel, "'tasks' must be a non-empty array");
    return;
  }

  const seenNames = new Set<string>();
  for (const task of data.tasks) {
    if (!task.entries || task.entries.length < 3) {
      fail(rel, `task '${task.task}' must have at least 3 entries`);
      continue;
    }
    for (const entry of task.entries) {
      if (seenNames.has(entry.name)) fail(rel, `duplicate entry name '${entry.name}'`);
      seenNames.add(entry.name);

      if (!ALLOWED_LANGUAGES.includes(entry.language)) {
        fail(rel, `entry '${entry.name}' has invalid language '${entry.language}'`);
      }
      if (!entry.specialty?.trim()) fail(rel, `entry '${entry.name}' has an empty specialty`);
      if (!entry.docs?.startsWith("https://")) {
        fail(rel, `entry '${entry.name}' has a non-HTTPS docs url`);
      }
      for (const flag of entry.flags ?? []) {
        if (!ALLOWED_FLAGS.includes(flag)) fail(rel, `entry '${entry.name}' has invalid flag '${flag}'`);
      }
    }
  }
}

async function main() {
  const files = await discoverTopicFiles();
  for (const file of files) validateTopic(file, await loadTopic(file));

  if (problems.length > 0) {
    console.error(`\n✖ ${problems.length} validation problem(s):\n`);
    problems.forEach((p) => console.error(`  [${p.file}] ${p.message}`));
    process.exit(1);
  }
  console.log(`✔ ${files.length} topic(s) — all valid`);
}

main();
```

Run it:

```powershell
npx tsx src/validate.ts
```

Break something on purpose to see the failure mode — change one entry's `"language"` to `"Ruby"`, rerun, read the error, put it back.

## How it works

Two design choices worth noticing, both because they make debugging faster:

1. **Collect every problem, then report all of them** — `fail()` pushes to an array rather than throwing on the first issue. Fixing one typo only to discover three more on the next run is a slow, frustrating loop; seeing every problem in one pass isn't.
2. **Every error message names the file and the specific entry** — never just "validation failed." A rule of thumb worth keeping for any validator you write: the error message should tell you where to go fix it, not just that something's wrong.

This project's actual `src/validate.ts` (once you've built through step 15) has a few more rules than shown here — verb-first task names checked against a known-verb list, slug-matches-folder-name, duplicate task names — but they all follow this exact same `fail(file, message)` pattern. Once you're comfortable with the shape above, adding another rule is a five-line addition, not a redesign.
