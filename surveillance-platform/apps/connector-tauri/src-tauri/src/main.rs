// Tauri shell. Spawns the Node worker as a sidecar and exposes a tray UI for
// pairing-code entry + status. The actual command-loop logic lives in
// ../worker/index.js (Node) — keep this file thin so we can iterate the
// product surface in JS without recompiling Rust.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
