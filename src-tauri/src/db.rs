use parking_lot::Mutex;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub id: i64,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DbSessionRecord {
    pub id: String,
    pub project_path: String,
    pub title: String,
    pub branch: String,
    pub agent_name: String,
    pub executable: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ToolApprovalRecord {
    pub id: String,
    pub session_id: String,
    pub tool_name: String,
    pub command: String,
    pub status: String,
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HydraSettings {
    pub terminal_font_family: String,
    pub terminal_font_size: u32,
    pub terminal_cursor_style: String,
    pub terminal_cursor_blink: bool,
    pub auto_approve_reads: bool,
    pub notification_on_blocked: bool,
    pub default_branch_prefix: String,
    pub workspace_dir: String,
}

impl Default for HydraSettings {
    fn default() -> Self {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/home/renan".to_string());
        Self {
            terminal_font_family: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace".to_string(),
            terminal_font_size: 12,
            terminal_cursor_style: "block".to_string(),
            terminal_cursor_blink: true,
            auto_approve_reads: true,
            notification_on_blocked: true,
            default_branch_prefix: "feat/".to_string(),
            workspace_dir: format!("{home}/src"),
        }
    }
}

pub struct DatabaseManager {
    conn: Mutex<Connection>,
}

impl DatabaseManager {
    pub fn new() -> Result<Self, String> {
        let db_path = Self::get_db_path()?;
        let conn = Connection::open(&db_path).map_err(|e| format!("Error opening SQLite: {e}"))?;

        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;

             CREATE TABLE IF NOT EXISTS sessions (
                 id TEXT PRIMARY KEY,
                 project_path TEXT NOT NULL DEFAULT '',
                 title TEXT NOT NULL,
                 branch TEXT NOT NULL DEFAULT 'main',
                 agent_name TEXT NOT NULL DEFAULT 'bash',
                 executable TEXT NOT NULL DEFAULT 'bash',
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
             );

             CREATE TABLE IF NOT EXISTS settings (
                 key TEXT PRIMARY KEY,
                 value TEXT NOT NULL
             );",
        )
        .map_err(|e| format!("Error running SQLite migrations: {e}"))?;

        let _ = conn.execute("ALTER TABLE sessions ADD COLUMN project_path TEXT NOT NULL DEFAULT ''", params![]);
        let _ = conn.execute("ALTER TABLE sessions ADD COLUMN branch TEXT NOT NULL DEFAULT 'main'", params![]);
        let _ = conn.execute("ALTER TABLE sessions ADD COLUMN agent_name TEXT NOT NULL DEFAULT 'bash'", params![]);
        let _ = conn.execute("ALTER TABLE sessions ADD COLUMN executable TEXT NOT NULL DEFAULT 'bash'", params![]);

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn get_db_path() -> Result<PathBuf, String> {
        let home = std::env::var("HOME").map_err(|_| "HOME not found".to_string())?;
        let dir = PathBuf::from(home).join(".config").join("hydra");
        std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create ~/.config/hydra: {e}"))?;
        Ok(dir.join("hydra_sessions.sqlite3"))
    }

    pub fn list_sessions(&self, project_path: Option<&str>) -> Result<Vec<DbSessionRecord>, String> {
        let conn = self.conn.lock();

        let mut list = Vec::new();
        if let Some(p) = project_path {
            if !p.is_empty() {
                let mut stmt = conn
                    .prepare("SELECT id, project_path, title, branch, agent_name, executable, created_at, updated_at FROM sessions WHERE project_path = ?1 OR project_path = '' ORDER BY updated_at DESC")
                    .map_err(|e| format!("Error preparing sessions select: {e}"))?;
                let rows = stmt
                    .query_map(params![p], |row| {
                        Ok(DbSessionRecord {
                            id: row.get(0)?,
                            project_path: row.get(1)?,
                            title: row.get(2)?,
                            branch: row.get(3)?,
                            agent_name: row.get(4)?,
                            executable: row.get(5)?,
                            created_at: row.get(6)?,
                            updated_at: row.get(7)?,
                        })
                    })
                    .map_err(|e| format!("Query error: {e}"))?;
                for r in rows.flatten() {
                    list.push(r);
                }
                return Ok(list);
            }
        }

        let mut stmt = conn
            .prepare("SELECT id, project_path, title, branch, agent_name, executable, created_at, updated_at FROM sessions ORDER BY updated_at DESC")
            .map_err(|e| format!("Error preparing sessions select: {e}"))?;
        let rows = stmt
            .query_map(params![], |row| {
                Ok(DbSessionRecord {
                    id: row.get(0)?,
                    project_path: row.get(1)?,
                    title: row.get(2)?,
                    branch: row.get(3)?,
                    agent_name: row.get(4)?,
                    executable: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })
            .map_err(|e| format!("Query error: {e}"))?;
        for r in rows.flatten() {
            list.push(r);
        }

        Ok(list)
    }

    pub fn upsert_session(&self, record: &DbSessionRecord) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO sessions (id, project_path, title, branch, agent_name, executable, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET 
             project_path = excluded.project_path,
             title = excluded.title,
             branch = excluded.branch,
             agent_name = excluded.agent_name,
             executable = excluded.executable,
             updated_at = excluded.updated_at",
            params![
                record.id,
                record.project_path,
                record.title,
                record.branch,
                record.agent_name,
                record.executable,
                record.created_at,
                record.updated_at
            ],
        )
        .map_err(|e| format!("Error upserting session: {e}"))?;
        Ok(())
    }

    pub fn delete_session(&self, session_id: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM sessions WHERE id = ?1", params![session_id])
            .map_err(|e| format!("Error deleting session: {e}"))?;
        Ok(())
    }

    pub fn save_message(&self, session_id: &str, role: &str, content: &str) -> Result<i64, String> {
        let conn = self.conn.lock();
        let now = chrono_now();

        let _ = conn.execute(
            "INSERT OR IGNORE INTO sessions (id, project_path, title, branch, agent_name, executable, created_at, updated_at) 
             VALUES (?1, '', ?2, 'main', 'bash', 'bash', ?3, ?3)",
            params![session_id, "Main Session", now],
        );

        conn.execute(
            "INSERT INTO messages (session_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![session_id, role, content, now],
        )
        .map_err(|e| format!("Error inserting message: {e}"))?;

        Ok(conn.last_insert_rowid())
    }

    pub fn list_messages(&self, session_id: &str) -> Result<Vec<ChatMessage>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT id, session_id, role, content, created_at FROM messages WHERE session_id = ?1 ORDER BY id ASC")
            .map_err(|e| format!("Error preparing select: {e}"))?;

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
            .map_err(|e| format!("Query error: {e}"))?;

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
        .map_err(|e| format!("Error saving tool approval: {e}"))?;
        Ok(())
    }

    pub fn get_settings(&self) -> Result<HydraSettings, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = 'global_settings'")
            .map_err(|e| format!("Error querying settings: {e}"))?;

        let mut rows = stmt.query(params![]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let json_str: String = row.get(0).map_err(|e| e.to_string())?;
            serde_json::from_str(&json_str).map_err(|e| format!("JSON parse error: {e}"))
        } else {
            Ok(HydraSettings::default())
        }
    }

    pub fn save_settings(&self, settings: &HydraSettings) -> Result<(), String> {
        let conn = self.conn.lock();
        let json_str = serde_json::to_string(settings).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('global_settings', ?1)",
            params![json_str],
        )
        .map_err(|e| format!("Error saving settings: {e}"))?;
        Ok(())
    }
}

fn chrono_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
