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

pub fn daemon_available() -> bool {
    let path = socket_path();
    if !path.exists() {
        DAEMON_LAST_STATUS.store(false, Ordering::Relaxed);
        return false;
    }
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;
    let last = DAEMON_LAST_CHECK.load(Ordering::Relaxed);
    if now - last < 1000 {
        return DAEMON_LAST_STATUS.load(Ordering::Relaxed);
    }
    let ok = crate::ipc::connect_local_stream(&path).is_ok();
    DAEMON_LAST_STATUS.store(ok, Ordering::Relaxed);
    DAEMON_LAST_CHECK.store(now, Ordering::Relaxed);
    ok
}

pub fn daemon_request(req: &DaemonRequest) -> Result<DaemonResponse, String> {
    use interprocess::local_socket::traits::Stream as _;
    let path = socket_path();
    let mut stream = crate::ipc::connect_local_stream(&path).map_err(|e| format!("daemon not available: {e}"))?;
    let _ = stream.set_recv_timeout(Some(Duration::from_millis(300)));
    let _ = stream.set_send_timeout(Some(Duration::from_millis(300)));
    let mut json = serde_json::to_string(req).map_err(|e| e.to_string())?;
    json.push('\n');
    stream.write_all(json.as_bytes()).map_err(|e| e.to_string())?;
    stream.flush().map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(&mut stream);
    let mut line = String::new();
    reader.read_line(&mut line).map_err(|e| e.to_string())?;
    if line.is_empty() {
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
