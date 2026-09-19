use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HydraProject {
    pub id: String,
    pub name: String,
    pub path: String,
    pub is_git: bool,
    pub current_branch: String,
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

            if let Ok(mut stmt) = conn.prepare("SELECT path, name FROM added_projects ORDER BY added_at DESC") {
                if let Ok(rows) = stmt.query_map(rusqlite::params![], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
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
                            });
                        }
                    }
                }
            }
        }
    }

    projects
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

    // Persiste no SQLite como projeto adicionado pelo usuário
    if let Ok(home) = std::env::var("HOME") {
        let db_path = PathBuf::from(home).join(".config").join("hydra").join("hydra_sessions.sqlite3");
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            let _ = conn.execute(
                "INSERT OR REPLACE INTO added_projects (path, name, added_at) VALUES (?1, ?2, ?3)",
                rusqlite::params![path_str, name, now],
            );
        }
    }

    Ok(HydraProject {
        id: format!("proj_{name}"),
        name,
        path: path_str.to_string(),
        is_git,
        current_branch: branch,
    })
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
