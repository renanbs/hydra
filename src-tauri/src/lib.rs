pub mod agent_state;
pub mod db;
pub mod terminal;
pub mod window_actions;

use agent_state::{detect_agent_state, fold_terminal_output};
use db::{ChatMessage, DatabaseManager, ToolApprovalRecord};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_window_state::StateFlags;
use terminal::{TerminalManager, TerminalSnapshot};

pub struct AppState {
    pub terminal: Arc<TerminalManager>,
    pub db: Arc<DatabaseManager>,
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

#[tauri::command]
fn check_agent_state(state: State<'_, AppState>) -> Result<String, String> {
    let snapshot = state.terminal.get_snapshot()?;
    let detected = detect_agent_state(&snapshot.clean_text);
    Ok(detected.as_str().to_string())
}

#[tauri::command]
fn get_folded_logs(state: State<'_, AppState>, max_lines: usize) -> Result<String, String> {
    let snapshot = state.terminal.get_snapshot()?;
    Ok(fold_terminal_output(&snapshot.clean_text, max_lines))
}

#[tauri::command]
fn save_chat_message(
    session_id: String,
    role: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    state.db.save_message(&session_id, &role, &content)
}

#[tauri::command]
fn get_session_messages(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ChatMessage>, String> {
    state.db.list_messages(&session_id)
}

#[tauri::command]
fn resolve_tool_approval(
    approval_id: String,
    session_id: String,
    status: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let record = ToolApprovalRecord {
        id: approval_id.clone(),
        session_id,
        tool_name: "bash".to_string(),
        command: String::new(),
        status: status.clone(),
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64,
    };
    state.db.save_tool_approval(&record)?;

    // Emite evento para sincronizar UIs (Desktop e Mobile Companion)
    let _ = app.emit("tool_approval:resolved", record);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let terminal_manager = Arc::new(TerminalManager::new());
    let db_manager = Arc::new(DatabaseManager::new().expect("Falha ao inicializar banco SQLite"));

    let state = AppState {
        terminal: terminal_manager,
        db: db_manager,
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
            check_agent_state,
            get_folded_logs,
            save_chat_message,
            get_session_messages,
            resolve_tool_approval,
            window_actions::window_minimize,
            window_actions::window_toggle_maximize,
            window_actions::window_close,
            window_actions::window_start_dragging
        ])
        .run(tauri::generate_context!())
        .expect("error while running hydra tauri application");
}
