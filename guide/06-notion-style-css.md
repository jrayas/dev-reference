# 06 — Notion-style CSS

## What & why

Three ingredients make this look like Notion rather than "a generic list": the exact colour values, the type scale (14px body text is noticeably smaller than most sites' default 16px — it's a deliberate part of Notion's density), and self-hosted Inter (Notion's actual font). None of these are guesses — they're specified exactly, so this step is mostly transcription plus understanding *why* each piece is structured the way it is.

## Do this

**Fonts.** Download Inter's variable font (one file covers every weight, 100–900, rather than shipping nine separate static files) and put the `.woff2` file(s) in `fonts/`. The easiest source is the `@fontsource-variable/inter` npm package:

```powershell
npm install --save-dev @fontsource-variable/inter
Copy-Item node_modules\@fontsource-variable\inter\files\inter-latin-wght-normal.woff2 fonts\
```

**Design tokens**, at the top of `public/style.css` — every colour, spacing and font-size value as a CSS custom property, never hard-coded again below this point:

```css
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("fonts/inter-latin-wght-normal.woff2") format("woff2-variations");
}

:root {
  --bg: #FAFAF9;
  --text: #37352F;
  --border: #E9E9E7;
  --accent: #2383E2;
  --font-sans: "Inter", -apple-system, sans-serif;
  --text-base: 0.875rem;   /* 14px */
  --text-lg: 1rem;         /* 16px */
  --space-2: 0.5rem;
  --space-4: 1rem;
  --radius-sm: 0.25rem;
  --sidebar-w: 15rem;      /* 240px, in rem not px */
}

:root[data-theme="dark"] {
  --bg: #191919;
  --text: #FFFFFE;
  --border: #2F2F2F;
  --accent: #529CDE;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: var(--text-base);
}
```

## How it works

**Why a variable font instead of separate weight files.** A "static" web font is one file per weight — Inter-Regular.woff2 (400), Inter-SemiBold.woff2 (600), Inter-Bold.woff2 (700) — and using five weights means five HTTP requests. A *variable* font encodes the entire weight axis (100 through 900) in one file, and `font-weight: 100 900` in the `@font-face` rule tells the browser "any weight in this range is available from this one file" — so `font-weight: 550` (a value with no equivalent named weight) works too, at no extra download cost.

**Why every value is a custom property, never a literal.** `prompt.md` requires this explicitly ("No fixed pixel widths anywhere. CSS custom properties for all spacing, colour and type values") — but the practical reason to actually follow it, beyond satisfying a spec: dark mode. `:root[data-theme="dark"] { --bg: #191919; ... }` redefines the *same* variable names with different values — every rule elsewhere that reads `var(--bg)` automatically follows, with zero duplicate `.dark-mode .thing { background: ... }` overrides scattered through the file. One redefinition block, and the whole page re-themes.

**Why `rem`, not `px`, for `--sidebar-w`.** `rem` is relative to the root font-size; `px` is an absolute physical measurement. A user who's bumped their browser's default text size up (an actual accessibility setting, not a hypothetical) gets a proportionally wider sidebar with `rem` — with `px` the sidebar stays a fixed width while the text inside it grows, and eventually doesn't fit. `prompt.md`'s "no fixed pixel widths" rule is really this same idea, generalised: prefer units that respond to the user's actual settings over units that don't.
