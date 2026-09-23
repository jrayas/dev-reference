# 01 — Setup & tools

## What & why

Before writing anything, we need a JavaScript/TypeScript runtime and a way to run `.ts` files without a compile step. The spec constraint driving this: "Run with tsx, no compile step needed." [tsx](https://github.com/privatenumber/tsx) is a tool that runs TypeScript files directly (it transpiles in-memory, on the fly) — no `tsc --build`, no output `dist/*.js` to keep in sync with source. That single choice is why every script in this project is invoked as `npx tsx src/whatever.ts` rather than `node dist/whatever.js`.

## Do this

Check what you already have:

```powershell
node --version   # want 20.x or newer
npm --version
```

If Node isn't installed, get it from [nodejs.org](https://nodejs.org) (the LTS installer) or `winget install OpenJS.NodeJS.LTS`.

Create the project folder and initialise it:

```powershell
mkdir dev-reference
cd dev-reference
npm init -y
```

Install the dependencies we'll use across every later step (add them now, understand each as it's used):

```powershell
npm install --save-dev typescript tsx @types/node handlebars
```

- **typescript** — gives us type-checking (`npx tsc --noEmit`) even though `tsx` handles actually *running* the code. They're not the same tool: tsx makes TypeScript runnable, `tsc --noEmit` makes it type-*checked*. We use both.
- **tsx** — runs `.ts` files directly, as above
- **@types/node** — type definitions for Node's built-in modules (`fs`, `path`, ...), so TypeScript knows what `readFile` returns instead of treating it as `any`
- **handlebars** — the templating engine we'll use in step 05 to turn one HTML template + JSON data into a finished page

Add a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

`"noEmit": true` matters here: this config exists purely so your editor (and `npx tsc --noEmit`) can type-check, never to actually produce `.js` output files — tsx does the running, tsc just does the checking.

And a `.gitignore` so you don't accidentally commit build output or dependencies:

```
node_modules/
dist/
target/
src-tauri/target/
*.log
```

## How it works

`npm install --save-dev X` records `X` in `package.json`'s `devDependencies` and downloads it into `node_modules/`. "Dev" dependency (vs. a plain dependency) means: needed to *build* the site, not needed by the *shipped* site itself — nothing in `dist/` will ever `require("typescript")`. Every tool installed in this step falls into that category; the actual runtime for the finished site is just a browser (or, later, a Tauri webview), which needs none of this.
