# 00 — Overview

## What we're building

A developer reference site — think "a searchable catalogue of tools, grouped by task, for a given ecosystem" — that:

- stores every bit of content as JSON (no CMS, no database)
- renders that JSON into one static `dist/index.html` you can host anywhere
- installs as a PWA (works offline, has an app icon, launches full-screen)
- also runs as a native Windows/Mac desktop app via Tauri, reading the same JSON live off disk
- deploys itself to GitHub Pages automatically on every push, via GitHub Actions

The seed content is a 120-entry catalogue of Notion developer tools, but the architecture doesn't know or care what topic it's holding — a topic is just a JSON file that follows a schema.

## Why this order

Each step in this guide produces something you can actually run and look at — never "trust me, we'll wire it up in step 12." The order is:

1. **Tools + skeleton** (01–02) — nothing to look at yet, just the ground to stand on
2. **Data + validation** (03–04) — the content model, and a script that keeps it honest
3. **Build + render** (05) — first time you see a real (if ugly) page
4. **Styling + layout** (06–07) — it starts looking like Notion
5. **Search + filters, then polish** (08–09) — it starts *behaving* like Notion
6. **Link checking** (10) — a safety net for the content, not the code
7. **PWA + icons** (11–12) — installable, works offline
8. **Tauri desktop** (13) — the same app, as a native window
9. **CI/CD** (14) — it deploys itself
10. **Extending it** (15–16) — add your own topic, and what to build next

By the end of step 05 you have a working (if plain) site. Everything after that is additive — you could stop after any step and have something real.

## Prerequisites

- Windows 10/11, PowerShell (this guide's commands are PowerShell-native)
- [Node.js](https://nodejs.org) 20+ and npm (comes with Node)
- [Rust](https://rustup.rs) — only needed from step 13 onward (Tauri)
- A GitHub account — only needed from step 14 onward
- No prior experience with Tauri or service workers assumed; both are explained from first principles when they come up, and in more depth under [`content/concepts/`](../content/concepts/)

## How to use this guide

Each numbered file has the same three sections:

- **What & why** — the problem this step solves, before any code
- **Do this** — exact commands and file contents
- **How it works** — the mechanism, so you're not just copying

Type the code rather than copy-pasting where you can — the goal is a version you built and understand, not a clone.
