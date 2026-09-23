use notify::{RecursiveMode, Watcher};
use serde_json::Value;
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::time::Duration;
use tauri::Emitter;

/// Finds the `topics/` folder to read live from, in priority order:
/// 1. `REFERENCE_TOPICS_DIR` env var, if set
/// 2. Walking up from the current working directory
/// 3. Walking up from the running executable's directory
/// This lets `npm run tauri dev` read the repo's `topics/` folder straight from
/// disk with no rebuild step: edit a JSON file, save, and the open window updates.
fn resolve_topics_dir() -> Option<PathBuf> {
    if let Ok(env_dir) = std::env::var("REFERENCE_TOPICS_DIR") {
        let path = PathBuf::from(env_dir);
        if path.is_dir() {
            return Some(path);
        }
    }

    let candidates = [std::env::current_dir().ok(), std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf()))];

    for start in candidates.into_iter().flatten() {
        let mut dir = Some(start.as_path());
        while let Some(d) = dir {
            let candidate = d.join("topics");
            if candidate.is_dir() {
                return Some(candidate);
            }
            dir = d.parent();
        }
    }

    None
}

fn read_topics_from(dir: &PathBuf) -> Result<Vec<Value>, String> {
    let mut topics = Vec::new();
    let entries = std::fs::read_dir(dir).map_err(|e| format!("cannot read {}: {e}", dir.display()))?;

    let mut dirs: Vec<PathBuf> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.is_dir()
                && !p
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .starts_with('_')
        })
        .collect();
    dirs.sort();

    for dir in dirs {
        let data_path = dir.join("data.json");
        if !data_path.is_file() {
            continue;
        }
        let raw = std::fs::read_to_string(&data_path).map_err(|e| format!("cannot read {}: {e}", data_path.display()))?;
        let value: Value = serde_json::from_str(&raw).map_err(|e| format!("invalid JSON in {}: {e}", data_path.display()))?;
        topics.push(value);
    }

    Ok(topics)
}

#[tauri::command]
fn list_topics() -> Result<Vec<Value>, String> {
    let dir = resolve_topics_dir().ok_or_else(|| "could not locate a topics/ folder".to_string())?;
    read_topics_from(&dir)
}

fn spawn_topics_watcher(app: &tauri::App) {
    let Some(topics_dir) = resolve_topics_dir() else {
        eprintln!("dev-reference: no topics/ folder found, live-reload watcher not started");
        return;
    };

    let app_handle = app.handle().clone();
    std::thread::spawn(move || {
        let (tx, rx) = channel();
        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("dev-reference: failed to start file watcher: {e}");
                return;
            }
        };
        if let Err(e) = watcher.watch(&topics_dir, RecursiveMode::Recursive) {
            eprintln!("dev-reference: failed to watch {}: {e}", topics_dir.display());
            return;
        }

        // Coalesce bursts of filesystem events (editors often emit several per save)
        // into a single reload notification.
        loop {
            match rx.recv() {
                Ok(_) => {
                    while rx.recv_timeout(Duration::from_millis(200)).is_ok() {}
                    let _ = app_handle.emit("topics-changed", ());
                }
                Err(_) => break,
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_topics])
        .setup(|app| {
            spawn_topics_watcher(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running dev-reference");
}
