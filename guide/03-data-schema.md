# 03 — Data schema

## What & why

This is the most important step in the whole project: everything downstream (validation, rendering, search, Tauri's Rust command) exists to serve one agreed shape of data. Get the shape right once, here, and every later step is "read this shape and do something with it" rather than "figure out what shape it might be."

The shape, informally: a **topic** (e.g. "Notion") has a name, slug, description, cover emoji, and a list of **tasks** (e.g. "Query the API"); each task has a name and a list of **entries** (e.g. "notion-sdk-js"); each entry is one tool, with a language, a one-line specialty, a docs URL, an optional note, and zero or more flags (paid, platform-limited, etc.).

## Do this

`src/lib/topics.ts` — the types and the shared logic every other script imports:

```ts
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED_LANGUAGES = [
  "TypeScript", "JavaScript", "Python", "Go", "Rust", "C", "C++", "Any",
] as const;

export const ALLOWED_FLAGS = [
  "paid", "windows-only", "mac-only", "linux-only", "deprecated",
] as const;

export type Language = (typeof ALLOWED_LANGUAGES)[number];
export type Flag = (typeof ALLOWED_FLAGS)[number];

export interface Entry {
  name: string;
  language: Language;
  specialty: string;
  docs: string;
  note: string;
  flags: Flag[];
}

export interface Task {
  task: string;
  entries: Entry[];
}

export interface TopicData {
  topic: string;
  slug: string;
  description: string;
  cover: string;
  tasks: Task[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..", "..");
export const TOPICS_DIR = path.join(ROOT, "topics");

export async function discoverTopicFiles(): Promise<string[]> {
  if (!existsSync(TOPICS_DIR)) return [];
  const entries = await readdir(TOPICS_DIR, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const dataPath = path.join(TOPICS_DIR, entry.name, "data.json");
    if (existsSync(dataPath)) files.push(dataPath);
  }
  return files.sort();
}

export async function loadTopic(filePath: string): Promise<TopicData> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as TopicData;
}
```

Now a real topic file, `topics/notion/data.json` — start with just enough to see the shape (you'll flesh this out to 15 tasks / 120 entries once validation exists in step 04 to check your work):

```json
{
  "topic": "Notion",
  "slug": "notion",
  "description": "Tools, SDKs and integrations for the Notion ecosystem",
  "cover": "🗂️",
  "tasks": [
    {
      "task": "Query the API",
      "entries": [
        { "name": "notion-sdk-js", "language": "TypeScript", "specialty": "Official Notion JavaScript/TypeScript client", "docs": "https://github.com/makenotion/notion-sdk-js", "note": "", "flags": [] },
        { "name": "notion-sdk-py", "language": "Python", "specialty": "Community Python client tracking the official API", "docs": "https://github.com/ramnes/notion-sdk-py", "note": "", "flags": [] },
        { "name": "curl", "language": "Any", "specialty": "Universal command-line tool for calling the API directly", "docs": "https://curl.se", "note": "", "flags": [] }
      ]
    }
  ]
}
```

## How it works

`discoverTopicFiles()` is the *only* place "how do we find topics" is decided: it lists `topics/`'s subfolders, skips any starting with `_` (that's how `topics/_template/` stays a template rather than a real topic — see step 15), and only counts a folder if it has a `data.json` inside. Every other script (`validate.ts`, `build.ts`, the Tauri Rust code) either calls this function directly or re-implements the identical rule in Rust (see step 13) — there is deliberately no second, divergent way to enumerate topics anywhere in the codebase.

`as const` on the two arrays does two jobs at once: it's the actual runtime list validation checks membership against (`ALLOWED_LANGUAGES.includes(x)`), *and* TypeScript derives the `Language`/`Flag` union types from it (`(typeof ALLOWED_LANGUAGES)[number]`) — add a language to the array and the type updates automatically, with zero risk of the type and the runtime check drifting apart.
