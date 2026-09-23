import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "C",
  "C++",
  "Any",
] as const;

export const ALLOWED_FLAGS = [
  "paid",
  "windows-only",
  "mac-only",
  "linux-only",
  "deprecated",
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

/** Verb-first check: verb must be an imperative form, not "Querying"/"Queries" */
export const KNOWN_VERBS = new Set([
  "query", "build", "authenticate", "sync", "automate", "publish", "render",
  "convert", "embed", "import", "export", "back", "manage", "test", "connect",
  "create", "read", "update", "delete", "fetch", "send", "receive", "parse",
  "generate", "validate", "deploy", "install", "configure", "monitor", "log",
  "search", "filter", "sort", "cache", "queue", "schedule", "trigger",
  "listen", "watch", "upload", "download", "encrypt", "decrypt", "sign",
  "verify", "migrate", "seed", "scaffold", "bundle", "compile", "transpile",
  "lint", "format", "document", "translate", "localize", "optimise",
  "optimize", "debug", "profile", "trace", "package", "publish", "version",
  "release", "notify", "alert", "archive", "restore", "clone", "fork",
  "merge", "review", "approve", "reject", "assign", "invite", "revoke",
  "grant", "audit", "secure", "protect", "throttle", "rate-limit", "batch",
  "stream", "transform", "map", "reduce", "aggregate", "index", "crawl",
  "scrape", "extract", "load", "orchestrate", "provision", "scale", "host",
  "serve", "proxy", "route", "redirect", "compress", "paginate", "share",
  "collaborate", "comment", "annotate", "tag", "label", "categorise",
  "categorize", "customise", "customize", "integrate", "extend", "plug",
  "hook", "bind", "wrap", "expose", "consume", "call", "invoke", "run",
  "execute", "start", "stop", "pause", "resume", "reset", "clear", "purge",
]);

export function verbFirst(taskName: string): { ok: boolean; verb: string } {
  const firstWord = taskName.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z-]/g, "") ?? "";
  return { ok: KNOWN_VERBS.has(firstWord), verb: firstWord };
}

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

export async function loadAllTopics(): Promise<{ file: string; data: TopicData }[]> {
  const files = await discoverTopicFiles();
  const out: { file: string; data: TopicData }[] = [];
  for (const file of files) {
    out.push({ file, data: await loadTopic(file) });
  }
  return out;
}

export function docsDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
