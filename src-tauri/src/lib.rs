use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_window_state::StateFlags;

pub mod agent_discovery;
pub mod agent_state;
pub mod daemon_client;
pub mod db;
pub mod fs_ops;
pub mod git_status;
pub mod ipc;
pub mod keep_awake;
pub mod pairing;
pub mod project_manager;
pub mod server;
pub mod shell_detection;
pub mod terminal;
pub mod window_actions;
pub mod worktree_ops;
pub mod preflight;
pub mod theme_import;

use agent_discovery::{probe_available_agents, AvailableAgent};
use agent_state::{detect_agent_state, fold_terminal_output};
use db::{ChatMessage, DatabaseManager, DbSessionRecord, HydraSettings, ToolApprovalRecord, UiLayoutState, WorkbenchState};
use fs_ops::{create_file, create_folder, delete_path, list_directory, rename_path, search_files_content, DirectoryListing, FileContent, read_file_text, SearchResult};
use git_status::{
    check_git_ignored, get_branch_commits, get_detailed_git_status, get_diff_numstat, get_git_history,
    get_git_status, get_git_status_for_path, get_submodule_live_status, git_commit, git_commit_amend,
    git_diff, git_discard_file, git_pull, git_push, git_stash_list, git_stash_pop, git_stash_push,
    git_stage_all, git_stage_file, git_stage_paths, git_unstage_all, git_unstage_file,
    git_unstage_paths, DetailedGitStatus, DiffNumStat, GitCommitEntry, GitRepoStatus,
};
use keep_awake::{KeepAwakeManager, KeepAwakeStatus};
use pairing::{PairingManager, PairingPayload};
use shell_detection::{list_available_shells as probe_available_shells, AvailableShell};
use preflight::{check_github_starred, check_preflight_tools, open_external_url, star_github_repo, PreflightStatus};
use project_manager::{
    add_existing_project, get_project_worktree_base_path, list_local_projects, remove_added_project,
    set_project_worktree_base_path, HydraProject,
};
use terminal::{TerminalManager, TerminalSnapshot};
use worktree_ops::{
    clone_git_repository, create_git_worktree, create_new_project, list_git_worktrees,
    remove_git_worktree, CreateProjectParams, CreateWorktreeParams, GitWorktreeInfo,
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
async fn check_preflight_tools_cmd() -> PreflightStatus {
    tokio::task::spawn_blocking(check_preflight_tools).await.unwrap_or(PreflightStatus {
        git_installed: false,
        gh_installed: false,
        gh_authenticated: false,
    })
}

#[tauri::command]
async fn check_github_starred_cmd(repo: Option<String>) -> Option<bool> {
    let r = repo.unwrap_or_else(|| "renanbs/hydra".to_string());
    tokio::task::spawn_blocking(move || check_github_starred(&r)).await.ok().flatten()
}

#[tauri::command]
async fn star_github_repo_cmd(repo: Option<String>) -> Result<bool, String> {
    let r = repo.unwrap_or_else(|| "renanbs/hydra".to_string());
    tokio::task::spawn_blocking(move || star_github_repo(&r)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn open_external_url_cmd(url: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || open_external_url(&url)).await.map_err(|e| e.to_string())?
}


#[tauri::command]
async fn get_repo_git_status() -> Result<GitRepoStatus, String> {
    tokio::task::spawn_blocking(get_git_status).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_repo_git_status_for_path(repoPath: String) -> Result<GitRepoStatus, String> {
    tokio::task::spawn_blocking(move || get_git_status_for_path(&repoPath)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_detailed_git_status_cmd(repoPath: String) -> Result<DetailedGitStatus, String> {
    tokio::task::spawn_blocking(move || get_detailed_git_status(&repoPath)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn git_stage(repoPath: String, file: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || git_stage_file(&repoPath, &file)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_unstage(repoPath: String, file: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || git_unstage_file(&repoPath, &file)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_discard(repoPath: String, file: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || git_discard_file(&repoPath, &file)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_commit_cmd(repoPath: String, message: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || git_commit(&repoPath, &message)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_commit_amend_cmd(repoPath: String, message: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || git_commit_amend(&repoPath, &message)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_diff_cmd(repoPath: String, file: String, staged: bool) -> Result<String, String> {
    tokio::task::spawn_blocking(move || git_diff(&repoPath, &file, staged)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn list_directory_cmd(path: String) -> Result<DirectoryListing, String> {
    tokio::task::spawn_blocking(move || list_directory(&path)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn read_file_text_cmd(path: String) -> Result<FileContent, String> {
    tokio::task::spawn_blocking(move || read_file_text(&path)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn search_files_cmd(repoPath: String, query: String, maxResults: usize) -> Result<Vec<SearchResult>, String> {
    tokio::task::spawn_blocking(move || search_files_content(&repoPath, &query, maxResults)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn get_git_history_cmd(repoPath: String, limit: usize) -> Result<Vec<GitCommitEntry>, String> {
    tokio::task::spawn_blocking(move || get_git_history(&repoPath, limit)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_stage_all_cmd(repoPath: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || git_stage_all(&repoPath)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_unstage_all_cmd(repoPath: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || git_unstage_all(&repoPath)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn check_git_ignored_cmd(repoPath: String, paths: Vec<String>) -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(move || check_git_ignored(&repoPath, &paths)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn get_diff_numstat_cmd(repoPath: String, staged: bool) -> Result<Vec<DiffNumStat>, String> {
    tokio::task::spawn_blocking(move || get_diff_numstat(&repoPath, staged)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn create_file_cmd(path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || create_file(&path)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn create_folder_cmd(path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || create_folder(&path)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn rename_path_cmd(oldPath: String, newPath: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || rename_path(&oldPath, &newPath)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn delete_path_cmd(path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || delete_path(&path)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn get_branch_commits_cmd(repoPath: String, baseRef: String, limit: usize) -> Result<Vec<GitCommitEntry>, String> {
    tokio::task::spawn_blocking(move || get_branch_commits(&repoPath, &baseRef, limit)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_push_cmd(repoPath: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || git_push(&repoPath)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_pull_cmd(repoPath: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || git_pull(&repoPath)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_stage_paths_cmd(repoPath: String, paths: Vec<String>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || git_stage_paths(&repoPath, &paths)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_unstage_paths_cmd(repoPath: String, paths: Vec<String>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || git_unstage_paths(&repoPath, &paths)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn get_submodule_paths_cmd(repoPath: String) -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(move || get_submodule_live_status(&repoPath)).await.map_err(|e| e.to_string())
}
#[tauri::command]
async fn git_stash_list_cmd(repoPath: String) -> Result<Vec<GitCommitEntry>, String> {
    tokio::task::spawn_blocking(move || git_stash_list(&repoPath)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_stash_push_cmd(repoPath: String, message: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || git_stash_push(&repoPath, &message)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn git_stash_pop_cmd(repoPath: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || git_stash_pop(&repoPath)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn open_in_file_manager(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    let target = if p.is_file() { p.parent().unwrap_or(p).to_string_lossy().to_string() } else { path.clone() };
    tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "linux")]
        { std::process::Command::new("xdg-open").arg(&target).spawn().map_err(|e| e.to_string())?; }
        #[cfg(target_os = "macos")]
        { std::process::Command::new("open").arg(&target).spawn().map_err(|e| e.to_string())?; }
        #[cfg(target_os = "windows")]
        { std::process::Command::new("explorer").arg(&target).spawn().map_err(|e| e.to_string())?; }
        Ok(())
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
async fn open_in_external_editor(path: String, command: String) -> Result<(), String> {
    if command.trim().is_empty() { return Err("No command".to_string()); }
    let cmd = command.trim().split_whitespace().next().unwrap_or(&command).to_string();
    let args: Vec<String> = command.trim().split_whitespace().skip(1).map(|s| s.to_string()).collect();
    tokio::task::spawn_blocking(move || {
        let mut c = std::process::Command::new(&cmd);
        for a in &args { c.arg(a); }
        c.arg(&path);
        c.spawn().map_err(|e| format!("Failed to launch '{}': {}", cmd, e))?;
        Ok(())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn list_projects() -> Vec<HydraProject> {
    list_local_projects()
}

#[tauri::command]
async fn register_existing_project(path: String) -> Result<HydraProject, String> {
    add_existing_project(&path)
}

#[tauri::command]
async fn remove_project(path: String) -> Result<(), String> {
    remove_added_project(&path)
}

#[tauri::command]
async fn get_project_worktree_base(path: String) -> Option<String> {
    get_project_worktree_base_path(&path)
}

#[tauri::command]
async fn set_project_worktree_base(path: String, base_path: Option<String>) -> Result<(), String> {
    set_project_worktree_base_path(&path, base_path.as_deref())
}

#[tauri::command]
async fn list_worktrees(repo_path: String) -> Result<Vec<GitWorktreeInfo>, String> {
    list_git_worktrees(&repo_path)
}

#[tauri::command]
async fn create_project(name: String, parent_dir: String, init_git: bool) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let path = create_new_project(CreateProjectParams {
            name,
            parent_dir,
            init_git,
        })?;
        let _ = add_existing_project(&path);
        Ok(path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn clone_project(url: String, parent_dir: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let path = clone_git_repository(&url, &parent_dir)?;
        let _ = add_existing_project(&path);
        Ok(path)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn create_worktree(repo_path: String, branch_name: String, new_branch: bool) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        create_git_worktree(CreateWorktreeParams {
            repo_path,
            branch_name,
            new_branch,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn delete_worktree(repo_path: String, worktree_path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || remove_git_worktree(&repo_path, &worktree_path))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_layout_persistence(state: State<'_, AppState>) -> Result<UiLayoutState, String> {
    state.db.get_layout_state()
}

#[tauri::command]
async fn save_layout_persistence(layout: UiLayoutState, state: State<'_, AppState>) -> Result<(), String> {
    state.db.save_layout_state(&layout)
}

#[tauri::command]
async fn get_workbench_persistence(state: State<'_, AppState>) -> Result<WorkbenchState, String> {
    state.db.get_workbench_state()
}

#[tauri::command]
async fn save_workbench_persistence(state: WorkbenchState, state_db: State<'_, AppState>) -> Result<(), String> {
    state_db.db.save_workbench_state(&state)
}

#[tauri::command]
async fn get_workbench_persistence_for_project(
    project_path: String,
    app_state: State<'_, AppState>,
) -> Result<WorkbenchState, String> {
    app_state.db.get_workbench_state_for_project(&project_path)
}

#[tauri::command]
async fn save_workbench_persistence_for_project(
    project_path: String,
    state: WorkbenchState,
    app_state: State<'_, AppState>,
) -> Result<(), String> {
    app_state.db.save_workbench_state_for_project(&project_path, &state)
}

#[tauri::command]
async fn list_available_agents() -> Vec<AvailableAgent> {
    tokio::task::spawn_blocking(probe_available_agents).await.unwrap_or_default()
}

#[tauri::command]
async fn list_available_shells() -> Vec<AvailableShell> {
    tokio::task::spawn_blocking(probe_available_shells).await.unwrap_or_default()
}

#[tauri::command]
async fn list_persisted_sessions(
    project_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<DbSessionRecord>, String> {
    state.db.list_sessions(project_path.as_deref())
}

#[tauri::command]
async fn save_session_record(record: DbSessionRecord, state: State<'_, AppState>) -> Result<(), String> {
    state.db.upsert_session(&record)
}

#[tauri::command]
async fn delete_session_record(session_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.delete_session(&session_id)?;
    // Try daemon first
    if daemon_client::daemon_available() {
        let req = daemon_client::DaemonRequest { op: "close".to_string(), session_id: Some(session_id.clone()), executable: None, args: None, cwd: None, input: None, rows: None, cols: None, offset: None };
        let _ = daemon_client::daemon_request(&req);
    }
    // close_session terminates the PTY process group, reaps it and joins the
    // reader thread — it may block briefly, so never run it on the tokio runtime.
    let terminal = state.terminal.clone();
    tokio::task::spawn_blocking(move || terminal.close_session(&session_id))
        .await
        .map_err(|e| format!("Failed to join terminal close task: {e}"))?;
    Ok(())
}

#[tauri::command]
async fn start_agent_terminal(
    session_id: String,
    executable: String,
    args: Vec<String>,
    cwd: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if daemon_client::daemon_available() {
        let req = daemon_client::DaemonRequest { op: "start".to_string(), session_id: Some(session_id.clone()), executable: Some(executable.clone()), args: Some(args.clone()), cwd: cwd.clone(), input: None, rows: None, cols: None, offset: None };
        match daemon_client::daemon_request(&req) {
            Ok(r) if r.ok => {
                let sid = session_id.clone();
                let app_handle = app.clone();
                std::thread::spawn(move || {
                    let mut offset = 0usize;
                    let mut last_state: Option<String> = None;
                    let mut poll_counter: usize = 0;
                    loop {
                        std::thread::sleep(std::time::Duration::from_millis(50));
                        let poll_req = daemon_client::DaemonRequest {
                            op: "poll".to_string(),
                            session_id: Some(sid.clone()),
                            executable: None,
                            args: None,
                            cwd: None,
                            input: None,
                            rows: None,
                            cols: None,
                            offset: Some(offset),
                        };
                        match daemon_client::daemon_request(&poll_req) {
                            Ok(res) if res.ok => {
                                if let Some(data) = res.data {
                                    let chunk = data.get("data").and_then(|v| v.as_str()).unwrap_or("");
                                    let next = data.get("next_offset").and_then(|v| v.as_u64()).unwrap_or(offset as u64) as usize;
                                    if !chunk.is_empty() {
                                        #[derive(serde::Serialize, Clone)]
                                        struct OutputPayload {
                                            session_id: String,
                                            output: String,
                                        }
                                        use tauri::Emitter;
                                        let _ = app_handle.emit(
                                            "terminal:output",
                                            OutputPayload {
                                                session_id: sid.clone(),
                                                output: chunk.to_string(),
                                            },
                                        );
                                    }
                                    offset = next;
                                }
                                // Push agent state via snapshot every ~200ms (4 * 50ms) — throttle to avoid IPC flood
                                poll_counter = poll_counter.wrapping_add(1);
                                if poll_counter % 4 == 0 {
                                    let snap_req = daemon_client::DaemonRequest {
                                        op: "snapshot".to_string(),
                                        session_id: Some(sid.clone()),
                                        executable: None,
                                        args: None,
                                        cwd: None,
                                        input: None,
                                        rows: None,
                                        cols: None,
                                        offset: None,
                                    };
                                    if let Ok(snap_res) = daemon_client::daemon_request(&snap_req) {
                                        if snap_res.ok {
                                            if let Some(snap_data) = snap_res.data {
                                                if let Ok(snap) = serde_json::from_value::<TerminalSnapshot>(snap_data) {
                                                    let detected = detect_agent_state(&snap.clean_text);
                                                    let state_str = detected.as_str().to_string();
                                                    if last_state.as_deref() != Some(&state_str) {
                                                        use tauri::Emitter;
                                                        let _ = app_handle.emit(
                                                            "agent:state",
                                                            serde_json::json!({
                                                                "session_id": sid.clone(),
                                                                "sessionId": sid.clone(),
                                                                "state": state_str.clone()
                                                            }),
                                                        );
                                                        last_state = Some(state_str);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            _ => break,
                        }
                    }
                });
                return Ok(());
            }
            Ok(r) => return Err(r.error.unwrap_or_else(|| "daemon error".to_string())),
            Err(_) => {} // fallback to local
        }
    }
    state.terminal.start_session(&session_id, &executable, args, cwd, app)
}

#[tauri::command]
async fn resize_terminal(
    session_id: String,
    rows: u16,
    cols: u16,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if daemon_client::daemon_available() {
        let req = daemon_client::DaemonRequest { op: "resize".to_string(), session_id: Some(session_id.clone()), executable: None, args: None, cwd: None, input: None, rows: Some(rows), cols: Some(cols), offset: None };
        match daemon_client::daemon_request(&req) {
            Ok(r) if r.ok => return Ok(()),
            Ok(r) => return Err(r.error.unwrap_or_else(|| "daemon error".to_string())),
            Err(_) => {}
        }
    }
    state.terminal.resize_session(&session_id, rows, cols)
}

#[tauri::command]
async fn send_terminal_input(
    session_id: String,
    input: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if daemon_client::daemon_available() {
        let req = daemon_client::DaemonRequest { op: "write".to_string(), session_id: Some(session_id.clone()), executable: None, args: None, cwd: None, input: Some(input.clone()), rows: None, cols: None, offset: None };
        match daemon_client::daemon_request(&req) {
            Ok(r) if r.ok => return Ok(()),
            Ok(r) => return Err(r.error.unwrap_or_else(|| "daemon error".to_string())),
            Err(_) => {}
        }
    }
    state.terminal.write_input(&session_id, &input)
}

#[tauri::command]
async fn get_terminal_snapshot(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<TerminalSnapshot, String> {
    if daemon_client::daemon_available() {
        let req = daemon_client::DaemonRequest { op: "snapshot".to_string(), session_id: Some(session_id.clone()), executable: None, args: None, cwd: None, input: None, rows: None, cols: None, offset: None };
        match daemon_client::daemon_request(&req) {
            Ok(r) if r.ok => {
                if let Some(data) = r.data {
                    if let Ok(snap) = serde_json::from_value::<TerminalSnapshot>(data) {
                        return Ok(snap);
                    }
                }
                return Err("bad daemon snapshot".to_string());
            },
            Ok(r) => return Err(r.error.unwrap_or_else(|| "daemon error".to_string())),
            Err(_) => {}
        }
    }
    state.terminal.get_snapshot(&session_id)
}

#[tauri::command]
async fn check_agent_state(session_id: String, state: State<'_, AppState>) -> Result<String, String> {
    let snapshot = if daemon_client::daemon_available() {
        let req = daemon_client::DaemonRequest { op: "snapshot".to_string(), session_id: Some(session_id.clone()), executable: None, args: None, cwd: None, input: None, rows: None, cols: None, offset: None };
        match daemon_client::daemon_request(&req) {
            Ok(r) if r.ok => r.data.and_then(|d| serde_json::from_value::<TerminalSnapshot>(d).ok()).ok_or_else(|| "bad daemon snapshot".to_string())?,
            _ => state.terminal.get_snapshot(&session_id)?,
        }
    } else { state.terminal.get_snapshot(&session_id)? };
    let detected = detect_agent_state(&snapshot.clean_text);
    Ok(detected.as_str().to_string())
}

#[tauri::command]
async fn get_folded_logs(
    session_id: String,
    max_lines: usize,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let snapshot = if daemon_client::daemon_available() {
        let req = daemon_client::DaemonRequest { op: "snapshot".to_string(), session_id: Some(session_id.clone()), executable: None, args: None, cwd: None, input: None, rows: None, cols: None, offset: None };
        match daemon_client::daemon_request(&req) {
            Ok(r) if r.ok => r.data.and_then(|d| serde_json::from_value::<TerminalSnapshot>(d).ok()).ok_or_else(|| "bad daemon snapshot".to_string())?,
            _ => state.terminal.get_snapshot(&session_id)?,
        }
    } else { state.terminal.get_snapshot(&session_id)? };
    Ok(fold_terminal_output(&snapshot.clean_text, max_lines))
}

#[tauri::command]
async fn save_chat_message(
    session_id: String,
    role: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || db.save_message(&session_id, &role, &content))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_session_messages(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ChatMessage>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || db.list_messages(&session_id))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_pairing_qr(state: State<'_, AppState>) -> Result<PairingPayload, String> {
    let pairing = state.pairing.clone();
    tokio::task::spawn_blocking(move || pairing.generate_pairing_payload())
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<HydraSettings, String> {
    state.db.get_settings()
}

#[tauri::command]
async fn save_settings(settings: HydraSettings, app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let enabled = settings.keep_computer_awake_while_agents_run;
    let before = state.keep_awake.get_status();
    state.db.save_settings(&settings)?;
    state.keep_awake.set_enabled(enabled);
    let after = state.keep_awake.get_status();
    if before.active != after.active || before.enabled != after.enabled {
        let _ = app.emit("keep_awake:status", after.clone());
    }
    Ok(())
}

#[tauri::command]
async fn list_terminal_sessions(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    if daemon_client::daemon_available() {
        let req = daemon_client::DaemonRequest { op: "list".to_string(), session_id: None, executable: None, args: None, cwd: None, input: None, rows: None, cols: None, offset: None };
        if let Ok(r) = daemon_client::daemon_request(&req) {
            if r.ok {
                if let Some(data) = r.data {
                    if let Ok(list) = serde_json::from_value::<Vec<String>>(data) {
                        return Ok(list);
                    }
                }
            }
        }
    }
    Ok(state.terminal.list_sessions())
}

#[tauri::command]
async fn poll_terminal_output(session_id: String, offset: usize, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    if daemon_client::daemon_available() {
        let req = daemon_client::DaemonRequest { op: "poll".to_string(), session_id: Some(session_id.clone()), executable: None, args: None, cwd: None, input: None, rows: None, cols: None, offset: Some(offset) };
        match daemon_client::daemon_request(&req) {
            Ok(r) if r.ok => return Ok(r.data.unwrap_or(serde_json::json!({"data":"","next_offset":offset}))),
            Ok(r) => return Err(r.error.unwrap_or_else(|| "daemon error".to_string())),
            Err(_) => {}
        }
    }
    let (data, next) = state.terminal.poll_output(&session_id, offset)?;
    Ok(serde_json::json!({"data": data, "next_offset": next}))
}

/// Sprint 2 P0: create a split terminal pane (new PTY) paired to an existing tab grid.
/// Uses same PTY manager + vt100 shadow as single terminals, emits via `terminal:output`.
/// Frontend may pre-generate sessionId or let server generate via parent_session_id.
#[tauri::command]
async fn create_split_terminal(
    session_id: Option<String>,
    parent_session_id: Option<String>,
    executable: Option<String>,
    cwd: Option<String>,
    args: Option<Vec<String>>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let exec = executable.unwrap_or_else(|| "bash".to_string());
    let new_id = if let Some(sid) = session_id.filter(|s| !s.is_empty()) {
        sid
    } else if let Some(parent) = parent_session_id.filter(|s| !s.is_empty()) {
        format!(
            "{}_split_{}",
            parent,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() % 100000
        )
    } else {
        format!(
            "sess_split_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        )
    };
    let a = args.unwrap_or_default();
    // Try daemon first
    if daemon_client::daemon_available() {
        let req = daemon_client::DaemonRequest {
            op: "start".to_string(),
            session_id: Some(new_id.clone()),
            executable: Some(exec.clone()),
            args: Some(a.clone()),
            cwd: cwd.clone(),
            input: None,
            rows: None,
            cols: None,
            offset: None,
        };
        match daemon_client::daemon_request(&req) {
            Ok(r) if r.ok => {
                let sid = new_id.clone();
                let app_handle = app.clone();
                std::thread::spawn(move || {
                    let mut offset = 0usize;
                    let mut last_state: Option<String> = None;
                    let mut poll_counter: usize = 0;
                    loop {
                        std::thread::sleep(std::time::Duration::from_millis(50));
                        let poll_req = daemon_client::DaemonRequest {
                            op: "poll".to_string(),
                            session_id: Some(sid.clone()),
                            executable: None,
                            args: None,
                            cwd: None,
                            input: None,
                            rows: None,
                            cols: None,
                            offset: Some(offset),
                        };
                        match daemon_client::daemon_request(&poll_req) {
                            Ok(res) if res.ok => {
                                if let Some(data) = res.data {
                                    let chunk = data.get("data").and_then(|v| v.as_str()).unwrap_or("");
                                    let next = data.get("next_offset").and_then(|v| v.as_u64()).unwrap_or(offset as u64) as usize;
                                    if !chunk.is_empty() {
                                        #[derive(serde::Serialize, Clone)]
                                        struct OutputPayload { session_id: String, output: String }
                                        use tauri::Emitter;
                                        let _ = app_handle.emit("terminal:output", OutputPayload { session_id: sid.clone(), output: chunk.to_string() });
                                    }
                                    offset = next;
                                }
                                poll_counter = poll_counter.wrapping_add(1);
                                if poll_counter % 4 == 0 {
                                    let snap_req = daemon_client::DaemonRequest {
                                        op: "snapshot".to_string(),
                                        session_id: Some(sid.clone()),
                                        executable: None,
                                        args: None,
                                        cwd: None,
                                        input: None,
                                        rows: None,
                                        cols: None,
                                        offset: None,
                                    };
                                    if let Ok(snap_res) = daemon_client::daemon_request(&snap_req) {
                                        if snap_res.ok {
                                            if let Some(snap_data) = snap_res.data {
                                                if let Ok(snap) = serde_json::from_value::<TerminalSnapshot>(snap_data) {
                                                    let detected = detect_agent_state(&snap.clean_text);
                                                    let state_str = detected.as_str().to_string();
                                                    if last_state.as_deref() != Some(&state_str) {
                                                        use tauri::Emitter;
                                                        let _ = app_handle.emit(
                                                            "agent:state",
                                                            serde_json::json!({
                                                                "session_id": sid.clone(),
                                                                "sessionId": sid.clone(),
                                                                "state": state_str.clone()
                                                            }),
                                                        );
                                                        last_state = Some(state_str);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            _ => break,
                        }
                    }
                });
                return Ok(new_id);
            }
            Ok(r) => return Err(r.error.unwrap_or_else(|| "daemon error".to_string())),
            Err(_) => {}
        }
    }
    state.terminal.start_session(&new_id, &exec, a, cwd, app)?;
    Ok(new_id)
}

#[tauri::command]
async fn close_split_terminal(session_id: String, state: State<'_, AppState>) -> Result<(), String> {
    if daemon_client::daemon_available() {
        let req = daemon_client::DaemonRequest {
            op: "close".to_string(),
            session_id: Some(session_id.clone()),
            executable: None,
            args: None,
            cwd: None,
            input: None,
            rows: None,
            cols: None,
            offset: None,
        };
        let _ = daemon_client::daemon_request(&req);
    }
    // close_session terminates the PTY process group, reaps it and joins the
    // reader thread — it may block briefly, so never run it on the tokio runtime.
    let terminal = state.terminal.clone();
    tokio::task::spawn_blocking(move || terminal.close_session(&session_id))
        .await
        .map_err(|e| format!("Failed to join terminal close task: {e}"))?;
    Ok(())
}

#[tauri::command]
async fn is_daemon_available() -> bool {
    daemon_client::daemon_available()
}

#[tauri::command]
fn get_keep_awake_status(state: State<'_, AppState>) -> KeepAwakeStatus {
    state.keep_awake.get_status()
}

#[tauri::command]
async fn sync_keep_awake(enabled: bool, working_count: usize, app: AppHandle, state: State<'_, AppState>) -> Result<KeepAwakeStatus, String> {
    let keep_awake = state.keep_awake.clone();
    let before = keep_awake.get_status();
    let after = tokio::task::spawn_blocking(move || {
        keep_awake.sync(enabled, working_count);
        keep_awake.get_status()
    })
    .await
    .map_err(|e| e.to_string())?;
    // Emit push when status changes (active/enabled/working_count) — frontend listens for instant update
    if before.active != after.active || before.enabled != after.enabled || before.working_count != after.working_count {
        let _ = app.emit("keep_awake:status", after.clone());
    }
    Ok(after)
}

#[tauri::command]
async fn set_keep_awake_working_count(working_count: usize, app: AppHandle, state: State<'_, AppState>) -> Result<KeepAwakeStatus, String> {
    let keep_awake = state.keep_awake.clone();
    let before = keep_awake.get_status();
    let after = tokio::task::spawn_blocking(move || {
        keep_awake.set_working_count(working_count);
        keep_awake.get_status()
    })
    .await
    .map_err(|e| e.to_string())?;
    if before.active != after.active || before.working_count != after.working_count {
        let _ = app.emit("keep_awake:status", after.clone());
    }
    Ok(after)
}

#[tauri::command]
async fn resolve_tool_approval(
    id: Option<String>,
    approval_id: Option<String>,
    approved: Option<bool>,
    status: Option<String>,
    session_id: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Flexible signature: frontend may send {id, approved} (P0 spec) or legacy {approval_id, session_id, status}
    let resolved_id = id
        .or(approval_id)
        .ok_or_else(|| "Missing id / approval_id".to_string())?;
    let resolved_status = if let Some(a) = approved {
        if a { "approved".to_string() } else { "rejected".to_string() }
    } else if let Some(s) = status {
        s
    } else {
        return Err("Missing approved / status".to_string());
    };
    let db = &state.db;
    // Try to update existing record; if not found, create a minimal one so UI can reflect status
    if let Ok(Some(mut existing)) = db.get_tool_approval(&resolved_id) {
        existing.status = resolved_status.clone();
        // keep session_id from existing if not provided
        db.save_tool_approval(&existing)?;
        use tauri::Emitter;
        let _ = app.emit("tool_approval:resolved", existing);
        return Ok(());
    }
    // No existing record — try to update via SQL first (covers case where id exists but get failed due to lock ordering)
    if db.update_tool_approval_status(&resolved_id, &resolved_status).is_ok() {
        if let Ok(Some(updated)) = db.get_tool_approval(&resolved_id) {
            use tauri::Emitter;
            let _ = app.emit("tool_approval:resolved", updated);
            return Ok(());
        }
        use tauri::Emitter;
        let _ = app.emit(
            "tool_approval:resolved",
            ToolApprovalRecord {
                id: resolved_id.clone(),
                session_id: session_id.clone().unwrap_or_default(),
                tool_name: "bash".to_string(),
                command: String::new(),
                status: resolved_status.clone(),
                created_at: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64,
            },
        );
        return Ok(());
    }
    // Fallback: create minimal record
    let sid = session_id.unwrap_or_default();
    let record = ToolApprovalRecord {
        id: resolved_id.clone(),
        session_id: sid,
        tool_name: "bash".to_string(),
        command: String::new(),
        status: resolved_status.clone(),
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64,
    };
    db.save_tool_approval(&record)?;
    use tauri::Emitter;
    let _ = app.emit("tool_approval:resolved", record);
    Ok(())
}

#[tauri::command]
async fn list_tool_approvals(
    session_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<ToolApprovalRecord>, String> {
    state.db.list_tool_approvals(session_id.as_deref())
}

#[tauri::command]
async fn create_tool_approval(
    record: ToolApprovalRecord,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    state.db.save_tool_approval(&record)?;
    use tauri::Emitter;
    let _ = app.emit("tool:approval:request", record.clone());
    let _ = app.emit("tool_approval:request", record);
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
            // Herdr-style daemon auto-spawn: if hydra.sock not live, spawn hydra-daemon
            std::thread::spawn(|| {
                if !daemon_client::daemon_available() {
                    daemon_client::ensure_daemon_spawned();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_status,
            get_app_version,
            get_repo_git_status,
            get_repo_git_status_for_path,
            get_detailed_git_status_cmd,
            git_stage,
            git_unstage,
            git_discard,
            git_commit_cmd,
            git_diff_cmd,
            list_directory_cmd,
            read_file_text_cmd,
            search_files_cmd,
            get_git_history_cmd,
            git_stage_all_cmd,
            git_unstage_all_cmd,
            check_git_ignored_cmd,
            get_diff_numstat_cmd,
            create_file_cmd,
            create_folder_cmd,
            rename_path_cmd,
            delete_path_cmd,
            get_branch_commits_cmd,
            git_push_cmd,
            git_pull_cmd,
            git_stage_paths_cmd,
            git_unstage_paths_cmd,
            get_submodule_paths_cmd,
            git_stash_list_cmd,
            git_stash_push_cmd,
            git_stash_pop_cmd,
            git_commit_amend_cmd,
            open_in_file_manager,
            open_in_external_editor,
            list_projects,
            register_existing_project,
            remove_project,
            get_project_worktree_base,
            set_project_worktree_base,
            list_worktrees,
            create_project,
            clone_project,
            create_worktree,
            delete_worktree,
            get_layout_persistence,
            save_layout_persistence,
            get_workbench_persistence,
            save_workbench_persistence,
            get_workbench_persistence_for_project,
            save_workbench_persistence_for_project,
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
            resize_terminal,
            set_keep_awake_working_count,
            list_available_shells,
            list_terminal_sessions,
            poll_terminal_output,
            is_daemon_available,
            create_split_terminal,
            close_split_terminal,
            resolve_tool_approval,
            list_tool_approvals,
            create_tool_approval,
            theme_import::preview_ghostty_import,
            theme_import::preview_warp_themes,
            theme_import::choose_warp_themes_file,
            window_actions::window_minimize,
            window_actions::window_toggle_maximize,
            window_actions::window_close,
            window_actions::window_start_dragging,
            check_preflight_tools_cmd,
            check_github_starred_cmd,
            star_github_repo_cmd,
            open_external_url_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running hydra tauri application");
}
