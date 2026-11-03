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

/// Caps from Orca `sanitizeRepoIcon` / `MAX_REPO_ICON_DATA_URL_LENGTH`.
const MAX_REPO_ICON_EMOJI_LENGTH: usize = 16;
const MAX_REPO_ICON_LUCIDE_NAME_LENGTH: usize = 40;
const MAX_REPO_ICON_LABEL_LENGTH: usize = 80;
const MAX_REPO_ICON_DATA_URL_LENGTH: usize = 400 * 1024;
const REPO_ICON_IMAGE_SOURCES: &[&str] = &["upload", "file", "favicon", "github"];

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
    /// SSH target id when the checkout lives on a remote host. `None` = local.
    /// Serialized so the sidebar row keeps its host scope (D03a-046).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub connection_id: Option<String>,
    /// Explicit execution owner (`ssh:<id>` / `runtime:<id>`), mirroring
    /// Orca's `executionHostId`; the sidebar keys host filtering on it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub execution_host_id: Option<String>,
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
    /// Orca `agentWorktreeVisibility`: per-repo override (`show`|`hide`) of the
    /// built-in "Claude Code" source and of the agent-scratch policy when no
    /// source matched. `None` (absent/`null`) means "no override" — the built-in
    /// source then falls back to the global `sourcePreferences`, and scratch
    /// worktrees stay hidden. Serialized even when `null`, like the fields above.
    #[serde(default)]
    pub agent_worktree_visibility: Option<String>,
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
                connection_id: None,
                execution_host_id: None,
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
                agent_worktree_visibility: None,
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
/// Removes one folder workspace from the catalog by id. The folder on disk is
/// untouched: only Hydra's workspace entry goes away.
pub fn remove_folder_workspace_from_catalog(
    folder_workspace_id: &str,
    envelope: &mut CatalogEnvelope,
) -> Result<(), String> {
    let before = envelope.folder_workspaces.len();
    envelope
        .folder_workspaces
        .retain(|workspace| workspace.id != folder_workspace_id);
    if envelope.folder_workspaces.len() == before {
        return Err(format!("Folder workspace not found: {folder_workspace_id}"));
    }
    Ok(())
}

/// Drops the catalog row(s) that represent one SSH-hosted workspace.
///
/// Scoped to both the connection and the normalized path: a local folder that
/// happens to share the path string, or another host's row, must survive a
/// forget. Returns how many folder-workspace rows were removed so the IPC
/// result can report a truthful count (zero on a repeat forget).
pub fn remove_ssh_workspace_records(
    envelope: &mut CatalogEnvelope,
    connection_id: &str,
    worktree_path: &str,
) -> usize {
    let connection_id = connection_id.trim();
    let normalized_path = normalize_catalog_path(worktree_path);
    if connection_id.is_empty() || normalized_path.is_empty() {
        return 0;
    }
    let before = envelope.folder_workspaces.len();
    envelope.folder_workspaces.retain(|workspace| {
        !(workspace.connection_id.as_deref() == Some(connection_id)
            && normalize_catalog_path(&workspace.folder_path) == normalized_path)
    });
    before - envelope.folder_workspaces.len()
}

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
            connection_id: None,
            execution_host_id: None,
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
            agent_worktree_visibility: None,
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
            connection_id: None,
            execution_host_id: None,
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
            agent_worktree_visibility: None,
            custom_worktree_visibility_sources: None,
            worktree_visibility_source_preferences: None,
        });
    }
    Ok(())
}

/// Last path segment, for a display name when the caller did not supply one.
fn last_path_segment(path: &str) -> Option<String> {
    path.trim_end_matches(['/', '\\'])
        .rsplit(['/', '\\'])
        .find(|segment| !segment.is_empty())
        .map(str::to_string)
}

/// Registers a checkout that lives on another host (SSH).
///
/// Unlike [`add_folder_to_catalog`] there is no local directory to probe, so the
/// caller supplies the identity the row is keyed on: normalized path +
/// connection id. Re-adding the same pair returns the existing row instead of a
/// duplicate, which makes a retried dialog or a re-clone idempotent.
pub fn add_remote_repo_to_catalog(
    path: &str,
    connection_id: &str,
    execution_host_id: Option<&str>,
    kind: &str,
    display_name: Option<&str>,
    envelope: &mut CatalogEnvelope,
) -> Result<CatalogRepo, String> {
    let normalized = normalize_catalog_path(path);
    if normalized.is_empty() {
        return Err("Empty path".to_string());
    }
    let connection_id = connection_id.trim();
    if connection_id.is_empty() {
        return Err("connectionId is required for a remote repository".to_string());
    }
    let kind = kind.trim();
    let kind = if kind.is_empty() { "git" } else { kind };
    if kind != "git" && kind != "folder" {
        return Err(format!("Unsupported repository kind: {kind}"));
    }

    if let Some(existing) = envelope.repos.iter().find(|repo| {
        repo.connection_id.as_deref() == Some(connection_id)
            && normalize_catalog_path(&repo.path) == normalized
    }) {
        return Ok(existing.clone());
    }

    let display_name = display_name
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .or_else(|| last_path_segment(&normalized))
        .unwrap_or_else(|| normalized.clone());

    let repo = CatalogRepo {
        id: new_id(),
        path: normalized,
        connection_id: Some(connection_id.to_string()),
        execution_host_id: execution_host_id
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string),
        display_name,
        added_at: now_ms(),
        kind: Some(kind.to_string()),
        worktree_base_path: None,
        project_group_id: None,
        repo_icon: None,
        imported_external_worktree_paths: None,
        external_worktree_discovery_suppressed_at: None,
        external_worktree_inbox_baseline_paths: None,
        external_worktree_visibility_prompt_dismissed_at: None,
        external_worktree_visibility: None,
        external_worktree_visibility_legacy: None,
        agent_worktree_visibility: None,
        custom_worktree_visibility_sources: None,
        worktree_visibility_source_preferences: None,
    };
    envelope.repos.push(repo.clone());
    Ok(repo)
}

/// Host id the renderer uses for this computer. A folder workspace stamped with
/// it is still local, so its directory has to exist.
const LOCAL_EXECUTION_HOST_ID: &str = "local";

fn normalize_stamp(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|stamp| !stamp.is_empty())
        .map(str::to_string)
}

fn is_remote_workspace(
    connection_id: Option<&str>,
    execution_host_id: Option<&str>,
) -> bool {
    connection_id.is_some()
        || execution_host_id.is_some_and(|id| id != LOCAL_EXECUTION_HOST_ID)
}

/// Creates a folder workspace (`catalog_add_folder_workspace`).
///
/// - `project_group_id` names an existing group; without it a `manual` group is
///   created for the folder so the workspace always has an owner.
/// - `name` defaults to `<folder> workspace`, matching the folder-scan rule.
/// - Local folders must exist; a workspace stamped for an SSH/runtime host skips
///   the probe, because that directory belongs to the other machine.
/// - Idempotent per `(group, normalized folder path)`: re-opening the same folder
///   in the same group returns the envelope unchanged instead of adding a row.
pub fn add_folder_workspace_to_catalog(
    parent_path: &str,
    project_group_id: Option<&str>,
    name: Option<&str>,
    connection_id: Option<&str>,
    execution_host_id: Option<&str>,
    envelope: &mut CatalogEnvelope,
) -> Result<(), String> {
    if parent_path.trim().is_empty() {
        return Err("Empty path".to_string());
    }
    let norm = normalize_catalog_path(parent_path);
    let connection_id = normalize_stamp(connection_id);
    let execution_host_id = normalize_stamp(execution_host_id);
    if !is_remote_workspace(connection_id.as_deref(), execution_host_id.as_deref()) {
        let folder = PathBuf::from(&norm);
        if !folder.is_dir() {
            return Err(format!("Not a directory: {parent_path}"));
        }
    }

    let folder_name = PathBuf::from(&norm)
        .file_name()
        .and_then(|entry| entry.to_str())
        .filter(|entry| !entry.is_empty())
        .unwrap_or("folder")
        .to_string();
    let now = now_ms();

    let group_id = match project_group_id.map(str::trim).filter(|id| !id.is_empty()) {
        Some(group_id) => {
            if !envelope.project_groups.iter().any(|group| group.id == group_id) {
                return Err(format!("Project group not found: {group_id}"));
            }
            group_id.to_string()
        }
        None => {
            let group = CatalogProjectGroup {
                id: new_id(),
                name: folder_name.clone(),
                parent_path: Some(norm.clone()),
                connection_id: connection_id.clone(),
                execution_host_id: execution_host_id.clone(),
                parent_group_id: None,
                created_from: "manual".to_string(),
                tab_order: 0,
                is_collapsed: false,
                color: None,
                created_at: now,
                updated_at: now,
            };
            let id = group.id.clone();
            envelope.project_groups.push(group);
            id
        }
    };

    let already_open = envelope.folder_workspaces.iter().any(|workspace| {
        workspace.project_group_id == group_id
            && normalize_catalog_path(&workspace.folder_path) == norm
    });
    if already_open {
        return Ok(());
    }

    let workspace_name = name
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| format!("{folder_name} workspace"));
    envelope.folder_workspaces.push(CatalogFolderWorkspace {
        id: new_id(),
        project_group_id: group_id,
        name: workspace_name,
        folder_path: norm,
        connection_id,
        execution_host_id,
        sort_order: now,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

/// Outcome of `import_nested_repos`: the group created for a group import (absent
/// for a separate import or when every selected repository was already known)
/// plus the normalized paths that were added and those that were skipped.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct NestedRepoImportResult {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group: Option<CatalogProjectGroup>,
    pub added: Vec<String>,
    pub skipped: Vec<String>,
}

/// Adds the repositories selected in the nested-import checklist to the catalog
/// in one mutation (`import_nested_repos`).
///
/// Atomicity: every path is validated before the envelope is touched, so one bad
/// path rejects the whole import and the caller writes nothing. Paths already in
/// the catalog (as a repo or folder workspace) and duplicates in the request are
/// reported as `skipped`, never duplicated. `group_name` creates one `manual`
/// group and assigns every added repo to it; without it the repos stay ungrouped
/// (`separate` import). An empty group is never created.
pub fn import_nested_repos_into_catalog(
    paths: &[String],
    group_name: Option<&str>,
    envelope: &mut CatalogEnvelope,
) -> Result<NestedRepoImportResult, String> {
    if paths.is_empty() {
        return Ok(NestedRepoImportResult::default());
    }

    let mut candidates: Vec<(String, String)> = Vec::with_capacity(paths.len());
    for raw in paths {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return Err("Empty repository path".to_string());
        }
        let norm = normalize_catalog_path(trimmed);
        let folder = PathBuf::from(&norm);
        if !folder.is_dir() {
            return Err(format!("Not a directory: {trimmed}"));
        }
        if !folder.join(".git").exists() {
            return Err(format!("Not a git repository: {trimmed}"));
        }
        let display_name = folder
            .file_name()
            .and_then(|entry| entry.to_str())
            .filter(|entry| !entry.is_empty())
            .unwrap_or("repo")
            .to_string();
        candidates.push((norm, display_name));
    }

    let known_repos: std::collections::HashSet<String> = envelope
        .repos
        .iter()
        .map(|repo| normalize_catalog_path(&repo.path))
        .collect();
    let known_folders: std::collections::HashSet<String> = envelope
        .folder_workspaces
        .iter()
        .map(|workspace| normalize_catalog_path(&workspace.folder_path))
        .collect();

    let mut seen = std::collections::HashSet::new();
    let mut to_add: Vec<(String, String)> = Vec::new();
    let mut skipped: Vec<String> = Vec::new();
    for (norm, display_name) in candidates {
        if !seen.insert(norm.clone())
            || known_repos.contains(&norm)
            || known_folders.contains(&norm)
        {
            skipped.push(norm);
            continue;
        }
        to_add.push((norm, display_name));
    }

    if to_add.is_empty() {
        return Ok(NestedRepoImportResult {
            group: None,
            added: Vec::new(),
            skipped,
        });
    }

    let now = now_ms();
    let group = group_name
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .map(|name| {
            let group = CatalogProjectGroup {
                id: new_id(),
                name: name.to_string(),
                parent_path: None,
                connection_id: None,
                execution_host_id: None,
                parent_group_id: None,
                created_from: "manual".to_string(),
                tab_order: 0,
                is_collapsed: false,
                color: None,
                created_at: now,
                updated_at: now,
            };
            envelope.project_groups.push(group.clone());
            group
        });

    let mut added = Vec::with_capacity(to_add.len());
    for (norm, display_name) in to_add {
        envelope.repos.push(CatalogRepo {
            id: new_id(),
            path: norm.clone(),
            display_name,
            added_at: now,
            kind: Some("git".to_string()),
            connection_id: None,
            execution_host_id: None,
            worktree_base_path: None,
            project_group_id: group.as_ref().map(|group| group.id.clone()),
            repo_icon: None,
            imported_external_worktree_paths: None,
            external_worktree_discovery_suppressed_at: None,
            external_worktree_inbox_baseline_paths: None,
            external_worktree_visibility_prompt_dismissed_at: None,
            external_worktree_visibility: None,
            external_worktree_visibility_legacy: None,
            agent_worktree_visibility: None,
            custom_worktree_visibility_sources: None,
            worktree_visibility_source_preferences: None,
        });
        added.push(norm);
    }

    Ok(NestedRepoImportResult {
        group,
        added,
        skipped,
    })

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

/// Writes (or clears, with `None`) the glyph the repo header paints. Keyed by
/// catalog repo id: the renderer's project id is that id behind the sidebar's
/// `repo_` prefix, and a repo's display path can change without the row moving.
/// An unknown id is an error, like the path-keyed setters, so the caller never
/// believes it persisted a value that went nowhere.
pub fn set_repo_icon(
    envelope: &mut CatalogEnvelope,
    repo_id: &str,
    repo_icon: Option<serde_json::Value>,
) -> Result<(), String> {
    let id = repo_id.trim();
    if id.is_empty() {
        return Err("Empty repo id".to_string());
    }
    // Validate before mutating: a rejected payload must leave the stored icon
    // exactly as it was.
    let normalized = match repo_icon {
        Some(value) => Some(normalize_repo_icon(&value)?),
        None => None,
    };
    let repo = envelope
        .repos
        .iter_mut()
        .find(|r| r.id == id)
        .ok_or_else(|| format!("Repo not found in catalog: {repo_id}"))?;
    repo.repo_icon = normalized;
    Ok(())
}

/// Orca `sanitizeRepoIcon` subset: keep only the fields `RepoIconGlyph` reads and
/// reject a payload it cannot draw, instead of persisting an icon that renders as
/// the default folder. URL/data-URI shape stays the renderer's check; Rust owns
/// the type discriminator and the size caps.
fn normalize_repo_icon(value: &serde_json::Value) -> Result<serde_json::Value, String> {
    let object = value
        .as_object()
        .ok_or_else(|| "repoIcon must be an object".to_string())?;
    let kind = object.get("type").and_then(|v| v.as_str()).unwrap_or_default();
    match kind {
        "emoji" => {
            let emoji = object
                .get("emoji")
                .and_then(|v| v.as_str())
                .map(str::trim)
                .unwrap_or_default();
            if emoji.is_empty() || emoji.chars().count() > MAX_REPO_ICON_EMOJI_LENGTH {
                return Err("repoIcon.emoji is empty or too long".to_string());
            }
            Ok(serde_json::json!({ "type": "emoji", "emoji": emoji }))
        }
        "lucide" => {
            let name = object
                .get("name")
                .and_then(|v| v.as_str())
                .map(str::trim)
                .unwrap_or_default();
            // Orca `LUCIDE_ICON_NAME_PATTERN: /^[A-Za-z][A-Za-z0-9]*$/`.
            let valid = name.len() <= MAX_REPO_ICON_LUCIDE_NAME_LENGTH
                && name.starts_with(|c: char| c.is_ascii_alphabetic())
                && name.chars().all(|c| c.is_ascii_alphanumeric());
            if !valid {
                return Err("repoIcon.name is not a Lucide icon name".to_string());
            }
            Ok(serde_json::json!({ "type": "lucide", "name": name }))
        }
        "image" => {
            let src = object
                .get("src")
                .and_then(|v| v.as_str())
                .map(str::trim)
                .unwrap_or_default();
            if src.is_empty() || src.len() > MAX_REPO_ICON_DATA_URL_LENGTH {
                return Err("repoIcon.src is empty or too long".to_string());
            }
            let source = object.get("source").and_then(|v| v.as_str()).unwrap_or_default();
            if !REPO_ICON_IMAGE_SOURCES.contains(&source) {
                return Err(format!("repoIcon.source is not supported: {source}"));
            }
            let label: String = object
                .get("label")
                .and_then(|v| v.as_str())
                .map(str::trim)
                .unwrap_or_default()
                .chars()
                .take(MAX_REPO_ICON_LABEL_LENGTH)
                .collect();
            Ok(if label.is_empty() {
                serde_json::json!({ "type": "image", "src": src, "source": source })
            } else {
                serde_json::json!({ "type": "image", "src": src, "source": source, "label": label })
            })
        }
        _ => Err(format!("repoIcon.type is not supported: {kind}")),
    }
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
    agent_worktree_visibility: Option<String>,
    external_worktree_discovery_suppressed_at: Option<i64>,
) -> Result<(), String> {
    set_worktree_visibility_sources_with_inbox(
        envelope,
        repo_path,
        custom_sources,
        source_preferences,
        external_worktree_visibility,
        external_worktree_visibility_legacy,
        agent_worktree_visibility,
        external_worktree_discovery_suppressed_at,
        None,
        None,
    )
}

/// Orca writes the inbox baseline and the suppression stamp in one catalog write;
/// `None` leaves both untouched.
#[allow(clippy::too_many_arguments)]
pub fn set_worktree_visibility_sources_with_inbox(
    envelope: &mut CatalogEnvelope,
    repo_path: &str,
    custom_sources: Option<Vec<CustomWorktreeSource>>,
    source_preferences: Option<SourcePreferences>,
    external_worktree_visibility: Option<String>,
    external_worktree_visibility_legacy: Option<bool>,
    agent_worktree_visibility: Option<String>,
    external_worktree_discovery_suppressed_at: Option<i64>,
    inbox_baseline_paths: Option<Vec<String>>,
    inbox_prompt_dismissed_at: Option<i64>,
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
    // Orca `agentWorktreeVisibility`: an invalid value is dropped (`None`), so a
    // typo can never persist a policy the resolver would ignore anyway.
    repo.agent_worktree_visibility = agent_worktree_visibility
        .as_deref()
        .and_then(normalize_visibility);
    // Orca un-suppresses discovery when the user chooses Show outside the listed
    // sources: `None` clears the stamp (writes `null`), `Some(ts)` writes it.
    repo.external_worktree_discovery_suppressed_at = external_worktree_discovery_suppressed_at;
    if let Some(paths) = inbox_baseline_paths {
        repo.external_worktree_inbox_baseline_paths = if paths.is_empty() { None } else { Some(paths) };
    }
    if inbox_prompt_dismissed_at.is_some() {
        repo.external_worktree_visibility_prompt_dismissed_at = inbox_prompt_dismissed_at;
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
    fn remove_folder_workspace_drops_only_the_entry() {
        let mut env = CatalogEnvelope::empty();
        env.folder_workspaces.push(CatalogFolderWorkspace {
            id: "fw1".to_string(),
            project_group_id: "g1".to_string(),
            name: "notes".to_string(),
            folder_path: "/x/notes".to_string(),
            connection_id: None,
            execution_host_id: None,
            sort_order: 0,
            created_at: 1,
            updated_at: 1,
        });
        env.folder_workspaces.push(CatalogFolderWorkspace {
            id: "fw2".to_string(),
            project_group_id: "g1".to_string(),
            name: "keep".to_string(),
            folder_path: "/x/keep".to_string(),
            connection_id: None,
            execution_host_id: None,
            sort_order: 1,
            created_at: 1,
            updated_at: 1,
        });

        remove_folder_workspace_from_catalog("fw1", &mut env).unwrap();
        assert_eq!(env.folder_workspaces.len(), 1);
        assert_eq!(env.folder_workspaces[0].id, "fw2");
        assert!(remove_folder_workspace_from_catalog("missing", &mut env).is_err());
    }

    #[test]
    fn remove_ssh_workspace_records_matches_connection_and_normalized_path() {
        let mut env = CatalogEnvelope::empty();
        let workspace = |id: &str, path: &str, connection: Option<&str>| CatalogFolderWorkspace {
            id: id.to_string(),
            project_group_id: "g1".to_string(),
            name: id.to_string(),
            folder_path: path.to_string(),
            connection_id: connection.map(str::to_string),
            execution_host_id: None,
            sort_order: 0,
            created_at: 1,
            updated_at: 1,
        };
        env.folder_workspaces.push(workspace("ssh-hit", "/srv/wt/", Some("ssh-1")));
        env.folder_workspaces.push(workspace("ssh-other-host", "/srv/wt", Some("ssh-2")));
        env.folder_workspaces.push(workspace("local-same-path", "/srv/wt", None));
        env.folder_workspaces.push(workspace("ssh-other-path", "/srv/keep", Some("ssh-1")));

        assert_eq!(
            remove_ssh_workspace_records(&mut env, "ssh-1", "/srv/wt"),
            1,
            "only the exact connection + normalized path row is removed"
        );
        let remaining: Vec<&str> = env
            .folder_workspaces
            .iter()
            .map(|workspace| workspace.id.as_str())
            .collect();
        assert_eq!(remaining, vec!["ssh-other-host", "local-same-path", "ssh-other-path"]);

        // Repeat forget is a no-op, not an error.
        assert_eq!(remove_ssh_workspace_records(&mut env, "ssh-1", "/srv/wt/"), 0);
        // Blank scope never removes anything.
        assert_eq!(remove_ssh_workspace_records(&mut env, "", "/srv/keep"), 0);
    }

    #[test]
    fn add_folder_idempotent_for_existing_repo() {
        let mut env = CatalogEnvelope::empty();
        env.repos.push(CatalogRepo {
            id: "r1".to_string(),
            path: "/x/repo".to_string(),
            connection_id: None,
            execution_host_id: None,
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
            agent_worktree_visibility: None,
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

    #[test]
    fn add_remote_repo_keeps_host_stamps_and_is_idempotent() {
        let mut env = CatalogEnvelope::empty();
        let repo = add_remote_repo_to_catalog(
            "/srv/apps/widgets/",
            "ssh-1",
            Some("ssh:ssh-1"),
            "git",
            None,
            &mut env,
        )
        .expect("remote repo written");

        assert_eq!(repo.path, "/srv/apps/widgets");
        assert_eq!(repo.display_name, "widgets");
        assert_eq!(repo.connection_id.as_deref(), Some("ssh-1"));
        assert_eq!(repo.execution_host_id.as_deref(), Some("ssh:ssh-1"));
        assert_eq!(env.repos.len(), 1);

        // Same host + same path is a no-op; the row keeps its id.
        let again = add_remote_repo_to_catalog(
            "/srv/apps/widgets",
            "ssh-1",
            Some("ssh:ssh-1"),
            "git",
            Some("ignored"),
            &mut env,
        )
        .expect("idempotent");
        assert_eq!(again.id, repo.id);
        assert_eq!(env.repos.len(), 1);

        // The same path on another host is a different project.
        add_remote_repo_to_catalog("/srv/apps/widgets", "ssh-2", None, "git", None, &mut env)
            .expect("second host");
        assert_eq!(env.repos.len(), 2);

        // The host stamps survive the wire format the renderer reads.
        let raw = serde_json::to_string(&env).expect("serialize");
        assert!(raw.contains("\"connectionId\":\"ssh-1\""));
        assert!(raw.contains("\"executionHostId\":\"ssh:ssh-1\""));
    }

    #[test]
    fn add_remote_repo_rejects_missing_identity_and_unknown_kind() {
        let mut env = CatalogEnvelope::empty();
        assert!(add_remote_repo_to_catalog("", "ssh-1", None, "git", None, &mut env).is_err());
        assert!(add_remote_repo_to_catalog("/srv/x", "  ", None, "git", None, &mut env).is_err());
        assert!(
            add_remote_repo_to_catalog("/srv/x", "ssh-1", None, "submodule", None, &mut env)
                .is_err()
        );
        assert!(env.repos.is_empty());
    }

    fn repo_at(path: &str) -> CatalogRepo {
        CatalogRepo {
            id: "r1".to_string(),
            path: path.to_string(),
            connection_id: None,
            execution_host_id: None,
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
            agent_worktree_visibility: None,
            custom_worktree_visibility_sources: None,
            worktree_visibility_source_preferences: None,
        }
    }

    #[test]
    fn set_repo_icon_roundtrips_emoji_and_clears() {
        let mut env = CatalogEnvelope::empty();
        env.repos.push(repo_at("/x/repo"));

        set_repo_icon(
            &mut env,
            "r1",
            Some(serde_json::json!({ "type": "emoji", "emoji": "🚀" })),
        )
        .expect("known repo writes the icon");

        // Persist and read back through the same serde layer the catalog file uses.
        let raw = serde_json::to_string(&env).expect("serialize");
        assert!(
            raw.contains("\"repoIcon\""),
            "camelCase key must reach the file: {raw}"
        );
        let back: CatalogEnvelope = serde_json::from_str(&raw).expect("deserialize");
        let icon = back.repos[0].repo_icon.as_ref().expect("icon persisted");
        assert_eq!(icon["type"], "emoji");
        assert_eq!(icon["emoji"], "🚀");

        // `None` clears: the renderer reads the absent field as "default folder".
        set_repo_icon(&mut env, "r1", None).expect("clearing the icon");
        let raw = serde_json::to_string(&env).expect("serialize");
        let back: CatalogEnvelope = serde_json::from_str(&raw).expect("deserialize");
        assert!(back.repos[0].repo_icon.is_none());
        assert!(
            !raw.contains("\"repoIcon\""),
            "a cleared icon must leave the file: {raw}"
        );
    }

    #[test]
    fn set_repo_icon_normalizes_payloads_the_renderer_reads() {
        let mut env = CatalogEnvelope::empty();
        env.repos.push(repo_at("/x/repo"));

        set_repo_icon(
            &mut env,
            "r1",
            Some(serde_json::json!({ "type": "lucide", "name": "  Rocket " })),
        )
        .expect("lucide payload");
        assert_eq!(env.repos[0].repo_icon.as_ref().unwrap()["name"], "Rocket");

        let overlong_label = "x".repeat(MAX_REPO_ICON_LABEL_LENGTH + 20);
        set_repo_icon(
            &mut env,
            "r1",
            Some(serde_json::json!({
                "type": "image",
                "src": "https://github.com/owner.png?size=64",
                "source": "github",
                "label": overlong_label,
            })),
        )
        .expect("image payload");
        let icon = env.repos[0].repo_icon.as_ref().unwrap();
        assert_eq!(
            icon["label"].as_str().map(str::len),
            Some(MAX_REPO_ICON_LABEL_LENGTH)
        );
        assert_eq!(icon["source"], "github");
    }

    #[test]
    fn set_repo_icon_rejects_payloads_the_renderer_cannot_draw() {
        let mut env = CatalogEnvelope::empty();
        env.repos.push(repo_at("/x/repo"));
        env.repos[0].repo_icon = Some(serde_json::json!({ "type": "emoji", "emoji": "🐙" }));

        for payload in [
            serde_json::json!({ "type": "emoji", "emoji": "   " }),
            serde_json::json!({ "type": "emoji", "emoji": "x".repeat(MAX_REPO_ICON_EMOJI_LENGTH + 1) }),
            serde_json::json!({ "type": "lucide", "name": "1Rocket" }),
            serde_json::json!({ "type": "image", "src": "", "source": "github" }),
            serde_json::json!({ "type": "image", "src": "https://x/y.png", "source": "ftp" }),
            serde_json::json!({ "type": "sprite" }),
            serde_json::json!("🚀"),
        ] {
            set_repo_icon(&mut env, "r1", Some(payload)).expect_err("invalid payload must error");
            // A rejected write never touches the stored icon.
            assert_eq!(env.repos[0].repo_icon.as_ref().unwrap()["emoji"], "🐙");
        }
    }

    #[test]
    fn set_repo_icon_unknown_id_errors() {
        let mut env = CatalogEnvelope::empty();
        env.repos.push(repo_at("/x/repo"));
        let err = set_repo_icon(&mut env, "r404", None).expect_err("unknown id must error");
        assert!(err.contains("r404"), "error must name the unknown id: {err}");
        assert!(err.contains("not found"), "error must be explicit: {err}");

        let err = set_repo_icon(&mut env, "  ", None).expect_err("blank id must error");
        assert!(err.contains("Empty repo id"), "{err}");
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
    fn visibility_sources_write_inbox_baseline_and_suppression_together() {
        let mut env = CatalogEnvelope::empty();
        env.repos.push(repo_at("/x/repo"));
        set_worktree_visibility_sources_with_inbox(
            &mut env,
            "/x/repo",
            None,
            None,
            Some("show".to_string()),
            None,
            None,
            Some(1_700_000_000_000),
            Some(vec!["/x/repo/keep".to_string()]),
            Some(1_700_000_000_000),
        )
        .unwrap();
        let repo = &env.repos[0];
        assert_eq!(
            repo.external_worktree_inbox_baseline_paths.as_deref(),
            Some(["/x/repo/keep".to_string()].as_slice())
        );
        assert_eq!(repo.external_worktree_discovery_suppressed_at, Some(1_700_000_000_000));
        assert_eq!(repo.external_worktree_visibility_prompt_dismissed_at, Some(1_700_000_000_000));
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
            Some("hide".to_string()),
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
        assert_eq!(repo.agent_worktree_visibility.as_deref(), Some("hide"));
        assert_eq!(repo.external_worktree_discovery_suppressed_at, Some(1_700_000_000_000));

        // Frontend reads these exact keys.
        assert!(raw.contains("\"customWorktreeVisibilitySources\""));
        assert!(raw.contains("\"worktreeVisibilitySourcePreferences\""));
        assert!(raw.contains("\"rootPath\""));
        assert!(raw.contains("\"builtIn\""));
        assert!(raw.contains("\"externalWorktreeVisibility\":\"show\""));
        assert!(raw.contains("\"externalWorktreeVisibilityLegacy\":false"));
        assert!(raw.contains("\"agentWorktreeVisibility\":\"hide\""));
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
            Some("show".to_string()),
            Some(1_700_000_000_000),
        )
        .expect("first write");
        assert_eq!(env.repos[0].agent_worktree_visibility.as_deref(), Some("show"));

        // Full replace: `None` clears each field (legacy back to "unset").
        set_worktree_visibility_sources(
            &mut env, "/x/repo", None, None, None, None, None, None,
        )
        .expect("clear write");
        let repo = &env.repos[0];
        assert!(repo.custom_worktree_visibility_sources.is_none());
        assert!(repo.worktree_visibility_source_preferences.is_none());
        assert!(repo.external_worktree_visibility.is_none());
        assert!(repo.external_worktree_visibility_legacy.is_none());
        assert!(repo.agent_worktree_visibility.is_none());
        assert!(repo.external_worktree_discovery_suppressed_at.is_none());
        // The cleared field is still emitted as `null` (frontend distinguishes
        // "unset" from "no key").
        let raw = serde_json::to_string(&env).expect("serialize");
        assert!(raw.contains("\"agentWorktreeVisibility\":null"), "{raw}");

        // An invalid policy value is dropped instead of persisted verbatim.
        set_worktree_visibility_sources(
            &mut env,
            "/x/repo",
            None,
            None,
            Some("maybe".to_string()),
            None,
            None,
            None,
        )
        .expect("invalid value write");
        assert!(env.repos[0].external_worktree_visibility.is_none());
        // An invalid `agentWorktreeVisibility` is dropped too.
        set_worktree_visibility_sources(
            &mut env,
            "/x/repo",
            None,
            None,
            None,
            None,
            Some("maybe".to_string()),
            None,
        )
        .expect("invalid agent value write");
        assert!(env.repos[0].agent_worktree_visibility.is_none());
        // An explicit empty source list is kept (it supersedes the global list).
        set_worktree_visibility_sources(
            &mut env, "/x/repo", Some(vec![]), None, None, None, None, None,
        )
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

        set_worktree_visibility_sources(
            &mut env, "/x/repo", None, None, None, None, None, None,
        )
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
            set_worktree_visibility_sources(&mut env, "/x/nope", None, None, None, None, None, None)
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
        assert!(repo.agent_worktree_visibility.is_none());
        assert!(repo.custom_worktree_visibility_sources.is_none());
        assert!(repo.worktree_visibility_source_preferences.is_none());
    }

    fn unique_test_dir(tag: &str) -> PathBuf {
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("hydra-catalog-{tag}-{stamp}"))
    }

    fn git_child(root: &PathBuf, name: &str) -> PathBuf {
        let child = root.join(name);
        std::fs::create_dir_all(child.join(".git")).unwrap();
        child
    }

    #[test]
    fn add_folder_workspace_creates_manual_group_and_is_idempotent() {
        let root = unique_test_dir("fw-create");
        let folder = root.join("notes");
        std::fs::create_dir_all(&folder).unwrap();
        let mut env = CatalogEnvelope::empty();

        add_folder_workspace_to_catalog(
            folder.to_str().unwrap(),
            None,
            Some("Design notes"),
            None,
            None,
            &mut env,
        )
        .expect("first create");

        assert_eq!(env.project_groups.len(), 1);
        assert_eq!(env.project_groups[0].created_from, "manual");
        assert_eq!(env.project_groups[0].name, "notes");
        let expected_group_parent = catalog_path_normalized(&folder);
        assert_eq!(
            env.project_groups[0].parent_path.as_deref(),
            Some(expected_group_parent.as_str())
        );
        assert_eq!(env.folder_workspaces.len(), 1);
        assert_eq!(env.folder_workspaces[0].name, "Design notes");
        assert_eq!(
            env.folder_workspaces[0].project_group_id,
            env.project_groups[0].id
        );

        // Re-opening the same folder in the same group must not add rows.
        let group_id = env.project_groups[0].id.clone();
        add_folder_workspace_to_catalog(
            folder.to_str().unwrap(),
            Some(&group_id),
            Some("Renamed"),
            None,
            None,
            &mut env,
        )
        .expect("second create");
        assert_eq!(env.project_groups.len(), 1);
        assert_eq!(env.folder_workspaces.len(), 1);
        assert_eq!(env.folder_workspaces[0].name, "Design notes");

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn add_folder_workspace_requires_a_known_group() {
        let root = unique_test_dir("fw-group");
        let folder = root.join("notes");
        std::fs::create_dir_all(&folder).unwrap();
        let mut env = CatalogEnvelope::empty();

        let error = add_folder_workspace_to_catalog(
            folder.to_str().unwrap(),
            Some("missing-group"),
            None,
            None,
            None,
            &mut env,
        )
        .expect_err("unknown group must be refused");
        assert!(error.contains("missing-group"), "{error}");
        assert!(env.folder_workspaces.is_empty());
        assert!(env.project_groups.is_empty());

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn add_folder_workspace_for_remote_host_skips_the_local_probe() {
        let mut env = CatalogEnvelope::empty();
        add_folder_workspace_to_catalog(
            "/srv/does-not-exist-here",
            None,
            None,
            Some("ssh-target-1"),
            None,
            &mut env,
        )
        .expect("remote folder does not need a local directory");
        assert_eq!(env.folder_workspaces.len(), 1);
        assert_eq!(
            env.folder_workspaces[0].connection_id.as_deref(),
            Some("ssh-target-1")
        );
        assert_eq!(env.folder_workspaces[0].name, "does-not-exist-here workspace");
    }

    fn catalog_path_normalized(folder: &PathBuf) -> String {
        normalize_catalog_path(folder.to_str().unwrap())
    }

    #[test]
    fn import_nested_repos_adds_selection_and_skips_known() {
        let root = unique_test_dir("nested-import");
        let a = git_child(&root, "repo-a");
        let b = git_child(&root, "repo-b");
        let mut env = CatalogEnvelope::empty();
        env.repos.push(repo_at(a.to_str().unwrap()));

        let result = import_nested_repos_into_catalog(
            &[
                a.to_str().unwrap().to_string(),
                b.to_str().unwrap().to_string(),
            ],
            Some("Workspace"),
            &mut env,
        )
        .expect("import selected repos");

        assert_eq!(result.added, vec![normalize_catalog_path(b.to_str().unwrap())]);
        assert_eq!(result.skipped, vec![normalize_catalog_path(a.to_str().unwrap())]);
        assert_eq!(env.project_groups.len(), 1, "one group for the batch");
        let group = result.group.expect("group returned with the result");
        assert_eq!(group.name, "Workspace");
        let added = env
            .repos
            .iter()
            .find(|repo| repo.path == normalize_catalog_path(b.to_str().unwrap()))
            .expect("repo-b added");
        assert_eq!(added.project_group_id.as_deref(), Some(group.id.as_str()));
        assert_eq!(env.repos.len(), 2);

        // A second import of the same selection skips everything and creates no group.
        let again = import_nested_repos_into_catalog(
            &[b.to_str().unwrap().to_string()],
            Some("Workspace"),
            &mut env,
        )
        .expect("re-import");
        assert!(again.added.is_empty());
        assert!(again.group.is_none());
        assert_eq!(env.project_groups.len(), 1);
        assert_eq!(env.repos.len(), 2);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn import_nested_repos_rejects_the_whole_batch_atomically() {
        let root = unique_test_dir("nested-atomic");
        let good = git_child(&root, "good");
        let plain = root.join("plain");
        std::fs::create_dir_all(&plain).unwrap();
        let mut env = CatalogEnvelope::empty();

        let error = import_nested_repos_into_catalog(
            &[
                good.to_str().unwrap().to_string(),
                plain.to_str().unwrap().to_string(),
            ],
            Some("Workspace"),
            &mut env,
        )
        .expect_err("a non-git path rejects the batch");
        assert!(error.contains("Not a git repository"), "{error}");
        assert!(env.repos.is_empty(), "no repo may land before validation");
        assert!(env.project_groups.is_empty(), "no group may land before validation");

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn import_nested_repos_separate_mode_leaves_repos_ungrouped() {
        let root = unique_test_dir("nested-separate");
        let repo = git_child(&root, "solo");
        let mut env = CatalogEnvelope::empty();

        let result = import_nested_repos_into_catalog(
            &[repo.to_str().unwrap().to_string()],
            None,
            &mut env,
        )
        .expect("separate import");

        assert!(result.group.is_none());
        assert_eq!(env.project_groups.len(), 0);
        assert_eq!(env.repos.len(), 1);
        assert!(env.repos[0].project_group_id.is_none());

        let _ = std::fs::remove_dir_all(&root);
    }
}
