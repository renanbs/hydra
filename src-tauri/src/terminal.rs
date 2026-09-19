use parking_lot::Mutex;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

pub struct TerminalSession {
    pub parser: Arc<Mutex<vt100::Parser>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub agent_id: String,
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
        app: AppHandle,
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
        if let Ok(dir) = std::env::current_dir() {
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

        let parser = Arc::new(Mutex::new(vt100::Parser::new(28, 100, 3000)));
        let parser_clone = Arc::clone(&parser);
        let s_id = session_id.to_string();

        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            while let Ok(n) = reader.read(&mut buf) {
                if n == 0 {
                    break;
                }
                let chunk = &buf[..n];
                {
                    let mut p = parser_clone.lock();
                    p.process(chunk);
                }

                #[derive(Serialize, Clone)]
                struct OutputPayload {
                    session_id: String,
                    output: String,
                }

                let _ = app.emit(
                    "terminal:output",
                    OutputPayload {
                        session_id: s_id.clone(),
                        output: String::from_utf8_lossy(chunk).to_string(),
                    },
                );
            }
        });

        guard.insert(
            session_id.to_string(),
            TerminalSession {
                parser,
                writer: Arc::new(Mutex::new(writer)),
                agent_id: executable.to_string(),
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
}
