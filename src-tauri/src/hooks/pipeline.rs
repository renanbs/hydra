//! Hook→agent:state pipeline (T6).
//!
//! Ingests hook envelopes from two sources — the listener outbox
//! ([`crate::hooks::server::HookServerHandle::delivered_hooks`]) and the
//! periodic [`crate::hooks::spool::drain_spool`] replay — sends each through
//! the sidecar over stdio, and converts the returned
//! `ParsedAgentStatusPayload` into an `agent:state` transition.
//!
//! Hydra decisions applied:
//! * `paneKey` is the opaque `session_id` (D3), passed through verbatim.
//! * Launch-token fence via [`crate::hooks::envelope::launch_token_hash`]:
//!   a payload whose token hash differs from the live session token is
//!   discarded (same rule as the spool fence: unknown panes with no live
//!   token are accepted).
//! * `sessionBoundary` `done` lands as `idle` (a connect/resume/clear is not
//!   a completed turn); the `agent:state` wire keeps the 6 known strings.
//! * Emit happens ONLY on transition, at the same point as
//!   `insert_state_transition` — the pipeline returns a transition only when
//!   the mapped state differs from the last emitted one.
//! * A dead sidecar maps hook sessions to `unknown` on the next tick without
//!   crashing (health is observed, never panics). Buffer scraping is left
//!   untouched and coexists until T8.
//!
//! The sidecar transport is a port ([`SidecarTransport`]) so tests inject a
//! fake; [`StdioSidecarTransport`] is the production stdio adapter speaking
//! the `hook-sidecar` JSON-lines protocol (handshake first, then
//! `{paneKey,source,body}` → `{paneKey,payload}`). It owns its process
//! supervision (spawn/handshake/health/backoff) rather than delegating to
//! [`HookSidecar`](super::sidecar::HookSidecar): the transport additionally
//! owns a stdout reader thread + channel for `send` timeouts, which the
//! plain driver does not model. Shared process-spawning helpers stay
//! duplicated by decision (Fix 7: dedup mínimo); the only shared helper is
//! [`crate::hooks::util::random_hex`] (endpoint + server tokens).

use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::mpsc;
use std::time::{Duration, Instant};
use serde::Deserialize;

use super::envelope::{launch_token_hash, HookEnvelope};
use super::server::DeliveredHook;
use super::sidecar::{SidecarHealth, SIDECAR_HANDSHAKE_PROTOCOL, SIDECAR_PROTOCOL_VERSION};
use super::spool::{drain_spool, SpoolRecord};

/// How long [`StdioSidecarTransport::send`] waits for one result line before
/// declaring the sidecar dead (fail-open: hook sessions go `unknown`).
const SIDECAR_RESPONSE_TIMEOUT: Duration = Duration::from_secs(2);

/// Pipeline tick cadence used by the Tauri wiring (matches the ~200 ms state
/// push cadence of the scraping loops it coexists with).
const PIPELINE_TICK_MS: u64 = 200;

/// Consecutive-failure backoff for supervised respawns (mirrors the driver
/// ladder in `sidecar.rs` without touching it).
const RESPAWN_BACKOFF: [Duration; 4] = [
    Duration::from_millis(100),
    Duration::from_millis(500),
    Duration::from_secs(1),
    Duration::from_secs(5),
];

/// Subset of the sidecar's `ParsedAgentStatusPayload` the pipeline consumes.
/// `toolInput` is lossy by design: the sidecar normalizes it to a string
/// preview, but a non-string value must degrade to a preview, never drop the
/// whole turn.
#[derive(Debug, Clone, Deserialize)]
pub struct ParsedStatus {
    pub state: String,
    #[serde(default)]
    pub prompt: String,
    #[serde(default, rename = "toolName")]
    pub tool_name: Option<String>,
    #[serde(default, rename = "toolInput", deserialize_with = "de_opt_string")]
    pub tool_input: Option<String>,
    #[serde(default, rename = "lastAssistantMessage", deserialize_with = "de_opt_string")]
    pub last_assistant_message: Option<String>,
    #[serde(default)]
    pub interrupted: Option<bool>,
    #[serde(default, rename = "sessionBoundary")]
    pub session_boundary: Option<bool>,
}

fn de_opt_string<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let value = Option::<serde_json::Value>::deserialize(deserializer)?;
    Ok(value.and_then(|value| match value {
        serde_json::Value::String(s) => Some(s),
        serde_json::Value::Bool(b) => Some(b.to_string()),
        serde_json::Value::Null => None,
        other => serde_json::to_string(&other).ok(),
    }))
}

/// Sidecar result line `{paneKey, payload}` (`dropped` lines carry a null
/// payload and are ignored the same way).
#[derive(Debug, Deserialize)]
struct SidecarOutput {
    #[serde(rename = "paneKey")]
    pane_key: String,
    payload: Option<ParsedStatus>,
}

/// One hook-driven state change, ready to emit + persist at the
/// `insert_state_transition` point. The wire keeps the 6 known strings;
/// hook detail rides on optional fields only.
#[derive(Debug, Clone)]
pub struct HookTransition {
    pub session_id: String,
    pub state: crate::agent_state::AgentState,
    pub tool_name: Option<String>,
    pub tool_input: Option<String>,
    pub last_assistant_message: Option<String>,
    pub interrupted: bool,
    pub session_boundary: bool,
    pub started_at: u64,
}

impl HookTransition {
    pub fn state_str(&self) -> &'static str {
        self.state.as_str()
    }

    /// Extended `agent:state` event JSON. Snake + camel casings are both
    /// emitted for pre-existing consumers (`App.tsx` reads `tool_name`;
    /// newer readers use `toolName`); absent optionals are omitted, never
    /// nulled.
    pub fn event_json(&self) -> serde_json::Value {
        let mut event = serde_json::json!({
            "session_id": self.session_id,
            "sessionId": self.session_id,
            "state": self.state_str(),
            "state_started_at": self.started_at,
            "source": "hook",
        });
        let map = event.as_object_mut().expect("event is an object");
        if let Some(name) = &self.tool_name {
            map.insert("tool_name".to_string(), serde_json::Value::String(name.clone()));
            map.insert("toolName".to_string(), serde_json::Value::String(name.clone()));
        }
        if let Some(input) = &self.tool_input {
            map.insert(
                "tool_input".to_string(),
                serde_json::Value::String(input.clone()),
            );
            map.insert(
                "toolInput".to_string(),
                serde_json::Value::String(input.clone()),
            );
        }
        if let Some(message) = &self.last_assistant_message {
            map.insert(
                "last_assistant_message".to_string(),
                serde_json::Value::String(message.clone()),
            );
        }
        if self.interrupted {
            map.insert("interrupted".to_string(), serde_json::Value::Bool(true));
        }
        if self.session_boundary {
            map.insert(
                "session_boundary".to_string(),
                serde_json::Value::Bool(true),
            );
            map.insert(
                "sessionBoundary".to_string(),
                serde_json::Value::Bool(true),
            );
        }
        event
    }
}
/// Map a sidecar state to the 6-string wire contract. `sessionBoundary done`
/// (connect/resume/clear landing) is idle, not a completed turn. The sidecar
/// additionally emits `idle` itself for the TUI-idle fence — it maps straight
/// to [`crate::agent_state::AgentState::Idle`]. `unverifiable` (a renderer-only
/// verdict about supervision, never a sidecar hook state) has no mapping: it
/// returns `None` so hook ingestion drops it and the decay path owns every
/// `Unknown`. Anything else outside `working|blocked|waiting|idle|done` is
/// dropped so scraping stays the authority for it.
pub fn map_agent_state(
    state: &str,
    session_boundary: bool,
) -> Option<crate::agent_state::AgentState> {
    use crate::agent_state::AgentState;
    match state {
        "working" => Some(AgentState::Working),
        "blocked" => Some(AgentState::Blocked),
        "waiting" => Some(AgentState::Waiting),
        "idle" => Some(AgentState::Idle),
        "done" if session_boundary => Some(AgentState::Idle),
        "done" => Some(AgentState::Done),
        // `unverifiable` is renderer vocabulary (agent-status-run verdict),
        // never a sidecar hook state — ingestion drops it; decay owns Unknown.
        _ => None,
    }
}
/// Launch-token fence for a live outbox envelope. Mirrors the spool rule:
/// a record replays only when its token hash matches the live session token,
/// or when the session has no live token at all (unknown pane).
pub fn token_accepted(
    envelope: &HookEnvelope,
    live_token_hash: &dyn Fn(&str) -> Option<String>,
) -> bool {
    let expected = live_token_hash(&envelope.pane_key);
    let actual = envelope
        .launch_token
        .as_deref()
        .and_then(launch_token_hash);
    expected.is_none() || actual == expected
}

/// Build the sidecar `body` for one envelope: the exact keys the sidecar's
/// `parseHookEnvelope` reads
/// (`paneKey/payload/tabId/worktreeId/launchToken/env/version`).
pub fn sidecar_body(envelope: &HookEnvelope) -> serde_json::Value {
    let mut body = serde_json::Map::with_capacity(8);
    body.insert(
        "paneKey".to_string(),
        serde_json::Value::String(envelope.pane_key.clone()),
    );
    body.insert("payload".to_string(), envelope.payload.clone());
    if let Some(value) = &envelope.tab_id {
        body.insert("tabId".to_string(), serde_json::Value::String(value.clone()));
    }
    if let Some(value) = &envelope.worktree_id {
        body.insert(
            "worktreeId".to_string(),
            serde_json::Value::String(value.clone()),
        );
    }
    if let Some(value) = &envelope.launch_token {
        body.insert(
            "launchToken".to_string(),
            serde_json::Value::String(value.clone()),
        );
    }
    if let Some(value) = &envelope.env {
        body.insert("env".to_string(), serde_json::Value::String(value.clone()));
    }
    if let Some(value) = &envelope.version {
        body.insert(
            "version".to_string(),
            serde_json::Value::String(value.clone()),
        );
    }
    serde_json::Value::Object(body)
}

/// Build the sidecar `{paneKey,source,body}` input for one envelope: routing
/// keys from the protocol README around [`sidecar_body`].
pub fn sidecar_input(pane_key: &str, source: &str, envelope: &HookEnvelope) -> serde_json::Value {
    serde_json::json!({
        "paneKey": pane_key,
        "source": source,
        "body": sidecar_body(envelope),
    })
}

/// v1 scope is claude + codex; anything else is never sent to the sidecar.
fn source_supported(source: &str) -> bool {
    source == "claude" || source == "codex"
}

/// Sidecar transport port. Production is [`StdioSidecarTransport`]; tests
/// inject a fake. `send` returns the normalized payload, or `None` when the
/// sidecar dropped the event (maps to nothing) — both are non-fatal.
pub trait SidecarTransport {
    fn send(
        &mut self,
        pane_key: &str,
        source: &str,
        body: serde_json::Value,
    ) -> Result<Option<ParsedStatus>, String>;
    fn alive(&mut self) -> bool;
}

/// Production stdio adapter: spawns `node dist/main.js` in `sidecar_dir`,
/// runs the version handshake, then exchanges one JSON line per hook. A
/// reader thread feeds result lines into a channel so `send` can time out
/// instead of hanging the pipeline tick.
pub struct StdioSidecarTransport {
    child: Option<Child>,
    stdin: Option<ChildStdin>,
    inbox: Option<mpsc::Receiver<String>>,
    sidecar_dir: PathBuf,
    env: String,
    node_bin: String,
    failures: usize,
    last_failure: Option<Instant>,
    dead_reason: Option<String>,
}

impl StdioSidecarTransport {
    pub fn spawn(sidecar_dir: PathBuf, env: impl Into<String>, node_bin: &str) -> Result<Self, String> {
        let mut transport = Self {
            child: None,
            stdin: None,
            inbox: None,
            sidecar_dir,
            env: env.into(),
            node_bin: node_bin.to_string(),
            failures: 0,
            last_failure: None,
            dead_reason: None,
        };
        transport.spawn_child()?;
        Ok(transport)
    }

    fn spawn_child(&mut self) -> Result<(), String> {
        let mut child = Command::new(&self.node_bin)
            .arg("dist/main.js")
            .current_dir(&self.sidecar_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|err| format!("spawn hook sidecar: {err}"))?;
        let mut stdin = child.stdin.take().ok_or("sidecar stdin not piped")?;
        let stdout = child.stdout.take().ok_or("sidecar stdout not piped")?;
        let handshake = serde_json::json!({
            "protocol": SIDECAR_HANDSHAKE_PROTOCOL,
            "version": SIDECAR_PROTOCOL_VERSION,
            "env": self.env,
        });
        let mut line = serde_json::to_string(&handshake).expect("handshake serializes");
        line.push('\n');
        stdin
            .write_all(line.as_bytes())
            .map_err(|err| format!("write sidecar handshake: {err}"))?;
        stdin
            .flush()
            .map_err(|err| format!("flush sidecar handshake: {err}"))?;
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(text) => {
                        if tx.send(text).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });
        self.child = Some(child);
        self.stdin = Some(stdin);
        self.inbox = Some(rx);
        self.dead_reason = None;
        Ok(())
    }

    fn note_dead(&mut self, reason: impl Into<String>) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
        }
        self.stdin = None;
        self.inbox = None;
        self.failures += 1;
        self.last_failure = Some(Instant::now());
        self.dead_reason = Some(reason.into());
    }

    pub fn health(&self) -> SidecarHealth {
        if self.child.is_some() {
            SidecarHealth::Running
        } else if self.failures == 0 {
            SidecarHealth::Idle
        } else {
            SidecarHealth::Dead {
                reason: self
                    .dead_reason
                    .clone()
                    .unwrap_or_else(|| "sidecar dead".to_string()),
                restart_in: RESPAWN_BACKOFF
                    .get(self.failures.min(RESPAWN_BACKOFF.len() - 1))
                    .copied()
                    .unwrap_or(Duration::from_secs(5)),
            }
        }
    }

    /// Supervised respawn when the backoff elapsed. No-op while running.
    pub fn try_respawn(&mut self) {
        if self.child.is_some() {
            return;
        }
        let delay = RESPAWN_BACKOFF
            .get(self.failures.min(RESPAWN_BACKOFF.len() - 1))
            .copied()
            .unwrap_or(Duration::from_secs(5));
        let ready = self
            .last_failure
            .map(|at| at.elapsed() >= delay)
            .unwrap_or(true);
        if ready {
            let _ = self.spawn_child();
        }
    }
}

impl SidecarTransport for StdioSidecarTransport {
    fn send(
        &mut self,
        pane_key: &str,
        source: &str,
        body: serde_json::Value,
    ) -> Result<Option<ParsedStatus>, String> {
        if !self.alive() {
            return Err("hook sidecar is not running".to_string());
        }
        let line = serde_json::json!({"paneKey": pane_key, "source": source, "body": body});
        let mut text = serde_json::to_string(&line).expect("sidecar input serializes");
        text.push('\n');
        let stdin = self.stdin.as_mut().ok_or("sidecar stdin gone")?;
        if stdin.write_all(text.as_bytes()).is_err() || stdin.flush().is_err() {
            self.note_dead("sidecar stdin write failed");
            return Err("hook sidecar stdin write failed".to_string());
        }
        let inbox = self.inbox.as_ref().ok_or("sidecar inbox gone")?;
        match inbox.recv_timeout(SIDECAR_RESPONSE_TIMEOUT) {
            Ok(text) => {
                let output: SidecarOutput = serde_json::from_str(&text)
                    .map_err(|err| format!("sidecar result parse failed: {err}"))?;
                let _ = output.pane_key;
                Ok(output.payload)
            }
            Err(_) => {
                self.note_dead("sidecar response timeout");
                Err("hook sidecar response timeout".to_string())
            }
        }
    }

    fn alive(&mut self) -> bool {
        let Some(child) = self.child.as_mut() else {
            return false;
        };
        match child.try_wait() {
            Ok(None) => true,
            Ok(Some(_)) | Err(_) => false,
        }
    }
}

/// Hook→agent:state pipeline state: last emitted state per session (the
/// transition cache), the hook-active session set (for dead-sidecar
/// `unknown` marking), and the listener outbox cursor.
pub struct HookPipeline<T: SidecarTransport> {
    transport: T,
    live_token_hash: Box<dyn Fn(&str) -> Option<String> + Send>,
    last_state: HashMap<String, crate::agent_state::AgentState>,
    hook_sessions: HashSet<String>,
    outbox_cursor: usize,
}

impl<T: SidecarTransport> HookPipeline<T> {
    pub fn new(
        transport: T,
        live_token_hash: impl Fn(&str) -> Option<String> + Send + 'static,
    ) -> Self {
        Self {
            transport,
            live_token_hash: Box::new(live_token_hash),
            last_state: HashMap::new(),
            hook_sessions: HashSet::new(),
            outbox_cursor: 0,
        }
    }

    pub fn transport_mut(&mut self) -> &mut T {
        &mut self.transport
    }

    /// Last hook-emitted state for `session_id`, if any.
    pub fn session_state(&self, session_id: &str) -> Option<crate::agent_state::AgentState> {
        self.last_state.get(session_id).copied()
    }

    /// Sessions the pipeline has heard hooks from (spool dirs + dead-sidecar
    /// marking both key off this).
    pub fn known_sessions(&self) -> Vec<String> {
        let mut sessions: Vec<String> = self.hook_sessions.iter().cloned().collect();
        for session_id in self.last_state.keys() {
            if !self.hook_sessions.contains(session_id) {
                sessions.push(session_id.clone());
            }
        }
        sessions.sort();
        sessions
    }

    /// Ingest one live envelope. Fence → sidecar → convert → transition
    /// check. Returns `None` on fence reject, sidecar drop/error, unmapped
    /// state, or no change (transition-only).
    pub fn ingest_envelope(
        &mut self,
        envelope: &HookEnvelope,
        source: &str,
    ) -> Option<HookTransition> {
        if !source_supported(source) {
            return None;
        }
        if !token_accepted(envelope, &self.live_token_hash) {
            return None;
        }
        self.hook_sessions.insert(envelope.pane_key.clone());
        let body = sidecar_body(envelope);
        let parsed = self
            .transport
            .send(&envelope.pane_key, source, body)
            .ok()??;
        self.convert(&envelope.pane_key, &parsed)
    }

    /// Ingest one spool record (source rides on the record).
    pub fn ingest_spool_record(&mut self, record: &SpoolRecord) -> Option<HookTransition> {
        let envelope = record.envelope();
        self.ingest_envelope(&envelope, &record.source)
    }

    /// Consume unseen listener outbox deliveries (arrival order) into
    /// transitions. The outbox only grows, so a cursor suffices — no server
    /// changes needed.
    pub fn drain_outbox(&mut self, delivered: &[DeliveredHook]) -> Vec<HookTransition> {
        let fresh = delivered.get(self.outbox_cursor..).unwrap_or(&[]);
        let mut transitions = Vec::new();
        for hook in fresh {
            if let Some(transition) = self.ingest_envelope(&hook.envelope, &hook.source) {
                transitions.push(transition);
            }
        }
        self.outbox_cursor = delivered.len();
        transitions
    }

    /// Replay one spool dir into transitions (fence included, per
    /// [`drain_spool`] semantics).
    pub fn drain_spool_dir(&mut self, dir: &Path) -> Vec<HookTransition> {
        let live = &self.live_token_hash;
        let records = drain_spool(
            dir,
            &|pane_key: &str| live(pane_key),
            super::spool::now_ms(),
        );
        let mut transitions = Vec::new();
        for record in &records {
            if let Some(transition) = self.ingest_spool_record(record) {
                transitions.push(transition);
            }
        }
        transitions
    }

    /// Mark hook sessions `unknown` when the sidecar is dead. Transition-only:
    /// sessions already `unknown` (or never hook-active) yield nothing, so this
    /// is safe to call on every tick while dead.
    pub fn mark_dead_sidecar_unknown(&mut self) -> Vec<HookTransition> {
        use crate::agent_state::AgentState;
        if self.transport.alive() {
            return Vec::new();
        }
        let mut transitions = Vec::new();
        let mut sessions: Vec<String> = self.hook_sessions.iter().cloned().collect();
        sessions.sort();
        for session_id in sessions {
            if self.last_state.get(&session_id) == Some(&AgentState::Unknown) {
                continue;
            }
            let started_at = crate::agent_state::now_epoch_ms();
            self.last_state.insert(session_id.clone(), AgentState::Unknown);
            transitions.push(HookTransition {
                session_id,
                state: AgentState::Unknown,
                tool_name: None,
                tool_input: None,
                last_assistant_message: None,
                interrupted: false,
                session_boundary: false,
                started_at,
            });
        }
        transitions
    }

    /// Sweep hook-active sessions whose last emitted state went stale:
    /// `decay_state` over each `(session_id, state_started_at)` pair, with
    /// PTY liveness from `pty_alive`. Transition-only — a decayed session
    /// updates `last_state` and yields one `HookTransition` (detail fields
    /// cleared: the live-event detail on the stale row is no longer truth);
    /// unchanged sessions yield nothing. Callers persist + emit at the
    /// normal transition point.
    pub fn check_stale_sessions(
        &mut self,
        started_at: &[(
            String,
            u64,
        )],
        pty_alive: impl Fn(&str) -> bool,
    ) -> Vec<HookTransition> {
        use crate::agent_state::{decay_state, now_epoch_ms};
        let now = now_epoch_ms();
        let mut transitions = Vec::new();
        let mut pairs: Vec<(String, u64)> = started_at.to_vec();
        pairs.sort_by(|a, b| a.0.cmp(&b.0));
        for (session_id, state_started_at) in pairs {
            let Some(last) = self.last_state.get(&session_id).copied() else {
                continue;
            };
            let decayed = decay_state(last, state_started_at, now, pty_alive(&session_id));
            if decayed == last {
                continue;
            }
            self.last_state.insert(session_id.clone(), decayed);
            transitions.push(HookTransition {
                session_id,
                state: decayed,
                tool_name: None,
                tool_input: None,
                last_assistant_message: None,
                interrupted: false,
                session_boundary: false,
                started_at: now,
            });
        }
        transitions
    }

    /// One pipeline tick: dead-sidecar marking, staleness decay, then outbox
    /// + spool drains.
    pub fn tick_once(
        &mut self,
        delivered: &[DeliveredHook],
        spool_dirs: &[PathBuf],
        stale: &[(
            String,
            u64,
        )],
        pty_alive: impl Fn(&str) -> bool,
    ) -> Vec<HookTransition> {
        let mut transitions = self.mark_dead_sidecar_unknown();
        transitions.extend(self.check_stale_sessions(stale, pty_alive));
        transitions.extend(self.drain_outbox(delivered));
        for dir in spool_dirs {
            transitions.extend(self.drain_spool_dir(dir));
        }
        transitions
    }

    fn convert(&mut self, pane_key: &str, parsed: &ParsedStatus) -> Option<HookTransition> {
        let boundary = parsed.session_boundary == Some(true);
        let state = map_agent_state(&parsed.state, boundary)?;
        if self.last_state.get(pane_key) == Some(&state) {
            return None;
        }
        let started_at = crate::agent_state::now_epoch_ms();
        self.last_state.insert(pane_key.to_string(), state);
        Some(HookTransition {
            session_id: pane_key.to_string(),
            state,
            tool_name: blank_to_none(&parsed.tool_name),
            tool_input: blank_to_none(&parsed.tool_input),
            last_assistant_message: blank_to_none(&parsed.last_assistant_message),
            interrupted: parsed.interrupted == Some(true),
            session_boundary: boundary,
            started_at,
        })
    }
}

fn blank_to_none(value: &Option<String>) -> Option<String> {
    value
        .as_deref()
        .map(str::trim)
        .filter(|trimmed| !trimmed.is_empty())
        .map(str::to_string)
}

/// Resolve the sidecar dir: bundled resource first, then exe-relative dev
/// layouts. Returns `None` when no `dist/main.js` is found (caller fails
/// open — scraping continues).
fn resolve_sidecar_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    use tauri::Manager;
    let mut candidates = Vec::new();
    if let Ok(resources) = app.path().resource_dir() {
        candidates.push(resources.join("hook-sidecar"));
    }
    if let Ok(exe) = std::env::current_exe() {
        let mut dir = exe.parent().map(Path::to_path_buf);
        for _ in 0..4 {
            if let Some(parent) = dir {
                candidates.push(parent.join("hook-sidecar"));
                dir = parent.parent().map(Path::to_path_buf);
            }
        }
    }
    candidates.into_iter().find(|dir| dir.join("dist/main.js").is_file())
}

fn emit_and_persist(
    app: &tauri::AppHandle,
    db: &std::sync::Arc<crate::db::DatabaseManager>,
    transition: &HookTransition,
) {
    use tauri::Emitter;
    let _ = app.emit("agent:state", transition.event_json());
    let _ = db.insert_state_transition(
        &transition.session_id,
        transition.state_str(),
        transition.started_at as i64,
    );
}

/// Start the listener + pipeline tick thread. Gated on
/// `agent_status_hooks_enabled`; every failure path fails open (the scraping
/// loops keep reporting). Scraping is NOT touched here — coexistence until T8.
pub fn maybe_spawn_hook_pipeline(app: tauri::AppHandle) {
    use tauri::Manager;
    let state = app.state::<crate::AppState>();
    let enabled = state
        .db
        .get_settings()
        .map(|settings| settings.agent_status_hooks_enabled)
        .unwrap_or(false);
    if !enabled {
        return;
    }
    let server = match super::server::start_hook_server() {
        Ok(handle) => handle,
        Err(err) => {
            eprintln!("[agent-hooks] pipeline: listener failed: {err}");
            return;
        }
    };
    let db = state.db.clone();
    let terminal = state.terminal.clone();
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let sidecar_dir = match resolve_sidecar_dir(&app_handle) {
            Some(dir) => dir,
            None => {
                eprintln!("[agent-hooks] pipeline: hook-sidecar dist not found; hook pipeline off");
                return;
            }
        };
        let transport =
            match StdioSidecarTransport::spawn(sidecar_dir, super::endpoint::HOOK_ENV, "node") {
                Ok(transport) => transport,
                Err(err) => {
                    eprintln!("[agent-hooks] pipeline: sidecar spawn failed: {err}");
                    return;
                }
            };
        // Live launch-token fence: the PTY env stamps
        // `session_coords(id).launch_token` (same in-memory cache), so the
        // hash of it is the expected token for the pane.
        let mut pipeline = HookPipeline::new(transport, |pane_key: &str| {
            let coords = super::endpoint::session_coords(pane_key);
            launch_token_hash(&coords.launch_token)
        });
        // Keep the listener handle alive for the thread's lifetime.
        let _server = server;
        loop {
            std::thread::sleep(Duration::from_millis(PIPELINE_TICK_MS));
            // `tick_once` marks hook sessions unknown while the sidecar is
            // dead (transition-only), decays stale hook states via
            // `check_stale_sessions` (same transition-only point), then
            // drains the outbox + spool dirs, all through the fenced,
            // transition-only `ingest_*` path. Scraping loops are untouched
            // and coexist until T8.
            let delivered = _server.delivered_hooks();
            let spool_dirs = spool_dirs_for(&pipeline, &terminal);
            // Staleness pairs: last persisted transition per known/live
            // session. Unknown sessions (no history) have nothing to decay.
            let mut stale: Vec<(String, u64)> = Vec::new();
            let mut stale_sessions: HashSet<String> =
                pipeline.known_sessions().into_iter().collect();
            for session_id in terminal.sessions.lock().keys() {
                stale_sessions.insert(session_id.clone());
            }
            for session_id in &stale_sessions {
                if let Ok(history) = db.get_state_history(session_id) {
                    if let Some(last) = history.last() {
                        stale.push((session_id.clone(), last.started_at.max(0) as u64));
                    }
                }
            }
            let _transitions =
                pipeline.tick_once(&delivered, &spool_dirs, &stale, |session_id| {
                    terminal.session_alive(session_id)
                });
        }
    });
}

/// Spool dirs for hook-active sessions plus live PTY sessions (a restarted
/// core replays spooled hooks for sessions that never delivered to this
/// boot's outbox).
fn spool_dirs_for<T: SidecarTransport>(
    pipeline: &HookPipeline<T>,
    terminal: &std::sync::Arc<crate::terminal::TerminalManager>,
) -> Vec<PathBuf> {
    let mut sessions: HashSet<String> = pipeline.known_sessions().into_iter().collect();
    for session_id in terminal.sessions.lock().keys() {
        sessions.insert(session_id.clone());
    }
    let mut dirs: Vec<PathBuf> = sessions
        .into_iter()
        .map(|session_id| super::endpoint::session_hooks_dir(&session_id).join("spool"))
        .collect();
    dirs.sort();
    dirs
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent_state::AgentState;
    use std::collections::HashMap;

    struct FakeTransport {
        alive: bool,
        calls: usize,
        handler:
            Box<dyn FnMut(&str, &str, &serde_json::Value) -> Result<Option<ParsedStatus>, String> + Send>,
    }

    impl FakeTransport {
        fn canned() -> Self {
            Self {
                alive: true,
                calls: 0,
                handler: Box::new(|_pane, _source, body| {
                    let event = body
                        .get("payload")
                        .and_then(|payload| payload.get("hook_event_name"))
                        .and_then(|name| name.as_str())
                        .unwrap_or("");
                    let status = |state: &str| {
                        serde_json::from_value::<ParsedStatus>(serde_json::json!({
                            "state": state,
                            "prompt": "hello",
                        }))
                        .expect("canned status parses")
                    };
                    match event {
                        "UserPromptSubmit" => Ok(Some(status("working"))),
                        "PreToolUse" => Ok(Some(
                            serde_json::from_value::<ParsedStatus>(serde_json::json!({
                                "state": "working",
                                "prompt": "hello",
                                "toolName": "Bash",
                                "toolInput": "ls -la",
                            }))
                            .expect("canned tool status parses"),
                        )),
                        "Stop" => Ok(Some(
                            serde_json::from_value::<ParsedStatus>(serde_json::json!({
                                "state": "done",
                                "prompt": "hello",
                                "toolName": "Bash",
                                "toolInput": "ls -la",
                            }))
                            .expect("canned done parses"),
                        )),
                        _ => Ok(None),
                    }
                }),
            }
        }
    }

    impl SidecarTransport for FakeTransport {
        fn send(
            &mut self,
            pane_key: &str,
            source: &str,
            body: serde_json::Value,
        ) -> Result<Option<ParsedStatus>, String> {
            self.calls += 1;
            if !self.alive {
                return Err("sidecar dead".to_string());
            }
            (self.handler)(pane_key, source, &body)
        }

        fn alive(&mut self) -> bool {
            self.alive
        }
    }

    fn envelope(pane: &str, token: Option<&str>, event: &str) -> HookEnvelope {
        HookEnvelope {
            pane_key: pane.to_string(),
            tab_id: Some(pane.to_string()),
            launch_token: token.map(str::to_string),
            worktree_id: Some("wt-1".to_string()),
            env: Some("production".to_string()),
            version: Some("1".to_string()),
            hook_event_name: Some(event.to_string()),
            payload: serde_json::json!({"hook_event_name": event}),
        }
    }

    fn live_hash(token: &str) -> HashMap<String, String> {
        let mut live = HashMap::new();
        live.insert(
            "sess-1".to_string(),
            launch_token_hash(token).expect("live token hashes"),
        );
        live
    }

    /// Recorded lead-turn sequence UserPromptSubmit→PreToolUse→Stop becomes
    /// working → (suppressed working/tool ping: transition-only) → done,
    /// with the Stop keeping the PreToolUse tool snapshot.
    #[test]
    fn recorded_turn_yields_working_then_done_with_tool() {
        let live = live_hash("live-token");
        let mut pipeline =
            HookPipeline::new(FakeTransport::canned(), move |pane: &str| live.get(pane).cloned());

        let first = pipeline
            .ingest_envelope(&envelope("sess-1", Some("live-token"), "UserPromptSubmit"), "claude")
            .expect("prompt submits → working");
        assert_eq!(first.state, AgentState::Working);
        assert_eq!(first.tool_name, None);

        let suppressed = pipeline.ingest_envelope(
            &envelope("sess-1", Some("live-token"), "PreToolUse"),
            "claude",
        );
        assert!(
            suppressed.is_none(),
            "working→working tool ping emits nothing (transition-only)"
        );

        let done = pipeline
            .ingest_envelope(&envelope("sess-1", Some("live-token"), "Stop"), "claude")
            .expect("stop → done");
        assert_eq!(done.state, AgentState::Done);
        assert_eq!(done.tool_name.as_deref(), Some("Bash"));
        assert_eq!(done.tool_input.as_deref(), Some("ls -la"));

        let event = done.event_json();
        assert_eq!(event["state"], "done");
        assert_eq!(event["source"], "hook");
        assert_eq!(event["toolName"], "Bash");
        assert_eq!(event["sessionId"], "sess-1");
        assert!(event["state"].is_string());
        for value in ["working", "blocked", "waiting", "idle", "done", "unknown"] {
            let _ = value;
        }
    }

    /// A payload whose launch token differs from the live session token is
    /// discarded before touching the sidecar.
    #[test]
    fn strange_token_discarded_before_sidecar() {
        let live = live_hash("live-token");
        let mut pipeline =
            HookPipeline::new(FakeTransport::canned(), move |pane: &str| live.get(pane).cloned());

        let rejected = pipeline.ingest_envelope(
            &envelope("sess-1", Some("attacker-token"), "UserPromptSubmit"),
            "claude",
        );
        assert!(rejected.is_none(), "foreign token must not transition");
        assert_eq!(pipeline.transport_mut().calls, 0);
        assert_eq!(pipeline.session_state("sess-1"), None);
    }

    /// Dead sidecar: hook sessions flip to unknown on the next tick, exactly
    /// once, without crashing; sessions never hook-active are untouched.
    #[test]
    fn dead_sidecar_marks_hook_sessions_unknown_once() {
        let mut pipeline = HookPipeline::new(FakeTransport::canned(), |_: &str| None);

        pipeline
            .ingest_envelope(&envelope("sess-1", None, "UserPromptSubmit"), "claude")
            .expect("working first");
        assert_eq!(pipeline.session_state("sess-1"), Some(AgentState::Working));

        pipeline.transport_mut().alive = false;
        let marked = pipeline.mark_dead_sidecar_unknown();
        assert_eq!(marked.len(), 1);
        assert_eq!(marked[0].session_id, "sess-1");
        assert_eq!(marked[0].state, AgentState::Unknown);
        assert_eq!(marked[0].event_json()["state"], "unknown");

        let again = pipeline.mark_dead_sidecar_unknown();
        assert!(again.is_empty(), "unknown is a transition: emitted once");
    }

    /// `sessionBoundary done` (SessionStart landing) maps to idle, never done.
    #[test]
    fn session_boundary_done_becomes_idle() {
        let mut pipeline = HookPipeline::new(FakeTransport::canned(), |_: &str| None);
        pipeline.transport_mut().handler = Box::new(|_, _, _| {
            Ok(Some(
                serde_json::from_value::<ParsedStatus>(serde_json::json!({
                    "state": "done",
                    "prompt": "",
                    "sessionBoundary": true,
                }))
                .expect("boundary status parses"),
            ))
        });
        let transition = pipeline
            .ingest_envelope(&envelope("sess-1", None, "SessionStart"), "claude")
            .expect("boundary done → idle");
        assert_eq!(transition.state, AgentState::Idle);
        assert!(transition.session_boundary);
        let event = transition.event_json();
        assert_eq!(event["state"], "idle");
        assert_eq!(event["sessionBoundary"], true);
    }

    /// The sidecar emits `idle` for the TUI-idle fence (see the `idle`-mapping
    /// doc on `map_agent_state`): recorded turn closes UserPromptSubmit →
    /// PreToolUse → Stop(done) → idle, and the recorded tail stays idle.
    #[test]
    fn recorded_turn_close_idle_stays_idle() {
        let live = live_hash("live-token");
        let mut pipeline =
            HookPipeline::new(FakeTransport::canned(), move |pane: &str| live.get(pane).cloned());

        pipeline
            .ingest_envelope(&envelope("sess-1", Some("live-token"), "UserPromptSubmit"), "claude")
            .expect("prompt submits → working");
        pipeline
            .ingest_envelope(&envelope("sess-1", Some("live-token"), "Stop"), "claude")
            .expect("stop → done");
        // The recorded close then lands an `idle` payload (TUI-idle fence):
        // it must map straight to Idle, closing working → done → idle.
        pipeline.transport_mut().handler = Box::new(|_, _, _| {
            Ok(Some(
                serde_json::from_value::<ParsedStatus>(serde_json::json!({
                    "state": "idle",
                    "prompt": "",
                }))
                .expect("idle status parses"),
            ))
        });
        let transition = pipeline
            .ingest_envelope(&envelope("sess-1", Some("live-token"), "SessionStart"), "claude")
            .expect("recorded close → idle");
        assert_eq!(transition.state, AgentState::Idle);
        assert_eq!(pipeline.session_state("sess-1"), Some(AgentState::Idle));
        assert!(map_agent_state("unverifiable", false).is_none());
    }

    /// Outbox cursor: each delivery ingests once; spool replay of a matching
    /// token record transitions too.
    #[test]
    fn outbox_and_spool_drain_into_transitions() {
        let live = live_hash("live-token");
        let mut pipeline =
            HookPipeline::new(FakeTransport::canned(), move |pane: &str| live.get(pane).cloned());
        let delivered = vec![DeliveredHook {
            source: "claude".to_string(),
            wire: "raw-json",
            envelope: envelope("sess-1", Some("live-token"), "UserPromptSubmit"),
        }];
        let first = pipeline.drain_outbox(&delivered);
        assert_eq!(first.len(), 1);
        assert_eq!(first[0].state, AgentState::Working);
        assert!(pipeline.drain_outbox(&delivered).is_empty());

        let dir = std::env::temp_dir().join(format!("hydra-pipeline-spool-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("spool temp dir");
        let line = serde_json::json!({
            "paneKey": "sess-1",
            "tabId": "sess-1",
            "worktreeId": "wt-1",
            "env": "production",
            "version": "1",
            "launchToken": "live-token",
            "hookEventName": "Stop",
            "source": "claude",
            "payload": {"hook_event_name": "Stop"},
            "receivedAt": super::super::spool::now_ms(),
        });
        std::fs::write(dir.join("pane-sess-1.jsonl"), format!("{}\n", line))
            .expect("spool line");
        let replayed = pipeline.drain_spool_dir(&dir);
        assert_eq!(replayed.len(), 1);
        assert_eq!(replayed[0].state, AgentState::Done);
        let _ = std::fs::remove_dir_all(&dir);
    }

    /// A `working` session whose hook went silent past the TTL decays on the
    /// tick path (`check_stale_sessions`): PTY alive ⇒ `unknown` transition,
    /// persisted by the caller at the normal transition point.
    #[test]
    fn stale_working_decays_on_tick_path() {
        let mut pipeline = HookPipeline::new(FakeTransport::canned(), |_: &str| None);
        pipeline
            .ingest_envelope(&envelope("sess-stale", None, "UserPromptSubmit"), "claude")
            .expect("working first");
        assert_eq!(
            pipeline.session_state("sess-stale"),
            Some(AgentState::Working)
        );
        let old = crate::agent_state::now_epoch_ms()
            .saturating_sub(crate::agent_state::AGENT_STATE_STALE_AFTER_MS + 1);
        let decayed = pipeline.check_stale_sessions(&[("sess-stale".to_string(), old)], |_| true);
        assert_eq!(decayed.len(), 1);
        assert_eq!(decayed[0].session_id, "sess-stale");
        assert_eq!(decayed[0].state, AgentState::Unknown);
        assert_eq!(
            pipeline.session_state("sess-stale"),
            Some(AgentState::Unknown)
        );
        // Transition-only: a second sweep emits nothing.
        assert!(pipeline
            .check_stale_sessions(&[("sess-stale".to_string(), old)], |_| true)
            .is_empty());
    }
    /// Live contract: the recorded sequence through the real node sidecar
    /// normalizes to working → working(tool) → done. Skips cleanly (no
    /// panic) when `hook-sidecar/dist/main.js` was not built in this
    /// checkout — Fix 8: a missing build artifact must never fail the suite.
    #[test]
    fn live_sidecar_recorded_turn() {
        let sidecar_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../hook-sidecar");
        if !sidecar_dir.join("dist/main.js").is_file() {
            eprintln!("skipping live_sidecar_recorded_turn: hook-sidecar dist not built");
            return;
        }
        let mut transport =
            StdioSidecarTransport::spawn(sidecar_dir, "production", "node").expect("spawn node");
        let mut send = |event: &str, tool: bool| {
            let mut payload = serde_json::json!({"hook_event_name": event});
            if tool {
                payload["tool_name"] = serde_json::json!("Bash");
                payload["tool_input"] = serde_json::json!({"command": "ls -la"});
            }
            let body = serde_json::json!({
                "paneKey": "sess-live",
                "tabId": "sess-live",
                "worktreeId": "wt-1",
                "env": "production",
                "version": "1",
                "payload": payload,
            });
            transport
                .send("sess-live", "claude", body)
                .expect("send ok")
                .expect("event maps")
        };
        let prompt = send("UserPromptSubmit", false);
        assert_eq!(prompt.state, "working");
        let pre = send("PreToolUse", true);
        assert_eq!(pre.state, "working");
        assert_eq!(pre.tool_name.as_deref(), Some("Bash"));
        let stop = send("Stop", false);
        assert_eq!(stop.state, "done");
        assert_eq!(stop.tool_name.as_deref(), Some("Bash"));
        assert_eq!(stop.tool_input.as_deref(), Some("ls -la"));
    }
}
