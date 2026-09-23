# 13 — Tauri desktop

## What & why

The same site, as a native Windows/Mac window — but with one meaningful upgrade over the web version: instead of reading topic data from a build-time snapshot, the desktop app reads `topics/*.json` **live off disk**, so editing a JSON file and saving it updates the open window immediately, with no rebuild. That's only possible because a native app (unlike a webpage) can access the real filesystem — which is exactly what Tauri's Rust half is for.

## Do this

Install prerequisites: [Rust via rustup](https://rustup.rs), then the Tauri CLI:

```powershell
npm install --save-dev @tauri-apps/cli
```

Scaffold the Rust side by hand (or start from `npx tauri init` and adjust — writing it directly is shown here since it's a handful of files):

`src-tauri/Cargo.toml`:

```toml
[package]
name = "dev-reference"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde_json = "1"
notify = "6"
```

`src-tauri/build.rs`: `fn main() { tauri_build::build() }`

`src-tauri/src/lib.rs` — the one command the frontend will call:

```rust
use std::path::PathBuf;
use serde_json::Value;

fn resolve_topics_dir() -> Option<PathBuf> {
    let mut dir = std::env::current_dir().ok()?;
    loop {
        let candidate = dir.join("topics");
        if candidate.is_dir() { return Some(candidate); }
        if !dir.pop() { return None; }
    }
}

#[tauri::command]
fn list_topics() -> Result<Vec<Value>, String> {
    let dir = resolve_topics_dir().ok_or("no topics/ folder found")?;
    let mut topics = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        let data_file = path.join("data.json");
        if data_file.is_file() {
            let raw = std::fs::read_to_string(&data_file).map_err(|e| e.to_string())?;
            topics.push(serde_json::from_str(&raw).map_err(|e| e.to_string())?);
        }
    }
    Ok(topics)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_topics])
        .run(tauri::generate_context!())
        .expect("error while running dev-reference");
}
```

`src-tauri/src/main.rs`:

```rust
fn main() { dev_reference_lib::run(); }
```

(Set `[lib] name = "dev_reference_lib"` in `Cargo.toml` to match.)

`src-tauri/tauri.conf.json` — the frameless 1200×800 window:

```json
{
  "productName": "Dev Reference",
  "identifier": "so.dev-reference.app",
  "build": { "frontendDist": "../dist", "beforeBuildCommand": "npm run build" },
  "app": {
    "withGlobalTauri": true,
    "windows": [{ "title": "Dev Reference", "width": 1200, "height": 800, "minWidth": 800, "minHeight": 600, "decorations": false }]
  },
  "bundle": { "active": true, "icon": ["icons/icon.ico", "icons/icon.icns", "icons/128x128.png"] }
}
```

Call `list_topics` from the frontend, in `public/app.js` — preferring it over any web fetch when running inside Tauri:

```js
const IS_TAURI = Boolean(window.__TAURI__);

async function loadTopics() {
  if (IS_TAURI) {
    return window.__TAURI__.core.invoke("list_topics");
  }
  // ...fall back to the web fetch/inlined-seed logic from earlier steps
}
```

Generate icons and run it:

```powershell
npx tauri icon public\icons\icon-1024.png -o src-tauri\icons
npm run tauri dev
```

## How it works

**Why `list_topics` returns `Vec<Value>` (generic JSON), not a typed Rust struct matching `TopicData`.** You *could* write `#[derive(Deserialize)] struct Entry { name: String, language: String, ... }` in Rust to mirror `src/lib/topics.ts`'s TypeScript types — but then the schema is defined in two languages, and every future field/enum change needs both updated in lockstep or one side silently drops data. Generic `serde_json::Value` passthrough means Rust's job is just "read the bytes, confirm it's valid JSON, hand it over" — the *one* place that actually understands the schema stays `src/lib/topics.ts` on the JS side. See [`content/decisions.md`](../content/decisions.md) for this reasoning in full, and [`content/concepts/tauri-ipc.md`](../content/concepts/tauri-ipc.md) for how `invoke`/events work more generally.

**Why the webview can't just read the file itself.** A Tauri webview runs the same sandboxed JS environment as a browser tab — no filesystem access, by design (that sandbox is a security boundary, not an oversight). `invoke("list_topics")` is JS asking the *trusted* Rust process, which has full OS access, to do the filesystem read on its behalf and hand back only the result. This is also why the frontend never passes a path as an argument to `list_topics` (`invoke("list_topics", { dir: "..." })`) — letting untrusted JS pick an arbitrary path for a trusted process to read defeats the point of the sandbox; `resolve_topics_dir()` decides the path entirely on the Rust side.

**Live reload without a rebuild — the piece this step's example leaves out, worth adding once the above works.** Add the `notify` crate, watch the resolved `topics/` directory in a background thread started from a `.setup()` hook, and on any change call `app_handle.emit("topics-changed", ())`. The frontend's `window.__TAURI__.event.listen("topics-changed", ...)` re-calls `list_topics` and re-renders. This is what makes "edit JSON, see it update instantly" actually true rather than "true after you restart the app" — see this project's real `src-tauri/src/lib.rs` for the full implementation.
