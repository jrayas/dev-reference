# 12 — Icons

## What & why

Every icon (PWA 192/512/maskable, Tauri desktop `.ico`/`.icns`) needs to come from *one* source image, generated at build time — not drawn by hand five times, which guarantees they'll eventually drift out of sync when the cover emoji changes. This step builds that one source image programmatically from the topic's cover emoji, using vendored (downloaded-once, committed) art rather than rendering a system emoji font, because emoji rendering differs across operating systems and fonts — the same 🗂️ character can look meaningfully different on Windows vs. Mac vs. a CI runner, and we need one canonical, reproducible result.

## Do this

Install an SVG-to-PNG renderer:

```powershell
npm install --save-dev @resvg/resvg-js
```

Download a vendored emoji SVG (Twemoji, CC-BY 4.0 licensed — must be attributed if you ship it, which `README.md` does):

```powershell
curl.exe -L -o assets\emoji-1f5c2.svg "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/1f5c2.svg"
```

(`1f5c2` is the Unicode codepoint for 🗂️ — [unicode.org's emoji list](https://unicode.org/emoji/charts/full-emoji-list.html) or `"🗂️".codePointAt(0).toString(16)` gives you the codepoint for any other emoji.)

`src/icons.ts`:

```ts
import { Resvg } from "@resvg/resvg-js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "./lib/topics.js";

function tileSvg(emojiInner: string, size: number, maskable: boolean) {
  const pad = maskable ? size * 0.2 : size * 0.12; // maskable needs a bigger safe-zone margin
  const glyphSize = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.22}" fill="#2383E2"/>
    <g transform="translate(${pad} ${pad})">
      <svg width="${glyphSize}" height="${glyphSize}" viewBox="0 0 36 36">${emojiInner}</svg>
    </g>
  </svg>`;
}

async function renderPng(svg: string, size: number, outFile: string) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  await writeFile(outFile, png);
}

async function main() {
  const outDir = path.join(ROOT, "public", "icons");
  await mkdir(outDir, { recursive: true });

  const rawSvg = await readFile(path.join(ROOT, "assets", "emoji-1f5c2.svg"), "utf-8");
  const inner = rawSvg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

  await renderPng(tileSvg(inner, 192, false), 192, path.join(outDir, "icon-192.png"));
  await renderPng(tileSvg(inner, 512, false), 512, path.join(outDir, "icon-512.png"));
  await renderPng(tileSvg(inner, 512, true), 512, path.join(outDir, "icon-maskable-512.png"));
  await renderPng(tileSvg(inner, 1024, false), 1024, path.join(outDir, "icon-1024.png"));
  console.log("Icons written to public/icons/");
}

main();
```

Run it: `npx tsx src/icons.ts`. Open `public/icons/icon-512.png` to check it.

## How it works

**`tileSvg()` wraps the raw glyph in a rounded, colour-filled tile.** A bare emoji glyph on its own reads as "a stray emoji," not an app icon — every real app icon has a background shape. The nested `<svg>` (an SVG inside an SVG) is the cleanest way to scale the glyph's own `viewBox="0 0 36 36"` coordinate system (that's Twemoji's native canvas size) into an arbitrary output size without doing the width/height math by hand for every glyph.

**`maskable`'s padding is genuinely different math, not a flag that does nothing.** A normal icon can use content right up near its edges. A maskable one needs everything important inside a centred ~80%-width zone, because the OS will crop outside that zone unpredictably (see step 11). `pad = size * 0.2` (maskable) vs `size * 0.12` (normal) is the actual difference — skipping this and generating "maskable" icons that are really just resized normal icons is a common real-world PWA bug: it passes every automated Lighthouse check (which only looks for the `purpose: "maskable"` manifest entry existing) while still visibly clipping the icon on real Android devices.

**Why this is a script, not a design step done once in Figma.** The moment a topic's cover emoji is user-editable data (it is — see step 15), the icon can't be a static asset anymore; it has to be *derived* from whatever the current cover value is. This project currently regenerates icons for the seed topic's cover specifically (🗂️) rather than per-topic — worth knowing as a limitation, and a natural next thing to extend (see step 16).
