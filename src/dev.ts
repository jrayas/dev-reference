import { createServer } from "node:http";
import { readFile, stat, watch } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { ROOT } from "./lib/topics.js";

const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT ?? 5173);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

async function runBuild(): Promise<void> {
  return new Promise((resolve) => {
    const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(npxCmd, ["tsx", path.join(ROOT, "src", "build.ts")], {
      stdio: "inherit",
      cwd: ROOT,
      shell: process.platform === "win32",
    });
    child.on("exit", () => resolve());
  });
}

async function serve() {
  const server = createServer(async (req, res) => {
    try {
      let reqPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
      if (reqPath === "/") reqPath = "/index.html";
      let filePath = path.join(DIST, reqPath);

      try {
        const s = await stat(filePath);
        if (s.isDirectory()) filePath = path.join(filePath, "index.html");
      } catch {
        filePath = path.join(DIST, "index.html"); // SPA fallback for hash-routed paths
      }

      const ext = path.extname(filePath);
      const body = await readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      res.end(body);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });

  server.listen(PORT, () => {
    console.log(`\n  Dev server:  http://localhost:${PORT}\n`);
  });
}

async function main() {
  console.log("Building once before starting the dev server...");
  await runBuild();
  await serve();

  console.log("Watching topics/, src/, public/ and template.html for changes...");
  const watchTargets = ["topics", "src", "public", "template.html"];
  let building = false;
  let queued = false;

  const rebuild = async () => {
    if (building) {
      queued = true;
      return;
    }
    building = true;
    await runBuild();
    building = false;
    if (queued) {
      queued = false;
      rebuild();
    }
  };

  for (const target of watchTargets) {
    const full = path.join(ROOT, target);
    (async () => {
      try {
        const watcher = watch(full, { recursive: true });
        for await (const _event of watcher) {
          rebuild();
        }
      } catch {
        /* single-file watch target (template.html) or platform without recursive watch */
      }
    })();
  }
}

main();
