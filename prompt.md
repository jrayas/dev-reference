TOPIC: Notion (seed topic — architecture supports unlimited topics)

════════════════════════════════════════════
GOAL
════════════════════════════════════════════
Build a cross-platform developer reference site modelled on Notion's
own UI — clean, minimal, sidebar-driven — that runs identically as a
website, an installable PWA, and a native Windows/Mac desktop app
(Tauri). Content lives entirely in JSON. Adding a new topic or page
means dropping a JSON file into the repo and pushing; GitHub Actions
handles everything else.

════════════════════════════════════════════
CONTENT SCOPE (seed data — Notion topic)
════════════════════════════════════════════
~120 entries across ~15 verb-named tasks, ~8 entries per task.
Tasks cover the full Notion developer workflow, e.g.:
  "Query the API", "Publish as a website", "Automate workflows",
  "Sync databases", "Build integrations", "Embed content",
  "Manage users", "Export content", "Style pages", "Test locally"
Propose the full task list yourself.

Ecosystems: TypeScript, JavaScript, Python, Go, Any (CLI / no-code / GUI).
Well-maintained and widely used only. Nothing deprecated or abandoned.
Flag 💰 paid or revenue-capped licences.
Flag platform limits (Windows only, Mac only, etc.) — I am on Windows.

════════════════════════════════════════════
DATA FORMAT
════════════════════════════════════════════
All content in JSON. Build script auto-discovers all topic files.

Folder structure:
  topics/
  ├── notion/data.json      ← seed topic
  └── _template/data.json  ← empty template with comments

Schema — topics/notion/data.json:
{
  "topic": "Notion",
  "slug": "notion",
  "description": "Tools, SDKs and integrations for the Notion ecosystem",
  "cover": "🗂️",
  "tasks": [
    {
      "task": "Query the API",
      "entries": [
        {
          "name": "notion-sdk-js",
          "language": "TypeScript",
          "specialty": "Official Notion JavaScript SDK",
          "docs": "https://github.com/makenotion/notion-sdk-js",
          "note": "",
          "flags": []
        }
      ]
    }
  ]
}

Allowed language values:
  TypeScript | JavaScript | Python | Go | Rust | C | C++ | Any

Allowed flag values:
  paid | windows-only | mac-only | linux-only | deprecated

════════════════════════════════════════════
VALIDATION RULES (validate.ts enforces all)
════════════════════════════════════════════
- docs must be HTTPS
- name unique within a topic
- language from allowed list only
- task names verb-first
- flags from allowed list only
- minimum 3 entries per task
- no empty specialty fields

════════════════════════════════════════════
TOOLING STACK (TypeScript throughout)
════════════════════════════════════════════
src/
├── build.ts          — reads all topics/*.json, renders index.html
├── validate.ts       — enforces schema rules, exits non-zero on failure
├── check-links.ts    — HEAD each docs URL, browser user-agent,
                        follow redirects, report 404s and moved domains
                        list any that block automation but work in browser
package.json          — scripts: validate | check | build | all
tsconfig.json
template.html         — Mustache/Handlebars template consumed by build.ts

Run with tsx, no compile step needed.

════════════════════════════════════════════
UI — NOTION-STYLE LAYOUT
════════════════════════════════════════════
Match Notion's actual product UI exactly:

Typography
- Inter font, self-hosted under /fonts/, no external requests
- Same type scale Notion uses: 14px base, 16px headings

Colours
- Light: background #FAFAF9, text #37352F, border #E9E9E7
- Dark:  background #191919, text #FFFFFE, border #2F2F2F
- Accent: #2383E2 (Notion blue)

Sidebar (left panel — desktop)
- Collapsible, 240px wide when open, collapses to icon rail
- Lists all topics as nav items with emoji cover + label
- Active topic highlighted
- Collapses to slide-in drawer on tablet
- Bottom sheet on mobile (swipe up to open)

Cover header (per topic)
- Emoji cover large, topic title in Notion page-title size
- One-line description beneath
- Matches a real Notion page header

Search
- Ctrl+K / Cmd+K opens a centred modal (not inline)
- Word-start matching across name, specialty, task, language
- "/" also opens modal
- Esc closes and clears
- Results grouped by task, filtered live

Filters
- Language chips + task chips below search modal
- Active filters shown as removable badges
- State saved in URL hash for shareable views

Entries per task
- Collapsible task groups (open by default)
- Each row: name | language badge | specialty | docs domain | flags
- Notion-style badges for language and flags
- Clicking docs domain opens in new tab

UX details
- Skeleton loaders while switching topics
- Empty state design for no results and no entries
- Smooth fade transition between topics
- Scroll position remembered per topic
- Breadcrumb trail: Home → Topic → Task

Responsive breakpoints (container queries, not media queries)
- ≥1200px: sidebar + multi-column entries
- 768–1200px: sidebar collapses, single column
- <768px: bottom-sheet nav, stacked rows

No fixed pixel widths anywhere. CSS custom properties for all
spacing, colour and type values.

════════════════════════════════════════════
PWA
════════════════════════════════════════════
- manifest.json with name, short_name, theme_color, background_color
- Service worker: cache-first for all assets, network-first for JSON
- Icons: 192px, 512px, maskable 512px (generate from cover emoji)
- Splash screen
- Installable from browser on Windows, Mac, Android, iOS

════════════════════════════════════════════
TAURI DESKTOP APP (Windows + Mac)
════════════════════════════════════════════
- tauri.conf.json — window size 1200×800, min 800×600, resizable
- Custom frameless titlebar (removes OS default chrome)
  matches Notion's own desktop app appearance
- When running in Tauri: read topics/*.json directly from filesystem
  (no rebuild needed locally — edit JSON, app reflects it live)
- Push to GitHub only to update the public website
- App icons:
  - Windows: icon.ico (16, 32, 48, 256px)
  - Mac:     icon.icns
  - Linux:   icon.png 512px
- src-tauri/ scaffold with Cargo.toml

════════════════════════════════════════════
GITHUB ACTIONS — AUTO DEPLOY
════════════════════════════════════════════
.github/workflows/deploy.yml triggers on push to main:
  1. npm ci
  2. npx tsx src/validate.ts       — fail build if schema invalid
  3. npx tsx src/check-links.ts    — warn on broken links, don't fail
  4. npx tsx src/build.ts          — output to dist/index.html
  5. Deploy dist/ to gh-pages branch
  6. GitHub Pages serves it

════════════════════════════════════════════
REPO STRUCTURE
════════════════════════════════════════════
/
├── topics/
│   ├── notion/data.json
│   └── _template/data.json
├── src/
│   ├── build.ts
│   ├── validate.ts
│   └── check-links.ts
├── src-tauri/           ← Tauri scaffold
├── fonts/               ← Inter, self-hosted
├── template.html
├── package.json
├── tsconfig.json
├── .github/
│   └── workflows/
│       └── deploy.yml
├── README.md
└── .gitignore

════════════════════════════════════════════
DELIVERABLES
════════════════════════════════════════════
1. All source files above, complete and ready to run
2. Published artifact (index.html rendered, live preview)
3. Repo zip for download
4. README.md includes:
   - How to add a new topic (one paragraph)
   - Windows PowerShell commands to push with GitHub CLI
   - How to enable GitHub Pages
   - How to build and run the Tauri app on Windows

════════════════════════════════════════════
STYLE
════════════════════════════════════════════
British English throughout.
Notion-style: clean, minimal, no decorative graphics.
Inter font. Soft off-white/dark backgrounds. Notion blue accent only.

════════════════════════════════════════════
FINAL REPLY FORMAT
════════════════════════════════════════════
Concise. State:
- How many entries and tasks in the seed data
- Which docs links were fixed and why
- Which sites block automated checks but work in a browser
- Any 💰 or platform flags found
- Any sensible choices made that weren't specified

Do not ask questions. Make sensible choices and state them.