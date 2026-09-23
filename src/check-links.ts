import { loadAllTopics, docsDomain } from "./lib/topics.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const CONCURRENCY = 8;
const TIMEOUT_MS = 12000;
const STRICT = process.argv.includes("--strict");

type Status = "ok" | "dead" | "moved" | "blocked" | "error";

interface CheckResult {
  name: string;
  url: string;
  status: Status;
  detail: string;
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

async function checkOne(name: string, url: string): Promise<CheckResult> {
  const originalHost = docsDomain(url);
  const attempt = async (method: "HEAD" | "GET") => {
    const { signal, cancel } = withTimeout(TIMEOUT_MS);
    try {
      return await fetch(url, {
        method,
        redirect: "follow",
        signal,
        headers: { "User-Agent": UA, Accept: "*/*" },
      });
    } finally {
      cancel();
    }
  };

  try {
    let res = await attempt("HEAD");
    if ([403, 405, 501].includes(res.status)) {
      res = await attempt("GET");
    }

    const finalHost = docsDomain(res.url || url);

    if (res.status === 404 || res.status === 410) {
      return { name, url, status: "dead", detail: `HTTP ${res.status}` };
    }
    if ([403, 429, 503].includes(res.status)) {
      return { name, url, status: "blocked", detail: `HTTP ${res.status} (likely bot-blocked; check manually in a browser)` };
    }
    if (res.status >= 400) {
      return { name, url, status: "dead", detail: `HTTP ${res.status}` };
    }
    if (finalHost !== originalHost) {
      return { name, url, status: "moved", detail: `redirected to ${finalHost}` };
    }
    return { name, url, status: "ok", detail: `HTTP ${res.status}` };
  } catch (err) {
    const message = (err as Error).name === "AbortError" ? "timed out" : (err as Error).message;
    return { name, url, status: "error", detail: message };
  }
}

async function runPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
}

async function main() {
  const topics = await loadAllTopics();
  const links: { name: string; url: string }[] = [];
  for (const { data } of topics) {
    for (const task of data.tasks) {
      for (const entry of task.entries) {
        links.push({ name: entry.name, url: entry.docs });
      }
    }
  }

  console.log(`Checking ${links.length} docs link(s) with concurrency ${CONCURRENCY}...\n`);
  const results = await runPool(links, CONCURRENCY, ({ name, url }) => checkOne(name, url));

  const groups: Record<Status, CheckResult[]> = { ok: [], dead: [], moved: [], blocked: [], error: [] };
  for (const r of results) groups[r.status].push(r);

  console.log(`✅ OK: ${groups.ok.length}`);
  console.log(`❌ Dead (404/410 or 4xx/5xx): ${groups.dead.length}`);
  for (const r of groups.dead) console.log(`   - [${r.name}] ${r.url} — ${r.detail}`);
  console.log(`↪  Moved domain: ${groups.moved.length}`);
  for (const r of groups.moved) console.log(`   - [${r.name}] ${r.url} — ${r.detail}`);
  console.log(`🛡  Blocks automation (works in a browser): ${groups.blocked.length}`);
  for (const r of groups.blocked) console.log(`   - [${r.name}] ${r.url} — ${r.detail}`);
  console.log(`⚠  Errored (dns/timeout): ${groups.error.length}`);
  for (const r of groups.error) console.log(`   - [${r.name}] ${r.url} — ${r.detail}`);

  const failing = groups.dead.length + groups.error.length;
  if (STRICT && failing > 0) {
    console.error(`\n--strict passed and ${failing} link(s) are dead/erroring — failing build`);
    process.exit(1);
  }
  process.exit(0);
}

main();
