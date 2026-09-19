use std::sync::Arc;
use tauri::{AppHandle, State};
use tauri_plugin_window_state::StateFlags;

pub mod agent_discovery;
pub mod agent_state;
pub mod db;
pub mod pairing;
pub mod terminal;
pub mod window_actions;

use agent_discovery::{probe_available_agents, AvailableAgent};
use agent_state::{detect_agent_state, fold_terminal_output};
use db::{ChatMessage, DatabaseManager, ToolApprovalRecord};
use pairing::{PairingManager, PairingPayload};
use terminal::{TerminalManager, TerminalSnapshot};

pub struct AppState {
    pub terminal: Arc<TerminalManager>,
    pub db: Arc<DatabaseManager>,
    pub pairing: Arc<PairingManager>,
}

#[tauri::command]
fn get_system_status() -> String {
    "Hydra Core Active (Rust 1.98 / Wayland)".to_string()
}

#[tauri::command]
fn list_available_agents() -> Vec<AvailableAgent> {
    probe_available_agents()
}

#[tauri::command]
fn start_agent_terminal(
    session_id: String,
    executable: String,
    args: Vec<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.terminal.start_session(&session_id, &executable, args, app)
}

#[tauri::command]
fn send_terminal_input(
    session_id: String,
    input: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.terminal.write_input(&session_id, &input)
}

#[tauri::command]
fn get_terminal_snapshot(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<TerminalSnapshot, String> {
    state.terminal.get_snapshot(&session_id)
}

#[tauri::command]
fn check_agent_state(session_id: String, state: State<'_, AppState>) -> Result<String, String> {
    let snapshot = state.terminal.get_snapshot(&session_id)?;
    let detected = detect_agent_state(&snapshot.clean_text);
    Ok(detected.as_str().to_string())
}

#[tauri::command]
fn get_folded_logs(
    session_id: String,
    max_lines: usize,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let snapshot = state.terminal.get_snapshot(&session_id)?;
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
fn get_pairing_qr(state: State<'_, AppState>) -> Result<PairingPayload, String> {
    state.pairing.generate_pairing_payload()
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

    use tauri::Emitter;
    let _ = app.emit("tool_approval:resolved", record);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let terminal_manager = Arc::new(TerminalManager::new());
    let db_manager = Arc::new(DatabaseManager::new().expect("Failed to initialize SQLite database"));
    let pairing_manager = Arc::new(PairingManager::new());

    let state = AppState {
        terminal: terminal_manager,
        db: db_manager,
        pairing: pairing_manager,
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
            list_available_agents,
            start_agent_terminal,
            send_terminal_input,
            get_terminal_snapshot,
            check_agent_state,
            get_folded_logs,
            save_chat_message,
            get_session_messages,
            get_pairing_qr,
            resolve_tool_approval,
            window_actions::window_minimize,
            window_actions::window_toggle_maximize,
            window_actions::window_close,
            window_actions::window_start_dragging
        ])
        .run(tauri::generate_context!())
        .expect("error while running hydra tauri application");
}
