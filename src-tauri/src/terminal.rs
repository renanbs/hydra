use parking_lot::Mutex;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

pub struct TerminalSession {
    parser: Arc<Mutex<vt100::Parser>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TerminalSnapshot {
    pub formatted: String,
    pub clean_text: String,
}

pub struct TerminalManager {
    pub session: Mutex<Option<TerminalSession>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            session: Mutex::new(None),
        }
    }

    pub fn start_shell(&self, app: AppHandle) -> Result<(), String> {
        let mut guard = self.session.lock();
        if guard.is_some() {
            return Ok(());
        }

        let pty_system = NativePtySystem::default();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Falha ao abrir PTY: {e}"))?;

        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
        let mut cmd = CommandBuilder::new(shell);
        if let Ok(dir) = std::env::current_dir() {
            cmd.cwd(dir);
        }

        let _child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Falha ao iniciar processo do shell: {e}"))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Falha ao obter canal de escrita PTY: {e}"))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Falha ao obter canal de leitura PTY: {e}"))?;

        let parser = Arc::new(Mutex::new(vt100::Parser::new(24, 80, 2000)));
        let parser_clone = Arc::clone(&parser);

        // Thread dedicada de leitura assíncrona do PTY para alimentar o buffer vt100
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            while let Ok(n) = reader.read(&mut buf) {
                if n == 0 {
                    break;
                }
                let chunk = &buf[..n];

                // Alimenta o buffer virtual em memória (zero rendering overhead)
                {
                    let mut p = parser_clone.lock();
                    p.process(chunk);
                }

                // Emite evento leve para o frontend saber que há novos bytes
                let _ = app.emit("terminal:output", String::from_utf8_lossy(chunk).to_string());
            }
        });

        *guard = Some(TerminalSession {
            parser,
            writer: Arc::new(Mutex::new(writer)),
        });

        Ok(())
    }

    pub fn write_input(&self, input: &str) -> Result<(), String> {
        let guard = self.session.lock();
        if let Some(sess) = guard.as_ref() {
            let mut w = sess.writer.lock();
            w.write_all(input.as_bytes())
                .map_err(|e| format!("Falha ao escrever no terminal: {e}"))?;
            w.flush().map_err(|e| format!("Falha no flush do terminal: {e}"))?;
            Ok(())
        } else {
            Err("Nenhuma sessão de terminal ativa".to_string())
        }
    }

    pub fn get_snapshot(&self) -> Result<TerminalSnapshot, String> {
        let guard = self.session.lock();
        if let Some(sess) = guard.as_ref() {
            let p = sess.parser.lock();
            let screen = p.screen();
            
            // Texto formatado com ANSI para o xterm.js da UI
            let formatted = String::from_utf8_lossy(&screen.contents_formatted()).to_string();
            // Texto limpo sem sequências ANSI para contexto de IA/LLM (economia de tokens)
            let clean_text = screen.contents();

            Ok(TerminalSnapshot {
                formatted,
                clean_text,
            })
        } else {
            Err("Nenhuma sessão de terminal ativa".to_string())
        }
    }
}
