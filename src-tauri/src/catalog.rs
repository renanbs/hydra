//! Catálogo persistente da sidebar em `~/.config/hydra/hydra-data.json`.
//!
//! Única fonte da lista da sidebar: `projectGroups`, `folderWorkspaces`, `repos`.
//! Rust é o único escritor (escrita atômica tmp + rename). Frontend nunca toca o arquivo.
//! SQLite continua dono de sessão/terminal; `added_projects` só é lida na migração one-shot.

use crate::db::{CustomWorktreeSource, SourcePreferences};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Versão do envelope. Bump quando o schema mudar de forma incompatível.
pub const CATALOG_SCHEMA_VERSION: u32 = 1;

/// Orca `MAX_CUSTOM_WORKTREE_VISIBILITY_SOURCES`.
pub const MAX_CUSTOM_WORKTREE_VISIBILITY_SOURCES: usize = 32;
const MAX_SOURCE_ID_LENGTH: usize = 128;
const MAX_SOURCE_PATH_LENGTH: usize = 4096;

/// Orca `BUILT_IN_WORKTREE_VISIBILITY_SOURCES` ids, in matcher order.
pub const BUILT_IN_WORKTREE_VISIBILITY_SOURCE_IDS: &[&str] = &["claude", "gsd"];

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
    /// Epoch-ms when the user suppressed discovered-worktree discovery for this
    /// repo (Orca `externalWorktreeDiscoverySuppressedAt`). Serialized even when
    /// `null`, so clearing the stamp (Show outside the listed sources) is
    /// distinguishable in the file and the inbox gate can reopen.
    #[serde(default)]
    pub external_worktree_discovery_suppressed_at: Option<i64>,
    /// Paths the user confirmed as intentionally hidden (Orca
    /// `externalWorktreeInboxBaselinePaths`). Serialized even when `null` so the
    /// frontend can distinguish "unset" from "cleared".
    #[serde(default)]
    pub external_worktree_inbox_baseline_paths: Option<Vec<String>>,
    /// Epoch-ms when the user dismissed the discovered-worktree prompt (Orca
    /// `externalWorktreeVisibilityPromptDismissedAt`). Serialized even when `null`.
    #[serde(default)]
    pub external_worktree_visibility_prompt_dismissed_at: Option<i64>,
    /// Orca `externalWorktreeVisibility`: per-repo override (`show`|`hide`) of the
    /// external-worktree policy. `None` (absent/`null`) means "no override" — the
    /// global `worktree_visibility_defaults.external` then decides. Serialized
    /// even when `null`, like the phase fields above.
    #[serde(default)]
    pub external_worktree_visibility: Option<String>,
    /// Orca `externalWorktreeVisibilityLegacy`. `None` (absent/`null`) means
    /// "unset" and resolves to `true`: an old repo, the old rule applied
    /// (`isLegacyRepoForExternalWorktreeVisibility`). Serialized even when `null`
    /// so the frontend can tell "unset" from an explicit `false`.
    #[serde(default)]
    pub external_worktree_visibility_legacy: Option<bool>,
    /// Orca `customWorktreeVisibilitySources`: absolute roots this repo treats as
    /// worktree sources. `None` = the repo has no own list, so the global
    /// `worktree_visibility_defaults.customSources` is the fallback; `Some([])` is
    /// an explicit empty list and supersedes the global one.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_worktree_visibility_sources: Option<Vec<CustomWorktreeSource>>,
    /// Orca `worktreeVisibilitySourcePreferences` scoped to this repo
    /// (`builtIn`/`custom` → `show`|`hide`). Wins over the global defaults.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub worktree_visibility_source_preferences: Option<SourcePreferences>,
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

/// Linha de `added_projects` lida para a migração one-shot.
pub struct AddedProjectRow {
    pub path: String,
    pub name: String,
    pub added_at: i64,
    pub worktree_base_path: Option<String>,
    pub imported_worktrees: Option<Vec<String>>,
    pub suppressed_discovery: Option<bool>,
}

/// Migração one-shot: importa linhas de `added_projects` para o envelope.
/// - Linha git: vira `Repo{kind:git}` com base/imports/suppress mapeados.
/// - Linha não-git (Jev rescan): cria grupo `folder-scan` + workspace e
///   re-scaneia filhos `.git` (mesma regra de `add_folder_to_catalog`).
/// Idempotente: linhas cujo path já existe no envelope são puladas.
pub fn migrate_added_projects(rows: Vec<AddedProjectRow>, envelope: &mut CatalogEnvelope) {
    for row in rows {
        let norm = normalize_catalog_path(&row.path);
        let already = envelope
            .repos
            .iter()
            .any(|r| normalize_catalog_path(&r.path) == norm)
            || envelope
                .folder_workspaces
                .iter()
                .any(|w| normalize_catalog_path(&w.folder_path) == norm);
        if already {
            continue;
        }
        let is_git = std::path::Path::new(&norm).join(".git").exists();
        if is_git {
            envelope.repos.push(CatalogRepo {
                id: new_id(),
                path: norm,
                display_name: row.name,
                added_at: row.added_at,
                kind: Some("git".to_string()),
                worktree_base_path: row.worktree_base_path.filter(|s| !s.trim().is_empty()),
                project_group_id: None,
                repo_icon: None,
                imported_external_worktree_paths: row.imported_worktrees,
                external_worktree_discovery_suppressed_at: row
                    .suppressed_discovery
                    .filter(|&v| v)
                    .map(|_| now_ms()),
                external_worktree_inbox_baseline_paths: None,
                external_worktree_visibility_prompt_dismissed_at: None,
                // Legacy rows carry no visibility config: the old rule applied.
                external_worktree_visibility: None,
                external_worktree_visibility_legacy: None,
                custom_worktree_visibility_sources: None,
                worktree_visibility_source_preferences: None,
            });
        } else {
            // Reaproveita o caminho de pasta: grupo + workspace + filhos com dedupe.
            // Base/imports do pai são herdados pelos filhos via add_folder; aplica
            // worktree_base_path do pai nos filhos criados nesta passada.
            let before = envelope.repos.len();
            if add_folder_to_catalog(&norm, envelope).is_ok() {
                if let Some(base) = row.worktree_base_path.filter(|s| !s.trim().is_empty()) {
                    for r in envelope.repos.iter_mut().skip(before) {
                        r.worktree_base_path = Some(base.clone());
                    }
                }
                if let Some(imports) = row.imported_worktrees {
                    for r in envelope.repos.iter_mut().skip(before) {
                        r.imported_external_worktree_paths = Some(imports.clone());
                    }
                }
                if row.suppressed_discovery == Some(true) {
                    let t = now_ms();
                    for r in envelope.repos.iter_mut().skip(before) {
                        r.external_worktree_discovery_suppressed_at = Some(t);
                    }
                }
            }
        }
    }
}

/// Lê `added_projects` do SQLite para a migração one-shot.
/// Tabela mantida para rollback; após migrar, o catálogo nunca mais a lê.
fn read_added_project_rows() -> Vec<AddedProjectRow> {
    let mut rows = Vec::new();
    let Ok(home) = std::env::var("HOME") else {
        return rows;
    };
    let db_path =
        std::path::PathBuf::from(home).join(".config").join("hydra").join("hydra_sessions.sqlite3");
    let Ok(conn) = rusqlite::Connection::open(&db_path) else {
        return rows;
    };
    let Ok(mut stmt) = conn.prepare(
        "SELECT path, name, added_at, worktree_base_path, imported_worktrees, suppressed_discovery FROM added_projects ORDER BY added_at DESC",
    ) else {
        return rows;
    };
    let mapped = stmt.query_map(rusqlite::params![], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<String>>(4)?,
            row.get::<_, Option<i64>>(5)?,
        ))
    });
    let Ok(mapped) = mapped else { return rows; };
    for r in mapped.flatten() {
        // Só migra paths que ainda existem no disco.
        if !std::path::Path::new(&r.0).exists() {
            continue;
        }
        rows.push(AddedProjectRow {
            path: r.0,
            name: r.1,
            added_at: r.2,
            worktree_base_path: r.3.filter(|s| !s.trim().is_empty()),
            imported_worktrees: r.4.and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok()),
            suppressed_discovery: r.5.map(|v| v != 0),
        });
    }
    rows
}

/// Migração one-shot: se o arquivo não existe mas há linhas no SQLite,
/// importa e grava. Chamado no início de `read_catalog`.
fn migrate_once_if_needed() {
    let path = match catalog_path() {
        Ok(p) => p,
        Err(_) => return,
    };
    if path.exists() {
        return;
    }
    let rows = read_added_project_rows();
    if rows.is_empty() {
        return;
    }
    let mut envelope = CatalogEnvelope::empty();
    migrate_added_projects(rows, &mut envelope);
    let _ = write_catalog(&envelope);
}

pub fn read_catalog() -> CatalogEnvelope {
    migrate_once_if_needed();
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
            external_worktree_inbox_baseline_paths: None,
            external_worktree_visibility_prompt_dismissed_at: None,
            external_worktree_visibility: None,
            external_worktree_visibility_legacy: None,
            custom_worktree_visibility_sources: None,
            worktree_visibility_source_preferences: None,
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
            external_worktree_inbox_baseline_paths: None,
            external_worktree_visibility_prompt_dismissed_at: None,
            external_worktree_visibility: None,
            external_worktree_visibility_legacy: None,
            custom_worktree_visibility_sources: None,
            worktree_visibility_source_preferences: None,
        });
    }
    Ok(())
}

/// Applies the external-worktree inbox state to the repo at `repo_path`
/// (normalized). An unknown path is an error instead of a silent no-op, so a
/// caller can never believe it persisted state that went nowhere.
pub fn set_external_worktree_visibility(
    envelope: &mut CatalogEnvelope,
    repo_path: &str,
    baseline_paths: Option<Vec<String>>,
    prompt_dismissed_at: Option<i64>,
) -> Result<(), String> {
    let norm = normalize_catalog_path(repo_path);
    if norm.is_empty() {
        return Err("Empty path".to_string());
    }
    let repo = find_repo_mut(envelope, &norm, repo_path)?;
    repo.external_worktree_inbox_baseline_paths = baseline_paths;
    repo.external_worktree_visibility_prompt_dismissed_at = prompt_dismissed_at;
    Ok(())
}

fn find_repo_mut<'a>(
    envelope: &'a mut CatalogEnvelope,
    normalized: &str,
    original: &str,
) -> Result<&'a mut CatalogRepo, String> {
    envelope
        .repos
        .iter_mut()
        .find(|r| normalize_catalog_path(&r.path) == normalized)
        .ok_or_else(|| format!("Repo not found in catalog: {original}"))
}

/// Orca `normalizeCustomWorktreeVisibilitySources`: drop invalid ids, non-absolute
/// or blank roots, duplicate ids/roots, and cap at
/// `MAX_CUSTOM_WORKTREE_VISIBILITY_SOURCES`.
pub fn normalize_worktree_visibility_sources(
    value: &[CustomWorktreeSource],
) -> Vec<CustomWorktreeSource> {
    let mut ids = std::collections::HashSet::new();
    let mut roots = std::collections::HashSet::new();
    let mut normalized = Vec::new();
    for candidate in value {
        if normalized.len() >= MAX_CUSTOM_WORKTREE_VISIBILITY_SOURCES {
            break;
        }
        if !is_valid_source_id(&candidate.id) {
            continue;
        }
        let Some(root_path) = normalize_source_root_path(&candidate.root_path) else {
            continue;
        };
        let root_key = normalize_catalog_path(&root_path);
        if ids.contains(&candidate.id) || roots.contains(&root_key) {
            continue;
        }
        ids.insert(candidate.id.clone());
        roots.insert(root_key);
        normalized.push(CustomWorktreeSource {
            id: candidate.id.clone(),
            root_path,
        });
    }
    normalized
}

fn is_valid_source_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_SOURCE_ID_LENGTH
        && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}

/// Orca `normalizeSourceRootPath`: trim, reject blank/NUL/UNC-single-slash, and
/// require an absolute path (POSIX, UNC, or drive-qualified).
fn normalize_source_root_path(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty()
        || trimmed.len() > MAX_SOURCE_PATH_LENGTH
        || trimmed.contains('\0')
        || (trimmed.starts_with('\\') && !trimmed.starts_with("\\\\"))
        || !is_absolute_source_root(trimmed)
    {
        return None;
    }
    Some(trimmed.to_string())
}

fn is_absolute_source_root(path: &str) -> bool {
    path.starts_with('/')
        || path.starts_with("\\\\")
        || (path.len() >= 3
            && path.as_bytes()[1] == b':'
            && (path.as_bytes()[2] == b'/' || path.as_bytes()[2] == b'\\'))
}

fn normalize_visibility(value: &str) -> Option<String> {
    match value {
        "show" | "hide" => Some(value.to_string()),
        _ => None,
    }
}

/// Orca `normalizeWorktreeVisibilitySourcePreferences`: only the built-in source
/// ids in `builtIn`, only `show`/`hide` values, `custom` keys that are valid
/// source ids (capped).
pub fn normalize_worktree_visibility_source_preferences(
    value: &SourcePreferences,
) -> SourcePreferences {
    let built_in = value
        .built_in
        .as_ref()
        .map(|prefs| {
            prefs
                .iter()
                .filter(|(id, visibility)| {
                    BUILT_IN_WORKTREE_VISIBILITY_SOURCE_IDS.contains(&id.as_str())
                        && normalize_visibility(visibility).is_some()
                })
                .map(|(id, visibility)| (id.clone(), visibility.clone()))
                .collect()
        })
        .unwrap_or_default();
    let custom = value
        .custom
        .as_ref()
        .map(|prefs| {
            prefs
                .iter()
                .filter(|(id, visibility)| {
                    is_valid_source_id(id) && normalize_visibility(visibility).is_some()
                })
                .take(MAX_CUSTOM_WORKTREE_VISIBILITY_SOURCES)
                .map(|(id, visibility)| (id.clone(), visibility.clone()))
                .collect()
        })
        .unwrap_or_default();
    SourcePreferences {
        built_in: Some(built_in),
        custom: Some(custom),
    }
}

/// Applies the per-repo worktree-visibility config written by the visibility
/// dialog (`WorktreeVisibilityDialog`). Full replace: every argument is the
/// desired state, and `None` clears it. Unknown path is an error, like
/// `set_external_worktree_visibility`.
pub fn set_worktree_visibility_sources(
    envelope: &mut CatalogEnvelope,
    repo_path: &str,
    custom_sources: Option<Vec<CustomWorktreeSource>>,
    source_preferences: Option<SourcePreferences>,
    external_worktree_visibility: Option<String>,
    external_worktree_visibility_legacy: Option<bool>,
    external_worktree_discovery_suppressed_at: Option<i64>,
) -> Result<(), String> {
    let norm = normalize_catalog_path(repo_path);
    if norm.is_empty() {
        return Err("Empty path".to_string());
    }
    let repo = find_repo_mut(envelope, &norm, repo_path)?;
    repo.custom_worktree_visibility_sources =
        custom_sources.map(|sources| normalize_worktree_visibility_sources(&sources));
    repo.worktree_visibility_source_preferences =
        source_preferences.map(|prefs| normalize_worktree_visibility_source_preferences(&prefs));
    repo.external_worktree_visibility = external_worktree_visibility
        .as_deref()
        .and_then(normalize_visibility);
    repo.external_worktree_visibility_legacy = external_worktree_visibility_legacy;
    // Orca un-suppresses discovery when the user chooses Show outside the listed
    // sources: `None` clears the stamp (writes `null`), `Some(ts)` writes it.
    repo.external_worktree_discovery_suppressed_at = external_worktree_discovery_suppressed_at;
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
            external_worktree_inbox_baseline_paths: None,
            external_worktree_visibility_prompt_dismissed_at: None,
            external_worktree_visibility: None,
            external_worktree_visibility_legacy: None,
            custom_worktree_visibility_sources: None,
            worktree_visibility_source_preferences: None,
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
    #[test]
    fn migrate_git_row_maps_fields() {
        let dir = std::env::temp_dir().join("hydra-catalog-mig-repo");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join(".git")).unwrap();
        let mut env = CatalogEnvelope::empty();
        migrate_added_projects(
            vec![AddedProjectRow {
                path: dir.to_str().unwrap().to_string(),
                name: "repo".to_string(),
                added_at: 7,
                worktree_base_path: Some("/b".to_string()),
                imported_worktrees: Some(vec!["/x".to_string()]),
                suppressed_discovery: Some(true),
            }],
            &mut env,
        );
        assert_eq!(env.repos.len(), 1);
        assert_eq!(env.repos[0].worktree_base_path.as_deref(), Some("/b"));
        assert!(env.project_groups.is_empty());
        migrate_added_projects(
            vec![AddedProjectRow {
                path: dir.to_str().unwrap().to_string(),
                name: "repo".to_string(),
                added_at: 7,
                worktree_base_path: None,
                imported_worktrees: None,
                suppressed_discovery: None,
            }],
            &mut env,
        );
        assert_eq!(env.repos.len(), 1);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn migrate_folder_row_rescans_children() {
        let base = std::env::temp_dir().join("hydra-catalog-mig-folder");
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(base.join("a").join(".git")).unwrap();
        let mut env = CatalogEnvelope::empty();
        migrate_added_projects(
            vec![AddedProjectRow {
                path: base.to_str().unwrap().to_string(),
                name: "code".to_string(),
                added_at: 9,
                worktree_base_path: None,
                imported_worktrees: None,
                suppressed_discovery: None,
            }],
            &mut env,
        );
        assert_eq!(env.project_groups.len(), 1);
        assert_eq!(env.project_groups[0].created_from, "folder-scan");
        assert_eq!(env.repos.len(), 1);
        let _ = std::fs::remove_dir_all(&base);
    }

    fn repo_at(path: &str) -> CatalogRepo {
        CatalogRepo {
            id: "r1".to_string(),
            path: path.to_string(),
            display_name: "repo".to_string(),
            added_at: 1,
            kind: Some("git".to_string()),
            worktree_base_path: None,
            project_group_id: None,
            repo_icon: None,
            imported_external_worktree_paths: None,
            external_worktree_discovery_suppressed_at: None,
            external_worktree_inbox_baseline_paths: None,
            external_worktree_visibility_prompt_dismissed_at: None,
            external_worktree_visibility: None,
            external_worktree_visibility_legacy: None,
            custom_worktree_visibility_sources: None,
            worktree_visibility_source_preferences: None,
        }
    }

    #[test]
    fn set_external_worktree_visibility_roundtrips_fields() {
        let mut env = CatalogEnvelope::empty();
        // The caller passes an un-normalized path (trailing slash) — the setter
        // must match the normalized repo.
        env.repos.push(repo_at("/x/repo"));

        set_external_worktree_visibility(
            &mut env,
            "/x/repo/",
            Some(vec!["/x/repo-a".to_string(), "/x/repo-b".to_string()]),
            Some(1_700_000_000_000),
        )
        .expect("known repo updates");

        // Persist and read back through the same serde layer the catalog file uses.
        let raw = serde_json::to_string(&env).expect("serialize");
        let back: CatalogEnvelope = serde_json::from_str(&raw).expect("deserialize");
        let repo = &back.repos[0];
        assert_eq!(
            repo.external_worktree_inbox_baseline_paths.as_ref(),
            Some(&vec!["/x/repo-a".to_string(), "/x/repo-b".to_string()])
        );
        assert_eq!(repo.external_worktree_visibility_prompt_dismissed_at, Some(1_700_000_000_000));
        // Frontend reads these exact keys, present even when `null`.
        assert!(raw.contains("\"externalWorktreeInboxBaselinePaths\""));
        assert!(raw.contains("\"externalWorktreeVisibilityPromptDismissedAt\""));
    }

    #[test]
    fn set_external_worktree_visibility_unknown_path_errors() {
        let mut env = CatalogEnvelope::empty();
        env.repos.push(repo_at("/x/repo"));
        let err = set_external_worktree_visibility(&mut env, "/x/nope", None, None)
            .expect_err("unknown path must error");
        assert!(err.contains("/x/nope"), "error must name the unknown path: {err}");
        assert!(err.contains("not found"), "error must be explicit: {err}");
        // The known repo is untouched.
        assert!(env.repos[0].external_worktree_inbox_baseline_paths.is_none());
    }

    fn source(id: &str, root_path: &str) -> CustomWorktreeSource {
        CustomWorktreeSource {
            id: id.to_string(),
            root_path: root_path.to_string(),
        }
    }

    fn prefs(
        built_in: &[(&str, &str)],
        custom: &[(&str, &str)],
    ) -> SourcePreferences {
        SourcePreferences {
            built_in: Some(
                built_in
                    .iter()
                    .map(|(id, v)| (id.to_string(), v.to_string()))
                    .collect(),
            ),
            custom: Some(
                custom
                    .iter()
                    .map(|(id, v)| (id.to_string(), v.to_string()))
                    .collect(),
            ),
        }
    }

    #[test]
    fn set_worktree_visibility_sources_roundtrips_and_normalizes() {
        let mut env = CatalogEnvelope::empty();
        // Un-normalized path (trailing slash) still matches the repo.
        env.repos.push(repo_at("/x/repo"));

        set_worktree_visibility_sources(
            &mut env,
            "/x/repo/",
            Some(vec![
                source("s1", "/worktrees"),
                source("s1", "/dup-id"),      // duplicate id → dropped
                source("s2", "relative/path"), // not absolute → dropped
                source("bad id", "/nope"),     // invalid id → dropped
                source("s3", "/worktrees/"),   // duplicate root (normalized) → dropped
            ]),
            Some(prefs(
                &[("claude", "show"), ("gsd", "maybe"), ("nope", "show")],
                &[("s1", "hide"), ("s2", "maybe")],
            )),
            Some("show".to_string()),
            Some(false),
            Some(1_700_000_000_000),
        )
        .expect("known repo updates");

        // Persist and read back through the same serde layer the catalog file uses.
        let raw = serde_json::to_string(&env).expect("serialize");
        let back: CatalogEnvelope = serde_json::from_str(&raw).expect("deserialize");
        let repo = &back.repos[0];

        let sources = repo
            .custom_worktree_visibility_sources
            .as_ref()
            .expect("custom sources persisted");
        assert_eq!(sources.len(), 1, "invalid/duplicate sources dropped: {sources:?}");
        assert_eq!(sources[0].id, "s1");
        assert_eq!(sources[0].root_path, "/worktrees");

        let preferences = repo
            .worktree_visibility_source_preferences
            .as_ref()
            .expect("source preferences persisted");
        let built_in = preferences.built_in.as_ref().expect("builtIn map");
        assert_eq!(built_in.get("claude").map(String::as_str), Some("show"));
        assert_eq!(built_in.len(), 1, "unknown built-in id/value dropped: {built_in:?}");
        let custom = preferences.custom.as_ref().expect("custom map");
        assert_eq!(custom.get("s1").map(String::as_str), Some("hide"));
        assert_eq!(custom.len(), 1, "invalid custom value dropped: {custom:?}");

        assert_eq!(repo.external_worktree_visibility.as_deref(), Some("show"));
        assert_eq!(repo.external_worktree_visibility_legacy, Some(false));
        assert_eq!(repo.external_worktree_discovery_suppressed_at, Some(1_700_000_000_000));

        // Frontend reads these exact keys.
        assert!(raw.contains("\"customWorktreeVisibilitySources\""));
        assert!(raw.contains("\"worktreeVisibilitySourcePreferences\""));
        assert!(raw.contains("\"rootPath\""));
        assert!(raw.contains("\"builtIn\""));
        assert!(raw.contains("\"externalWorktreeVisibility\":\"show\""));
        assert!(raw.contains("\"externalWorktreeVisibilityLegacy\":false"));
    }

    #[test]
    fn set_worktree_visibility_sources_full_replace_clears_with_none() {
        let mut env = CatalogEnvelope::empty();
        env.repos.push(repo_at("/x/repo"));
        set_worktree_visibility_sources(
            &mut env,
            "/x/repo",
            Some(vec![source("s1", "/worktrees")]),
            Some(prefs(&[("claude", "show")], &[])),
            Some("show".to_string()),
            Some(false),
            Some(1_700_000_000_000),
        )
        .expect("first write");

        // Full replace: `None` clears each field (legacy back to "unset").
        set_worktree_visibility_sources(&mut env, "/x/repo", None, None, None, None, None)
            .expect("clear write");
        let repo = &env.repos[0];
        assert!(repo.custom_worktree_visibility_sources.is_none());
        assert!(repo.worktree_visibility_source_preferences.is_none());
        assert!(repo.external_worktree_visibility.is_none());
        assert!(repo.external_worktree_visibility_legacy.is_none());
        assert!(repo.external_worktree_discovery_suppressed_at.is_none());

        // An invalid policy value is dropped instead of persisted verbatim.
        set_worktree_visibility_sources(
            &mut env,
            "/x/repo",
            None,
            None,
            Some("maybe".to_string()),
            None,
            None,
        )
        .expect("invalid value write");
        assert!(env.repos[0].external_worktree_visibility.is_none());
        // An explicit empty source list is kept (it supersedes the global list).
        set_worktree_visibility_sources(&mut env, "/x/repo", Some(vec![]), None, None, None, None)
            .expect("empty list write");
        assert_eq!(env.repos[0].custom_worktree_visibility_sources, Some(vec![]));
    }

    #[test]
    fn set_worktree_visibility_sources_writes_and_clears_discovery_suppression() {
        // Orca un-suppresses discovery when the user chooses Show outside the
        // listed sources: `None` must clear the stamp, `Some(ts)` must write it,
        // and `null` must survive the file roundtrip so the inbox reopens.
        let mut env = CatalogEnvelope::empty();
        env.repos.push(repo_at("/x/repo"));
        env.repos[0].external_worktree_discovery_suppressed_at = Some(1_600_000_000_000);

        set_worktree_visibility_sources(&mut env, "/x/repo", None, None, None, None, None)
            .expect("un-suppress write");
        let raw = serde_json::to_string(&env).expect("serialize");
        let back: CatalogEnvelope = serde_json::from_str(&raw).expect("deserialize");
        assert!(back.repos[0].external_worktree_discovery_suppressed_at.is_none());
        assert!(
            raw.contains("\"externalWorktreeDiscoverySuppressedAt\":null"),
            "cleared stamp must serialize as null: {raw}"
        );

        set_worktree_visibility_sources(
            &mut env,
            "/x/repo",
            None,
            None,
            None,
            None,
            Some(1_700_000_000_000),
        )
        .expect("re-suppress write");
        let raw = serde_json::to_string(&env).expect("serialize");
        let back: CatalogEnvelope = serde_json::from_str(&raw).expect("deserialize");
        assert_eq!(
            back.repos[0].external_worktree_discovery_suppressed_at,
            Some(1_700_000_000_000)
        );
        assert!(raw.contains("\"externalWorktreeDiscoverySuppressedAt\":1700000000000"), "{raw}");
    }

    #[test]
    fn set_worktree_visibility_sources_unknown_path_errors() {
        let mut env = CatalogEnvelope::empty();
        env.repos.push(repo_at("/x/repo"));
        let err =
            set_worktree_visibility_sources(&mut env, "/x/nope", None, None, None, None, None)
                .expect_err("unknown path must error");
        assert!(err.contains("/x/nope"), "error must name the unknown path: {err}");
        assert!(err.contains("not found"), "error must be explicit: {err}");
    }

    #[test]
    fn absent_visibility_fields_deserialize_as_unset() {
        // Legacy catalog JSON (no visibility config) must keep working, and the
        // legacy flag must stay distinguishable from an explicit `false`.
        let raw = r#"{"schemaVersion":1,"projectGroups":[],"folderWorkspaces":[],"repos":[
            {"id":"r1","path":"/x/repo","displayName":"repo","addedAt":1}
        ]}"#;
        let env: CatalogEnvelope = serde_json::from_str(raw).expect("legacy catalog parses");
        let repo = &env.repos[0];
        assert!(repo.external_worktree_visibility.is_none());
        assert!(repo.external_worktree_visibility_legacy.is_none());
        assert!(repo.custom_worktree_visibility_sources.is_none());
        assert!(repo.worktree_visibility_source_preferences.is_none());
    }
}
