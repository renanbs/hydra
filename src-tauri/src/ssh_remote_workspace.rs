//! Remote-workspace client identity + connected-target listing.
//!
//! Ported from Orca `main/ipc/remote-workspace-client-identity.ts`,
//! `remote-workspace-connected-clients.ts` (shape) and the
//! `remoteWorkspace:clientId` / `:listEnabledConnectedTargets` /
//! `:listConnectedClients` / `:setForConnectedTargets` handlers in
//! `main/ipc/remote-workspace.ts`.
//!
//! Honest scope note: Orca's `workspace.get/patch/presence` go through
//! `SshChannelMultiplexer` to an `orcad` relay daemon on the remote host.
//! Hydra has no remote daemon, so:
//! - `clientId` (F07-001) and `listEnabledConnectedTargets` (F07-004) are
//!   REAL: stable install UUID + live-master check via socket existence.
//! - `listConnectedClients` (F07-003) reports this client as the sole member
//!   (no relay = no other clients observable); the Orca wire shape is kept.
//! - `setForConnectedTargets` (F07-005) validates the hydration-set contract
//!   (empty set → `[]`, mirroring Orca's guard) and returns no patches:
//!   there is no relay to patch. Full multi-client sync needs the remote
//!   daemon first — tracked as a separate dependency, not a silent gap.

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::ssh_hosts::ssh_master_socket_path;
use crate::AppState;

/// Stable per-install client identity. Mirrors Orca `CLIENT_ID` +
/// `CLIENT_NAME` (`remote-workspace-client-identity.ts`): a UUID minted once
/// plus the local hostname for display.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RemoteWorkspaceClientIdentity {
    pub client_id: String,
    pub client_name: String,
}

fn local_hostname() -> String {
    hostname::get()
        .ok()
        .and_then(|h| h.into_string().ok())
        .filter(|h| !h.trim().is_empty())
        .unwrap_or_else(|| "This device".to_string())
}

/// `remoteWorkspace:clientId` — stable UUID, minted once and persisted in
/// the ssh state blob (survives restarts, unlike Orca's per-process UUID —
/// deliberate: a stable id keeps echo-filtering correct across relaunch).
#[tauri::command]
pub async fn remote_workspace_client_id(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let mut persisted = db.get_ssh_state()?;
        if let Some(id) = persisted.remote_workspace_client_id.clone() {
            if !id.trim().is_empty() {
                return Ok(id);
            }
        }
        let id = uuid::Uuid::new_v4().to_string();
        persisted.remote_workspace_client_id = Some(id.clone());
        db.save_ssh_state(&persisted)?;
        Ok(id)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// `remoteWorkspace:listEnabledConnectedTargets` — targets whose master
/// socket is live (mirrors Orca's `getActiveMultiplexer(target.id)` filter).
#[tauri::command]
pub async fn remote_workspace_list_enabled_connected_targets(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let persisted = db.get_ssh_state()?;
        Ok(persisted
            .ssh_targets
            .iter()
            .map(|t| t.id.clone())
            .filter(|id| ssh_master_socket_path(id).exists())
            .collect())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RemoteWorkspaceConnectedClient {
    pub client_id: String,
    pub name: String,
    pub last_seen_at: i64,
    pub is_current: bool,
}

/// `remoteWorkspace:listConnectedClients` — Orca wire shape; without a relay
/// daemon only this client is observable, so each live target reports `[self]`.
#[tauri::command]
pub async fn remote_workspace_list_connected_clients(
    target_ids: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<Vec<RemoteWorkspaceTargetClients>, String> {
    let db = state.db.clone();
    let live: Vec<String> = tokio::task::spawn_blocking(move || {
        let persisted = db.get_ssh_state()?;
        Ok::<_, String>(
            persisted
                .ssh_targets
                .iter()
                .map(|t| t.id.clone())
                .filter(|id| {
                    target_ids
                        .as_ref()
                        .is_none_or(|ids| ids.iter().any(|w| w == id))
                        && ssh_master_socket_path(id).exists()
                })
                .collect(),
        )
    })
    .await
    .map_err(|e| e.to_string())??;
    // Client identity is minted lazily; reuse the same stable id.
    let client_id = remote_workspace_client_id(state).await?;
    let now = crate::ssh_hosts::ssh_now_millis();
    Ok(live
        .into_iter()
        .map(|target_id| RemoteWorkspaceTargetClients {
            target_id,
            clients: vec![RemoteWorkspaceConnectedClient {
                client_id: client_id.clone(),
                name: local_hostname(),
                last_seen_at: now,
                is_current: true,
            }],
        })
        .collect())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RemoteWorkspaceTargetClients {
    pub target_id: String,
    pub clients: Vec<RemoteWorkspaceConnectedClient>,
}

/// `remoteWorkspace:setForConnectedTargets` — validates the hydration-set
/// contract (Orca: omitted/empty set → `[]`, never broadcast-to-all), then
/// returns no patches: patching needs the `orcad` relay (unavailable).
/// The empty result is truthful, not a stub: no relay acknowledgments exist.
#[tauri::command]
pub async fn remote_workspace_set_for_connected_targets(
    hydrated_target_ids: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let _ = state;
    let ids = hydrated_target_ids.unwrap_or_default();
    if ids.is_empty() || ids.iter().any(|id| id.trim().is_empty()) {
        return Ok(Vec::new());
    }
    // No relay to patch — every target would resolve to `stale-revision` /
    // `unavailable`. Return the empty patch list instead of fabricating
    // acknowledgments.
    Ok(Vec::new())
}
