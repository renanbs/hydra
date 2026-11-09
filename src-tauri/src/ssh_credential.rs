//! SSH credential request/response flow (passphrase, password,
//! keyboard-interactive).
//!
//! Ported from Orca `main/ipc/ssh-passphrase.ts` (`requestCredential` +
//! `registerCredentialHandler`): the backend mints a `requestId`, emits
//! `ssh:credential-request`, and awaits `ssh_submit_credential`. A timeout
//! resolves `null` so a dismissed renderer never hangs a dial. The emit side
//! uses `AppHandle` (Tauri push), not polling, per the event-loop discipline.

use std::collections::HashMap;
use std::sync::LazyLock;
use std::time::Duration;
use parking_lot::Mutex;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;

const CREDENTIAL_TIMEOUT: Duration = Duration::from_secs(120);

static PENDING_CREDENTIALS: LazyLock<Mutex<HashMap<String, oneshot::Sender<Option<String>>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SshCredentialRequestPayload {
    pub request_id: String,
    pub target_id: String,
    pub kind: String,
    pub detail: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct SshCredentialResolvedPayload {
    pub request_id: String,
}

/// Mint a credential request, notify the renderer, and wait for
/// `ssh_submit_credential` (or timeout → `None`).
///
/// `kind`: `passphrase` | `password` | `keyboard-interactive`.
/// Callable from any spawn_blocking dial path: the wait itself is async and
/// must run on the async side — this helper only registers and emits; see
/// `await_credential` below for the split.
pub fn request_ssh_credential(
    app: &AppHandle,
    target_id: &str,
    kind: &str,
    detail: &str,
) -> (String, oneshot::Receiver<Option<String>>) {
    let request_id = format!(
        "cred-{}-{}",
        ssh_now(),
        PENDING_CREDENTIALS.lock().len()
    );
    let (tx, rx) = oneshot::channel();
    PENDING_CREDENTIALS
        .lock()
        .insert(request_id.clone(), tx);
    let _ = app.emit(
        "ssh:credential-request",
        SshCredentialRequestPayload {
            request_id: request_id.clone(),
            target_id: target_id.to_string(),
            kind: kind.to_string(),
            detail: detail.to_string(),
        },
    );
    // Timeout guard: a renderer that never answers must not hang the dial.
    let app_emit = app.clone();
    let timeout_id = request_id.clone();
    tokio::spawn(async move {
        tokio::time::sleep(CREDENTIAL_TIMEOUT).await;
        if let Some(tx) = PENDING_CREDENTIALS.lock().remove(&timeout_id) {
            let _ = tx.send(None);
            let _ = app_emit.emit(
                "ssh:credential-resolved",
                SshCredentialResolvedPayload {
                    request_id: timeout_id,
                },
            );
        }
    });
    (request_id, rx)
}

fn ssh_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Resolve a pending credential request from the renderer.
/// Mirrors Orca `ipcMain.handle('ssh:submitCredential')`.
#[tauri::command]
pub async fn ssh_submit_credential(
    request_id: String,
    value: Option<String>,
    app: AppHandle,
) -> Result<(), String> {
    let tx = PENDING_CREDENTIALS.lock().remove(&request_id);
    if let Some(tx) = tx {
        let _ = tx.send(value);
        let _ = app.emit(
            "ssh:credential-resolved",
            SshCredentialResolvedPayload { request_id },
        );
    }
    Ok(())
}
