// Persisted registry of paired remote runtimes ("Orca servers").
//
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Sources: shared/runtime-environments.ts (store shape), shared/remote-pairing-address.ts
// (loopback classification), main/ipc/runtime-environment-pairing-verification.ts
// (verify-then-save flow).
//
// Why this lives in Rust and not in renderer localStorage: the SSH host registry
// already persists in SQLite (`ssh_state`), and the environments must survive the
// same restarts. The renderer reaches this module through two Tauri commands —
// `runtime_verify_and_add_from_pairing_code` and `runtime_list_environments` — so
// `src/store/runtime-environment-bridge.ts` is a thin transport again.
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DatabaseManager;
use crate::AppState;

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// One paired runtime host. The access endpoint + device token are the secret
/// half: they travel back to the renderer (which needs them to open the E2EE
/// transport) but are redacted from every log line this module emits.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeAccessEndpoint {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub endpoint: String,
    #[serde(default)]
    pub device_token: Option<String>,
    #[serde(default)]
    pub public_key_b64: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PairedRuntimeEnvironment {
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
    #[serde(default)]
    pub pairing_revision: Option<i64>,
    #[serde(default)]
    pub paired_device_id: Option<String>,
    #[serde(default)]
    pub last_used_at: Option<i64>,
    #[serde(default)]
    pub runtime_id: Option<String>,
    #[serde(default)]
    pub connection_dependency: Option<String>,
    #[serde(default)]
    pub endpoints: Vec<RuntimeAccessEndpoint>,
    #[serde(default)]
    pub preferred_endpoint_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct PersistedRuntimeEnvironments {
    #[serde(default)]
    pub environments: Vec<PairedRuntimeEnvironment>,
    #[serde(default)]
    pub environment_generation_counter: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct PairingOfferPayload {
    pub v: Option<i64>,
    pub endpoint: Option<String>,
    pub device_token: Option<String>,
    #[serde(default)]
    pub public_key_b64: Option<String>,
    #[serde(default)]
    pub paired_device_id: Option<String>,
    #[serde(default)]
    pub scope: Option<String>,
}

fn decode_base64url(input: &str) -> Option<Vec<u8>> {
    if input.is_empty() || input.len() > 8 * 1024 {
        return None;
    }
    let mut s = input.replace('-', "+").replace('_', "/");
    while s.len() % 4 != 0 {
        s.push('=');
    }
    const TABLE: &[u8; 256] = &{
        let mut t = [255u8; 256];
        let mut i = 0u8;
        while i < 26 {
            t[(b'A' + i) as usize] = i;
            t[(b'a' + i) as usize] = 26 + i;
            i += 1;
        }
        let mut j = 0u8;
        while j < 10 {
            t[(b'0' + j) as usize] = 52 + j;
            j += 1;
        }
        t[b'+' as usize] = 62;
        t[b'/' as usize] = 63;
        t[b'=' as usize] = 0;
        t
    };
    if s.bytes().any(|b| TABLE[b as usize] == 255) {
        return None;
    }
    let mut out = Vec::with_capacity(s.len() / 4 * 3);
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        let mut n: u32 = 0;
        for k in 0..4 {
            n = (n << 6) | TABLE[bytes[i + k] as usize] as u32;
        }
        out.push((n >> 16) as u8);
        if bytes[i + 2] != b'=' {
            out.push((n >> 8) as u8);
        }
        if bytes[i + 3] != b'=' {
            out.push(n as u8);
        }
        i += 4;
    }
    Some(out)
}

fn extract_pairing_code(input: &str) -> Option<String> {
    let trimmed = input.trim();
    if trimmed.is_empty() || trimmed.len() > 16 * 1024 {
        return None;
    }
    if !trimmed.to_lowercase().starts_with("orca://") {
        return Some(trimmed.to_string());
    }
    let lower = trimmed.to_lowercase();
    if !lower.starts_with("orca://pair") {
        return None;
    }
    let rest = &trimmed["orca://".len()..];
    let (host, tail) = match rest.find(['?', '#']) {
        Some(i) => (&rest[..i], &rest[i..]),
        None => (rest, ""),
    };
    if !host.eq_ignore_ascii_case("pair") {
        return None;
    }
    if let Some(q) = tail.strip_prefix('?') {
        let query = q.split('#').next().unwrap_or("");
        for param in query.split('&') {
            let mut kv = param.splitn(2, '=');
            if kv.next().unwrap_or("") == "code" {
                return kv.next().map(|s| s.to_string());
            }
        }
        return None;
    }
    tail.strip_prefix('#')
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

fn parse_pairing_offer(input: &str) -> Option<PairingOfferPayload> {
    let code = extract_pairing_code(input)?;
    let bytes = decode_base64url(&code)?;
    let json = String::from_utf8(bytes).ok()?;
    let offer: PairingOfferPayload = serde_json::from_str(&json).ok()?;
    let endpoint = offer.endpoint.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty())?;
    let token = offer.device_token.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty())?;
    if offer.v.is_none() || endpoint.is_empty() || token.is_empty() {
        return None;
    }
    Some(offer)
}

fn is_loopback_endpoint(endpoint: &str) -> bool {
    let after_scheme = endpoint.split("://").nth(1).unwrap_or(endpoint);
    let authority = after_scheme
        .split(['/', '?', '#'])
        .next()
        .unwrap_or("");
    let host_port = authority.rsplit('@').next().unwrap_or("");
    let host = host_port
        .trim_matches(|c| c == '[' || c == ']')
        .split(':')
        .next()
        .unwrap_or("")
        .to_lowercase();
    host == "localhost"
        || host == "localhost.localdomain"
        || host == "127.0.0.1"
        || host == "::1"
        || host.starts_with("127.")
        || host.ends_with(".localhost")
}

/// Verify-then-save: parse the pasted `orca://pair` link, refuse a loopback
/// destination unless the SSH-tunnel override was accepted, and persist the
/// environment in SQLite (`runtime_environments`, same key-JSON pattern as
/// `ssh_state`). The live E2EE verification against the remote host happens in
/// the renderer (`remote-runtime-browser-pairing.ts`), which already holds the
/// decrypted offer; the backend trusts the parsed link the same way Orca's
/// `addEnvironmentFromPairingCode` trusts its already-verified offer.
#[tauri::command]
pub async fn runtime_verify_and_add_from_pairing_code(
    state: State<'_, AppState>,
    name: String,
    pairing_code: String,
    allow_loopback: Option<bool>,
) -> Result<PairedRuntimeEnvironment, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Server name is required.".to_string());
    }
    let offer = parse_pairing_offer(&pairing_code)
        .ok_or_else(|| "Invalid pairing code. Expected an orca://pair?... URL or bare pairing payload.".to_string())?;
    if offer.scope.as_deref() == Some("mobile") {
        return Err("This link grants mobile-only access. Generate a link for another Orca client.".to_string());
    }
    let endpoint = offer.endpoint.clone().unwrap_or_default();
    if is_loopback_endpoint(&endpoint) && allow_loopback != Some(true) {
        return Err("This access link points back to this device.".to_string());
    }
    let db: &DatabaseManager = &state.db;
    let mut persisted = db
        .get_runtime_environments()
        .map_err(|e| format!("Failed to read paired servers: {e}"))?;
    if persisted
        .environments
        .iter()
        .any(|entry| entry.name == name)
    {
        return Err(format!("A server named \"{name}\" already exists."));
    }
    persisted.environment_generation_counter += 1;
    let counter = persisted.environment_generation_counter;
    let now = now_ms();
    let uses_ssh_tunnel = is_loopback_endpoint(&endpoint) && allow_loopback == Some(true);
    let mut environment = PairedRuntimeEnvironment {
        id: format!("{now:013x}-{counter:08x}"),
        created_at: now,
        updated_at: now,
        pairing_revision: Some(now),
        paired_device_id: offer.paired_device_id.clone(),
        last_used_at: None,
        runtime_id: None,
        connection_dependency: uses_ssh_tunnel.then(|| "ssh-tunnel".to_string()),
        endpoints: vec![RuntimeAccessEndpoint {
            id: String::new(),
            kind: "websocket".to_string(),
            label: "WebSocket".to_string(),
            endpoint,
            device_token: offer.device_token.clone(),
            public_key_b64: offer.public_key_b64.clone(),
        }],
        preferred_endpoint_id: None,
        name,
    };
    persisted.environments.sort_by(|a, b| a.name.cmp(&b.name));
    environment.endpoints[0].id = format!("ws-{}", environment.id);
    environment.preferred_endpoint_id = Some(environment.endpoints[0].id.clone());
    persisted.environments.push(environment.clone());
    persisted.environments.sort_by(|a, b| a.name.cmp(&b.name));
    db.save_runtime_environments(&persisted)
        .map_err(|e| format!("Failed to save paired server: {e}"))?;
    Ok(environment)
}

#[tauri::command]
pub async fn runtime_list_environments(
    state: State<'_, AppState>,
) -> Result<Vec<PairedRuntimeEnvironment>, String> {
    state
        .db
        .get_runtime_environments()
        .map(|persisted| persisted.environments)
        .map_err(|e| format!("Failed to read paired servers: {e}"))
}
/// Full-secret read for one environment: the renderer needs the stored offer
/// (endpoint + device token + host key) to open the E2EE transport for
/// `repo.clone` / `repo.create` on that server. Scoped to a single id so a
/// list surface never carries secrets.
#[tauri::command]
pub async fn runtime_environment_offer(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<PairedRuntimeEnvironment, String> {
    state
        .db
        .get_runtime_environments()
        .map_err(|e| format!("Failed to read paired servers: {e}"))?
        .environments
        .into_iter()
        .find(|entry| entry.id == environment_id)
        .ok_or_else(|| "Paired server not found.".to_string())
}

#[tauri::command]
pub async fn runtime_remove_environment(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<bool, String> {
    let mut persisted = state
        .db
        .get_runtime_environments()
        .map_err(|e| format!("Failed to read paired servers: {e}"))?;
    let before = persisted.environments.len();
    persisted
        .environments
        .retain(|entry| entry.id != environment_id);
    if persisted.environments.len() == before {
        return Ok(false);
    }
    state
        .db
        .save_runtime_environments(&persisted)
        .map_err(|e| format!("Failed to remove paired server: {e}"))?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pairing_link(offer: serde_json::Value) -> String {
        const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        let bytes = serde_json::to_vec(&offer).unwrap();
        let mut out = String::new();
        let mut i = 0;
        while i < bytes.len() {
            let a = bytes[i] as u32;
            let b = if i + 1 < bytes.len() { bytes[i + 1] as u32 } else { 0 };
            let c = if i + 2 < bytes.len() { bytes[i + 2] as u32 } else { 0 };
            let n = (a << 16) | (b << 8) | c;
            out.push(TABLE[((n >> 18) & 63) as usize] as char);
            out.push(TABLE[((n >> 12) & 63) as usize] as char);
            if i + 1 < bytes.len() {
                out.push(TABLE[((n >> 6) & 63) as usize] as char);
            }
            if i + 2 < bytes.len() {
                out.push(TABLE[n as usize & 63] as char);
            }
            i += 3;
        }
        format!("orca://pair?code={out}")
    }

    #[test]
    fn parses_bare_and_url_pairing_codes() {
        let link = pairing_link(serde_json::json!({
            "v": 2, "endpoint": "wss://100.64.0.2:6767", "deviceToken": "token"
        }));
        let offer = parse_pairing_offer(&link).expect("url form parses");
        assert_eq!(offer.endpoint.as_deref(), Some("wss://100.64.0.2:6767"));
        let code = extract_pairing_code(&link).unwrap();
        let bare = parse_pairing_offer(&code).expect("bare form parses");
        assert_eq!(bare.device_token.as_deref(), Some("token"));
    }

    #[test]
    fn rejects_mobile_scope_and_loopback_without_override() {
        let mobile = pairing_link(serde_json::json!({
            "v": 2, "endpoint": "wss://100.64.0.2:6767", "deviceToken": "t", "scope": "mobile"
        }));
        let offer = parse_pairing_offer(&mobile).unwrap();
        assert_eq!(offer.scope.as_deref(), Some("mobile"));
        assert!(is_loopback_endpoint("wss://127.0.0.1:6767"));
        assert!(is_loopback_endpoint("ws://localhost:6767/path"));
        assert!(!is_loopback_endpoint("wss://100.64.0.2:6767"));
        assert!(!is_loopback_endpoint("wss://192.168.1.10:6767"));
    }

    #[test]
    fn rejects_garbage_without_panicking() {
        assert!(parse_pairing_offer("").is_none());
        assert!(parse_pairing_offer("orca://pair?code=!!!").is_none());
        assert!(parse_pairing_offer("https://example.com").is_none());
        assert!(parse_pairing_offer("orca://other?code=abc").is_none());
    }
}
