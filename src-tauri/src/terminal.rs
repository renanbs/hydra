// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)

use parking_lot::Mutex;
use portable_pty::{Child, CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

use crate::agent_state::{detect_with_decay, now_epoch_ms, AgentState};

pub struct TerminalSession {
    pub parser: Arc<Mutex<vt100::Parser>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    pub agent_id: String,
    pub output: Arc<Mutex<OutputBuffer>>,
    /// Handle of the spawned process, kept so `close_session` can signal it and
    /// reap it. Without the wait, the process becomes a zombie when it exits.
    pub child: Box<dyn Child + Send + Sync>,
    /// Handle of the PTY reader thread, kept so `close_session` can join it.
    pub reader_thread: Option<std::thread::JoinHandle<()>>,
}

/// Retained window of the raw PTY output stream, backing the poll fallback.
/// `base` is the absolute position (in the full stream) of `bytes[0]`, so the
/// frontend's absolute offsets stay valid across buffer drains.
pub struct OutputBuffer {
    pub bytes: Vec<u8>,
    pub base: usize,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TerminalSnapshot {
    pub session_id: String,
    pub formatted: String,
    pub clean_text: String,
}

pub struct TerminalManager {
    pub sessions: Mutex<HashMap<String, TerminalSession>>,
    /// Shared SQLite connection. Session start reads settings from here
    /// instead of opening a fresh connection + running migrations per session
    /// (bug #7) — the connection is already kept in AppState.db.
    pub db: Arc<crate::db::DatabaseManager>,
}

impl TerminalManager {
    pub fn new(db: Arc<crate::db::DatabaseManager>) -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            db,
        }
    }

    pub fn start_session(
        &self,
        session_id: &str,
        executable: &str,
        args: Vec<String>,
        cwd: Option<String>,
        app: AppHandle,
    ) -> Result<(), String> {
        self.start_session_inner(session_id, executable, args, cwd, Some(app))
    }

    pub fn start_session_headless(
        &self,
        session_id: &str,
        executable: &str,
        args: Vec<String>,
        cwd: Option<String>,
    ) -> Result<(), String> {
        self.start_session_inner(session_id, executable, args, cwd, None)
    }

    fn start_session_inner(
        &self,
        session_id: &str,
        executable: &str,
        args: Vec<String>,
        cwd: Option<String>,
        app: Option<AppHandle>,
    ) -> Result<(), String> {
        let mut guard = self.sessions.lock();
        if guard.contains_key(session_id) {
            return Ok(());
        }

        let pty_system = NativePtySystem::default();
        let pair = pty_system
            .openpty(PtySize {
                rows: 28,
                cols: 100,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {e}"))?;

        let mut cmd = CommandBuilder::new(executable);
        for arg in args {
            cmd.arg(arg);
        }
        // xterm.js paints 24-bit SGR. The parent is often an agent shell
        // (TERM=dumb, NO_COLOR, CI). Claude Code returns color depth 1 as soon
        // as CI is set, before it reads COLORTERM, so the logo stays gray.
        // Advertise the emulator and drop the non-interactive suppressors.
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env_remove("NO_COLOR");
        cmd.env_remove("NODE_DISABLE_COLORS");
        cmd.env_remove("CI");
        if let Some(c) = &cwd {
            let p = std::path::PathBuf::from(c);
            if p.exists() {
                cmd.cwd(p);
            } else if let Ok(dir) = std::env::current_dir() {
                cmd.cwd(dir);
            }
        } else if let Ok(dir) = std::env::current_dir() {
            cmd.cwd(dir);
        }
        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn executable '{executable}': {e}"))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get PTY writer: {e}"))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to get PTY reader: {e}"))?;

        let master = Arc::new(Mutex::new(pair.master));
        let parser = Arc::new(Mutex::new(vt100::Parser::new(28, 100, 3000)));
        let parser_clone = Arc::clone(&parser);
        let output = Arc::new(Mutex::new(OutputBuffer { bytes: Vec::new(), base: 0 }));
        let output_clone = Arc::clone(&output);
        let s_id = session_id.to_string();
        let db_settings = self.db.get_settings().ok();
        let allow_osc52 = db_settings.as_ref().map(|s| s.terminal_allow_osc52_clipboard).unwrap_or(true);
        let scrollback_cap = db_settings.as_ref().map(|s| std::cmp::max(2 * 1024 * 1024, s.terminal_scrollback_rows as usize * 120)).unwrap_or(2 * 1024 * 1024);
        let reader_thread = std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            // PR-6 freshness tracking (per session): the active state and the
            // epoch ms it started at. state_started_at is initialized at spawn
            // and reset on every transition, so the TTL measures how long the
            // CURRENT state has been asserting itself without fresh evidence.
            let mut last_state: AgentState = AgentState::Unknown;
            let mut state_started_at = crate::agent_state::now_epoch_ms();
            while let Ok(n) = reader.read(&mut buf) {
                if n == 0 {
                    break;
                }
                let chunk = &buf[..n];
                // OSC52 gate — Orca osc52-clipboard-settings write-only <10KB, query block
                let (effective, should_emit) = if chunk.windows(4).any(|w| w == b"\x1b]5") || chunk.windows(5).any(|w| w == b"\x1b]52") {
                    let allow = allow_osc52;
                    // Block OSC52 queries (?), always strip ? ops
                    let has_query = chunk.windows(6).any(|w| w == b"\x1b]52;?");
                    if has_query {
                        (None, false) // drop query entirely
                    } else if !allow {
                        // Strip OSC52 writes entirely when disabled
                        let filtered = strip_osc52(chunk);
                        if filtered.is_empty() { (None, false) } else { (Some(filtered), true) }
                    } else if chunk.len() > 10 * 1024 {
                        // Cap payload 10KB write-only exposure
                        let truncated = truncate_osc52(chunk, 10 * 1024);
                        (Some(truncated), true)
                    } else {
                        (None, true)
                    }
                } else {
                    (None, true)
                };
                let emit_chunk = effective.as_deref().unwrap_or(chunk);
                let do_emit_terminal = should_emit && !emit_chunk.is_empty();
                // --- PTY shadow buffer (vt100) always processes emit_chunk when non-empty ---
                // Zero DB queries per chunk, zero allocations beyond vt100 parser (AGENTS.md discipline).
                // State detection runs after vt100 process and only emits on transition (push <500ms).
                if !emit_chunk.is_empty() {
                    let now = now_epoch_ms();
                    let new_state = {
                        let mut p = parser_clone.lock();
                        p.process(emit_chunk);
                        let contents = p.screen().contents();
                        // PTY reader loop: state detection ONLY. No SQLite here —
                        // persistence of transitions happens in the lib.rs poll
                        // path (AGENTS.md discipline: zero DB in the reader loop).
                        // pty_alive=true: this loop only runs while the PTY is open.
                        detect_with_decay(&contents, last_state, state_started_at, now, true).state
                    };
                    if new_state != last_state {
                        if let Some(app_handle) = &app {
                            #[derive(Serialize, Clone)]
                            struct AgentStatePayload {
                                session_id: String,
                                #[serde(rename = "sessionId")]
                                session_id_camel: String,
                                state: String,
                                state_started_at: u64,
                            }
                            let payload = AgentStatePayload {
                                session_id: s_id.clone(),
                                session_id_camel: s_id.clone(),
                                state: new_state.as_str().to_string(),
                                state_started_at: now,
                            };
                            let _ = app_handle.emit("agent:state", payload);
                        }
                        last_state = new_state;
                        state_started_at = now;
                    }
                }
                if do_emit_terminal {
                    // Keep raw output buffer for poll fallback (Orca backlogCapChars)
                    {
                        let mut win = output_clone.lock();
                        win.bytes.extend_from_slice(emit_chunk);
                        // cap at max(2MB, scrollback*120) — configured once on session start
                        let cap = scrollback_cap;
                        if win.bytes.len() > cap {
                            let drain = win.bytes.len() - cap;
                            win.bytes.drain(0..drain);
                            // Advance the absolute stream position of bytes[0] so
                            // poll offsets remain valid across drains (bug #5).
                            win.base += drain;
                        }
                    }
                    if let Some(ref app) = app {
                        #[derive(Serialize, Clone)]
                        struct OutputPayload {
                            session_id: String,
                            output: String,
                        }
                        let _ = app.emit(
                            "terminal:output",
                            OutputPayload {
                                session_id: s_id.clone(),
                                output: String::from_utf8_lossy(emit_chunk).to_string(),
                            },
                        );
                    }
                }
            }
        });

        guard.insert(
            session_id.to_string(),
            TerminalSession {
                parser,
                writer: Arc::new(Mutex::new(writer)),
                master,
                agent_id: executable.to_string(),
                output,
                child,
                reader_thread: Some(reader_thread),
            },
        );

        Ok(())
    }

    pub fn write_input(&self, session_id: &str, input: &str) -> Result<(), String> {
        let guard = self.sessions.lock();
        if let Some(sess) = guard.get(session_id) {
            let mut w = sess.writer.lock();
            w.write_all(input.as_bytes())
                .map_err(|e| format!("Failed to write to terminal: {e}"))?;
            w.flush().map_err(|e| format!("Failed to flush terminal: {e}"))?;
            Ok(())
        } else {
            Err(format!("No active terminal session for ID '{session_id}'"))
        }
    }

    pub fn get_snapshot(&self, session_id: &str) -> Result<TerminalSnapshot, String> {
        let guard = self.sessions.lock();
        if let Some(sess) = guard.get(session_id) {
            let p = sess.parser.lock();
            let screen = p.screen();
            
            let formatted = String::from_utf8_lossy(&screen.contents_formatted()).to_string();
            let clean_text = screen.contents();

            Ok(TerminalSnapshot {
                session_id: session_id.to_string(),
                formatted,
                clean_text,
            })
        } else {
            Err(format!("No active terminal session for ID '{session_id}'"))
        }
    }

    pub fn close_session(&self, session_id: &str) {
        let session = self.sessions.lock().remove(session_id);

        let Some(sess) = session else {
            return;
        };

        let mut child = sess.child;
        let reader_thread = sess.reader_thread;

        // The spawned process calls setsid() in its pre_exec, so its pid is also
        // its process-group id. Signal the whole group (shell + subprocesses),
        // otherwise orphaned children keep the PTY slave fds open and the reader
        // thread never reaches EOF/EIO.
        if let Some(pid) = child.process_id() {
            unsafe {
                libc::kill(-(pid as i32), libc::SIGHUP);
            }
        } else {
            let _ = child.kill();
        }

        // Grace window for a clean exit, then escalate to SIGKILL. Reaping via
        // wait()/try_wait() prevents zombie processes from accumulating.
        let deadline = std::time::Instant::now() + std::time::Duration::from_millis(600);
        loop {
            match child.try_wait() {
                Ok(Some(_)) => break, // already exited and reaped
                Ok(None) => {
                    if std::time::Instant::now() >= deadline {
                        if let Some(pid) = child.process_id() {
                            unsafe {
                                libc::kill(-(pid as i32), libc::SIGKILL);
                            }
                        } else {
                            let _ = child.kill();
                        }
                        // Reap immediately; wait() only fails in the unlikely
                        // race where the process exited between try_wait and kill.
                        if child.wait().is_err() {
                            let _ = child.try_wait();
                        }
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(20));
                }
                Err(_) => break,
            }
        }

        // Join the reader thread: once the slave side is fully closed (child
        // group dead), the master read hits EIO/EOF and the loop ends.
        // Known edge: a grandchild that fully detaches (setsid + keeps the pty
        // fds open) survives the group kill and would keep the slave open,
        // making this join block. Such daemonized descendants are rare in
        // terminal sessions and lie outside the zombie-reaping scope of this fix.
        if let Some(thread) = reader_thread {
            let _ = thread.join();
        }
    }

    pub fn resize_session(&self, session_id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let guard = self.sessions.lock();
        if let Some(sess) = guard.get(session_id) {
            // Resize vt100 shadow buffer
            {
                let mut p = sess.parser.lock();
                p.screen_mut().set_size(rows, cols);
            }
            let m = sess.master.lock();
            m.resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {e}"))?;
            Ok(())
        } else {
            Err(format!("No active terminal session for ID '{session_id}'"))
        }
    }

    pub fn list_sessions(&self) -> Vec<String> {
        self.sessions.lock().keys().cloned().collect()
    }

    pub fn poll_output(&self, session_id: &str, offset: usize) -> Result<(String, usize), String> {
        let guard = self.sessions.lock();
        if let Some(sess) = guard.get(session_id) {
            let win = sess.output.lock();
            let window_end = win.base + win.bytes.len();
            // `offset` is an absolute stream position. If it was already evicted
            // from the retained window by a drain, resync from the window start;
            // if it is ahead of the stream, return an empty slice at `window_end`.
            let from = offset.min(window_end).max(win.base);
            let slice = &win.bytes[(from - win.base)..];
            let s = String::from_utf8_lossy(slice).to_string();
            Ok((s, window_end))
        } else {
            Err(format!("No active terminal session for ID '{session_id}'"))
        }
    }
}

fn strip_osc52(input: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(input.len());
    let mut i = 0;
    while i < input.len() {
        if i + 5 <= input.len() && &input[i..i+5] == b"\x1b]52" {
            // Skip until BEL \x07 or ST \x1b\\
            let mut j = i + 5;
            while j < input.len() {
                if input[j] == 0x07 { j += 1; break; }
                if j + 1 < input.len() && input[j] == 0x1b && input[j+1] == b'\\' { j += 2; break; }
                j += 1;
            }
            i = j;
        } else {
            out.push(input[i]);
            i += 1;
        }
    }
    out
}

fn truncate_osc52(input: &[u8], cap: usize) -> Vec<u8> {
    if input.len() <= cap { return input.to_vec(); }
    // If OSC52 payload exceeds cap, strip it entirely to avoid partial base64
    if input.windows(5).any(|w| w == b"\x1b]52") {
        return strip_osc52(input);
    }
    let mut v = input.to_vec();
    v.truncate(cap);
    v
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Closing a session must terminate the PTY process group, reap the child
    /// (no zombie left behind) and join the reader thread before returning.
    #[test]
    fn close_session_reaps_child_and_joins_reader_thread() {
        let manager = TerminalManager::new(Arc::new(crate::db::DatabaseManager::new_in_memory().expect("in-memory db")));
        let sid = "test-reap-1";

        manager
            .start_session_headless(sid, "/bin/sh", vec!["-c".into(), "sleep 300".into()], None)
            .unwrap();

        let pid = manager
            .sessions
            .lock()
            .get(sid)
            .expect("session present")
            .child
            .process_id()
            .expect("child process id");

        // Process exists (kill(pid, 0) succeeds).
        assert_eq!(unsafe { libc::kill(pid as i32, 0) }, 0, "child should be alive before close");

        manager.close_session(sid);

        // Process was reaped: a zombie still answers kill(pid, 0) == 0, so
        // ESRCH here means it was waited on, not merely killed.
        assert_eq!(
            unsafe { libc::kill(pid as i32, 0) },
            -1,
            "child should be reaped after close"
        );
        assert_eq!(
            std::io::Error::last_os_error().raw_os_error(),
            Some(libc::ESRCH),
            "reaped process must be gone from the process table"
        );

        // Session is gone and the reader thread was joined (close_session
        // returns only after join()).
        assert!(manager.sessions.lock().get(sid).is_none());
    }

    /// Reaping must also work when the child exits by itself before the
    /// session is closed (the classic zombie accumulation path). The shell is
    /// left as a real zombie (state `Z`, never waited on) and `close_session`
    /// is what must reap it.
    #[test]
    fn close_session_reaps_an_already_exited_child() {
        let manager = TerminalManager::new(Arc::new(crate::db::DatabaseManager::new_in_memory().expect("in-memory db")));
        let sid = "test-reap-2";

        manager
            .start_session_headless(sid, "/bin/sh", vec!["-c".into(), "exit 0".into()], None)
            .unwrap();

        let pid = manager
            .sessions
            .lock()
            .get(sid)
            .expect("session present")
            .child
            .process_id()
            .expect("child process id");

        // Wait until the short-lived child shows up as a zombie. A zombie still
        // occupies its pid and answers kill(pid, 0) successfully; only reaping
        // removes it from the process table.
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
        loop {
            if proc_state(pid) == "Z" {
                break;
            }
            if std::time::Instant::now() >= deadline {
                panic!("child did not become a zombie in time (state={})", proc_state(pid));
            }
            std::thread::sleep(std::time::Duration::from_millis(20));
        }

        manager.close_session(sid);

        // close_session reaped the zombie: pid no longer exists.
        assert_eq!(
            unsafe { libc::kill(pid as i32, 0) },
            -1,
            "already-exited child must be reaped by close_session"
        );
        assert_eq!(
            std::io::Error::last_os_error().raw_os_error(),
            Some(libc::ESRCH)
        );
    }

    /// Reads the state letter (field 3) of /proc/<pid>/stat: "Z" = zombie.
    fn proc_state(pid: u32) -> String {
        std::fs::read_to_string(format!("/proc/{pid}/stat"))
            .ok()
            .map(|s| s.rsplit(')').next().unwrap_or("").trim_start().chars().next().unwrap_or('?').to_string())
            .unwrap_or_default()
    }

    /// Absolute poll offsets must stay valid after the retained window drains
    /// from the front (bug #5): the returned `next_offset` is absolute, and a
    /// stale offset resyncs to the start of the retained window.
    #[test]
    fn poll_output_offsets_survive_buffer_drain() {
        let manager = TerminalManager::new(Arc::new(crate::db::DatabaseManager::new_in_memory().expect("in-memory db")));
        let sid = "test-poll-drain";

        manager
            .start_session_headless(sid, "/bin/sh", vec!["-c".into(), "exit 0".into()], None)
            .unwrap();

        // Wait for the reader thread to finish so it cannot overwrite the
        // crafted window below (the child exits immediately, no output).
        let reader = manager
            .sessions
            .lock()
            .get_mut(sid)
            .unwrap()
            .reader_thread
            .take()
            .unwrap();
        reader.join().unwrap();

        // Simulate a reader drain: the retained window starts at absolute
        // position 100 and holds bytes [100, 1100), with bytes[j] ≡ 'a' + (100+j) % 26.
        {
            let mut sessions_guard = manager.sessions.lock();
            let sess = sessions_guard.get_mut(sid).unwrap();
            let mut win = sess.output.lock();
            win.base = 100;
            win.bytes = (0..1000u32).map(|j| b'a' + ((100 + j) % 26) as u8).collect();
        }

        // Poll at an absolute position already evicted by the drain: resync to
        // the start of the retained window, `next` is absolute and correct.
        let (data, next) = manager.poll_output(sid, 50).unwrap();
        assert_eq!(next, 1100);
        assert_eq!(data.len(), 1000);
        assert_eq!(data.as_bytes()[0], b'a' + (100 % 26) as u8); // absolute 100
        assert_eq!(data.as_bytes()[999], b'a' + (1099 % 26) as u8); // absolute 1099

        // Poll at a valid absolute offset inside the window.
        let (data2, next2) = manager.poll_output(sid, 500).unwrap();
        assert_eq!(next2, 1100);
        assert_eq!(data2.len(), 600); // bytes [500, 1100)
        assert_eq!(data2.as_bytes()[0], b'a' + (500 % 26) as u8); // absolute 500

        // Poll at the absolute end: empty slice, cursor stays stable.
        let (empty, next3) = manager.poll_output(sid, 1100).unwrap();
        assert!(empty.is_empty());
        assert_eq!(next3, 1100);
    }

    /// The PTY is an xterm.js surface. Children must see 256-color + truecolor
    /// even when the parent was launched with TERM=dumb, NO_COLOR, and CI.
    /// Claude Code treats any CI as "no color" before it reads COLORTERM.
    #[test]
    fn spawned_pty_advertises_truecolor() {
        let saved_term = std::env::var("TERM").ok();
        let saved_no_color = std::env::var("NO_COLOR").ok();
        let saved_node_disable = std::env::var("NODE_DISABLE_COLORS").ok();
        let saved_ci = std::env::var("CI").ok();
        std::env::set_var("TERM", "dumb");
        std::env::set_var("NO_COLOR", "1");
        std::env::set_var("NODE_DISABLE_COLORS", "1");
        std::env::set_var("CI", "true");

        let manager = TerminalManager::new(Arc::new(
            crate::db::DatabaseManager::new_in_memory().expect("in-memory db"),
        ));
        let sid = "test-truecolor";
        let started = manager.start_session_headless(
            sid,
            "/bin/sh",
            vec![
                "-c".into(),
                r#"printf 'TERM=%s COLORTERM=%s NO_COLOR=%s NODE_DISABLE_COLORS=%s CI=%s
' "$TERM" "$COLORTERM" "${NO_COLOR-unset}" "${NODE_DISABLE_COLORS-unset}" "${CI-unset}""#.into(),
            ],
            None,
        );

        match saved_term {
            Some(value) => std::env::set_var("TERM", value),
            None => std::env::remove_var("TERM"),
        }
        match saved_no_color {
            Some(value) => std::env::set_var("NO_COLOR", value),
            None => std::env::remove_var("NO_COLOR"),
        }
        match saved_node_disable {
            Some(value) => std::env::set_var("NODE_DISABLE_COLORS", value),
            None => std::env::remove_var("NODE_DISABLE_COLORS"),
        }
        match saved_ci {
            Some(value) => std::env::set_var("CI", value),
            None => std::env::remove_var("CI"),
        }
        started.unwrap();

        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
        let mut seen = String::new();
        loop {
            if let Ok((chunk, _)) = manager.poll_output(sid, 0) {
                seen = chunk;
            }
            if seen.contains("COLORTERM=") {
                break;
            }
            if std::time::Instant::now() >= deadline {
                panic!("timed out waiting for env probe, saw: {seen:?}");
            }
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
        manager.close_session(sid);

        assert!(
            seen.contains("TERM=xterm-256color"),
            "TERM must advertise xterm.js, saw: {seen:?}"
        );
        assert!(
            seen.contains("COLORTERM=truecolor"),
            "COLORTERM must advertise 24-bit color, saw: {seen:?}"
        );
        assert!(
            seen.contains("NO_COLOR=unset"),
            "inherited NO_COLOR must not disable terminal color, saw: {seen:?}"
        );
        assert!(
            seen.contains("NODE_DISABLE_COLORS=unset"),
            "inherited NODE_DISABLE_COLORS must not disable terminal color, saw: {seen:?}"
        );
        assert!(
            seen.contains("CI=unset"),
            "inherited CI must not mark the PTY as non-interactive, saw: {seen:?}"
        );
    }
}
