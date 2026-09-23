import {
  ALLOWED_FLAGS,
  ALLOWED_LANGUAGES,
  discoverTopicFiles,
  loadTopic,
  verbFirst,
  type TopicData,
} from "./lib/topics.js";
import path from "node:path";

interface Problem {
  file: string;
  message: string;
}

const problems: Problem[] = [];

function fail(file: string, message: string) {
  problems.push({ file, message });
}

function validateTopic(file: string, data: TopicData) {
  const rel = path.relative(process.cwd(), file);

  if (!data.topic || typeof data.topic !== "string") fail(rel, "missing/invalid 'topic'");
  if (!data.slug || typeof data.slug !== "string") fail(rel, "missing/invalid 'slug'");
  if (!data.description) fail(rel, "missing 'description'");
  if (!data.cover) fail(rel, "missing 'cover'");

  const folderSlug = path.basename(path.dirname(file));
  if (data.slug && data.slug !== folderSlug) {
    fail(rel, `slug '${data.slug}' does not match folder name '${folderSlug}'`);
  }

  if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
    fail(rel, "'tasks' must be a non-empty array");
    return;
  }

  const seenTaskNames = new Set<string>();
  const seenEntryNames = new Set<string>();

  for (const task of data.tasks) {
    const taskLabel = `task '${task.task ?? "?"}'`;

    if (!task.task || typeof task.task !== "string") {
      fail(rel, "a task is missing its 'task' name");
      continue;
    }

    if (seenTaskNames.has(task.task)) {
      fail(rel, `duplicate task name '${task.task}'`);
    }
    seenTaskNames.add(task.task);

    const { ok, verb } = verbFirst(task.task);
    if (!ok) {
      fail(
        rel,
        `${taskLabel} does not start with a recognised imperative verb (got '${verb}'). Add it to KNOWN_VERBS in src/lib/topics.ts if it's a legitimate verb.`,
      );
    }

    if (!Array.isArray(task.entries) || task.entries.length < 3) {
      fail(rel, `${taskLabel} must have at least 3 entries (has ${task.entries?.length ?? 0})`);
      continue;
    }

    for (const entry of task.entries) {
      const entryLabel = `${taskLabel} entry '${entry.name ?? "?"}'`;

      if (!entry.name) {
        fail(rel, `${taskLabel} has an entry with no 'name'`);
      } else {
        if (seenEntryNames.has(entry.name)) {
          fail(rel, `duplicate entry name '${entry.name}' within topic (names must be unique per topic)`);
        }
        seenEntryNames.add(entry.name);
      }

      if (!ALLOWED_LANGUAGES.includes(entry.language)) {
        fail(rel, `${entryLabel} has invalid language '${entry.language}'`);
      }

      if (!entry.specialty || !entry.specialty.trim()) {
        fail(rel, `${entryLabel} has an empty 'specialty'`);
      }

      if (!entry.docs || !entry.docs.startsWith("https://")) {
        fail(rel, `${entryLabel} has a non-HTTPS or missing 'docs' url: '${entry.docs}'`);
      } else {
        try {
          new URL(entry.docs);
        } catch {
          fail(rel, `${entryLabel} has a malformed 'docs' url: '${entry.docs}'`);
        }
      }

      if (entry.note === undefined || entry.note === null) {
        fail(rel, `${entryLabel} is missing 'note' (use "" for none)`);
      }

      if (!Array.isArray(entry.flags)) {
        fail(rel, `${entryLabel} has invalid 'flags' (must be an array)`);
      } else {
        for (const flag of entry.flags) {
          if (!ALLOWED_FLAGS.includes(flag)) {
            fail(rel, `${entryLabel} has invalid flag '${flag}'`);
          }
        }
      }
    }
  }
}

async function main() {
  const files = await discoverTopicFiles();

  if (files.length === 0) {
    console.error("No topic files found under topics/*/data.json");
    process.exit(1);
  }

  for (const file of files) {
    let data: TopicData;
    try {
      data = await loadTopic(file);
    } catch (err) {
      fail(path.relative(process.cwd(), file), `invalid JSON: ${(err as Error).message}`);
      continue;
    }
    validateTopic(file, data);
  }

  if (problems.length > 0) {
    console.error(`\n✖ ${problems.length} validation problem(s):\n`);
    for (const p of problems) {
      console.error(`  [${p.file}] ${p.message}`);
    }
    console.error("");
    process.exit(1);
  }

  const totalTasks = (await Promise.all(files.map((f) => loadTopic(f)))).reduce(
    (sum, d) => sum + d.tasks.length,
    0,
  );
  const totalEntries = (await Promise.all(files.map((f) => loadTopic(f)))).reduce(
    (sum, d) => sum + d.tasks.reduce((s, t) => s + t.entries.length, 0),
    0,
  );

  console.log(
    `✔ ${files.length} topic(s), ${totalTasks} task(s), ${totalEntries} entries — all valid`,
  );
}

main();
