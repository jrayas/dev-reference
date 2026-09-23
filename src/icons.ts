import { Resvg } from "@resvg/resvg-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "./lib/topics.js";

const EMOJI_SVG_PATH = path.join(ROOT, "assets", "emoji-1f5c2.svg");
const OUT_DIR = path.join(ROOT, "public", "icons");

/**
 * Wraps the vendored Twemoji glyph on a rounded, brand-coloured tile so it
 * reads as an app icon rather than a bare emoji on a transparent square.
 */
function tileSvg(emojiInner: string, size: number, opts: { maskable: boolean }): string {
  const pad = opts.maskable ? size * 0.2 : size * 0.12; // maskable icons need a safe-zone margin
  const glyphSize = size - pad * 2;
  const radius = opts.maskable ? 0 : size * 0.22;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#2383E2"/>
  <g transform="translate(${pad} ${pad})">
    <svg width="${glyphSize}" height="${glyphSize}" viewBox="0 0 36 36">${emojiInner}</svg>
  </g>
</svg>`;
}

async function renderPng(svg: string, size: number, outFile: string) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  const png = resvg.render().asPng();
  await writeFile(outFile, png);
  console.log(`  wrote ${path.relative(ROOT, outFile)} (${size}x${size})`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const rawSvg = await readFile(EMOJI_SVG_PATH, "utf-8");
  const inner = rawSvg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

  console.log("Rendering PWA icons from vendored Twemoji glyph...");
  await renderPng(tileSvg(inner, 192, { maskable: false }), 192, path.join(OUT_DIR, "icon-192.png"));
  await renderPng(tileSvg(inner, 512, { maskable: false }), 512, path.join(OUT_DIR, "icon-512.png"));
  await renderPng(tileSvg(inner, 512, { maskable: true }), 512, path.join(OUT_DIR, "icon-maskable-512.png"));
  await renderPng(tileSvg(inner, 1024, { maskable: false }), 1024, path.join(OUT_DIR, "icon-1024.png"));
  await renderPng(tileSvg(inner, 180, { maskable: false }), 180, path.join(OUT_DIR, "apple-touch-icon.png"));

  console.log(
    "\nDone. Run 'npx tauri icon public/icons/icon-1024.png' from src-tauri/ to generate desktop app icons (icon.ico, icon.icns, icon.png).",
  );
}

main();
