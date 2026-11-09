//! Workspace disk-space analysis: per-worktree `du` scan with cancel and cache.
//!
//! Ported from Orca `main/workspace-space-analysis.ts`,
//! `main/ipc/workspace-space.ts`, `main/workspace-space-analysis-snapshot.ts`
//! and `shared/workspace-space-types.ts` (local subset: no `orcad` relay, no
//! WSL distro routing, no sidecar snapshot files — the cache lives in the
//! Hydra SQLite db via a JSON blob row).
//!
//! Scan model: enumerate local worktrees via `git worktree list --porcelain`
//! per repo root supplied by the renderer, then `du -sk -d1`-equivalent per
//! worktree (Rust `walkdir`-free: shell out to `du`, like Orca, with timeout +
//! cancel flag). Progress streams through `workspace-space:progress` emits;
//! the final analysis persists for `get_cached_analysis`.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::LazyLock;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};

use crate::AppState;

static SPACE_SCAN_CANCEL: LazyLock<AtomicBool> = LazyLock::new(|| AtomicBool::new(false));

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSpaceItem {
    pub name: String,
    pub path: String,
    pub kind: String,
    pub size_bytes: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSpaceWorktree {
    pub worktree_id: String,
    pub repo_id: String,
    pub repo_display_name: String,
    pub repo_path: String,
    pub display_name: String,
    pub path: String,
    pub branch: String,
    pub is_main_worktree: bool,
    /// Scan status: ok | missing | error (mirrors Orca WorkspaceSpaceScanStatus subset).
    pub status: String,
    /// Main worktrees are never deletable from Space (Orca rule).
    pub can_delete: bool,
    /// Last activity: worktree dir mtime (ms). Feeds activity sort.
    pub last_activity_at: i64,
    pub size_bytes: u64,
    /// Reclaimable storage: non-main worktrees can be deleted outright.
    /// Mirrors Orca `createScannedWorkspaceSpaceRow` (main -> 0).
    pub reclaimable_bytes: u64,
    pub top_level_items: Vec<WorkspaceSpaceItem>,
    pub omitted_top_level_item_count: usize,
    pub omitted_top_level_size_bytes: u64,
    pub error: Option<String>,
    pub scanned_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSpaceAnalysis {
    pub scanned_at: i64,
    pub total_size_bytes: u64,
    pub reclaimable_bytes: u64,
    pub worktrees: Vec<WorkspaceSpaceWorktree>,
}

/// `du -sk -d1 <path>` parsed to (path -> KiB*1024). Timeout 120s like Orca.
fn du_depth_one(path: &str) -> Result<HashMap<String, u64>, String> {
    let out = Command::new("du")
        .args(["-sk", "-d", "1", path])
        .output()
        .map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
    }
    let mut sizes = HashMap::new();
    for line in String::from_utf8_lossy(&out.stdout).lines() {
        let mut it = line.split_whitespace();
        let (Some(kb), Some(p)) = (it.next(), it.next()) else {
            continue;
        };
        if let Ok(k) = kb.parse::<u64>() {
            sizes.insert(p.to_string(), k * 1024);
        }
    }
    Ok(sizes)
}

fn kind_of(path: &std::path::Path) -> &'static str {
    if path.is_symlink() {
        "symlink"
    } else if path.is_dir() {
        "directory"
    } else if path.is_file() {
        "file"
    } else {
        "other"
    }
}

fn dir_mtime_ms(path: &str) -> Option<i64> {
    std::fs::metadata(path).and_then(|m| m.modified()).ok().and_then(|t| {
        t.duration_since(std::time::UNIX_EPOCH)
            .ok()
            .map(|d| d.as_millis() as i64)
    })
}

fn measure_worktree(repo_id: &str, repo_path: &str, wt_path: &str, branch: &str, is_main: bool) -> WorkspaceSpaceWorktree {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let base = || WorkspaceSpaceWorktree {
        worktree_id: wt_path.to_string(),
        repo_id: repo_id.to_string(),
        repo_display_name: repo_path.to_string(),
        repo_path: repo_path.to_string(),
        display_name: wt_path.to_string(),
        path: wt_path.to_string(),
        branch: branch.to_string(),
        is_main_worktree: is_main,
        status: "ok".to_string(),
        can_delete: !is_main,
        last_activity_at: now,
        size_bytes: 0,
        reclaimable_bytes: 0,
        top_level_items: vec![],
        omitted_top_level_item_count: 0,
        omitted_top_level_size_bytes: 0,
        error: None,
        scanned_at: now,
    };
    let dir_missing = !std::path::Path::new(wt_path).exists();
    let sizes = match du_depth_one(wt_path) {
        Ok(s) => s,
        Err(e) => {
            let mut w = base();
            w.status = if dir_missing { "missing".to_string() } else { "error".to_string() };
            w.error = Some(e);
            return w;
        }
    };
    // Total = entry for the root itself; children become top-level items.
    let root_total = sizes.get(wt_path).copied().unwrap_or(0);
    let mut items: Vec<WorkspaceSpaceItem> = Vec::new();
    let mut omitted_count = 0;
    let mut omitted_bytes = 0u64;
    if let Ok(entries) = std::fs::read_dir(wt_path) {
        for entry in entries.flatten() {
            let p = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let size = sizes.get(&p.to_string_lossy().to_string()).copied().unwrap_or(0);
            // Keep the top 50; fold the tail into omitted (mirrors Orca omit logic).
            if items.len() < 50 {
                items.push(WorkspaceSpaceItem {
                    name,
                    path: p.to_string_lossy().to_string(),
                    kind: kind_of(&p).to_string(),
                    size_bytes: size,
                });
            } else {
                omitted_count += 1;
                omitted_bytes += size;
            }
        }
    }
    items.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    let mut w = base();
    w.size_bytes = root_total;
    w.reclaimable_bytes = if is_main { 0 } else { root_total };
    if let Some(mtime) = dir_mtime_ms(wt_path) {
        w.last_activity_at = mtime;
    }
    w.top_level_items = items;
    w.omitted_top_level_item_count = omitted_count;
    w.omitted_top_level_size_bytes = omitted_bytes;
    w
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct SpaceProgressPayload {
    scan_id: String,
    state: String,
    scanned_worktree_count: usize,
    total_worktree_count: usize,
    current_worktree_display_name: Option<String>,
}

#[tauri::command]
pub async fn workspace_space_analyze(
    repo_worktrees: Vec<WorkspaceSpaceScanTarget>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<WorkspaceSpaceAnalysis, String> {
    SPACE_SCAN_CANCEL.store(false, Ordering::SeqCst);
    let scan_id = format!("{}", crate::ssh_hosts::ssh_now_millis());
    let total = repo_worktrees.iter().map(|r| r.paths.len()).sum::<usize>();
    let started = Instant::now();
    let timeout = Duration::from_secs(120);
    // Flatten targets so blocking work owns plain data (no AppHandle across threads).
    let jobs: Vec<(String, String, String, String, bool)> = repo_worktrees
        .iter()
        .flat_map(|r| {
            r.paths.iter().enumerate().map(|(i, p)| {
                (
                    r.repo_id.clone(),
                    r.repo_path.clone(),
                    p.clone(),
                    r.branch.clone().unwrap_or_default(),
                    i == 0,
                )
            })
        })
        .collect();
    let mut worktrees = Vec::new();
    for (i, (repo_id, repo_path, wt_path, branch, is_main)) in jobs.into_iter().enumerate() {
        if SPACE_SCAN_CANCEL.load(Ordering::SeqCst) || started.elapsed() > timeout {
            break;
        }
        let _ = app.emit(
            "workspace-space:progress",
            SpaceProgressPayload {
                scan_id: scan_id.clone(),
                state: "running".to_string(),
                scanned_worktree_count: i,
                total_worktree_count: total,
                current_worktree_display_name: Some(wt_path.clone()),
            },
        );
        let measured = tokio::task::spawn_blocking(move || {
            measure_worktree(&repo_id, &repo_path, &wt_path, &branch, is_main)
        })
        .await
        .map_err(|e| e.to_string())?;
        worktrees.push(measured);
    }
    let _ = app.emit(
        "workspace-space:progress",
        SpaceProgressPayload {
            scan_id: scan_id.clone(),
            state: "done".to_string(),
            scanned_worktree_count: worktrees.len(),
            total_worktree_count: total,
            current_worktree_display_name: None,
        },
    );
    let total_size = worktrees.iter().map(|w| w.size_bytes).sum();
    let total_reclaimable: u64 = worktrees.iter().map(|w| w.reclaimable_bytes).sum();
    let analysis = WorkspaceSpaceAnalysis {
        scanned_at: crate::ssh_hosts::ssh_now_millis(),
        total_size_bytes: total_size,
        reclaimable_bytes: total_reclaimable,
        worktrees,
    };
    // Persist cache (best-effort).
    let db = state.db.clone();
    let cached = serde_json::to_string(&analysis).unwrap_or_default();
    let _ = tokio::task::spawn_blocking(move || {
        db.save_workspace_space_cache(&cached)
    })
    .await;
    Ok(analysis)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSpaceScanTarget {
    pub repo_id: String,
    pub repo_path: String,
    pub paths: Vec<String>,
    pub branch: Option<String>,
}

#[tauri::command]
pub async fn workspace_space_cancel() -> Result<(), String> {
    SPACE_SCAN_CANCEL.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn workspace_space_get_cached_analysis(
    state: State<'_, AppState>,
) -> Result<Option<WorkspaceSpaceAnalysis>, String> {
    let db = state.db.clone();
    let raw: Option<String> = tokio::task::spawn_blocking(move || db.load_workspace_space_cache())
        .await
        .map_err(|e| e.to_string())??;
    match raw {
        Some(json) if !json.is_empty() => Ok(serde_json::from_str(&json).ok()),
        _ => Ok(None),
    }
}
