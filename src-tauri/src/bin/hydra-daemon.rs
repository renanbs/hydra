use std::io::{BufRead, BufReader, Write};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tracing::{info, warn};

use tauri_app_lib::terminal::TerminalManager;
use tauri_app_lib::db::DatabaseManager;
use tauri_app_lib::server::socket_paths::{hydra_socket_path, prepare_socket_path, restrict_socket_permissions};
use tauri_app_lib::ipc::{bind_local_listener, socket_file_identity, remove_socket_file_if_owned};
use tauri_app_lib::daemon_client::{DaemonRequest, DaemonResponse};

fn main() -> std::io::Result<()> {
    tracing_subscriber::fmt().with_env_filter(tracing_subscriber::EnvFilter::from_default_env()).init();
    let rt = tokio::runtime::Builder::new_multi_thread().enable_all().build().unwrap();
    rt.block_on(async_main())
}

async fn async_main() -> std::io::Result<()> {
    let socket_path = hydra_socket_path();
    prepare_socket_path(&socket_path)?;
    let listener = bind_local_listener(&socket_path)?;
    restrict_socket_permissions(&socket_path)?;
    let identity = socket_file_identity(&socket_path)?;
    // Herdr-style nonblocking accept on Unix to allow 250ms poll and quit check
    #[cfg(unix)]
    {
        use interprocess::local_socket::traits::Listener as _;
        use interprocess::local_socket::ListenerNonblockingMode;
        let _ = listener.set_nonblocking(ListenerNonblockingMode::Accept);
    }
    info!(path=%socket_path.display(), "hydra daemon listening");

    let terminal = Arc::new(TerminalManager::new());
    let db = Arc::new(DatabaseManager::new().expect("db"));
    let should_quit = Arc::new(AtomicBool::new(false));
    let sq = should_quit.clone();
    ctrlc::set_handler(move || sq.store(true, Ordering::SeqCst)).ok();

    loop {
        if should_quit.load(Ordering::SeqCst) { break; }
        use interprocess::local_socket::traits::Listener as _;
        match listener.accept() {
            Ok(stream) => {
                let t = terminal.clone();
                let d = db.clone();
                std::thread::spawn(move || handle_client(stream, t, d));
                continue;
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                tokio::time::sleep(std::time::Duration::from_millis(10)).await;
                continue;
            }
            Err(e) => {
                if should_quit.load(Ordering::SeqCst) { break; }
                warn!(err=%e, "accept failed");
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        }
    }
    let _ = remove_socket_file_if_owned(&socket_path, &identity);
    info!("hydra daemon exiting");
    Ok(())
}

fn handle_client(stream: tauri_app_lib::ipc::LocalStream, terminal: Arc<TerminalManager>, db: Arc<DatabaseManager>) {
    use interprocess::local_socket::traits::Stream as _;
    let _ = stream.set_recv_timeout(Some(std::time::Duration::from_secs(2)));
    let _ = stream.set_send_timeout(Some(std::time::Duration::from_secs(2)));
    let mut buf_reader = BufReader::new(stream);
    let mut line = String::new();
    // Orca terminalOutputBacklogCapChars: max(2MB, rows*120) — dynamic by scrollback
    let cap = db.get_settings().map(|s| std::cmp::max(2 * 1024 * 1024, s.terminal_scrollback_rows as usize * 120)).unwrap_or(2 * 1024 * 1024);
    loop {
        line.clear();
        match buf_reader.read_line(&mut line) {
            Ok(0) => break, // closed
            Ok(_) => {},
            Err(e) => { warn!(err=%e, "read failed"); break; }
        }
        if line.len() > cap {
            warn!(len=line.len(), cap=cap, "daemon line too large, truncating");
            line.truncate(cap);
        }
        let trimmed = line.trim();
        if trimmed.is_empty() { continue; }
        let req: Result<DaemonRequest, _> = serde_json::from_str(trimmed);
        let resp = match req {
            Ok(r) => handle_request(r, &terminal),
            Err(e) => DaemonResponse { ok: false, error: Some(format!("bad request: {e}")), data: None },
        };
        let mut out = serde_json::to_string(&resp).unwrap_or_else(|_| r#"{"ok":false,"error":"serialize"}"#.to_string());
        out.push('\n');
        if let Err(e) = buf_reader.get_mut().write_all(out.as_bytes()) { warn!(err=%e, "write failed"); break; }
        if let Err(e) = buf_reader.get_mut().flush() { warn!(err=%e, "flush failed"); break; }
    }
}

fn handle_request(req: DaemonRequest, terminal: &TerminalManager) -> DaemonResponse {
    match req.op.as_str() {
        "start" => {
            let sid = req.session_id.unwrap_or_default();
            let exe = req.executable.unwrap_or_else(|| "bash".to_string());
            let args = req.args.unwrap_or_default();
            let cwd = req.cwd;
            match terminal.start_session_headless(&sid, &exe, args, cwd) {
                Ok(()) => DaemonResponse { ok: true, error: None, data: None },
                Err(e) => DaemonResponse { ok: false, error: Some(e), data: None },
            }
        }
        "write" => {
            let sid = req.session_id.unwrap_or_default();
            let input = req.input.unwrap_or_default();
            match terminal.write_input(&sid, &input) {
                Ok(()) => DaemonResponse { ok: true, error: None, data: None },
                Err(e) => DaemonResponse { ok: false, error: Some(e), data: None },
            }
        }
        "resize" => {
            let sid = req.session_id.unwrap_or_default();
            let rows = req.rows.unwrap_or(24);
            let cols = req.cols.unwrap_or(80);
            match terminal.resize_session(&sid, rows, cols) {
                Ok(()) => DaemonResponse { ok: true, error: None, data: None },
                Err(e) => DaemonResponse { ok: false, error: Some(e), data: None },
            }
        }
        "snapshot" => {
            let sid = req.session_id.unwrap_or_default();
            match terminal.get_snapshot(&sid) {
                Ok(snap) => DaemonResponse { ok: true, error: None, data: Some(serde_json::to_value(snap).unwrap()) },
                Err(e) => DaemonResponse { ok: false, error: Some(e), data: None },
            }
        }
        "close" => {
            let sid = req.session_id.unwrap_or_default();
            terminal.close_session(&sid);
            DaemonResponse { ok: true, error: None, data: None }
        }
        "list" => {
            let list = terminal.list_sessions();
            DaemonResponse { ok: true, error: None, data: Some(serde_json::json!(list)) }
        }
        "poll" => {
            let sid = req.session_id.unwrap_or_default();
            let off = req.offset.unwrap_or(0);
            match terminal.poll_output(&sid, off) {
                Ok((data, next)) => DaemonResponse { ok: true, error: None, data: Some(serde_json::json!({"data": data, "next_offset": next})) },
                Err(e) => DaemonResponse { ok: false, error: Some(e), data: None },
            }
        }
        _ => DaemonResponse { ok: false, error: Some(format!("unknown op {}", req.op)), data: None },
    }
}
