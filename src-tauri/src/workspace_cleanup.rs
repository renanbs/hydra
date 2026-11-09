//! Workspace cleanup persistence: dismissals, cached scan, prune batches.
//!
//! Ported from Orca `main/ipc/workspace-cleanup.ts` (persistence half),
//! `main/workspace-cleanup-removal-snapshot-prune.ts` and
//! `main/workspace-cleanup-scan-snapshot.ts` (SQLite subset: the Orca sidecar
//! files become `settings`-table JSON rows; the prune batch only tracks the
//! worktree paths removed during one UI batch so the cached scan can drop
//! them on finish).
//!
//! Classification itself is TS-side (`useWorkspaceCleanupScan`, built on the
//! ported decision projection) — the evidence (tabs, agents, git status)
//! already lives in the renderer store.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;
use parking_lot::Mutex;
use tauri::State;

use crate::AppState;

static PRUNE_BATCHES: LazyLock<Mutex<HashMap<String, HashSet<String>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceCleanupCachedScan {
    pub scanned_at: i64,
    pub candidates: Vec<WorkspaceCleanupCandidateRow>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceCleanupCandidateRow {
    pub worktree_id: String,
    pub repo_id: String,
    pub reasons: Vec<String>,
    pub blockers: Vec<String>,
    pub last_activity_at: i64,
}

#[tauri::command]
pub async fn workspace_cleanup_get_cached_scan(
    state: State<'_, AppState>,
) -> Result<Option<WorkspaceCleanupCachedScan>, String> {
    let db = state.db.clone();
    let raw: Option<String> = tokio::task::spawn_blocking(move || db.load_workspace_cleanup_cache())
        .await
        .map_err(|e| e.to_string())??;
    match raw {
        Some(json) if !json.is_empty() => Ok(serde_json::from_str(&json).ok()),
        _ => Ok(None),
    }
}

#[tauri::command]
pub async fn workspace_cleanup_save_cached_scan(
    scan: WorkspaceCleanupCachedScan,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.clone();
    let json = serde_json::to_string(&scan).map_err(|e| e.to_string())?;
    tokio::task::spawn_blocking(move || db.save_workspace_cleanup_cache(&json))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn workspace_cleanup_dismiss(
    worktree_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let mut dismissed = db.load_workspace_cleanup_dismissals()?;
        if !dismissed.contains(&worktree_id) {
            dismissed.push(worktree_id);
        }
        db.save_workspace_cleanup_dismissals(&dismissed)?;
        Ok(dismissed)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn workspace_cleanup_clear_dismissals(
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || db.save_workspace_cleanup_dismissals(&[]))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn workspace_cleanup_list_dismissals(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || db.load_workspace_cleanup_dismissals())
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn workspace_cleanup_begin_removal_snapshot_prune_batch(
    batch_id: String,
) -> Result<(), String> {
    PRUNE_BATCHES.lock().insert(batch_id, HashSet::new());
    Ok(())
}

#[tauri::command]
pub async fn workspace_cleanup_record_removal_snapshot_prune(
    batch_id: String,
    worktree_id: String,
) -> Result<(), String> {
    let mut batches = PRUNE_BATCHES.lock();
    let batch = batches.entry(batch_id).or_default();
    batch.insert(worktree_id);
    Ok(())
}

#[tauri::command]
pub async fn workspace_cleanup_finish_removal_snapshot_prune_batch(
    batch_id: String,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let pruned: HashSet<String> = PRUNE_BATCHES.lock().remove(&batch_id).unwrap_or_default();
    if pruned.is_empty() {
        return Ok(0);
    }
    let db = state.db.clone();
    let removed = tokio::task::spawn_blocking(move || {
        let raw = db.load_workspace_cleanup_cache()?;
        let Some(json) = raw.filter(|s: &String| !s.is_empty()) else {
            return Ok::<_, String>(0);
        };
        let mut scan: WorkspaceCleanupCachedScan =
            serde_json::from_str(&json).map_err(|e| e.to_string())?;
        let before = scan.candidates.len();
        scan.candidates.retain(|c| !pruned.contains(&c.worktree_id));
        let removed = before - scan.candidates.len();
        let json = serde_json::to_string(&scan).map_err(|e| e.to_string())?;
        db.save_workspace_cleanup_cache(&json)?;
        Ok(removed)
    })
    .await
    .map_err(|e| e.to_string())??;
    Ok(removed)
}
