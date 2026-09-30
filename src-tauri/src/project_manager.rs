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
    /// Orca `Repo.repoIcon`: saved glyph, or a GitHub owner avatar when none is saved.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repo_icon: Option<serde_json::Value>,
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
                                repo_icon: None,
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
                        repo_icon: None,
                    });
                }
            }
        }
    }
    let mut finished = if expanded.len() != projects.len() {
        expanded
    } else {
        projects
    };
    attach_repo_icons(&mut finished);
    finished
}

fn normalize_project_path(path: &str) -> String {
    let mut s = path.replace('\\', "/");
    while s.ends_with('/') && s.len() > 1 {
        s.pop();
    }
    s
}

/// Saved Orca sidebar glyphs, keyed by repo path. Custom uploads (the Hydra mark)
/// live here. GitHub avatars are only the fallback for a repo the user added,
/// never for a git dir discovered inside a folder workspace.
fn orca_repo_icons_by_path() -> std::collections::HashMap<String, serde_json::Value> {
    let mut map = std::collections::HashMap::new();
    let Ok(home) = std::env::var("HOME") else {
        return map;
    };
    let path = PathBuf::from(home)
        .join(".config")
        .join("orca")
        .join("profiles")
        .join("local-default")
        .join("orca-data.json");
    let Ok(text) = std::fs::read_to_string(path) else {
        return map;
    };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) else {
        return map;
    };
    for key in ["repos", "projects"] {
        let Some(entries) = value.get(key).and_then(|entry| entry.as_array()) else {
            continue;
        };
        for entry in entries {
            let Some(repo_path) = entry.get("path").and_then(|p| p.as_str()) else {
                continue;
            };
            let Some(icon) = entry.get("repoIcon").filter(|icon| !icon.is_null()) else {
                continue;
            };
            map.insert(normalize_project_path(repo_path), icon.clone());
        }
    }
    map
}

fn github_slug_from_remote(url: &str) -> Option<(String, String)> {
    let url = url.trim().trim_end_matches('/');
    let path = if let Some(rest) = url.strip_prefix("git@github.com:") {
        rest
    } else if let Some(rest) = url.strip_prefix("ssh://git@github.com/") {
        rest
    } else if let Some(rest) = url.strip_prefix("https://github.com/") {
        rest
    } else if let Some(rest) = url.strip_prefix("http://github.com/") {
        rest
    } else {
        return None;
    };
    let path = path.trim_end_matches(".git");
    let mut parts = path.split('/');
    let owner = parts.next()?.trim();
    let repo = parts.next()?.trim();
    if owner.is_empty() || repo.is_empty() {
        return None;
    }
    if !owner
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return None;
    }
    Some((owner.to_string(), repo.to_string()))
}

fn git_remote_slug(repo_path: &str, remote: &str) -> Option<(String, String)> {
    let output = std::process::Command::new("git")
        .arg("-C")
        .arg(repo_path)
        .args(["remote", "get-url", remote])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let url = String::from_utf8(output.stdout).ok()?;
    github_slug_from_remote(&url)
}

/// Same-name fork keeps the upstream owner. A renamed fork is its own project
/// and keeps `origin`. No upstream remote falls back to `origin`.
fn github_avatar_slug(repo_path: &str) -> Option<(String, String)> {
    let origin = git_remote_slug(repo_path, "origin")?;
    match git_remote_slug(repo_path, "upstream") {
        Some(upstream) if upstream.1.eq_ignore_ascii_case(&origin.1) => Some(upstream),
        _ => Some(origin),
    }
}

fn github_avatar_icon(repo_path: &str) -> Option<serde_json::Value> {
    let (owner, repo) = github_avatar_slug(repo_path)?;
    Some(serde_json::json!({
        "type": "image",
        "src": format!("https://github.com/{owner}.png?size=64"),
        "source": "github",
        "label": format!("{owner}/{repo}"),
    }))
}

/// A git repo found by scanning a folder the user added. Orca keeps the glyph
/// on that folder, not on each child, so these rows stay on the folder mark.
fn is_discovered_folder_child(project: &HydraProject, projects: &[HydraProject]) -> bool {
    let key = normalize_project_path(&project.path);
    projects.iter().any(|parent| {
        if parent.is_git {
            return false;
        }
        let root = normalize_project_path(&parent.path);
        root != key && key.starts_with(&(root + "/"))
    })
}

fn attach_repo_icons(projects: &mut [HydraProject]) {
    let saved = orca_repo_icons_by_path();
    let discovered: Vec<bool> = projects
        .iter()
        .map(|project| is_discovered_folder_child(project, projects))
        .collect();
    for (project, discovered) in projects.iter_mut().zip(discovered) {
        if discovered {
            project.repo_icon = None;
            continue;
        }
        let key = normalize_project_path(&project.path);
        project.repo_icon = saved.get(&key).cloned().or_else(|| {
            if project.is_git {
                github_avatar_icon(&project.path)
            } else {
                None
            }
        });
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

    let mut project = HydraProject {
        id: format!("proj_{name}"),
        name,
        path: path_str.to_string(),
        is_git,
        current_branch: branch,
        worktree_base_path: existing_base,
        imported_worktrees: None,
        suppressed_discovery: None,
        repo_icon: None,
    };
    attach_repo_icons(std::slice::from_mut(&mut project));
    Ok(project)
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
