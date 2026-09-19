use std::sync::Arc;
use tauri::{AppHandle, State};
use tauri_plugin_window_state::StateFlags;

pub mod agent_discovery;
pub mod agent_state;
pub mod db;
pub mod git_status;
pub mod pairing;
pub mod project_manager;
pub mod terminal;
pub mod window_actions;
pub mod worktree_ops;

use agent_discovery::{probe_available_agents, AvailableAgent};
use agent_state::{detect_agent_state, fold_terminal_output};
use db::{ChatMessage, DatabaseManager, DbSessionRecord, HydraSettings, ToolApprovalRecord};
use git_status::{get_git_status, GitRepoStatus};
use pairing::{PairingManager, PairingPayload};
use project_manager::{list_local_projects, HydraProject};
use terminal::{TerminalManager, TerminalSnapshot};
use worktree_ops::{
    create_git_worktree, create_new_project, list_git_worktrees, remove_git_worktree,
    CreateProjectParams, CreateWorktreeParams, GitWorktreeInfo,
};

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
fn get_repo_git_status() -> Result<GitRepoStatus, String> {
    get_git_status()
}

#[tauri::command]
fn list_projects() -> Vec<HydraProject> {
    list_local_projects()
}

#[tauri::command]
fn list_worktrees(repo_path: String) -> Result<Vec<GitWorktreeInfo>, String> {
    list_git_worktrees(&repo_path)
}

#[tauri::command]
fn create_project(name: String, parent_dir: String, init_git: bool) -> Result<String, String> {
    create_new_project(CreateProjectParams {
        name,
        parent_dir,
        init_git,
    })
}

#[tauri::command]
fn create_worktree(repo_path: String, branch_name: String, new_branch: bool) -> Result<String, String> {
    create_git_worktree(CreateWorktreeParams {
        repo_path,
        branch_name,
        new_branch,
    })
}

#[tauri::command]
fn delete_worktree(repo_path: String, worktree_path: String) -> Result<(), String> {
    remove_git_worktree(&repo_path, &worktree_path)
}

#[tauri::command]
fn list_available_agents() -> Vec<AvailableAgent> {
    probe_available_agents()
}

#[tauri::command]
fn list_persisted_sessions(
    project_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<DbSessionRecord>, String> {
    state.db.list_sessions(project_path.as_deref())
}

#[tauri::command]
fn save_session_record(record: DbSessionRecord, state: State<'_, AppState>) -> Result<(), String> {
    state.db.upsert_session(&record)
}

#[tauri::command]
fn delete_session_record(session_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.delete_session(&session_id)?;
    state.terminal.close_session(&session_id);
    Ok(())
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
fn get_settings(state: State<'_, AppState>) -> Result<HydraSettings, String> {
    state.db.get_settings()
}

#[tauri::command]
fn save_settings(settings: HydraSettings, state: State<'_, AppState>) -> Result<(), String> {
    state.db.save_settings(&settings)
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
            get_repo_git_status,
            list_projects,
            list_worktrees,
            create_project,
            create_worktree,
            delete_worktree,
            list_available_agents,
            list_persisted_sessions,
            save_session_record,
            delete_session_record,
            start_agent_terminal,
            send_terminal_input,
            get_terminal_snapshot,
            check_agent_state,
            get_folded_logs,
            save_chat_message,
            get_session_messages,
            get_pairing_qr,
            get_settings,
            save_settings,
            resolve_tool_approval,
            window_actions::window_minimize,
            window_actions::window_toggle_maximize,
            window_actions::window_close,
            window_actions::window_start_dragging
        ])
        .run(tauri::generate_context!())
        .expect("error while running hydra tauri application");
}
