use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HydraProject {
    pub id: String,
    pub name: String,
    pub path: String,
    pub is_git: bool,
    pub current_branch: String,
    /// Per-project worktree base path — mirrors Orca Repo.worktreeBasePath
    /// Relative paths resolve from `path` (see configured-worktree-base-path.ts:18)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub worktree_base_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub imported_worktrees: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub suppressed_discovery: Option<bool>,
}

pub fn list_local_projects() -> Vec<HydraProject> {
    let mut projects = Vec::new();

    // Carrega SOMENTE projetos adicionados explicitamente pelo usuário no SQLite
    if let Ok(home) = std::env::var("HOME") {
        let db_path = PathBuf::from(home).join(".config").join("hydra").join("hydra_sessions.sqlite3");
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            let _ = conn.execute(
                "CREATE TABLE IF NOT EXISTS added_projects (
                    path TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    added_at INTEGER NOT NULL
                )",
                rusqlite::params![],
            );
            let _ = conn.execute(
                "ALTER TABLE added_projects ADD COLUMN worktree_base_path TEXT",
                rusqlite::params![],
            );
            let _ = conn.execute(
                "ALTER TABLE added_projects ADD COLUMN imported_worktrees TEXT",
                rusqlite::params![],
            );
            let _ = conn.execute(
                "ALTER TABLE added_projects ADD COLUMN suppressed_discovery INTEGER",
                rusqlite::params![],
            );

            if let Ok(mut stmt) = conn.prepare("SELECT path, name, worktree_base_path, imported_worktrees, suppressed_discovery FROM added_projects ORDER BY added_at DESC") {
                if let Ok(rows) = stmt.query_map(rusqlite::params![], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, Option<String>>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, Option<i64>>(4)?,
                    ))
                }) {
                    for r in rows.flatten() {
                        let p = PathBuf::from(&r.0);
                        if p.exists() {
                            let is_git = p.join(".git").exists();
                            let branch = if is_git { get_branch_for_path(&p) } else { "none".to_string() };
                            projects.push(HydraProject {
                                id: format!("proj_{}", r.1),
                                name: r.1,
                                path: r.0,
                                is_git,
                                current_branch: branch,
                                worktree_base_path: r.2.filter(|s| !s.trim().is_empty()),
                                imported_worktrees: r.3.and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok()),
                                suppressed_discovery: r.4.map(|v| v != 0),
                            });
                        }
                    }
                }
            }
        }
    }

    // ── Sprint 3 #2: Folder workspace expansion — Orca parity (limit 20, normalize, inherit base)
    let mut expanded: Vec<HydraProject> = Vec::new();
    let mut seen_paths: std::collections::HashSet<String> = projects
        .iter()
        .map(|p| {
            let mut s = p.path.replace('\\', "/");
            while s.ends_with('/') && s.len() > 1 {
                s.pop();
            }
            s
        })
        .collect();
    for proj in &projects {
        expanded.push(proj.clone());
        let p = PathBuf::from(&proj.path);
        if !proj.is_git && p.is_dir() {
            if let Ok(entries) = std::fs::read_dir(&p) {
                let mut sub_repos: Vec<PathBuf> = entries
                    .flatten()
                    .map(|e| e.path())
                    .filter(|sub| sub.is_dir() && sub.join(".git").exists())
                    .collect();
                sub_repos.sort();
                // Limit to 20 to avoid scanning massive dirs like /home
                for sub in sub_repos.into_iter().take(20) {
                    let sub_str = sub.to_string_lossy().to_string().replace('\\', "/");
                    let mut norm = sub_str.clone();
                    while norm.ends_with('/') && norm.len() > 1 {
                        norm.pop();
                    }
                    if seen_paths.contains(&norm) || seen_paths.contains(&sub_str) {
                        continue;
                    }
                    seen_paths.insert(norm.clone());
                    seen_paths.insert(sub_str.clone());
                    let name = sub.file_name().and_then(|n| n.to_str()).unwrap_or("repo").to_string();
                    let branch = get_branch_for_path(&sub);
                    // id unique by path hash, not just name+parent
                    let id_suffix = sub_str.replace('/', "_").replace('\\', "_").replace(':', "_");
                    expanded.push(HydraProject {
                        id: format!("proj_{id_suffix}"),
                        name,
                        path: sub_str,
                        is_git: true,
                        current_branch: branch,
                        worktree_base_path: proj.worktree_base_path.clone(),
                        imported_worktrees: proj.imported_worktrees.clone(),
                        suppressed_discovery: proj.suppressed_discovery,
                    });
                }
            }
        }
    }
    if expanded.len() != projects.len() {
        expanded
    } else {
        projects
    }
}

pub fn get_project_worktree_base_path(path_str: &str) -> Option<String> {
    if let Ok(home) = std::env::var("HOME") {
        let db_path = PathBuf::from(home).join(".config").join("hydra").join("hydra_sessions.sqlite3");
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            let _ = conn.execute(
                "ALTER TABLE added_projects ADD COLUMN worktree_base_path TEXT",
                rusqlite::params![],
            );
            if let Ok(mut stmt) = conn.prepare("SELECT worktree_base_path FROM added_projects WHERE path = ?1") {
                if let Ok(mut rows) = stmt.query(rusqlite::params![path_str]) {
                    if let Ok(Some(row)) = rows.next() {
                        if let Ok(v) = row.get::<_, Option<String>>(0) {
                            return v.filter(|s| !s.trim().is_empty());
                        }
                    }
                }
            }
        }
    }
    None
}

pub fn set_project_worktree_base_path(path_str: &str, base_path: Option<&str>) -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not found".to_string())?;
    let db_path = PathBuf::from(home).join(".config").join("hydra").join("hydra_sessions.sqlite3");
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let _ = conn.execute(
        "ALTER TABLE added_projects ADD COLUMN worktree_base_path TEXT",
        rusqlite::params![],
    );
    conn.execute(
        "UPDATE added_projects SET worktree_base_path = ?1 WHERE path = ?2",
        rusqlite::params![base_path, path_str],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn add_existing_project(path_str: &str) -> Result<HydraProject, String> {
    let p = PathBuf::from(path_str);
    if !p.exists() || !p.is_dir() {
        return Err("Selected path does not exist or is not a directory".to_string());
    }

    let name = p
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("project")
        .to_string();

    let is_git = p.join(".git").exists();
    let branch = if is_git { get_branch_for_path(&p) } else { "none".to_string() };

    // Persiste no SQLite como projeto adicionado pelo usuário (preserva worktree_base_path se já existir)
    let existing_base = get_project_worktree_base_path(path_str);
    if let Ok(home) = std::env::var("HOME") {
        let db_path = PathBuf::from(home).join(".config").join("hydra").join("hydra_sessions.sqlite3");
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            let _ = conn.execute(
                "ALTER TABLE added_projects ADD COLUMN worktree_base_path TEXT",
                rusqlite::params![],
            );
            let _ = conn.execute(
                "INSERT OR REPLACE INTO added_projects (path, name, added_at, worktree_base_path) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![path_str, name, now, existing_base],
            );
        }
    }

    Ok(HydraProject {
        id: format!("proj_{name}"),
        name,
        path: path_str.to_string(),
        is_git,
        current_branch: branch,
        worktree_base_path: existing_base,
        imported_worktrees: None,
        suppressed_discovery: None,
    })
}
pub fn import_external_worktree_for_project(project_path: &str, worktree_path: &str) -> Result<(), String> {
    if let Ok(home) = std::env::var("HOME") {
        let db_path = PathBuf::from(home).join(".config").join("hydra").join("hydra_sessions.sqlite3");
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            let _ = conn.execute("ALTER TABLE added_projects ADD COLUMN imported_worktrees TEXT", rusqlite::params![]);
            let current_json: Option<String> = conn.query_row(
                "SELECT imported_worktrees FROM added_projects WHERE path = ?1",
                rusqlite::params![project_path],
                |row| row.get(0),
            ).unwrap_or(None);

            let mut list: Vec<String> = current_json
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();

            if !list.contains(&worktree_path.to_string()) {
                list.push(worktree_path.to_string());
            }

            let new_json = serde_json::to_string(&list).map_err(|e| e.to_string())?;
            conn.execute(
                "UPDATE added_projects SET imported_worktrees = ?1 WHERE path = ?2",
                rusqlite::params![new_json, project_path],
            ).map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    Err("Failed to open database".to_string())
}

pub fn suppress_discovery_for_project(project_path: &str) -> Result<(), String> {
    if let Ok(home) = std::env::var("HOME") {
        let db_path = PathBuf::from(home).join(".config").join("hydra").join("hydra_sessions.sqlite3");
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            let _ = conn.execute("ALTER TABLE added_projects ADD COLUMN suppressed_discovery INTEGER", rusqlite::params![]);
            conn.execute(
                "UPDATE added_projects SET suppressed_discovery = 1 WHERE path = ?1",
                rusqlite::params![project_path],
            ).map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    Err("Failed to open database".to_string())
}

pub fn remove_added_project(path_str: &str) -> Result<(), String> {
    if let Ok(home) = std::env::var("HOME") {
        let db_path = PathBuf::from(home).join(".config").join("hydra").join("hydra_sessions.sqlite3");
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            let _ = conn.execute("DELETE FROM added_projects WHERE path = ?1", rusqlite::params![path_str]);
            let _ = conn.execute("DELETE FROM sessions WHERE project_path = ?1", rusqlite::params![path_str]);
        }
    }
    Ok(())
}

fn get_branch_for_path(path: &Path) -> String {
    std::process::Command::new("git")
        .args(["-C", path.to_string_lossy().as_ref(), "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map(|out| {
            if out.status.success() {
                String::from_utf8_lossy(&out.stdout).trim().to_string()
            } else {
                "main".to_string()
            }
        })
        .unwrap_or_else(|_| "main".to_string())
}
