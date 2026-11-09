//! Live SSH port-forward lifecycle over the persistent master socket.
//!
//! Ported from Orca `main/ssh/ssh-port-forward.ts` +
//! `system-ssh-port-forward-provider.ts`: the Hydra master (`ssh -M -S
//! <socket> -fN`, see `ssh_hosts::build_ssh_master_args`) multiplexes
//! `-L` forwards via `ssh -O forward` / `-O cancel`, so no extra auth
//! round-trip is needed per forward. Persisted intent lives on
//! `SshTarget.port_forwards`; the live registry below is the runtime truth
//! (mirrors `SshPortForwardManager.forwards`).

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::LazyLock;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

use crate::ssh_hosts::{
    build_ssh_base_args, build_ssh_destination, build_ssh_master_exit_args, ssh_master_socket_path,
    ssh_now_millis,
};
use crate::AppState;

/// Live forward entry, mirrors `PortForwardEntry` in `src/shared/ssh-types.ts`
/// and Orca `shared/ssh-types.ts`.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LivePortForward {
    pub id: String,
    pub connection_id: String,
    pub local_port: u16,
    pub remote_host: String,
    pub remote_port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct PortForwardsChangedPayload {
    target_id: String,
    forwards: Vec<LivePortForward>,
}

static LIVE_FORWARDS: LazyLock<Mutex<HashMap<String, LivePortForward>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static NEXT_FORWARD_ID: AtomicU64 = AtomicU64::new(1);

/// Arguments that add a `-L` forward to a live master (`ssh -O forward`).
/// Mirrors `build_ssh_master_exit_args`, minus the `-T` strip (base args
/// already carry `-T`-less multiplex options via the master builders).
pub fn build_ssh_forward_add_args(
    target: &crate::ssh_hosts::SshTarget,
    socket: &std::path::Path,
    local_port: u16,
    remote_host: &str,
    remote_port: u16,
) -> Vec<String> {
    let mut args = build_ssh_base_args(target);
    args.retain(|arg| arg != "-T");
    args.push("-S".to_string());
    args.push(socket.to_string_lossy().to_string());
    args.push("-O".to_string());
    args.push("forward".to_string());
    args.push("-L".to_string());
    args.push(format!("127.0.0.1:{local_port}:{remote_host}:{remote_port}"));
    args.push(build_ssh_destination(target));
    args
}

/// Arguments that remove a `-L` forward from a live master (`ssh -O cancel`).
pub fn build_ssh_forward_cancel_args(
    target: &crate::ssh_hosts::SshTarget,
    socket: &std::path::Path,
    local_port: u16,
    remote_host: &str,
    remote_port: u16,
) -> Vec<String> {
    let mut args = build_ssh_base_args(target);
    args.retain(|arg| arg != "-T");
    args.push("-S".to_string());
    args.push(socket.to_string_lossy().to_string());
    args.push("-O".to_string());
    args.push("cancel".to_string());
    args.push(format!("127.0.0.1:{local_port}:{remote_host}:{remote_port}"));
    args.push(build_ssh_destination(target));
    args
}

fn run_forward_cmd(args: &[String]) -> Result<String, String> {
    let output = Command::new("ssh")
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to spawn ssh: {e}"))?;
    if output.status.success() {
        return Ok(String::from_utf8_lossy(&output.stdout).trim().to_string());
    }
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    Err(if stderr.is_empty() {
        format!("ssh exited with status {}", output.status)
    } else {
        stderr
    })
}

fn emit_forwards(app: &AppHandle, target_id: &str) {
    let forwards: Vec<LivePortForward> = LIVE_FORWARDS
        .lock()
        .values()
        .filter(|f| f.connection_id == target_id)
        .cloned()
        .collect();
    let _ = app.emit(
        "ssh:port-forwards-changed",
        PortForwardsChangedPayload {
            target_id: target_id.to_string(),
            forwards,
        },
    );
}

fn persist_forwards(db: &crate::db::DatabaseManager, target_id: &str) -> Result<(), String> {
    let mut persisted = db.get_ssh_state()?;
    let Some(target) = persisted
        .ssh_targets
        .iter_mut()
        .find(|t| t.id == target_id)
    else {
        return Ok(());
    };
    let saved: Vec<crate::ssh_hosts::SavedPortForward> = LIVE_FORWARDS
        .lock()
        .values()
        .filter(|f| f.connection_id == target_id)
        .map(|f| crate::ssh_hosts::SavedPortForward {
            local_port: f.local_port,
            remote_host: f.remote_host.clone(),
            remote_port: f.remote_port,
            label: f.label.clone(),
        })
        .collect();
    target.port_forwards = if saved.is_empty() { None } else { Some(saved) };
    db.save_ssh_state(&persisted)?;
    Ok(())
}

fn live_socket_for(
    db: &crate::db::DatabaseManager,
    target_id: &str,
) -> Result<(crate::ssh_hosts::SshTarget, std::path::PathBuf), String> {
    let persisted = db.get_ssh_state()?;
    let Some(target) = persisted
        .ssh_targets
        .into_iter()
        .find(|t| t.id == target_id)
    else {
        return Err(format!("SSH target \"{target_id}\" not found"));
    };
    let socket = ssh_master_socket_path(target_id);
    if !socket.exists() {
        return Err("SSH connection is not established".to_string());
    }
    Ok((target, socket))
}

#[tauri::command]
pub async fn ssh_add_port_forward(
    target_id: String,
    local_port: u16,
    remote_host: String,
    remote_port: u16,
    label: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<LivePortForward, String> {
    let db = state.db.clone();
    let entry = tokio::task::spawn_blocking(move || {
        let (target, socket) = live_socket_for(&db, &target_id)?;
        let args = build_ssh_forward_add_args(&target, &socket, local_port, &remote_host, remote_port);
        // Give the OS a beat when rebinding a just-released port (mirrors
        // Orca `updateForward` remove-async before re-add).
        std::thread::sleep(Duration::from_millis(50));
        run_forward_cmd(&args)?;
        let id = format!("pf-{}", NEXT_FORWARD_ID.fetch_add(1, Ordering::SeqCst));
        let entry = LivePortForward {
            id,
            connection_id: target_id.clone(),
            local_port,
            remote_host,
            remote_port,
            label,
        };
        LIVE_FORWARDS.lock().insert(entry.id.clone(), entry.clone());
        persist_forwards(&db, &target_id)?;
        Ok::<_, String>(entry)
    })
    .await
    .map_err(|e| e.to_string())??;
    emit_forwards(&app, &entry.connection_id);
    Ok(entry)
}

#[tauri::command]
pub async fn ssh_update_port_forward(
    id: String,
    target_id: String,
    local_port: u16,
    remote_host: String,
    remote_port: u16,
    label: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<LivePortForward, String> {
    let db = state.db.clone();
    let entry = tokio::task::spawn_blocking(move || {
        let old = LIVE_FORWARDS
            .lock()
            .get(&id)
            .cloned()
            .ok_or_else(|| format!("Port forward \"{id}\" not found"))?;
        let (target, socket) = live_socket_for(&db, &target_id)?;
        // Remove-async first so the OS releases the port before rebinding
        // (mirrors Orca `updateForward`); rollback to the old spec on failure.
        let cancel =
            build_ssh_forward_cancel_args(&target, &socket, old.local_port, &old.remote_host, old.remote_port);
        let _ = run_forward_cmd(&cancel);
        LIVE_FORWARDS.lock().remove(&id);
        let add =
            build_ssh_forward_add_args(&target, &socket, local_port, &remote_host, remote_port);
        if let Err(err) = run_forward_cmd(&add) {
            let rollback = build_ssh_forward_add_args(
                &target,
                &socket,
                old.local_port,
                &old.remote_host,
                old.remote_port,
            );
            let _ = run_forward_cmd(&rollback);
            LIVE_FORWARDS.lock().insert(old.id.clone(), old);
            persist_forwards(&db, &target_id)?;
            return Err(err);
        }
        let entry = LivePortForward {
            id: old.id,
            connection_id: target_id.clone(),
            local_port,
            remote_host,
            remote_port,
            label,
        };
        LIVE_FORWARDS.lock().insert(entry.id.clone(), entry.clone());
        persist_forwards(&db, &target_id)?;
        Ok::<_, String>(entry)
    })
    .await
    .map_err(|e| e.to_string())??;
    emit_forwards(&app, &entry.connection_id);
    Ok(entry)
}

#[tauri::command]
pub async fn ssh_remove_port_forward(
    id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<LivePortForward>, String> {
    let db = state.db.clone();
    let removed = tokio::task::spawn_blocking(move || {
        let old = LIVE_FORWARDS.lock().remove(&id);
        let Some(old) = old else {
            return Ok::<_, String>(None);
        };
        // Best-effort cancel on a live master; a dead master means the
        // kernel already released the port, so persist + report regardless.
        if let Ok((target, socket)) = live_socket_for(&db, &old.connection_id) {
            let cancel = build_ssh_forward_cancel_args(
                &target,
                &socket,
                old.local_port,
                &old.remote_host,
                old.remote_port,
            );
            let _ = run_forward_cmd(&cancel);
        }
        persist_forwards(&db, &old.connection_id)?;
        Ok(Some(old))
    })
    .await
    .map_err(|e| e.to_string())??;
    if let Some(entry) = &removed {
        emit_forwards(&app, &entry.connection_id);
    }
    Ok(removed)
}

#[tauri::command]
pub async fn ssh_list_port_forwards(
    target_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<LivePortForward>, String> {
    let _ = state;
    let guard = LIVE_FORWARDS.lock();
    Ok(guard
        .values()
        .filter(|f| target_id.as_deref().is_none_or(|t| f.connection_id == t))
        .cloned()
        .collect())
}

/// Restore persisted forwards after a (re)connect. Mirrors Orca
/// `restorePortForwards`: failures stay persisted for the next retry.
#[tauri::command]
pub async fn ssh_restore_port_forwards(
    target_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<LivePortForward>, String> {
    let db = state.db.clone();
    let tid = target_id.clone();
    let restored = tokio::task::spawn_blocking(move || {
        let persisted = db.get_ssh_state()?;
        let saved = persisted
            .ssh_targets
            .iter()
            .find(|t| t.id == tid)
            .and_then(|t| t.port_forwards.clone())
            .unwrap_or_default();
        if saved.is_empty() {
            return Ok::<_, String>(Vec::new());
        }
        let (target, socket) = live_socket_for(&db, &tid)?;
        let mut out = Vec::new();
        for pf in saved {
            // A reconnect swaps the connection; bail if the master died mid-loop.
            if !socket.exists() {
                break;
            }
            let args = build_ssh_forward_add_args(
                &target,
                &socket,
                pf.local_port,
                &pf.remote_host,
                pf.remote_port,
            );
            match run_forward_cmd(&args) {
                Ok(_) => {
                    let id = format!("pf-{}", NEXT_FORWARD_ID.fetch_add(1, Ordering::SeqCst));
                    let entry = LivePortForward {
                        id,
                        connection_id: tid.clone(),
                        local_port: pf.local_port,
                        remote_host: pf.remote_host,
                        remote_port: pf.remote_port,
                        label: pf.label,
                    };
                    LIVE_FORWARDS.lock().insert(entry.id.clone(), entry.clone());
                    out.push(entry);
                }
                Err(err) => {
                    eprintln!(
                        "[ssh] Failed to restore forward :{} → {}:{}: {err}",
                        pf.local_port, pf.remote_host, pf.remote_port
                    );
                }
            }
        }
        persist_forwards(&db, &tid)?;
        Ok(out)
    })
    .await
    .map_err(|e| e.to_string())??;
    emit_forwards(&app, &target_id);
    Ok(restored)
}

/// Reset the relay transport for a target: `ssh -O exit` on the master, so
/// the next dial opens a fresh transport. Mirrors Orca `ssh:resetRelay`
/// (connection-handlers.ts) minus the Electron fencing (single Tauri
/// process = no cross-window race).
#[tauri::command]
pub async fn ssh_reset_relay(
    target_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let persisted = db.get_ssh_state()?;
        let Some(target) = persisted
            .ssh_targets
            .into_iter()
            .find(|t| t.id == target_id)
        else {
            return Err(format!("SSH target \"{target_id}\" not found"));
        };
        let socket = ssh_master_socket_path(&target_id);
        if socket.exists() {
            let args = build_ssh_master_exit_args(&target, &socket);
            // Best-effort: a dead master exits nonzero; the socket going
            // away is the real verdict.
            let _ = run_forward_cmd(&args);
            // Drop live forwards bound to the dead master; persisted intent
            // stays for restore-on-reconnect.
            LIVE_FORWARDS.lock().retain(|_, f| f.connection_id != target_id);
        }
        let mut persisted = db.get_ssh_state()?;
        for record in persisted.ssh_connection_records.iter_mut() {
            if record.connection_id == target_id {
                record.status = "disconnected".to_string();
                record.error = None;
                record.updated_at = ssh_now_millis();
                record.master_socket = None;
            }
        }
        db.save_ssh_state(&persisted)?;
        Ok::<_, String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}
