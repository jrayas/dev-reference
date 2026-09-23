# 10 — Check links

## What & why

`validate.ts` (step 04) checks *shape* — is this a well-formed entry. It has no way to know whether a `docs` URL actually resolves to something real; that requires making an actual HTTP request. `check-links.ts` does that, for every entry across every topic, and — critically — never fails the build over it (a third-party site being down isn't this repo's bug). Its job is to *report*, clearly enough that a human can decide what to do about each result.

## Do this

`src/check-links.ts`:

```ts
import { loadAllTopics } from "./lib/topics.js"; // add this helper to topics.ts if you haven't:
// export async function loadAllTopics() { const files = await discoverTopicFiles(); return Promise.all(files.map(async (f) => ({ file: f, data: await loadTopic(f) }))); }

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36";

async function checkOne(name: string, url: string) {
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", headers: { "User-Agent": UA } });
    if ([403, 405, 501].includes(res.status)) {
      res = await fetch(url, { method: "GET", redirect: "follow", headers: { "User-Agent": UA } });
    }
    if (res.status === 404 || res.status === 410) return { name, url, status: "dead" as const };
    if ([403, 429, 503].includes(res.status)) return { name, url, status: "blocked" as const };
    const finalHost = new URL(res.url).hostname;
    if (finalHost !== new URL(url).hostname) return { name, url, status: "moved" as const, to: finalHost };
    return { name, url, status: "ok" as const };
  } catch {
    return { name, url, status: "error" as const };
  }
}

async function main() {
  const topics = await loadAllTopics();
  const links = topics.flatMap(({ data }) =>
    data.tasks.flatMap((t) => t.entries.map((e) => ({ name: e.name, url: e.docs })))
  );

  const results = await Promise.all(links.map(({ name, url }) => checkOne(name, url)));

  const dead = results.filter((r) => r.status === "dead");
  const blocked = results.filter((r) => r.status === "blocked");
  console.log(`✅ OK: ${results.filter((r) => r.status === "ok").length}`);
  console.log(`❌ Dead: ${dead.length}`); dead.forEach((r) => console.log(`   ${r.name} — ${r.url}`));
  console.log(`🛡 Blocks automation (check manually): ${blocked.length}`); blocked.forEach((r) => console.log(`   ${r.name} — ${r.url}`));

  process.exit(0); // warn-only: never fails the build
}

main();
```

Run it: `npx tsx src/check-links.ts`.

## How it works

**HEAD first, GET as fallback — not GET always.** `HEAD` asks a server "what would you respond with," without transferring the response body — much cheaper for both sides when checking 100+ URLs. Some servers, though, reject `HEAD` outright (403/405) or don't implement it properly (501) while handling `GET` fine — the fallback exists because "this URL is unreachable via HEAD" and "this URL is dead" are different findings, and conflating them would misreport plenty of perfectly live sites as broken.

**Why "moved domain" is its own category, distinct from "dead."** A redirect landing on a *different hostname* than the one you linked (`workers.cloudflare.com` → `developers.cloudflare.com`, say) usually means the product's docs moved somewhere more canonical, or the original link was already slightly wrong — worth fixing the seed data to point at the real destination directly, but it's not the same failure as a link that's simply gone (404). Same reasoning for "blocks automation": a `403`/`429` from a site with real, working docs (Cloudflare and many others block scripted HEAD requests but serve a browser fine) shouldn't be reported the same way as an actually-dead link — this project hit this exact case with `make.com` and `rsync.samba.org` during seeding (see [`content/lessons-learned.md`](../content/lessons-learned.md)) and it's why the category exists at all, not a hypothetical.

**Why it always exits 0.** This is the one deliberate asymmetry with `validate.ts`: a broken third-party link is *information* for a human to act on, not a defect in *this* repository that should block every future deploy until some other company's server comes back online. See [`content/concepts/github-actions-pages.md`](../content/concepts/github-actions-pages.md) for how this plays out in the CI workflow (`continue-on-error: true`).
