use std::io::{BufRead, BufReader, Write};
use std::time::Duration;
use std::sync::atomic::{AtomicI64, AtomicBool, Ordering};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct DaemonRequest {
    pub op: String,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub executable: Option<String>,
    #[serde(default)]
    pub args: Option<Vec<String>>,
    #[serde(default)]
    pub cwd: Option<String>,
    #[serde(default)]
    pub input: Option<String>,
    #[serde(default)]
    pub rows: Option<u16>,
    #[serde(default)]
    pub cols: Option<u16>,
    #[serde(default)]
    pub offset: Option<usize>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DaemonResponse {
    pub ok: bool,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub data: Option<serde_json::Value>,
}

fn socket_path() -> std::path::PathBuf {
    crate::server::socket_paths::hydra_socket_path()
}

static DAEMON_LAST_CHECK: AtomicI64 = AtomicI64::new(0);
static DAEMON_LAST_STATUS: AtomicBool = AtomicBool::new(false);

/// How long a probe result is served before re-checking the socket. Was 1s,
/// which let a stale positive survive long after a daemon crash (bug #9).
const DAEMON_PROBE_TTL_MS: i64 = 250;

fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

pub fn daemon_available() -> bool {
    let path = socket_path();
    if !path.exists() {
        // Socket file gone => daemon is definitively down. Republish the status
        // (Release) so concurrent readers never keep serving a stale positive,
        // but do NOT cache the negative: a fresh socket file is cheap to
        // re-stat, so the moment a restarted daemon recreates the path this
        // call probes again instead of returning a cached "down".
        DAEMON_LAST_STATUS.store(false, Ordering::Release);
        return false;
    }
    let now = now_millis();
    // Acquire pairs with the Release stores below: a reader that sees a fresh
    // timestamp is guaranteed (happens-before) to observe the matching status.
    // Order matters: check is written last, so reading check THEN status always
    // yields a consistent (timestamp, status) pair.
    let last = DAEMON_LAST_CHECK.load(Ordering::Acquire);
    if now - last < DAEMON_PROBE_TTL_MS {
        return DAEMON_LAST_STATUS.load(Ordering::Acquire);
    }
    let ok = crate::ipc::connect_local_stream(&path).is_ok();
    DAEMON_LAST_STATUS.store(ok, Ordering::Release);
    DAEMON_LAST_CHECK.store(now, Ordering::Release);
    ok
}

/// Bust the availability cache after a real request failed to reach the
/// daemon. Without this a positive cached result (daemon alive during the last
/// probe) keeps being served for the rest of the TTL after the daemon crashes,
/// sending every following daemon_request into a doomed connection (bug #9).
pub fn mark_daemon_unavailable() {
    DAEMON_LAST_STATUS.store(false, Ordering::Release);
    DAEMON_LAST_CHECK.store(0, Ordering::Release); // expire the window: force a re-probe
}

pub fn daemon_request(req: &DaemonRequest) -> Result<DaemonResponse, String> {
    use interprocess::local_socket::traits::Stream as _;
    let path = socket_path();
    let mut stream = match crate::ipc::connect_local_stream(&path) {
        Ok(s) => s,
        Err(e) => {
            // Connection refused/closed: the daemon is unreachable. Don't let
            // the stale cached positive keep failing the next calls.
            mark_daemon_unavailable();
            return Err(format!("daemon not available: {e}"));
        }
    };
    let _ = stream.set_recv_timeout(Some(Duration::from_millis(300)));
    let _ = stream.set_send_timeout(Some(Duration::from_millis(300)));
    let mut json = serde_json::to_string(req).map_err(|e| e.to_string())?;
    json.push('\n');
    stream.write_all(json.as_bytes()).map_err(|e| {
        mark_daemon_unavailable();
        e.to_string()
    })?;
    stream.flush().map_err(|e| {
        mark_daemon_unavailable();
        e.to_string()
    })?;
    let mut reader = BufReader::new(&mut stream);
    let mut line = String::new();
    reader.read_line(&mut line).map_err(|e| {
        mark_daemon_unavailable();
        e.to_string()
    })?;
    if line.is_empty() {
        // Peer closed the connection mid-request: the daemon went away.
        mark_daemon_unavailable();
        return Err("daemon closed connection".to_string());
    }
    let resp: DaemonResponse = serde_json::from_str(line.trim()).map_err(|e| format!("bad daemon response: {e} line={line}"))?;
    Ok(resp)
}

pub fn ensure_daemon_spawned() {
    if daemon_available() { return; }
    // Try spawn hydra-daemon binary next to current exe
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let daemon = dir.join("hydra-daemon");
            if daemon.exists() {
                let _ = std::process::Command::new(daemon).spawn();
                std::thread::sleep(Duration::from_millis(300));
                return;
            }
        }
    }
    // Fallback: try cargo target
    let _ = std::process::Command::new("hydra-daemon").spawn();
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::Ordering;

    #[test]
    fn mark_daemon_unavailable_busts_cached_positive() {
        // Simulate a fresh cached positive from a probe against a live daemon.
        DAEMON_LAST_CHECK.store(now_millis(), Ordering::SeqCst);
        DAEMON_LAST_STATUS.store(true, Ordering::SeqCst);

        // A real request that failed to reach the daemon busts the cache...
        mark_daemon_unavailable();

        // ...so the next availability check re-probes instead of serving the
        // stale positive for the rest of the TTL (bug #9: TTL window expired).
        assert!(!DAEMON_LAST_STATUS.load(Ordering::SeqCst), "status must be republished as false");
        assert_eq!(DAEMON_LAST_CHECK.load(Ordering::SeqCst), 0, "probe window must be expired");
    }

    #[test]
    fn missing_socket_never_serves_cached_positive() {
        let p = socket_path();
        if !p.exists() {
            // A cached "daemon alive" must not survive the socket file being
            // gone (crash leaves the socket, but a restarted daemon rebinds the
            // path — when it is absent the daemon is definitively down).
            DAEMON_LAST_CHECK.store(now_millis(), Ordering::SeqCst);
            DAEMON_LAST_STATUS.store(true, Ordering::SeqCst);
            assert!(!daemon_available());
            assert!(!DAEMON_LAST_STATUS.load(Ordering::SeqCst));
        }
    }
}
