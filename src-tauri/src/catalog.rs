//! Catálogo persistente da sidebar em `~/.config/hydra/hydra-data.json`.
//!
//! Única fonte da lista da sidebar: `projectGroups`, `folderWorkspaces`, `repos`.
//! Rust é o único escritor (escrita atômica tmp + rename). Frontend nunca toca o arquivo.
//! SQLite continua dono de sessão/terminal; `added_projects` só é lida na migração one-shot.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Versão do envelope. Bump quando o schema mudar de forma incompatível.
pub const CATALOG_SCHEMA_VERSION: u32 = 1;

pub fn catalog_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not found".to_string())?;
    let dir = PathBuf::from(home).join(".config").join("hydra");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create ~/.config/hydra: {e}"))?;
    Ok(dir.join("hydra-data.json"))
}

/// Espelha `ProjectGroup` de `src/shared/project-group-types.ts`.
/// `connectionId`/`executionHostId` existem no schema mas sem função local (sempre null).
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CatalogProjectGroup {
    pub id: String,
    pub name: String,
    pub parent_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub connection_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub execution_host_id: Option<String>,
    pub parent_group_id: Option<String>,
    pub created_from: String,
    #[serde(default)]
    pub tab_order: i64,
    #[serde(default)]
    pub is_collapsed: bool,
    pub color: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Espelha `FolderWorkspace` de `src/shared/folder-workspace-types.ts` (campos de catálogo).
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CatalogFolderWorkspace {
    pub id: String,
    pub project_group_id: String,
    pub name: String,
    pub folder_path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub connection_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub execution_host_id: Option<String>,
    #[serde(default)]
    pub sort_order: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Subconjunto de `Repo` de `src/shared/repo-types.ts` relevante ao catálogo local.
/// Campos remotos/SSH ficam ausentes (None) até terem função.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CatalogRepo {
    pub id: String,
    pub path: String,
    pub display_name: String,
    pub added_at: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub worktree_base_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub project_group_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repo_icon: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub imported_external_worktree_paths: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub external_worktree_discovery_suppressed_at: Option<i64>,
}

/// Envelope do arquivo. Só as três listas têm função.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct CatalogEnvelope {
    #[serde(default = "default_schema_version")]
    pub schema_version: u32,
    #[serde(default)]
    pub project_groups: Vec<CatalogProjectGroup>,
    #[serde(default)]
    pub folder_workspaces: Vec<CatalogFolderWorkspace>,
    #[serde(default)]
    pub repos: Vec<CatalogRepo>,
}

fn default_schema_version() -> u32 {
    CATALOG_SCHEMA_VERSION
}

impl CatalogEnvelope {
    pub fn empty() -> Self {
        Self {
            schema_version: CATALOG_SCHEMA_VERSION,
            project_groups: Vec::new(),
            folder_workspaces: Vec::new(),
            repos: Vec::new(),
        }
    }
}

pub fn read_catalog() -> CatalogEnvelope {
    let path = match catalog_path() {
        Ok(p) => p,
        Err(_) => return CatalogEnvelope::empty(),
    };
    let raw = match std::fs::read_to_string(&path) {
        Ok(s) => s,
        Err(_) => return CatalogEnvelope::empty(),
    };
    serde_json::from_str::<CatalogEnvelope>(&raw).unwrap_or_default()
}

/// Escrita atômica: grava em arquivo temporário no mesmo diretório e renomeia.
pub fn write_catalog(envelope: &CatalogEnvelope) -> Result<(), String> {
    let path = catalog_path()?;
    let tmp = path.with_extension("json.tmp");
    let raw = serde_json::to_string_pretty(envelope)
        .map_err(|e| format!("Failed to serialize catalog: {e}"))?;
    std::fs::write(&tmp, raw).map_err(|e| format!("Failed to write catalog tmp: {e}"))?;
    std::fs::rename(&tmp, &path).map_err(|e| format!("Failed to commit catalog: {e}"))?;
    Ok(())
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Normaliza path para comparação: `/` como separador, sem trailing slash.
pub fn normalize_catalog_path(path: &str) -> String {
    let mut s = path.replace('\\', "/");
    while s.ends_with('/') && s.len() > 1 {
        s.pop();
    }
    s
}

fn new_id() -> String {
    // uuid simples sem dependência nova: 16 bytes hex do relógio + pid + contador.
    use std::sync::atomic::{AtomicU64, Ordering};
    static CTR: AtomicU64 = AtomicU64::new(0);
    let n = CTR.fetch_add(1, Ordering::Relaxed);
    let t = now_ms() as u64;
    let pid = std::process::id() as u64;
    format!("{t:013x}-{pid:08x}-{n:08x}")
}

/// Adiciona pasta ao catálogo (T-A2 usa esta função via comando).
/// - Se o path já existe como repo ou folderWorkspace: retorna o envelope inalterado.
/// - Se tem `.git`: cria `Repo{kind:git}` direto, sem grupo.
/// - Senão: cria 1 `ProjectGroup{createdFrom:folder-scan}` + 1 `FolderWorkspace`
///   + 1 `Repo` por subdir imediato com `.git` (máx 20, ordenado), com dedupe.
pub fn add_folder_to_catalog(path: &str, envelope: &mut CatalogEnvelope) -> Result<(), String> {
    use std::path::PathBuf as PB;
    let norm = normalize_catalog_path(path);
    if norm.is_empty() {
        return Err("Empty path".to_string());
    }
    let known_repos: std::collections::HashSet<String> =
        envelope.repos.iter().map(|r| normalize_catalog_path(&r.path)).collect();
    let known_folders: std::collections::HashSet<String> = envelope
        .folder_workspaces
        .iter()
        .map(|w| normalize_catalog_path(&w.folder_path))
        .collect();
    if known_repos.contains(&norm) || known_folders.contains(&norm) {
        return Ok(());
    }
    let dir = PB::from(&norm);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }
    let now = now_ms();
    if dir.join(".git").exists() {
        let name = dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("repo")
            .to_string();
        envelope.repos.push(CatalogRepo {
            id: new_id(),
            path: norm,
            display_name: name,
            added_at: now,
            kind: Some("git".to_string()),
            worktree_base_path: None,
            project_group_id: None,
            repo_icon: None,
            imported_external_worktree_paths: None,
            external_worktree_discovery_suppressed_at: None,
        });
        return Ok(());
    }
    let group_id = new_id();
    let folder_name = dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("folder")
        .to_string();
    envelope.project_groups.push(CatalogProjectGroup {
        id: group_id.clone(),
        name: folder_name.clone(),
        parent_path: Some(norm.clone()),
        connection_id: None,
        execution_host_id: None,
        parent_group_id: None,
        created_from: "folder-scan".to_string(),
        tab_order: 0,
        is_collapsed: false,
        color: None,
        created_at: now,
        updated_at: now,
    });
    envelope.folder_workspaces.push(CatalogFolderWorkspace {
        id: new_id(),
        project_group_id: group_id.clone(),
        name: format!("{folder_name} workspace"),
        folder_path: norm.clone(),
        connection_id: None,
        execution_host_id: None,
        sort_order: now,
        created_at: now,
        updated_at: now,
    });
    let mut sub_repos: Vec<PB> = std::fs::read_dir(&dir)
        .map_err(|e| format!("Failed to scan folder: {e}"))?
        .flatten()
        .map(|e| e.path())
        .filter(|sub| sub.is_dir() && sub.join(".git").exists())
        .collect();
    sub_repos.sort();
    for sub in sub_repos.into_iter().take(20) {
        let sub_str = sub.to_string_lossy().to_string();
        let sub_norm = normalize_catalog_path(&sub_str);
        if known_repos.contains(&sub_norm)
            || envelope
                .repos
                .iter()
                .any(|r| normalize_catalog_path(&r.path) == sub_norm)
        {
            continue;
        }
        let name = sub
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("repo")
            .to_string();
        envelope.repos.push(CatalogRepo {
            id: new_id(),
            path: sub_norm,
            display_name: name,
            added_at: now,
            kind: Some("git".to_string()),
            worktree_base_path: None,
            project_group_id: Some(group_id.clone()),
            repo_icon: None,
            imported_external_worktree_paths: None,
            external_worktree_discovery_suppressed_at: None,
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_missing_file_returns_empty() {
        let env = CatalogEnvelope::empty();
        assert_eq!(env.schema_version, CATALOG_SCHEMA_VERSION);
        assert!(env.project_groups.is_empty());
        assert!(env.repos.is_empty());
    }

    #[test]
    fn catalog_roundtrip_preserves_folder_scan() {
        let g = CatalogProjectGroup {
            id: "g1".to_string(),
            name: "code".to_string(),
            parent_path: Some("/x/code".to_string()),
            connection_id: None,
            execution_host_id: None,
            parent_group_id: None,
            created_from: "folder-scan".to_string(),
            tab_order: 0,
            is_collapsed: false,
            color: None,
            created_at: 1,
            updated_at: 2,
        };
        let env = CatalogEnvelope {
            schema_version: 1,
            project_groups: vec![g],
            folder_workspaces: Vec::new(),
            repos: Vec::new(),
        };
        let raw = serde_json::to_string(&env).unwrap();
        let back: CatalogEnvelope = serde_json::from_str(&raw).unwrap();
        assert_eq!(back.project_groups[0].created_from, "folder-scan");
        assert_eq!(back.project_groups[0].parent_path.as_deref(), Some("/x/code"));
    }

    #[test]
    fn add_folder_idempotent_for_existing_repo() {
        let mut env = CatalogEnvelope::empty();
        env.repos.push(CatalogRepo {
            id: "r1".to_string(),
            path: "/x/repo".to_string(),
            display_name: "repo".to_string(),
            added_at: 1,
            kind: Some("git".to_string()),
            worktree_base_path: None,
            project_group_id: None,
            repo_icon: None,
            imported_external_worktree_paths: None,
            external_worktree_discovery_suppressed_at: None,
        });
        add_folder_to_catalog("/x/repo/", &mut env).unwrap();
        assert_eq!(env.repos.len(), 1);
        assert!(env.project_groups.is_empty());
    }

    #[test]
    fn add_git_dir_creates_repo_without_group() {
        let dir = std::env::temp_dir().join("hydra-catalog-test-repo");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join(".git")).unwrap();
        let mut env = CatalogEnvelope::empty();
        add_folder_to_catalog(dir.to_str().unwrap(), &mut env).unwrap();
        assert_eq!(env.repos.len(), 1);
        assert!(env.project_groups.is_empty());
        assert_eq!(env.repos[0].kind.as_deref(), Some("git"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn add_plain_folder_creates_group_workspace_and_child_repos() {
        let base = std::env::temp_dir().join("hydra-catalog-test-folder");
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(base.join("a").join(".git")).unwrap();
        std::fs::create_dir_all(base.join("b").join(".git")).unwrap();
        std::fs::create_dir_all(base.join("plain")).unwrap();
        let mut env = CatalogEnvelope::empty();
        add_folder_to_catalog(base.to_str().unwrap(), &mut env).unwrap();
        assert_eq!(env.project_groups.len(), 1);
        assert_eq!(env.project_groups[0].created_from, "folder-scan");
        assert_eq!(env.folder_workspaces.len(), 1);
        // só a e b têm .git
        assert_eq!(env.repos.len(), 2);
        // segunda chamada não duplica
        add_folder_to_catalog(base.to_str().unwrap(), &mut env).unwrap();
        assert_eq!(env.project_groups.len(), 1);
        assert_eq!(env.repos.len(), 2);
        let _ = std::fs::remove_dir_all(&base);
    }
}
