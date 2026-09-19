pub mod terminal;
pub mod window_actions;

use std::sync::Arc;
use tauri::{AppHandle, State};
use tauri_plugin_window_state::StateFlags;
use terminal::{TerminalManager, TerminalSnapshot};

pub struct AppState {
    pub terminal: Arc<TerminalManager>,
}

#[tauri::command]
fn get_system_status() -> String {
    "Hydra Core Active (Rust 1.98 / Wayland)".to_string()
}

#[tauri::command]
fn start_terminal_session(state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    state.terminal.start_shell(app)
}

#[tauri::command]
fn send_terminal_input(input: String, state: State<'_, AppState>) -> Result<(), String> {
    state.terminal.write_input(&input)
}

#[tauri::command]
fn get_terminal_snapshot(state: State<'_, AppState>) -> Result<TerminalSnapshot, String> {
    state.terminal.get_snapshot()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let terminal_manager = Arc::new(TerminalManager::new());
    let state = AppState {
        terminal: terminal_manager,
    };

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::all())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_system_status,
            start_terminal_session,
            send_terminal_input,
            get_terminal_snapshot,
            window_actions::window_minimize,
            window_actions::window_toggle_maximize,
            window_actions::window_close,
            window_actions::window_start_dragging
        ])
        .run(tauri::generate_context!())
        .expect("error while running hydra tauri application");
}
