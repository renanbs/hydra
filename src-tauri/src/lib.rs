use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_window_state::StateFlags;

pub mod agent_discovery;
pub mod agent_state;
pub mod db;
pub mod git_status;
pub mod keep_awake;
pub mod pairing;
pub mod project_manager;
pub mod shell_detection;
pub mod terminal;
pub mod window_actions;
pub mod worktree_ops;

use agent_discovery::{probe_available_agents, AvailableAgent};
use agent_state::{detect_agent_state, fold_terminal_output};
use db::{ChatMessage, DatabaseManager, DbSessionRecord, HydraSettings, ToolApprovalRecord, UiLayoutState};
use git_status::{get_git_status, GitRepoStatus};
use keep_awake::{KeepAwakeManager, KeepAwakeStatus};
use pairing::{PairingManager, PairingPayload};
use shell_detection::{list_available_shells as probe_available_shells, AvailableShell};
use project_manager::{add_existing_project, list_local_projects, remove_added_project, HydraProject};
use terminal::{TerminalManager, TerminalSnapshot};
use worktree_ops::{
    create_git_worktree, create_new_project, list_git_worktrees, remove_git_worktree,
    CreateProjectParams, CreateWorktreeParams, GitWorktreeInfo,
};

pub struct AppState {
    pub terminal: Arc<TerminalManager>,
    pub db: Arc<DatabaseManager>,
    pub pairing: Arc<PairingManager>,
    pub keep_awake: Arc<KeepAwakeManager>,
}

#[tauri::command]
fn get_system_status() -> String {
    "Hydra Core Active (Rust 1.98 / Wayland)".to_string()
}

#[tauri::command]
fn get_app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
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
fn register_existing_project(path: String) -> Result<HydraProject, String> {
    add_existing_project(&path)
}

#[tauri::command]
fn remove_project(path: String) -> Result<(), String> {
    remove_added_project(&path)
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
fn get_layout_persistence(state: State<'_, AppState>) -> Result<UiLayoutState, String> {
    state.db.get_layout_state()
}

#[tauri::command]
fn save_layout_persistence(layout: UiLayoutState, state: State<'_, AppState>) -> Result<(), String> {
    state.db.save_layout_state(&layout)
}

#[tauri::command]
fn list_available_agents() -> Vec<AvailableAgent> {
    probe_available_agents()
}

#[tauri::command]
fn list_available_shells() -> Vec<AvailableShell> {
    probe_available_shells()
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
    let enabled = settings.keep_computer_awake_while_agents_run;
    state.db.save_settings(&settings)?;
    state.keep_awake.set_enabled(enabled);
    Ok(())
}

#[tauri::command]
fn get_keep_awake_status(state: State<'_, AppState>) -> KeepAwakeStatus {
    state.keep_awake.get_status()
}

#[tauri::command]
fn sync_keep_awake(enabled: bool, working_count: usize, state: State<'_, AppState>) -> KeepAwakeStatus {
    state.keep_awake.sync(enabled, working_count);
    state.keep_awake.get_status()
}

#[tauri::command]
fn set_keep_awake_working_count(working_count: usize, state: State<'_, AppState>) -> KeepAwakeStatus {
    state.keep_awake.set_working_count(working_count);
    state.keep_awake.get_status()
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
    let initial_enabled = db_manager
        .get_settings()
        .map(|s| s.keep_computer_awake_while_agents_run)
        .unwrap_or(false);
    let keep_awake_manager = Arc::new(KeepAwakeManager::new(initial_enabled));

    let state = AppState {
        terminal: terminal_manager,
        db: db_manager,
        pairing: pairing_manager,
        keep_awake: keep_awake_manager,
    };

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::all())
                .build(),
        )
        .setup(|app| {
            // Ensure Wayland taskbar/dock shows hydra crest, not generic Wayland icon (dev + installed)
            if let Some(window) = app.get_webview_window("main") {
                let icon_bytes = include_bytes!("../icons/icon.png");
                if let Ok(img) = image::load_from_memory(icon_bytes) {
                    let rgba = img.into_rgba8();
                    let (width, height) = rgba.dimensions();
                    let image = tauri::image::Image::new_owned(rgba.into_raw(), width, height);
                    let _ = window.set_icon(image);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_status,
            get_app_version,
            get_repo_git_status,
            list_projects,
            register_existing_project,
            remove_project,
            list_worktrees,
            create_project,
            create_worktree,
            delete_worktree,
            get_layout_persistence,
            save_layout_persistence,
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
            get_keep_awake_status,
            sync_keep_awake,
            set_keep_awake_working_count,
            list_available_shells,
            resolve_tool_approval,
            window_actions::window_minimize,
            window_actions::window_toggle_maximize,
            window_actions::window_close,
            window_actions::window_start_dragging
        ])
        .run(tauri::generate_context!())
        .expect("error while running hydra tauri application");
}
