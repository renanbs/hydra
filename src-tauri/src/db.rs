use parking_lot::Mutex;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub id: i64,
    pub session_id: String,
    pub role: String, // "user", "agent", "system", "tool"
    pub content: String,
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ToolApprovalRecord {
    pub id: String,
    pub session_id: String,
    pub tool_name: String,
    pub command: String,
    pub status: String, // "pending", "approved", "rejected"
    pub created_at: i64,
}

pub struct DatabaseManager {
    conn: Mutex<Connection>,
}

impl DatabaseManager {
    pub fn new() -> Result<Self, String> {
        let db_path = Self::get_db_path()?;
        let conn = Connection::open(&db_path).map_err(|e| format!("Erro ao abrir SQLite: {e}"))?;

        // Ativa modo WAL (Write-Ahead Logging) para crash-proof e altíssima performance
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;

             CREATE TABLE IF NOT EXISTS sessions (
                 id TEXT PRIMARY KEY,
                 title TEXT NOT NULL,
                 created_at INTEGER NOT NULL,
                 updated_at INTEGER NOT NULL
             );

             CREATE TABLE IF NOT EXISTS messages (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 session_id TEXT NOT NULL,
                 role TEXT NOT NULL,
                 content TEXT NOT NULL,
                 created_at INTEGER NOT NULL,
                 FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
             );

             CREATE TABLE IF NOT EXISTS tool_approvals (
                 id TEXT PRIMARY KEY,
                 session_id TEXT NOT NULL,
                 tool_name TEXT NOT NULL,
                 command TEXT NOT NULL,
                 status TEXT NOT NULL,
                 created_at INTEGER NOT NULL
             );",
        )
        .map_err(|e| format!("Erro ao migrar tabelas SQLite: {e}"))?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn get_db_path() -> Result<PathBuf, String> {
        let home = std::env::var("HOME").map_err(|_| "HOME não encontrado".to_string())?;
        let dir = PathBuf::from(home).join(".config").join("hydra");
        std::fs::create_dir_all(&dir).map_err(|e| format!("Falha ao criar ~/.config/hydra: {e}"))?;
        Ok(dir.join("hydra_sessions.sqlite3"))
    }

    pub fn save_message(&self, session_id: &str, role: &str, content: &str) -> Result<i64, String> {
        let conn = self.conn.lock();
        let now = chrono_now();

        // Garante que a sessão existe
        let _ = conn.execute(
            "INSERT OR IGNORE INTO sessions (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
            params![session_id, "Nova Sessão Hydra", now],
        );

        conn.execute(
            "INSERT INTO messages (session_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![session_id, role, content, now],
        )
        .map_err(|e| format!("Erro ao inserir mensagem: {e}"))?;

        Ok(conn.last_insert_rowid())
    }

    pub fn list_messages(&self, session_id: &str) -> Result<Vec<ChatMessage>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT id, session_id, role, content, created_at FROM messages WHERE session_id = ?1 ORDER BY id ASC")
            .map_err(|e| format!("Erro ao preparar select: {e}"))?;

        let rows = stmt
            .query_map(params![session_id], |row| {
                Ok(ChatMessage {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })
            .map_err(|e| format!("Erro na query: {e}"))?;

        let mut messages = Vec::new();
        for r in rows {
            if let Ok(msg) = r {
                messages.push(msg);
            }
        }
        Ok(messages)
    }

    pub fn save_tool_approval(&self, approval: &ToolApprovalRecord) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT OR REPLACE INTO tool_approvals (id, session_id, tool_name, command, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                approval.id,
                approval.session_id,
                approval.tool_name,
                approval.command,
                approval.status,
                approval.created_at
            ],
        )
        .map_err(|e| format!("Erro ao salvar tool approval: {e}"))?;
        Ok(())
    }
}

fn chrono_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
