# Concept: Tauri IPC (inter-process communication)

## The shape of a Tauri app

A Tauri app is two processes talking to each other: a native Rust process (has full OS access — filesystem, native APIs) hosting a webview that renders your HTML/CSS/JS (has none of that access, same sandbox as a browser tab). "IPC" is the bridge between them — the mechanism by which JS in the webview can ask Rust to do something it can't do itself, and get a result back.

## `invoke`: the request/response half

Rust functions marked `#[tauri::command]` and registered in `.invoke_handler(tauri::generate_handler![...])` become callable from JS as `await window.__TAURI__.core.invoke("command_name", args)`. This project has exactly one: `list_topics()`, which reads `topics/*/data.json` off disk and returns them as JSON — the thing the webview sandbox can't do on its own (`fetch("file:///...")` doesn't work the way `fetch("https://...")` does, and there's no filesystem API in a browser context at all). `public/app.js`'s `loadTopics()` tries this first, before falling back to a network fetch or the inlined seed data (see [[../architecture]]).

## Events: the push half

`invoke` is Rust answering a question JS asked. Sometimes Rust needs to tell JS something *unprompted* — here, "a topic file changed on disk, go re-render." That's what `app_handle.emit("topics-changed", ())` in `src-tauri/src/lib.rs` does, paired with `listen("topics-changed", ...)` in `app.js`'s `initTauriWatch()`. The watcher itself is a background OS-level filesystem watch (the `notify` crate) running on its own thread, started once in the `.setup()` hook — it's not polling, and it's not blocking the main Tauri event loop.

## Why `list_topics` doesn't take the topics-dir path as an argument

The obvious-looking API would be `invoke("list_topics", { dir: "..." })` — but that means the *webview* (untrusted, in the security model Tauri assumes) decides which arbitrary filesystem path Rust reads from, which is exactly the kind of thing Tauri's permission system (`capabilities/*.json`) exists to prevent by default. Instead, `resolve_topics_dir()` runs entirely on the Rust side — env var, then walking up from the working directory, then walking up from the executable's own location — so the *path itself* is never something JS can influence, only whether the call happens at all.

## Permissions (`capabilities/default.json`)

Tauri v2 denies every capability by default; each window explicitly opts into what it needs. This project's `main` window is granted `core:window:allow-minimize` / `allow-toggle-maximize` / `allow-close` / `allow-start-dragging` (for the custom titlebar buttons — see [[../decisions]] on why there's no native titlebar to fall back on) and `core:event:default` (so `listen()` works for `topics-changed`). Notably *absent*: any filesystem permission — because the frontend never touches the filesystem directly, only through the one narrow `list_topics` command, which does its own path resolution server-side.

## Where to look in this repo

- `src-tauri/src/lib.rs` — `list_topics`, `resolve_topics_dir`, the `notify` watcher setup
- `src-tauri/capabilities/default.json` — exactly what the webview is allowed to invoke
- `public/app.js` — `loadTopics()` (the `invoke` call) and `initTauriWatch()` (the `listen` call)
