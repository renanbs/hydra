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
pub struct UiLayoutState {
    pub left_sidebar_open: bool,
    pub right_sidebar_open: bool,
    pub left_sidebar_width: u32,
    pub right_sidebar_width: u32,
}

impl Default for UiLayoutState {
    fn default() -> Self {
        Self {
            left_sidebar_open: true,
            right_sidebar_open: true,
            left_sidebar_width: 260,
            right_sidebar_width: 360,
        }
    }
}

fn default_theme() -> String { "system".to_string() }
fn default_terminal_font_family() -> String { "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace".to_string() }
fn default_terminal_font_size() -> u32 { 14 }
fn default_terminal_font_weight() -> u32 { 500 }
fn default_terminal_font_weight_bold() -> u32 { 700 }
fn default_terminal_line_height() -> f32 { 1.0 }
fn default_terminal_cursor_style() -> String { "block".to_string() }
fn default_true() -> bool { true }
fn default_false() -> bool { false }
fn default_terminal_gpu() -> String { "auto".to_string() }
fn default_terminal_ligatures() -> String { "auto".to_string() }
fn default_terminal_theme_dark() -> String { "Ghostty Default Style Dark".to_string() }
fn default_terminal_theme_light() -> String { "Builtin Tango Light".to_string() }
fn default_divider_dark() -> String { "#3f3f46".to_string() }
fn default_divider_light() -> String { "#d4d4d8".to_string() }
fn default_inactive_opacity() -> f32 { 0.6 }
fn default_active_opacity() -> f32 { 1.0 }
fn default_transition_ms() -> u32 { 140 }
fn default_divider_thickness() -> u32 { 3 }
fn default_scrollback() -> u32 { 10000 }
fn default_branch_prefix() -> String { "feat/".to_string() }
fn default_workspace_dir() -> String {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/renan".to_string());
    format!("{home}/src")
}
fn deserialize_theme<'de, D>(deserializer: D) -> Result<String, D::Error>
where D: serde::Deserializer<'de> {
    let s = String::deserialize(deserializer)?;
    Ok(match s.as_str() {
        "dark" | "light" | "system" => s,
        "oled" => "dark".to_string(),
        _ => "system".to_string(),
    })
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TerminalColorOverrides {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub foreground: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cursorAccent: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub selectionBackground: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub selectionForeground: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub black: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub red: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub green: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub yellow: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub blue: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub magenta: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cyan: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub white: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightBlack: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightRed: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightGreen: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightYellow: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightBlue: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightMagenta: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightCyan: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightWhite: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TerminalCustomTheme {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default = "default_terminal_custom_source")]
    pub source: String,
    #[serde(default = "default_terminal_custom_mode")]
    pub mode: String,
    #[serde(default)]
    pub terminal: TerminalColorOverrides,
    #[serde(default)]
    pub importedAt: String,
}
fn default_terminal_custom_source() -> String { "manual".to_string() }
fn default_terminal_custom_mode() -> String { "unknown".to_string() }

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HydraSettings {
    #[serde(default = "default_theme", deserialize_with = "deserialize_theme")]
    pub theme: String,
    #[serde(default = "default_terminal_font_family")]
    pub terminal_font_family: String,
    #[serde(default = "default_terminal_font_size")]
    pub terminal_font_size: u32,
    #[serde(default = "default_terminal_font_weight")]
    pub terminal_font_weight: u32,
    #[serde(default = "default_terminal_font_weight_bold")]
    pub terminal_font_weight_bold: u32,
    #[serde(default = "default_terminal_line_height")]
    pub terminal_line_height: f32,
    #[serde(default = "default_terminal_cursor_style")]
    pub terminal_cursor_style: String,
    #[serde(default = "default_true")]
    pub terminal_cursor_blink: bool,
    #[serde(default = "default_terminal_gpu")]
    pub terminal_gpu_acceleration: String,
    #[serde(default = "default_terminal_ligatures")]
    pub terminal_ligatures: String,
    #[serde(default = "default_terminal_theme_dark")]
    pub terminal_theme_dark: String,
    #[serde(default = "default_terminal_theme_light")]
    pub terminal_theme_light: String,
    #[serde(default = "default_true")]
    pub terminal_use_separate_light_theme: bool,
    #[serde(default = "default_divider_dark")]
    pub terminal_divider_color_dark: String,
    #[serde(default = "default_divider_light")]
    pub terminal_divider_color_light: String,
    #[serde(default)]
    pub terminal_custom_themes: Vec<TerminalCustomTheme>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub terminal_background_opacity: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub terminal_minimum_contrast_ratio: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub terminal_color_overrides: Option<TerminalColorOverrides>,
    #[serde(default = "default_inactive_opacity")]
    pub terminal_inactive_pane_opacity: f32,
    #[serde(default = "default_active_opacity")]
    pub terminal_active_pane_opacity: f32,
    #[serde(default = "default_transition_ms")]
    pub terminal_pane_opacity_transition_ms: u32,
    #[serde(default = "default_divider_thickness")]
    pub terminal_divider_thickness_px: u32,
    #[serde(default = "default_false")]
    pub terminal_focus_follows_mouse: bool,
    #[serde(default = "default_scrollback")]
    pub terminal_scrollback_rows: u32,
    #[serde(default = "default_true")]
    pub primary_selection_middle_click_paste: bool,
    #[serde(default = "default_true")]
    pub auto_approve_reads: bool,
    #[serde(default = "default_true")]
    pub notification_on_blocked: bool,
    #[serde(default = "default_branch_prefix")]
    pub default_branch_prefix: String,
    #[serde(default = "default_workspace_dir")]
    pub workspace_dir: String,
}

impl Default for HydraSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            terminal_font_family: default_terminal_font_family(),
            terminal_font_size: default_terminal_font_size(),
            terminal_font_weight: default_terminal_font_weight(),
            terminal_font_weight_bold: default_terminal_font_weight_bold(),
            terminal_line_height: default_terminal_line_height(),
            terminal_cursor_style: default_terminal_cursor_style(),
            terminal_cursor_blink: true,
            terminal_gpu_acceleration: default_terminal_gpu(),
            terminal_ligatures: default_terminal_ligatures(),
            terminal_theme_dark: default_terminal_theme_dark(),
            terminal_theme_light: default_terminal_theme_light(),
            terminal_use_separate_light_theme: true,
            terminal_divider_color_dark: default_divider_dark(),
            terminal_divider_color_light: default_divider_light(),
            terminal_custom_themes: vec![],
            terminal_background_opacity: None,
            terminal_minimum_contrast_ratio: None,
            terminal_color_overrides: None,
            terminal_inactive_pane_opacity: default_inactive_opacity(),
            terminal_active_pane_opacity: default_active_opacity(),
            terminal_pane_opacity_transition_ms: default_transition_ms(),
            terminal_divider_thickness_px: default_divider_thickness(),
            terminal_focus_follows_mouse: false,
            terminal_scrollback_rows: default_scrollback(),
            primary_selection_middle_click_paste: true,
            auto_approve_reads: true,
            notification_on_blocked: true,
            default_branch_prefix: default_branch_prefix(),
            workspace_dir: default_workspace_dir(),
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

    pub fn get_layout_state(&self) -> Result<UiLayoutState, String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = 'ui_layout_state'")
            .map_err(|e| format!("Error querying layout state: {e}"))?;

        let mut rows = stmt.query(params![]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let json_str: String = row.get(0).map_err(|e| e.to_string())?;
            serde_json::from_str(&json_str).map_err(|e| format!("JSON parse error: {e}"))
        } else {
            Ok(UiLayoutState::default())
        }
    }

    pub fn save_layout_state(&self, layout: &UiLayoutState) -> Result<(), String> {
        let conn = self.conn.lock();
        let json_str = serde_json::to_string(layout).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('ui_layout_state', ?1)",
            params![json_str],
        )
        .map_err(|e| format!("Error saving layout state: {e}"))?;
        Ok(())
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
