use parking_lot::Mutex;
use portable_pty::{CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

pub struct TerminalSession {
    pub parser: Arc<Mutex<vt100::Parser>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    pub agent_id: String,
    pub output: Arc<Mutex<Vec<u8>>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TerminalSnapshot {
    pub session_id: String,
    pub formatted: String,
    pub clean_text: String,
}

pub struct TerminalManager {
    pub sessions: Mutex<HashMap<String, TerminalSession>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
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
        let _child = pair
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
        let output = Arc::new(Mutex::new(Vec::<u8>::new()));
        let output_clone = Arc::clone(&output);
        let s_id = session_id.to_string();
        let db_settings = crate::db::DatabaseManager::new().ok().and_then(|db| db.get_settings().ok());
        let allow_osc52 = db_settings.as_ref().map(|s| s.terminal_allow_osc52_clipboard).unwrap_or(true);
        let scrollback_cap = db_settings.as_ref().map(|s| std::cmp::max(2 * 1024 * 1024, s.terminal_scrollback_rows as usize * 120)).unwrap_or(2 * 1024 * 1024);
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
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
                if should_emit {
                    {
                        let mut p = parser_clone.lock();
                        p.process(emit_chunk);
                    }
                    // Keep raw output buffer for daemon poll (Orca backlogCapChars)
                    {
                        let mut out = output_clone.lock();
                        out.extend_from_slice(emit_chunk);
                        // cap at max(2MB, scrollback*120) — configured once on session start
                        let cap = scrollback_cap;
                        if out.len() > cap {
                            let drain = out.len() - cap;
                            out.drain(0..drain);
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
                } else if !emit_chunk.is_empty() {
                    // Even if not emitting, still process non-OSC52 part for vt100
                    let mut p = parser_clone.lock();
                    p.process(emit_chunk);
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
        let mut guard = self.sessions.lock();
        guard.remove(session_id);
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
            let out = sess.output.lock();
            if offset >= out.len() {
                return Ok((String::new(), out.len()));
            }
            let slice = &out[offset..];
            let s = String::from_utf8_lossy(slice).to_string();
            Ok((s, out.len()))
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
