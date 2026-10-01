//! Loopback hook listener (G2/T2).
//!
//! Binds `127.0.0.1:0` once per boot behind a 256-bit bearer token and serves
//! `POST /hook/claude` + `POST /hook/codex` for the managed hook scripts
//! (`assets/hooks/hydra-*-hook.sh`). Mirrors Orca `agent-hook-listener.ts`
//! with the Hydra decisions applied:
//!
//! * `HYDRA_*` namespace (D2); token header `X-Hydra-Agent-Hook-Token`.
//! * `paneKey` is the opaque `session_id` (D3); parsing lives in
//!   [`crate::hooks::envelope`] and this listener never splits it.
//! * Fail-open 204 on every path: auth is checked BEFORE the body is read,
//!   and no path ever returns 4xx/5xx — a hook must never break the agent
//!   (the scripts spool to disk when the POST fails).
//! * 204 goes out as soon as the envelope parses; forwarding never blocks
//!   the agent waiting on normalization.
//! * Truncated bodies (Content-Length unmet: the IDS/AV-resets-loopback
//!   fingerprint from Orca #11217) are counted, reported once at threshold,
//!   and answered 204.
//!
//! Delivery: parsed envelopes land in the handle outbox
//! ([`HookServerHandle::delivered_hooks`]) — the observable handoff the T2
//! tests assert on. Tauri/sidecar wiring (T6) bridges the outbox into the
//! [`crate::hooks::sidecar`] driver; this module never spawns it, and the
//! test path instantiates the server directly with no Tauri setup.
//!
//! Publication: the bound port + token ride on the handle AND on
//! [`published_listener`] for T4 (`session_coords` takes authoritative
//! ownership from here when the T6 wiring lands; `endpoint.rs` already
//! anticipates the takeover and is intentionally left untouched by T2).

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Arc, LazyLock, Mutex,
};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use super::envelope::{parse_hook_body, HookEnvelope, HookHeaders, META_HEADER};

/// Token header the hook scripts send (`X-Hydra-Agent-Hook-Token`).
/// Matched case-insensitively per HTTP semantics.
pub const HOOK_TOKEN_HEADER: &str = "x-hydra-agent-hook-token";
/// POST route for the Claude managed hook.
pub const HOOK_CLAUDE_ROUTE: &str = "/hook/claude";
/// POST route for the Codex managed hook.
pub const HOOK_CODEX_ROUTE: &str = "/hook/codex";

/// Max hook body accepted. Mirrors Orca `HOOK_REQUEST_MAX_BYTES` (1 MB):
/// hook payloads are small agent JSON; anything larger is not a hook.
const MAX_BODY_BYTES: u64 = 1_000_000;
/// Cap on the request line + headers block; overflow answers 204.
const MAX_HEADER_BYTES: usize = 32 * 1024;
/// Cap on header count so a junk header flood cannot grow the map.
const MAX_HEADER_COUNT: usize = 128;
/// Slowloris cap. Mirrors Orca `HOOK_REQUEST_SLOWLORIS_MS` (5 s).
const READ_TIMEOUT: Duration = Duration::from_secs(5);
const WRITE_TIMEOUT: Duration = Duration::from_secs(5);

/// Truncation count that fires the one-time interference report. Mirrors
/// Orca `HOOK_TRANSPORT_INTERFERENCE_THRESHOLD`: one cut body can be a
/// crashed agent mid-write; a repeat is a device on the loopback path.
pub const HOOK_TRANSPORT_INTERFERENCE_THRESHOLD: u64 = 3;

/// A parsed hook handed off by the listener. `wire` records which envelope
/// mode the request used (`"raw-json"` when [`META_HEADER`] was present,
/// else the legacy form post) — the same mode bit the scripts select on.
#[derive(Debug, Clone)]
pub struct DeliveredHook {
    /// `"claude"` or `"codex"` (the route that received the POST).
    pub source: String,
    /// `"raw-json"` or `"form"`.
    pub wire: &'static str,
    pub envelope: HookEnvelope,
}

/// Bound port + token published for T4/T6. `session_coords` takes
/// authoritative ownership of these when the T6 wiring lands.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublishedListener {
    pub port: u16,
    pub token: String,
}

static PUBLISHED_LISTENER: LazyLock<Mutex<Option<PublishedListener>>> =
    LazyLock::new(|| Mutex::new(None));

/// Port + token of the most recently started listener, if any.
pub fn published_listener() -> Option<PublishedListener> {
    PUBLISHED_LISTENER
        .lock()
        .ok()
        .and_then(|guard| guard.clone())
}

fn publish_listener(port: u16, token: &str) {
    if let Ok(mut guard) = PUBLISHED_LISTENER.lock() {
        *guard = Some(PublishedListener {
            port,
            token: token.to_string(),
        });
    }
}

/// Running loopback listener. `port`/`token` are the coordinates the hook
/// scripts need; deliveries and the truncation count are observable for
/// tests and for the T6 sidecar bridge.
pub struct HookServerHandle {
    pub port: u16,
    pub token: String,
    delivered: Arc<Mutex<Vec<DeliveredHook>>>,
    truncations: Arc<AtomicU64>,
    shutdown_flag: Arc<AtomicBool>,
    accept_thread: Option<JoinHandle<()>>,
}

impl HookServerHandle {
    /// Envelopes parsed + accepted since boot, in arrival order.
    pub fn delivered_hooks(&self) -> Vec<DeliveredHook> {
        self.delivered
            .lock()
            .map(|guard| guard.clone())
            .unwrap_or_default()
    }

    /// Authenticated-but-truncated POSTs observed since boot.
    pub fn truncation_count(&self) -> u64 {
        self.truncations.load(Ordering::SeqCst)
    }

    /// Stop the accept loop and join it. Idempotent; `Drop` repeats it.
    pub fn shutdown(&mut self) {
        self.shutdown_flag.store(true, Ordering::SeqCst);
        if let Some(thread) = self.accept_thread.take() {
            let _ = thread.join();
        }
    }
}

impl Drop for HookServerHandle {
    fn drop(&mut self) {
        self.shutdown();
    }
}

/// Start the loopback listener: bind `127.0.0.1:0`, mint a fresh 256-bit
/// token, publish both for T4/T6, and serve hooks on a background thread.
/// No Tauri setup involved (that wiring is T6); tests call this directly.
pub fn start_hook_server() -> std::io::Result<HookServerHandle> {
    let token = new_hook_token();
    let listener = TcpListener::bind("127.0.0.1:0")?;
    listener.set_nonblocking(true)?;
    let port = listener.local_addr()?.port();
    publish_listener(port, &token);

    let delivered = Arc::new(Mutex::new(Vec::new()));
    let truncations = Arc::new(AtomicU64::new(0));
    let shutdown_flag = Arc::new(AtomicBool::new(false));
    let accept_thread = thread::spawn({
        let token = token.clone();
        let delivered = Arc::clone(&delivered);
        let truncations = Arc::clone(&truncations);
        let shutdown_flag = Arc::clone(&shutdown_flag);
        move || accept_loop(listener, &token, &delivered, &truncations, &shutdown_flag)
    });

    eprintln!("[agent-hooks] listening on 127.0.0.1:{port}");
    Ok(HookServerHandle {
        port,
        token,
        delivered,
        truncations,
        shutdown_flag,
        accept_thread: Some(accept_thread),
    })
}

fn accept_loop(
    listener: TcpListener,
    token: &str,
    delivered: &Arc<Mutex<Vec<DeliveredHook>>>,
    truncations: &Arc<AtomicU64>,
    shutdown: &Arc<AtomicBool>,
) {
    loop {
        if shutdown.load(Ordering::SeqCst) {
            break;
        }
        match listener.accept() {
            Ok((stream, _)) => {
                // Accepted sockets inherit nonblocking: back to blocking,
                // timeouts are applied per connection.
                let _ = stream.set_nonblocking(false);
                let token = token.to_string();
                let delivered = Arc::clone(delivered);
                let truncations = Arc::clone(truncations);
                thread::spawn(move || handle_connection(stream, &token, &delivered, &truncations));
            }
            Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(10));
            }
            Err(_) => {
                if shutdown.load(Ordering::SeqCst) {
                    break;
                }
                thread::sleep(Duration::from_millis(10));
            }
        }
    }
}

/// Serve one connection. Every path answers 204 (or closes a dead socket);
/// 4xx/5xx are never emitted so a listener fault cannot break the agent.
fn handle_connection(
    stream: TcpStream,
    token: &str,
    delivered: &Arc<Mutex<Vec<DeliveredHook>>>,
    truncations: &Arc<AtomicU64>,
) {
    let _ = stream.set_read_timeout(Some(READ_TIMEOUT));
    let _ = stream.set_write_timeout(Some(WRITE_TIMEOUT));
    // One buffered reader serves head + body: a client that pipelines the
    // body with the headers must not lose bytes to a dropped buffer.
    let reader_stream = match stream.try_clone() {
        Ok(peer) => peer,
        Err(_) => {
            respond_204(&stream);
            return;
        }
    };
    let mut reader = BufReader::new(reader_stream);
    let (method, target, headers) = match read_head(&mut reader) {
        Ok(head) => head,
        Err(_) => {
            respond_204(&stream);
            return;
        }
    };
    // Auth BEFORE body: a missing/forged token never pays for a body read.
    if !token_ok(&headers, token) {
        respond_204(&stream);
        return;
    }
    let source = match route_source(&target) {
        Some(source) => source,
        None => {
            respond_204(&stream);
            return;
        }
    };
    if method != "POST" {
        respond_204(&stream);
        return;
    }
    let body = match read_body(&mut reader, &headers) {
        Ok(body) => body,
        Err(BodyError::Truncated { read, declared }) => {
            let count = truncations.fetch_add(1, Ordering::SeqCst) + 1;
            if count == HOOK_TRANSPORT_INTERFERENCE_THRESHOLD {
                eprintln!(
                    "[agent-hooks] {count} hook POSTs cut off mid-body on loopback since boot \
                     (last: {read}/{declared} bytes, /hook/{source}). Agent status will be \
                     missing until this stops. Most likely local network security software is \
                     inspecting and blocking loopback HTTP; less likely, this process stalled \
                     past the hook client timeout."
                );
            }
            respond_204(&stream);
            return;
        }
        Err(BodyError::Oversize) | Err(BodyError::Io) => {
            respond_204(&stream);
            return;
        }
    };
    let envelope = match parse_hook_body(&body, &headers) {
        Ok(envelope) => envelope,
        Err(_) => {
            respond_204(&stream);
            return;
        }
    };
    // Record synchronously (a mutex push, microseconds) so 204 stays
    // immediate while delivery remains deterministic for tests and the T6
    // bridge; normalization itself happens downstream, never on this path.
    let wire = if headers.contains_key(META_HEADER) {
        "raw-json"
    } else {
        "form"
    };
    if let Ok(mut outbox) = delivered.lock() {
        outbox.push(DeliveredHook {
            source: source.to_string(),
            wire,
            envelope,
        });
    }
    respond_204(&stream);
}

fn respond_204(stream: &TcpStream) {
    if let Ok(mut writer) = stream.try_clone() {
        let _ = writer.write_all(
            b"HTTP/1.1 204 No Content\r\ncontent-length: 0\r\nconnection: close\r\n\r\n",
        );
        let _ = writer.flush();
    }
    // Drop closes the connection (`connection: close`, one request each).
}

fn read_head(
    reader: &mut BufReader<TcpStream>,
) -> std::io::Result<(String, String, HookHeaders)> {
    let mut line = String::new();
    let mut total = 0usize;
    reader.read_line(&mut line)?;
    total += line.len();
    if total == 0 || total > MAX_HEADER_BYTES {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "bad hook request line",
        ));
    }
    let mut parts = line.split_whitespace();
    let method = parts
        .next()
        .ok_or_else(|| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, "missing hook method")
        })?
        .to_uppercase();
    let target = parts
        .next()
        .ok_or_else(|| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, "missing hook target")
        })?
        .to_string();
    let mut headers = HookHeaders::new();
    loop {
        line.clear();
        let n = reader.read_line(&mut line)?;
        if n == 0 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::UnexpectedEof,
                "hook head ended early",
            ));
        }
        total += n;
        if total > MAX_HEADER_BYTES {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "hook headers too large",
            ));
        }
        let trimmed = line.trim_end_matches(['\r', '\n']);
        if trimmed.is_empty() {
            break;
        }
        // Lines without a colon are ignored (fail-open leniency); auth +
        // envelope parsing still gate delivery.
        if let Some((name, value)) = trimmed.split_once(':') {
            headers.insert(name.trim().to_lowercase(), value.trim().to_string());
            if headers.len() > MAX_HEADER_COUNT {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "too many hook headers",
                ));
            }
        }
    }
    Ok((method, target, headers))
}

fn route_source(target: &str) -> Option<&'static str> {
    let path = target.split(['?', '#']).next().unwrap_or("");
    match path {
        HOOK_CLAUDE_ROUTE => Some("claude"),
        HOOK_CODEX_ROUTE => Some("codex"),
        _ => None,
    }
}

fn token_ok(headers: &HashMap<String, String>, token: &str) -> bool {
    headers
        .iter()
        .find(|(name, _)| name.eq_ignore_ascii_case(HOOK_TOKEN_HEADER))
        .is_some_and(|(_, value)| constant_time_eq(value.as_bytes(), token.as_bytes()))
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

enum BodyError {
    Oversize,
    Truncated { read: u64, declared: u64 },
    Io,
}

fn content_length(headers: &HookHeaders) -> Option<u64> {
    headers.get("content-length")?.trim().parse::<u64>().ok()
}

fn read_body(
    reader: &mut BufReader<TcpStream>,
    headers: &HookHeaders,
) -> Result<Vec<u8>, BodyError> {
    match content_length(headers) {
        Some(declared) => {
            if declared > MAX_BODY_BYTES {
                return Err(BodyError::Oversize);
            }
            let mut body = Vec::with_capacity(declared as usize);
            let mut remaining = declared;
            let mut chunk = [0u8; 8192];
            while remaining > 0 {
                let want = (remaining as usize).min(chunk.len());
                match reader.read(&mut chunk[..want]) {
                    Ok(0) => {
                        return Err(BodyError::Truncated {
                            read: declared - remaining,
                            declared,
                        });
                    }
                    Ok(n) => {
                        body.extend_from_slice(&chunk[..n]);
                        remaining -= n as u64;
                    }
                    // Reset mid-body is the interference fingerprint: fewer
                    // bytes than Content-Length promised.
                    Err(_) => {
                        return Err(BodyError::Truncated {
                            read: declared - remaining,
                            declared,
                        });
                    }
                }
            }
            Ok(body)
        }
        None => {
            // No length framing (never sent by the managed scripts): read to
            // EOF so a complete small body still parses, capped at the max.
            let mut body = Vec::new();
            reader
                .take(MAX_BODY_BYTES + 1)
                .read_to_end(&mut body)
                .map_err(|_| BodyError::Io)?;
            if body.len() as u64 > MAX_BODY_BYTES {
                return Err(BodyError::Oversize);
            }
            Ok(body)
        }
    }
}

/// Fresh 256-bit bearer token as 64 lowercase hex chars.
fn new_hook_token() -> String {
    random_hex(32)
}

/// Lowercase hex from the OS RNG (`/dev/urandom`), falling back to a
/// time/pid/counter xorshift when unavailable. Mirrors
/// `endpoint::random_hex` (kept private to T4, so duplicated here to keep
/// the T2 commit to its own paths).
fn random_hex(nbytes: usize) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut bytes = vec![0u8; nbytes];
    let filled = std::fs::File::open("/dev/urandom")
        .and_then(|mut f| {
            use std::io::Read as _;
            let mut got = 0;
            while got < nbytes {
                let n = f.read(&mut bytes[got..])?;
                if n == 0 {
                    break;
                }
                got += n;
            }
            Ok::<_, std::io::Error>(got)
        })
        .unwrap_or(0);
    if filled < nbytes {
        static COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let mut state = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0x9e3779b97f4a7c15)
            .wrapping_add(std::process::id() as u64)
            .wrapping_add(COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed));
        for b in bytes.iter_mut().skip(filled) {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            *b = (state >> 56) as u8;
        }
    }
    let mut out = String::with_capacity(nbytes * 2);
    for b in &bytes {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 0xf) as usize] as char);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine as _;
    use std::net::Shutdown;
    use std::time::Duration;

    const STOP_PAYLOAD: &str = r#"{"hook_event_name":"Stop","session_id":"sess-t2"}"#;

    fn raw_json_meta() -> String {
        base64::engine::general_purpose::STANDARD.encode("sess-t2-raw\x1fTAB-t2\x1ftok-t2\x1fwt-t2\x1fproduction\x1f1")
    }

    fn codex_form_body() -> Vec<u8> {
        form_urlencoded::Serializer::new(String::new())
            .append_pair("paneKey", "sess-t2-form")
            .append_pair("tabId", "TAB-t2")
            .append_pair("launchToken", "tok-t2")
            .append_pair("worktreeId", "wt-t2")
            .append_pair("env", "production")
            .append_pair("version", "1")
            .append_pair("payload", STOP_PAYLOAD)
            .finish()
            .into_bytes()
    }

    /// Raw HTTP POST over loopback; returns the full response text.
    fn raw_post(
        port: u16,
        route: &str,
        token: Option<&str>,
        extra_headers: &[(&str, &str)],
        body: &[u8],
    ) -> String {
        let mut stream =
            TcpStream::connect(("127.0.0.1", port)).expect("connect hook listener");
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .expect("read timeout");
        let mut head = format!(
            "POST {route} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: {}\r\n",
            body.len()
        );
        if let Some(token) = token {
            head.push_str(&format!("X-Hydra-Agent-Hook-Token: {token}\r\n"));
        }
        for (name, value) in extra_headers {
            head.push_str(&format!("{name}: {value}\r\n"));
        }
        head.push_str("Connection: close\r\n\r\n");
        stream.write_all(head.as_bytes()).expect("write head");
        stream.write_all(body).expect("write body");
        stream.flush().expect("flush");
        let mut response = Vec::new();
        stream.read_to_end(&mut response).expect("read response");
        String::from_utf8_lossy(&response).into_owned()
    }

    fn status_line(response: &str) -> &str {
        response.lines().next().unwrap_or("")
    }

    /// POST with token (RAW_JSON wire, as the managed scripts send) parses
    /// and is handed to the outbox; the agent gets 204.
    #[test]
    fn claude_raw_json_post_with_token_is_delivered() {
        let mut server = start_hook_server().expect("hook listener binds");
        // 256-bit bearer token.
        assert_eq!(server.token.len(), 64);
        assert!(server.token.chars().all(|c| c.is_ascii_hexdigit()));

        let response = raw_post(
            server.port,
            HOOK_CLAUDE_ROUTE,
            Some(&server.token.clone()),
            &[
                ("Content-Type", "application/json"),
                ("X-Hydra-Agent-Hook-Meta", &raw_json_meta()),
            ],
            STOP_PAYLOAD.as_bytes(),
        );
        assert!(
            status_line(&response).starts_with("HTTP/1.1 204"),
            "must answer 204, got: {response}"
        );

        let delivered = server.delivered_hooks();
        assert_eq!(delivered.len(), 1, "one envelope must be handed off");
        assert_eq!(delivered[0].source, "claude");
        assert_eq!(delivered[0].wire, "raw-json");
        assert_eq!(delivered[0].envelope.pane_key, "sess-t2-raw");
        assert_eq!(
            delivered[0].envelope.hook_event_name.as_deref(),
            Some("Stop")
        );
        assert_eq!(server.truncation_count(), 0);
        server.shutdown();
    }

    /// The legacy form wire on the codex route also delivers.
    #[test]
    fn codex_form_post_with_token_is_delivered() {
        let mut server = start_hook_server().expect("hook listener binds");
        let body = codex_form_body();
        let response = raw_post(
            server.port,
            HOOK_CODEX_ROUTE,
            Some(&server.token.clone()),
            &[("Content-Type", "application/x-www-form-urlencoded")],
            &body,
        );
        assert!(
            status_line(&response).starts_with("HTTP/1.1 204"),
            "must answer 204, got: {response}"
        );
        let delivered = server.delivered_hooks();
        assert_eq!(delivered.len(), 1);
        assert_eq!(delivered[0].source, "codex");
        assert_eq!(delivered[0].wire, "form");
        assert_eq!(delivered[0].envelope.pane_key, "sess-t2-form");
        server.shutdown();
    }

    /// No token: 204, nothing delivered (auth runs before the body read).
    #[test]
    fn post_without_token_gets_204_without_delivery() {
        let mut server = start_hook_server().expect("hook listener binds");
        let response = raw_post(
            server.port,
            HOOK_CLAUDE_ROUTE,
            None,
            &[("Content-Type", "application/json")],
            STOP_PAYLOAD.as_bytes(),
        );
        assert!(
            status_line(&response).starts_with("HTTP/1.1 204"),
            "auth failure must still answer 204, got: {response}"
        );
        assert!(server.delivered_hooks().is_empty());
        server.shutdown();
    }

    /// Forged token: 204, nothing delivered.
    #[test]
    fn post_with_wrong_token_gets_204_without_delivery() {
        let mut server = start_hook_server().expect("hook listener binds");
        let response = raw_post(
            server.port,
            HOOK_CODEX_ROUTE,
            Some("0".repeat(64).as_str()),
            &[("Content-Type", "application/json")],
            STOP_PAYLOAD.as_bytes(),
        );
        assert!(
            status_line(&response).starts_with("HTTP/1.1 204"),
            "auth failure must still answer 204, got: {response}"
        );
        assert!(server.delivered_hooks().is_empty());
        server.shutdown();
    }

    /// Valid token but garbage body: 204, nothing delivered (fail-open).
    #[test]
    fn invalid_body_gets_204_without_delivery() {
        let mut server = start_hook_server().expect("hook listener binds");
        let response = raw_post(
            server.port,
            HOOK_CLAUDE_ROUTE,
            Some(&server.token.clone()),
            &[("Content-Type", "application/json")],
            b"not json {{{",
        );
        assert!(
            status_line(&response).starts_with("HTTP/1.1 204"),
            "parse failure must still answer 204, got: {response}"
        );
        assert!(server.delivered_hooks().is_empty());
        server.shutdown();
    }

    /// Unknown route: 204, never 404 (hooks never break the agent).
    #[test]
    fn unknown_route_gets_204_without_delivery() {
        let mut server = start_hook_server().expect("hook listener binds");
        let response = raw_post(
            server.port,
            "/hook/gemini",
            Some(&server.token.clone()),
            &[("Content-Type", "application/json")],
            STOP_PAYLOAD.as_bytes(),
        );
        assert!(
            status_line(&response).starts_with("HTTP/1.1 204"),
            "unknown route must still answer 204, got: {response}"
        );
        assert!(server.delivered_hooks().is_empty());
        server.shutdown();
    }

    /// Body cut short of Content-Length (transport interference): counted,
    /// logged, answered 204, nothing delivered.
    #[test]
    fn truncated_body_counts_and_gets_204() {
        let mut server = start_hook_server().expect("hook listener binds");
        let mut stream =
            TcpStream::connect(("127.0.0.1", server.port)).expect("connect hook listener");
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .expect("read timeout");
        let head = format!(
            "POST {} HTTP/1.1\r\nHost: 127.0.0.1\r\nX-Hydra-Agent-Hook-Token: {}\r\nContent-Length: 64\r\nConnection: close\r\n\r\n",
            HOOK_CLAUDE_ROUTE, server.token
        );
        stream.write_all(head.as_bytes()).expect("write head");
        stream.write_all(b"0123456789").expect("write short body");
        stream.flush().expect("flush");
        // Half-close: the server read sees EOF with 10/64 bytes promised.
        stream.shutdown(Shutdown::Write).expect("half close");
        let mut response = Vec::new();
        stream.read_to_end(&mut response).expect("read response");
        let response = String::from_utf8_lossy(&response);
        assert!(
            status_line(&response).starts_with("HTTP/1.1 204"),
            "truncation must still answer 204, got: {response}"
        );
        assert_eq!(server.truncation_count(), 1);
        assert!(server.delivered_hooks().is_empty());
        server.shutdown();
    }
}
