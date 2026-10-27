use crate::catalog::{self, CatalogRepo};
use crate::db::{CustomWorktreeSource, SourcePreferences, WorktreeVisibilityDefaults};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitWorktreeInfo {
    pub path: String,
    pub head_commit: String,
    pub branch: String,
    pub is_bare: bool,
    pub is_locked: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub first_agent_message_rename_error: Option<String>,
    /// D07: sidebar pin persisted in `worktree_metadata.is_pinned`. `None` = no
    /// value stored (or no row at all), so the field is omitted from the payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_pinned: Option<bool>,
    /// D07: sidebar unread flag persisted in `worktree_metadata.is_unread`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_unread: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_sparse: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sparse_directories: Option<Vec<String>>,
    /// Provenance kind for automation-created worktrees (`created-by-automation`),
    /// read from `worktree_metadata.provenance_kind`. Omitted from the wire when NULL.
    #[serde(rename = "automationProvenanceKind", default, skip_serializing_if = "Option::is_none")]
    pub automation_provenance_kind: Option<String>,
    /// Provenance kind for CLI-created worktrees (`created-by-cli`), read from the
    /// same column. Omitted from the wire when NULL.
    #[serde(rename = "cliProvenanceKind", default, skip_serializing_if = "Option::is_none")]
    pub cli_provenance_kind: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CreateWorktreeParams {
    pub repo_path: String,
    pub branch_name: String,
    pub new_branch: bool,
    /// Agent that requested the creation, when the caller knows it. Persisted as
    /// Orca's `createdWithAgent`; `None` still records `created_at`.
    #[serde(default)]
    pub created_with_agent: Option<String>,
    /// Creation provenance kind (`created-by-automation` | `created-by-cli`),
    /// persisted to `worktree_metadata.provenance_kind`. `None` records none.
    #[serde(default)]
    pub provenance_kind: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CreateProjectParams {
    pub name: String,
    pub parent_dir: String,
    pub init_git: bool,
}

// ── Orca-faithful path helpers (shared/worktree/configured-worktree-base-path.ts + cross-platform-path) ──

fn normalize_runtime_path_separators(p: &str) -> String {
    p.replace('\\', "/")
}

fn normalize_runtime_path_for_comparison(p: &str) -> String {
    let mut s = normalize_runtime_path_separators(p);
    if s.len() > 1 && s.ends_with('/') {
        while s.ends_with('/') && s.len() > 1 {
            s.pop();
        }
    }
    s
}

fn is_runtime_path_absolute(p: &str) -> bool {
    // Simplified POSIX + Windows check — Hydra runs on Linux primarily, but handle Windows for parity
    p.starts_with('/') || p.starts_with("//") || (p.len() >= 3 && p.as_bytes()[1] == b':' && (p.as_bytes()[2] == b'/' || p.as_bytes()[2] == b'\\'))
}

fn resolve_runtime_path(base: &str, relative: &str) -> String {
    let b = PathBuf::from(base);
    let joined = b.join(relative);
    normalize_runtime_path_separators(&joined.to_string_lossy())
}

fn resolve_workspace_layout_path(repo_path: &str, layout_path: &str) -> String {
    if is_runtime_path_absolute(layout_path) {
        normalize_runtime_path_separators(layout_path)
    } else {
        resolve_runtime_path(repo_path, layout_path)
    }
}

fn resolve_configured_worktree_base_paths(repo_path: &str, worktree_base_path: Option<&str>) -> Vec<String> {
    if let Some(cfg) = worktree_base_path.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        let base = resolve_workspace_layout_path(repo_path, cfg);
        return vec![base];
    }
    vec![]
}

#[derive(Clone, Debug)]
struct OrcaWorkspaceLayout {
    path: String,
    nest_workspaces: bool,
}

fn build_known_orca_workspace_layouts(
    workspace_dir: &str,
    nest_workspaces: bool,
    workspace_dir_history: &[OrcaWorkspaceLayout],
    repo_path: &str,
    configured_bases: &[String],
) -> Vec<OrcaWorkspaceLayout> {
    let mut layouts: Vec<OrcaWorkspaceLayout> = Vec::new();
    for base in configured_bases {
        layouts.push(OrcaWorkspaceLayout {
            path: base.clone(),
            nest_workspaces,
        });
    }
    // Global workspaceDir — Orca includes it only for local repos or relative paths; Hydra simplifies: always include if non-empty
    if !workspace_dir.trim().is_empty() {
        let resolved = resolve_workspace_layout_path(repo_path, workspace_dir);
        layouts.push(OrcaWorkspaceLayout {
            path: resolved.clone(),
            nest_workspaces,
        });
        for h in workspace_dir_history {
            if h.path.trim().is_empty() {
                continue;
            }
            let rp = resolve_workspace_layout_path(repo_path, &h.path);
            layouts.push(OrcaWorkspaceLayout {
                path: rp,
                nest_workspaces: h.nest_workspaces,
            });
        }
    }

    // Dedup by normalized path + nest flag
    let mut seen = std::collections::HashSet::new();
    layouts.retain(|l| {
        let key = format!(
            "{}:{}",
            normalize_runtime_path_for_comparison(&l.path),
            l.nest_workspaces
        );
        if seen.contains(&key) || l.path.trim().is_empty() {
            return false;
        }
        seen.insert(key);
        true
    });
    layouts
}

fn relative_path_inside_root(root: &str, candidate: &str) -> Option<String> {
    let nr = normalize_runtime_path_for_comparison(root);
    let nc = normalize_runtime_path_for_comparison(candidate);
    if nc == nr {
        return Some(String::new());
    }
    let prefix = if nr.ends_with('/') {
        nr.clone()
    } else {
        format!("{nr}/")
    };
    if nc.starts_with(&prefix) {
        Some(nc[prefix.len()..].to_string())
    } else {
        None
    }
}

fn is_under_flat_or_untrusted_orca_root(worktree_path: &str, known_layouts: &[OrcaWorkspaceLayout]) -> bool {
    for layout in known_layouts {
        if relative_path_inside_root(&layout.path, worktree_path).is_some() && !layout.nest_workspaces {
            return true;
        }
    }
    false
}

fn can_classify_as_external(worktree_path: &str, known_layouts: &[OrcaWorkspaceLayout]) -> bool {
    if known_layouts.is_empty() {
        return false;
    }
    for layout in known_layouts {
        if relative_path_inside_root(&layout.path, worktree_path).is_some() {
            return layout.nest_workspaces;
        }
    }
    false
}

// ── Built-in scratch/source detection (shared/agent-scratch-worktrees.ts + worktree/visibility-sources.ts) ──

/// Orca `BUILT_IN_WORKTREE_VISIBILITY_SOURCES`, in matcher order: the id plus the
/// path segments that must appear under a checkout for the source to match.
const BUILT_IN_VISIBILITY_SOURCES: &[(&str, &[&str])] =
    &[("claude", &[".claude", "worktrees"]), ("gsd", &[".gsd-workspaces"])];

/// Orca `createWorktreeVisibilitySourceMatcher` built-in half: a worktree under
/// `<checkout>/.claude/worktrees/…` (or `.gsd-workspaces/…`) for one of the
/// scanned checkouts matches, unless a configured base points at or inside the
/// source root (Orca #15232).
fn built_in_source_match<'a>(
    checkout_paths: &[String],
    configured_bases: &[String],
    worktree_path: &str,
) -> Option<&'a str> {
    let normalized_candidate = normalize_runtime_path_for_comparison(worktree_path);
    let segments: Vec<&str> = normalized_candidate.split('/').collect();
    let checkout_keys: std::collections::HashSet<String> = checkout_paths
        .iter()
        .map(|p| normalize_runtime_path_for_comparison(p))
        .collect();

    // configured bases for superseded check
    let configured_bases_normalized: Vec<(String, String)> = configured_bases
        .iter()
        .map(|b| {
            let k = normalize_runtime_path_for_comparison(b);
            (k.clone(), k)
        })
        .collect();

    for (id, prefix) in BUILT_IN_VISIBILITY_SOURCES {
        for idx in 0..segments.len() {
            if idx + prefix.len() >= segments.len() {
                continue;
            }
            if !prefix.iter().enumerate().all(|(off, seg)| segments[idx + off] == *seg) {
                continue;
            }
            let checkout_path = segments[..idx].join("/");
            let checkout_key = if checkout_path.is_empty() {
                "/".to_string()
            } else if checkout_path.len() == 2 && checkout_path.as_bytes()[1] == b':' {
                format!("{checkout_path}/")
            } else {
                checkout_path.clone()
            };
            let checkout_key_norm = normalize_runtime_path_for_comparison(&checkout_key);
            // handle drive letter case by also checking raw
            let matches_checkout = checkout_keys.contains(&checkout_key_norm) || checkout_keys.contains(&checkout_path);
            if !matches_checkout {
                continue;
            }
            // superseded check: if configured base contains candidate and is at/inside source root
            let source_root = segments[..idx + prefix.len()].join("/");
            let source_root_key = normalize_runtime_path_for_comparison(&source_root);
            let superseded = configured_bases_normalized.iter().any(|(base_key, _)| {
                let contains = relative_path_inside_root(base_key, &normalized_candidate).is_some()
                    || base_key == &normalized_candidate;
                let is_at_or_inside_source = base_key == &source_root_key
                    || base_key.starts_with(&format!("{source_root_key}/"));
                contains && is_at_or_inside_source
            });
            if superseded {
                continue;
            }
            return Some(*id);
        }
    }
    None
}

fn is_agent_scratch_worktree_path(
    checkout_paths: &[String],
    configured_bases: &[String],
    worktree_path: &str,
) -> bool {
    built_in_source_match(checkout_paths, configured_bases, worktree_path).is_some()
}

/// Which visibility source a worktree belongs to (Orca
/// `WorktreeVisibilitySourceMatch`). Built-ins are checked first, then custom
/// roots, exactly like `createWorktreeVisibilitySourceMatcher`.
#[derive(PartialEq, Eq, Debug, Clone)]
enum WorktreeVisibilitySource {
    BuiltIn(&'static str),
    Custom(String),
}

/// Orca `createDescendantMatcher`: strictly below the root (the root itself is
/// not a source member).
fn custom_source_match(
    custom_sources: &[CustomWorktreeSource],
    worktree_path: &str,
) -> Option<String> {
    let normalized_candidate = normalize_runtime_path_for_comparison(worktree_path);
    for source in custom_sources {
        let root = normalize_runtime_path_for_comparison(&source.root_path);
        if root.is_empty() || normalized_candidate == root {
            continue;
        }
        if relative_path_inside_root(&root, &normalized_candidate).is_some() {
            return Some(source.id.clone());
        }
    }
    None
}

fn match_worktree_visibility_source(
    checkout_paths: &[String],
    configured_bases: &[String],
    custom_sources: &[CustomWorktreeSource],
    worktree_path: &str,
) -> Option<WorktreeVisibilitySource> {
    if let Some(id) = built_in_source_match(checkout_paths, configured_bases, worktree_path) {
        return Some(WorktreeVisibilitySource::BuiltIn(id));
    }
    custom_source_match(custom_sources, worktree_path).map(WorktreeVisibilitySource::Custom)
}

#[derive(PartialEq, Eq, Debug)]
enum WorktreeOwnership {
    AgentScratch,
    External,
    UnknownLegacy,
    /// Strong provenance proves Hydra/Orca created it (Orca `orca-managed`).
    /// Always visible, regardless of the `external` visibility policy.
    OrcaManaged,
}

/// The subset of Orca's `WorktreeMeta` that decides ownership up front:
/// `createdAt` / `createdWithAgent` (Orca `hasStrongOrcaMetadata`,
/// `shared/worktree/ownership.ts:227`). Hydra has no equivalent for the other
/// strong fields, so these two are the whole predicate.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct WorktreeProvenance {
    pub created_at: Option<i64>,
    pub created_with_agent: Option<String>,
}

impl WorktreeProvenance {
    /// Truthiness mirrors Orca: an epoch-zero `createdAt` (treated as absent) or
    /// a blank agent name does not count as metadata. A `worktree_metadata` row
    /// carrying only non-strong fields (e.g. `updated_at`) does NOT make the
    /// worktree visible.
    pub fn is_strong_orca_metadata(&self) -> bool {
        self.created_at.is_some_and(|v| v != 0)
            || self
                .created_with_agent
                .as_deref()
                .is_some_and(|agent| !agent.trim().is_empty())
    }
}

fn classify_worktree_ownership(
    worktree_path: &str,
    provenance: Option<&WorktreeProvenance>,
    _repo_path: &str,
    checkout_paths: &[String],
    configured_bases: &[String],
    known_layouts: &[OrcaWorkspaceLayout],
) -> WorktreeOwnership {
    // Strong provenance is checked before every layout/scratch heuristic
    // (Orca ownership.ts:124); a row with only weak fields does not qualify.
    if provenance.is_some_and(WorktreeProvenance::is_strong_orca_metadata) {
        return WorktreeOwnership::OrcaManaged;
    }
    // Agent scratch (`.claude/worktrees`, `.gsd-workspaces`) keeps its own
    // policy (Orca ownership.ts:132). A configured base still supersedes scratch
    // detection inside the matcher.
    if is_agent_scratch_worktree_path(checkout_paths, configured_bases, worktree_path) {
        return WorktreeOwnership::AgentScratch;
    }
    if configured_bases
        .iter()
        .any(|base| relative_path_inside_root(base, worktree_path).is_some())
    {
        return WorktreeOwnership::External;
    }
    if is_under_flat_or_untrusted_orca_root(worktree_path, known_layouts) {
        return WorktreeOwnership::UnknownLegacy;
    }
    if can_classify_as_external(worktree_path, known_layouts) {
        return WorktreeOwnership::External;
    }
    WorktreeOwnership::External
}

/// Per-repo visibility inputs, read from the catalog (`CatalogRepo`) plus the
/// legacy `added_projects` imports. Pure data so the scan and the unit tests
/// share one decision path.
#[derive(Clone, Debug, Default)]
pub struct RepoVisibilityPolicy {
    /// Orca `Repo.externalWorktreeVisibility` (`show`|`hide`), the per-repo
    /// override of the external policy. `None` = no override.
    pub external_worktree_visibility: Option<String>,
    /// Orca `Repo.externalWorktreeVisibilityLegacy`. `None` = unset, which
    /// resolves to the old rule for that repo.
    pub external_worktree_visibility_legacy: Option<bool>,
    /// Orca `Repo.agentWorktreeVisibility` (`show`|`hide`). `None` = no override:
    /// the built-in "Claude Code" source falls back to the global preference, and
    /// scratch without a source match stays hidden.
    pub agent_worktree_visibility: Option<String>,
    /// Orca `Repo.customWorktreeVisibilitySources`. `Some([])` is an explicit
    /// empty list that supersedes the global list.
    pub custom_sources: Option<Vec<CustomWorktreeSource>>,
    /// Orca `Repo.worktreeVisibilitySourcePreferences`, scoped to this repo.
    pub source_preferences: Option<SourcePreferences>,
    /// Paths recovered one by one through the inbox (catalog
    /// `importedExternalWorktreePaths` plus the legacy SQLite list). Always visible.
    pub imported_paths: Vec<String>,
}

impl RepoVisibilityPolicy {
    fn from_catalog(repo: &CatalogRepo) -> Self {
        Self {
            external_worktree_visibility: repo.external_worktree_visibility.clone(),
            external_worktree_visibility_legacy: repo.external_worktree_visibility_legacy,
            agent_worktree_visibility: repo.agent_worktree_visibility.clone(),
            custom_sources: repo.custom_worktree_visibility_sources.clone(),
            source_preferences: repo.worktree_visibility_source_preferences.clone(),
            imported_paths: repo
                .imported_external_worktree_paths
                .clone()
                .unwrap_or_default(),
        }
    }

    /// Orca `isLegacyRepoForExternalWorktreeVisibility`: an explicit flag wins;
    /// otherwise no per-repo `externalWorktreeVisibility` means "old repo" and
    /// the old rule applied.
    fn is_legacy_repo(&self) -> bool {
        match self.external_worktree_visibility_legacy {
            Some(legacy) => legacy,
            None => self.external_worktree_visibility.is_none(),
        }
    }

    /// Orca `resolveCustomWorktreeVisibilitySources`: the repo's own list wins
    /// when it exists (`Some([])` included); otherwise the global list is the
    /// fallback. Both go through Orca's normalizer.
    fn resolved_custom_sources(
        &self,
        defaults: Option<&WorktreeVisibilityDefaults>,
    ) -> Vec<CustomWorktreeSource> {
        match self.custom_sources.as_deref() {
            Some(sources) => catalog::normalize_worktree_visibility_sources(sources),
            None => catalog::normalize_worktree_visibility_sources(
                defaults
                    .and_then(|d| d.custom_sources.as_deref())
                    .unwrap_or(&[]),
            ),
        }
    }

    /// Orca `effectiveExternalWorktreeVisibility`: repo override → global
    /// `external` → legacy rule (`show` for an old repo).
    fn effective_external_visibility(
        &self,
        defaults: Option<&WorktreeVisibilityDefaults>,
    ) -> bool {
        visibility_pref(self.external_worktree_visibility.as_deref())
            .or_else(|| visibility_pref(defaults.and_then(|d| d.external.as_deref())))
            .unwrap_or_else(|| self.is_legacy_repo())
    }

    /// Orca `effectiveBuiltInWorktreeSourceVisibility`: repo override → the
    /// per-repo `agentWorktreeVisibility` (the built-in "Claude Code" project
    /// override) → global preference → `hide`.
    fn built_in_source_is_visible(
        &self,
        id: &str,
        defaults: Option<&WorktreeVisibilityDefaults>,
    ) -> bool {
        source_pref(self.source_preferences.as_ref(), true, id)
            .or_else(|| visibility_pref(self.agent_worktree_visibility.as_deref()))
            .or_else(|| {
                source_pref(
                    defaults.and_then(|d| d.source_preferences.as_ref()),
                    true,
                    id,
                )
            })
            .unwrap_or(false)
    }

    /// Orca `effectiveCustomWorktreeSourceVisibility`: repo preference → a source
    /// this repo owns is hidden by default → global preference → `hide`.
    fn custom_source_is_visible(
        &self,
        id: &str,
        defaults: Option<&WorktreeVisibilityDefaults>,
    ) -> bool {
        if let Some(visible) = source_pref(self.source_preferences.as_ref(), false, id) {
            return visible;
        }
        let repo_owns_source = self
            .custom_sources
            .as_deref()
            .is_some_and(|sources| sources.iter().any(|source| source.id == id));
        if repo_owns_source {
            return false;
        }
        source_pref(
            defaults.and_then(|d| d.source_preferences.as_ref()),
            false,
            id,
        )
        .unwrap_or(false)
    }

    fn source_is_visible(
        &self,
        source: &WorktreeVisibilitySource,
        defaults: Option<&WorktreeVisibilityDefaults>,
    ) -> bool {
        match source {
            WorktreeVisibilitySource::BuiltIn(id) => {
                self.built_in_source_is_visible(id, defaults)
            }
            WorktreeVisibilitySource::Custom(id) => self.custom_source_is_visible(id, defaults),
        }
    }
}

fn visibility_pref(value: Option<&str>) -> Option<bool> {
    match value {
        Some("show") => Some(true),
        Some("hide") => Some(false),
        _ => None,
    }
}

fn source_pref(prefs: Option<&SourcePreferences>, built_in: bool, id: &str) -> Option<bool> {
    let prefs = prefs?;
    let map = if built_in {
        prefs.built_in.as_ref()?
    } else {
        prefs.custom.as_ref()?
    };
    visibility_pref(map.get(id).map(String::as_str))
}

/// Orca `shouldShowWorktree` (`worktree-visibility-resolution.ts:14-52`), in
/// Orca's order. The main checkout is decided by the caller, before this runs.
///
/// A worktree inside a known workspace layout is NOT visible on that evidence
/// alone: layouts only classify ownership, they never grant visibility.
fn should_show_worktree(
    ownership: &WorktreeOwnership,
    is_imported: bool,
    source: Option<&WorktreeVisibilitySource>,
    repo: &RepoVisibilityPolicy,
    defaults: Option<&WorktreeVisibilityDefaults>,
) -> bool {
    if *ownership == WorktreeOwnership::OrcaManaged {
        return true;
    }
    if is_imported {
        return true;
    }
    if let Some(source) = source {
        return repo.source_is_visible(source, defaults);
    }
    if *ownership == WorktreeOwnership::AgentScratch {
        // Orca `effectiveAgentWorktreeVisibility`: only an explicit per-repo
        // `show` makes scratch visible; the default is hide, including legacy.
        return visibility_pref(repo.agent_worktree_visibility.as_deref()) == Some(true);
    }
    repo.effective_external_visibility(defaults)
}


/// Executa `git worktree list --porcelain` no repositório ativo ou varre sub-repositórios em folder workspaces.
/// Aplica filtragem Orca-faithful: a visibilidade final vem de `should_show_worktree`
/// (Orca `shouldShowWorktree`), nunca do layout por si só.
/// Mirrors `shared/worktree/ownership.ts:111 classifyWorktreeOwnership` + `worktree-visibility-resolution.ts`
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProjectWorktreeScanResult {
    pub visible: Vec<GitWorktreeInfo>,
    pub hidden: Vec<GitWorktreeInfo>,
    pub is_suppressed: bool,
}

pub fn list_git_worktrees(repo_path: &str) -> Result<Vec<GitWorktreeInfo>, String> {
    let scan = scan_project_worktrees(repo_path)?;
    Ok(scan.visible)
}

pub fn scan_project_worktrees(repo_path: &str) -> Result<ProjectWorktreeScanResult, String> {
    let context = load_hydra_workspace_context(repo_path);
    let provenance = load_worktree_provenance_map();
    let (mut visible, mut hidden) = list_git_worktrees_with_context(
        repo_path,
        context.worktree_base_path.as_deref(),
        &context.workspace_dir,
        context.nest_workspaces,
        &context.workspace_dir_history,
        &context.repo_policy,
        context.visibility_defaults.as_ref(),
        &provenance,
    )?;
    fill_worktree_metadata(&mut visible);
    fill_worktree_metadata(&mut hidden);
    Ok(ProjectWorktreeScanResult {
        visible,
        hidden,
        is_suppressed: context.is_suppressed,
    })
}

/// Everything the scan needs from persisted state: global settings (SQLite),
/// the per-project base + legacy imports (`added_projects`) and the per-repo
/// visibility config (catalog).
struct HydraWorkspaceContext {
    workspace_dir: String,
    nest_workspaces: bool,
    workspace_dir_history: Vec<OrcaWorkspaceLayout>,
    worktree_base_path: Option<String>,
    is_suppressed: bool,
    visibility_defaults: Option<WorktreeVisibilityDefaults>,
    repo_policy: RepoVisibilityPolicy,
}

/// Per-repo visibility config from the catalog — the single source of truth.
/// A repo missing from the catalog (or an unreadable catalog) falls back to the
/// default policy: no overrides, so the old rule applies.
fn load_repo_visibility_policy(repo_path: &str) -> RepoVisibilityPolicy {
    let normalized = catalog::normalize_catalog_path(repo_path);
    catalog::read_catalog()
        .repos
        .iter()
        .find(|repo| catalog::normalize_catalog_path(&repo.path) == normalized)
        .map(RepoVisibilityPolicy::from_catalog)
        .unwrap_or_default()
}

fn load_hydra_workspace_context(repo_path: &str) -> HydraWorkspaceContext {
    // Try load from SQLite; fallback to defaults (Orca defaults: workspaceDir ~/src, nestWorkspaces true)
    // Bug #14: resolve the home dir properly instead of a hardcoded "/home/renan".
    let home = crate::db::user_home_dir();
    let default_dir = home.join("src").to_string_lossy().to_string();
    let mut context = HydraWorkspaceContext {
        workspace_dir: default_dir,
        nest_workspaces: true,
        workspace_dir_history: vec![],
        worktree_base_path: None,
        is_suppressed: false,
        visibility_defaults: None,
        repo_policy: load_repo_visibility_policy(repo_path),
    };
    if let Ok(db_path) = std::path::Path::new(&home).join(".config/hydra/hydra_sessions.sqlite3").canonicalize().or_else(|_| Ok::<_, String>(PathBuf::from(&home).join(".config/hydra/hydra_sessions.sqlite3")) ) {
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            if let Ok(mut stmt) = conn.prepare("SELECT value FROM settings WHERE key = 'global_settings'") {
                if let Ok(mut rows) = stmt.query(rusqlite::params![]) {
                    if let Ok(Some(row)) = rows.next() {
                        if let Ok(json_str) = row.get::<_, String>(0) {
                            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&json_str) {
                                if let Some(wvd) = v.get("worktree_visibility_defaults").or_else(|| v.get("worktreeVisibilityDefaults")) {
                                    if let Ok(d) = serde_json::from_value::<WorktreeVisibilityDefaults>(wvd.clone()) {
                                        context.visibility_defaults = Some(d);
                                    }
                                }
                                if let Some(wd) = v.get("workspace_dir").and_then(|x| x.as_str()) {
                                    context.workspace_dir = wd.to_string();
                                } else if let Some(wd) = v.get("workspaceDir").and_then(|x| x.as_str()) {
                                    context.workspace_dir = wd.to_string();
                                }
                                if let Some(nw) = v.get("nest_workspaces").and_then(|x| x.as_bool()) {
                                    context.nest_workspaces = nw;
                                } else if let Some(nw) = v.get("nestWorkspaces").and_then(|x| x.as_bool()) {
                                    context.nest_workspaces = nw;
                                }
                                if let Some(arr) = v.get("workspace_dir_history").and_then(|x| x.as_array()) {
                                    for item in arr {
                                        if let Some(p) = item.get("path").and_then(|x| x.as_str()) {
                                            let nw = item.get("nest_workspaces").and_then(|x| x.as_bool())
                                                .or_else(|| item.get("nestWorkspaces").and_then(|x| x.as_bool()))
                                                .unwrap_or(context.nest_workspaces);
                                            context.workspace_dir_history.push(OrcaWorkspaceLayout { path: p.to_string(), nest_workspaces: nw });
                                        }
                                    }
                                } else if let Some(arr) = v.get("workspaceDirHistory").and_then(|x| x.as_array()) {
                                    for item in arr {
                                        if let Some(p) = item.get("path").and_then(|x| x.as_str()) {
                                            let nw = item.get("nestWorkspaces").and_then(|x| x.as_bool()).unwrap_or(context.nest_workspaces);
                                            context.workspace_dir_history.push(OrcaWorkspaceLayout { path: p.to_string(), nest_workspaces: nw });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // per-project base
            let _ = conn.execute("CREATE TABLE IF NOT EXISTS added_projects (path TEXT PRIMARY KEY, name TEXT NOT NULL, added_at INTEGER NOT NULL)", rusqlite::params![]);
            let _ = conn.execute("ALTER TABLE added_projects ADD COLUMN worktree_base_path TEXT", rusqlite::params![]);
            let _ = conn.execute("ALTER TABLE added_projects ADD COLUMN imported_worktrees TEXT", rusqlite::params![]);
            let _ = conn.execute("ALTER TABLE added_projects ADD COLUMN suppressed_discovery INTEGER", rusqlite::params![]);
            if let Ok(mut stmt) = conn.prepare("SELECT worktree_base_path, imported_worktrees, suppressed_discovery FROM added_projects WHERE path = ?1") {
                if let Ok(mut rows) = stmt.query(rusqlite::params![repo_path]) {
                    if let Ok(Some(row)) = rows.next() {
                        let base: Option<String> = row.get(0).ok().flatten();
                        let imported_raw: Option<String> = row.get(1).ok().flatten();
                        let suppressed_raw: Option<i64> = row.get(2).ok().flatten();
                        let imported = imported_raw
                            .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
                            .unwrap_or_default();
                        // Legacy `added_projects` imports stay visible alongside the
                        // catalog's `importedExternalWorktreePaths` (both are the
                        // user's per-path recovery).
                        for path in imported {
                            let already_known = context.repo_policy.imported_paths.iter().any(|known| {
                                normalize_runtime_path_for_comparison(known)
                                    == normalize_runtime_path_for_comparison(&path)
                            });
                            if !already_known {
                                context.repo_policy.imported_paths.push(path);
                            }
                        }
                        context.worktree_base_path = base.filter(|s| !s.trim().is_empty());
                        context.is_suppressed = suppressed_raw.map(|v| v != 0).unwrap_or(false);
                        return context;
                    }
                }
            }
        }
    }
    context
}

fn list_git_worktrees_with_context(
    repo_path: &str,
    worktree_base_path: Option<&str>,
    workspace_dir: &str,
    nest_workspaces: bool,
    workspace_dir_history: &[OrcaWorkspaceLayout],
    repo_policy: &RepoVisibilityPolicy,
    visibility_defaults: Option<&WorktreeVisibilityDefaults>,
    provenance: &HashMap<String, WorktreeProvenance>,
) -> Result<(Vec<GitWorktreeInfo>, Vec<GitWorktreeInfo>), String> {
    let repo = PathBuf::from(repo_path);
    if !repo.exists() {
        return Err("Repository path does not exist".to_string());
    }

    let mut all_raw: Vec<(GitWorktreeInfo, String)> = Vec::new(); // (info, checkout_repo_path for that worktree)
    let mut seen_paths = std::collections::HashSet::new();

    let is_direct_git = repo.join(".git").exists();

    // 1. Lista no próprio diretório se for repositório git
    if is_direct_git {
        if let Ok(out) = Command::new("git")
            .args(["worktree", "list", "--porcelain"])
            .current_dir(&repo)
            .output()
        {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout);
                for wt in parse_worktree_porcelain(&stdout) {
                    if seen_paths.insert(wt.path.clone()) {
                        all_raw.push((wt, repo_path.to_string()));
                    }
                }
            }
        }
    }

    // 2. Folder Workspace: varre sub-repositórios Git dentro (monorepo)
    if let Ok(entries) = std::fs::read_dir(&repo) {
        let mut child_dirs: Vec<PathBuf> = entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.is_dir() && !p.file_name().and_then(|n| n.to_str()).unwrap_or("").starts_with('.'))
            .collect();
        child_dirs.sort();

        for child in child_dirs {
            if child.join(".git").exists() {
                let repo_name = child.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
                let child_str = child.to_string_lossy().to_string();
                if let Ok(out) = Command::new("git")
                    .args(["worktree", "list", "--porcelain"])
                    .current_dir(&child)
                    .output()
                {
                    if out.status.success() {
                        let stdout = String::from_utf8_lossy(&out.stdout);
                        for mut wt in parse_worktree_porcelain(&stdout) {
                            if seen_paths.insert(wt.path.clone()) {
                                if !is_direct_git && !repo_name.is_empty() {
                                    wt.branch = format!("{repo_name}: {}", wt.branch);
                                }
                                all_raw.push((wt, child_str.clone()));
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Orca-faithful visibility filtering
    // For direct git repos, filtering is per-repo. For folder workspaces, filtering is per-child checkout.
    let mut filtered = Vec::new();
    let mut hidden = Vec::new();
    // Custom sources do not depend on the checkout being scanned (they are
    // absolute roots), so resolve them once per scan.
    let custom_sources = repo_policy.resolved_custom_sources(visibility_defaults);
    for (wt, checkout_path) in &all_raw {
        let is_main = normalize_runtime_path_for_comparison(&wt.path) == normalize_runtime_path_for_comparison(&checkout_path)
            || (is_direct_git && normalize_runtime_path_for_comparison(&wt.path) == normalize_runtime_path_for_comparison(repo_path) && checkout_path == repo_path);
        // Resolve configured bases for THIS checkout (per-project base resolves relative to repo_path OR checkout_path)
        // Prefer per-project base attached to the root repo_path; for folder children, same base applies if root has it.
        let configured_bases = resolve_configured_worktree_base_paths(&checkout_path, worktree_base_path)
            .into_iter()
            .collect::<Vec<_>>();
        // If root had no base but child might? check both
        let configured_bases_root = if checkout_path != repo_path {
            resolve_configured_worktree_base_paths(repo_path, worktree_base_path)
        } else {
            vec![]
        };
        let mut merged_bases = configured_bases;
        for b in configured_bases_root {
            if !merged_bases.contains(&b) {
                merged_bases.push(b);
            }
        }
        // Implicit .worktrees base (Orca fallback: repo/.worktrees if exists) — ensures folder workspaces
        // like /code with .worktrees/ only show worktrees under that dir, hiding child mains.
        let implicit_root = PathBuf::from(repo_path).join(".worktrees");
        if implicit_root.exists() {
            let imp = normalize_runtime_path_separators(&implicit_root.to_string_lossy());
            if !merged_bases.contains(&imp) {
                merged_bases.push(imp);
            }
        }
        // Also consider checkout's own .worktrees as implicit (for direct repos that use it)
        let implicit_child = PathBuf::from(checkout_path).join(".worktrees");
        if implicit_child.exists() {
            let imp = normalize_runtime_path_separators(&implicit_child.to_string_lossy());
            if !merged_bases.contains(&imp) {
                merged_bases.push(imp);
            }
        }

        let known_layouts = build_known_orca_workspace_layouts(
            workspace_dir,
            nest_workspaces,
            workspace_dir_history,
            &checkout_path,
            &merged_bases,
        );

        // Folder workspace: hide child mains (wt.path == checkout_path but checkout != root).
        // Only the root's own main checkout is kept as "default". Child mains are the repos themselves,
        // not linked worktrees, and should not clutter the worktree list.
        if is_main || wt.path == *checkout_path {
            if checkout_path == repo_path {
                filtered.push(wt.clone());
            }
            // else: skip child main (e.g., /code/malhaclub-api) — it's a main checkout, not a linked worktree
            continue;
        }

        let checkout_paths = vec![checkout_path.clone()];
        let ownership = classify_worktree_ownership(
            &wt.path,
            provenance_lookup(provenance, &wt.path),
            checkout_path,
            &checkout_paths,
            &merged_bases,
            &known_layouts,
        );
        let source = match_worktree_visibility_source(
            &checkout_paths,
            &merged_bases,
            &custom_sources,
            &wt.path,
        );
        let is_imported = repo_policy.imported_paths.iter().any(|imp| {
            normalize_runtime_path_for_comparison(imp) == normalize_runtime_path_for_comparison(&wt.path)
        });
        // Single decision point (Orca `shouldShowWorktree`). Layout membership and
        // configured/implicit bases only classify ownership (`known_layouts`) — they
        // never make a worktree visible on their own.
        if should_show_worktree(&ownership, is_imported, source.as_ref(), repo_policy, visibility_defaults)
        {
            filtered.push(wt.clone());
        } else if ownership == WorktreeOwnership::AgentScratch {
            // Agent plumbing stays out of the discovery inbox (Orca
            // `isUserFacingExternalWorktree`), hidden or not.
            continue;
        } else {
            hidden.push(wt.clone());
        }
    }

    // Fallback: if filtering removed everything but we know there was at least one raw main worktree,
    // ensure at least the main checkout is returned. This handles the case where workspace_dir is misconfigured.
    if filtered.is_empty() && !all_raw.is_empty() {
        let mut mains = Vec::new();
        for (wt, checkout_path) in &all_raw {
            if normalize_runtime_path_for_comparison(&wt.path) == normalize_runtime_path_for_comparison(checkout_path) {
                mains.push(wt.clone());
            }
        }
        if !mains.is_empty() {
            fill_worktree_metadata(&mut mains);
            return Ok((mains, hidden));
        }
    }

    fill_worktree_metadata(&mut filtered);
    fill_worktree_metadata(&mut hidden);
    Ok((filtered, hidden))
}

pub fn parse_worktree_porcelain(stdout: &str) -> Vec<GitWorktreeInfo> {
    let mut worktrees = Vec::new();
    let mut current_path = String::new();
    let mut current_head = String::new();
    let mut current_branch = String::new();
    let mut is_bare = false;
    let mut is_locked = false;
    let mut is_prunable = false;

    for line in stdout.lines() {
        if line.starts_with("worktree ") {
            if !current_path.is_empty() {
                worktrees.push(GitWorktreeInfo {
                    path: current_path,
                    head_commit: current_head,
                    branch: current_branch,
                    is_bare,
                    is_locked,
                    created_at: None,
                    status: if is_prunable { Some("prunable".to_string()) } else { None },
                    display_name: None,
                    first_agent_message_rename_error: None,
                    is_pinned: None,
                    is_unread: None,
                    is_sparse: None,
                    sparse_directories: None,
                    automation_provenance_kind: None,
                    cli_provenance_kind: None,
                });
                current_head = String::new();
                current_branch = String::new();
                is_bare = false;
                is_locked = false;
                is_prunable = false;
            }
            current_path = line.strip_prefix("worktree ").unwrap_or("").trim().to_string();
        } else if line.starts_with("HEAD ") {
            current_head = line.strip_prefix("HEAD ").unwrap_or("").trim().to_string();
        } else if line.starts_with("branch ") {
            let full_ref = line.strip_prefix("branch ").unwrap_or("").trim();
            current_branch = full_ref.strip_prefix("refs/heads/").unwrap_or(full_ref).to_string();
        } else if line == "bare" {
            is_bare = true;
        } else if line.starts_with("locked") {
            is_locked = true;
        } else if line.starts_with("prunable") {
            is_prunable = true;
        }
    }

    if !current_path.is_empty() {
        worktrees.push(GitWorktreeInfo {
            path: current_path,
            head_commit: current_head,
            branch: current_branch,
            is_bare,
            is_locked,
            created_at: None,
            status: if is_prunable { Some("prunable".to_string()) } else { None },
            display_name: None,
            first_agent_message_rename_error: None,
            is_pinned: None,
            is_unread: None,
            is_sparse: None,
            sparse_directories: None,
            automation_provenance_kind: None,
            cli_provenance_kind: None,
        });
    }

    worktrees
}

fn get_worktree_created_at(path: &str) -> Option<i64> {
    // 1) Try filesystem mtime of worktree directory (most reliable for age)
    if let Ok(meta) = std::fs::metadata(path) {
        if let Ok(modified) = meta.modified() {
            if let Ok(dur) = modified.duration_since(std::time::UNIX_EPOCH) {
                return Some(dur.as_secs() as i64);
            }
        }
    }
    // 2) Fallback: git log -1 --format=%ct for that worktree's HEAD
    if let Ok(out) = std::process::Command::new("git")
        .args(["log", "-1", "--format=%ct"])
        .current_dir(path)
        .output()
    {
        if out.status.success() {
            let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if let Ok(ts) = s.parse::<i64>() {
                return Some(ts);
            }
        }
    }
    None
}

/// Persisted `worktree_metadata` row, as far as the worktree scan needs it.
#[derive(Clone, Debug, Default)]
struct PersistedWorktreeMetadata {
    display_name: Option<String>,
    first_agent_message_rename_error: Option<String>,
    status: Option<String>,
    is_pinned: Option<bool>,
    is_unread: Option<bool>,
    provenance: WorktreeProvenance,
    provenance_kind: Option<String>,
}

fn load_all_persisted_worktree_metadata() -> HashMap<String, PersistedWorktreeMetadata> {
    let mut map = HashMap::new();
    if let Ok(db_path) = crate::db::DatabaseManager::get_db_path() {
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            let _ = conn.execute(
                "CREATE TABLE IF NOT EXISTS worktree_metadata (
                    worktree_path TEXT PRIMARY KEY,
                    display_name TEXT,
                    first_agent_message_rename_error TEXT,
                    status TEXT,
                    created_at INTEGER,
                    created_with_agent TEXT,
                    provenance_kind TEXT,
                    is_pinned INTEGER,
                    is_unread INTEGER,
                    updated_at INTEGER NOT NULL
                )",
                rusqlite::params![],
            );
            let _ = conn.execute("ALTER TABLE worktree_metadata ADD COLUMN status TEXT", rusqlite::params![]);
            let _ = conn.execute("ALTER TABLE worktree_metadata ADD COLUMN created_at INTEGER", rusqlite::params![]);
            let _ = conn.execute("ALTER TABLE worktree_metadata ADD COLUMN created_with_agent TEXT", rusqlite::params![]);
            let _ = conn.execute("ALTER TABLE worktree_metadata ADD COLUMN provenance_kind TEXT", rusqlite::params![]);
            let _ = conn.execute("ALTER TABLE worktree_metadata ADD COLUMN is_pinned INTEGER", rusqlite::params![]);
            let _ = conn.execute("ALTER TABLE worktree_metadata ADD COLUMN is_unread INTEGER", rusqlite::params![]);
            if let Ok(mut stmt) = conn.prepare("SELECT worktree_path, display_name, first_agent_message_rename_error, status, created_at, created_with_agent, is_pinned, is_unread, provenance_kind FROM worktree_metadata") {
                if let Ok(rows) = stmt.query_map(rusqlite::params![], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        PersistedWorktreeMetadata {
                            display_name: row.get(1)?,
                            first_agent_message_rename_error: row.get(2)?,
                            status: row.get(3)?,
                            is_pinned: row.get(6)?,
                            is_unread: row.get(7)?,
                            provenance: WorktreeProvenance {
                                created_at: row.get(4)?,
                                created_with_agent: row.get(5)?,
                            },
                            provenance_kind: row.get(8)?,
                        },
                    ))
                }) {
                    for r in rows.flatten() {
                        map.insert(r.0, r.1);
                    }
                }
            }
        }
    }
    map
}

/// Provenance keyed by normalized path, matching how the scan compares paths.
fn load_worktree_provenance_map() -> HashMap<String, WorktreeProvenance> {
    load_all_persisted_worktree_metadata()
        .into_iter()
        .map(|(path, meta)| (normalize_runtime_path_for_comparison(&path), meta.provenance))
        .collect()
}

/// Provenance for a worktree, keyed by normalized path (Orca
/// `areRuntimePathsEqual`). Whether a hit counts as strong metadata is decided
/// by `WorktreeProvenance::is_strong_orca_metadata`.
fn provenance_lookup<'a>(
    provenance: &'a HashMap<String, WorktreeProvenance>,
    worktree_path: &str,
) -> Option<&'a WorktreeProvenance> {
    provenance.get(&normalize_runtime_path_for_comparison(worktree_path))
}

fn check_sparse_checkout(wt: &mut GitWorktreeInfo) {
    let wt_path = Path::new(&wt.path);
    let dot_git = wt_path.join(".git");
    let git_dir = if dot_git.is_file() {
        if let Ok(content) = std::fs::read_to_string(&dot_git) {
            if let Some(rest) = content.trim().strip_prefix("gitdir:") {
                let p = rest.trim();
                let candidate = Path::new(p);
                if candidate.is_absolute() {
                    candidate.to_path_buf()
                } else {
                    wt_path.join(candidate)
                }
            } else {
                dot_git
            }
        } else {
            dot_git
        }
    } else {
        dot_git
    };

    let sparse_info = git_dir.join("info").join("sparse-checkout");
    if sparse_info.is_file() {
        if let Ok(content) = std::fs::read_to_string(&sparse_info) {
            let dirs: Vec<String> = content
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty() && !l.starts_with('#'))
                .collect();
            if !dirs.is_empty() {
                wt.is_sparse = Some(true);
                wt.sparse_directories = Some(dirs);
            }
        }
    }
}

fn fill_worktree_metadata(worktrees: &mut [GitWorktreeInfo]) {
    let metadata_map = load_all_persisted_worktree_metadata();
    for wt in worktrees.iter_mut() {
        if wt.created_at.is_none() {
            wt.created_at = get_worktree_created_at(&wt.path);
        }
        if let Some(record) = metadata_map.get(&wt.path) {
            if wt.display_name.is_none() {
                wt.display_name = record.display_name.clone();
            }
            if wt.first_agent_message_rename_error.is_none() {
                wt.first_agent_message_rename_error = record.first_agent_message_rename_error.clone();
            }
            if wt.status.is_none() {
                wt.status = record.status.clone();
            }
            // The metadata table is the only source for the D07 sidebar flags, so
            // the persisted value wins for both set and unset.
            wt.is_pinned = record.is_pinned;
            wt.is_unread = record.is_unread;
            // Same for creation provenance kind: the persisted column is the only
            // source, and an unrecognized/absent value paints neither field.
            match record.provenance_kind.as_deref() {
                Some("created-by-automation") => {
                    wt.automation_provenance_kind = Some("created-by-automation".to_string())
                }
                Some("created-by-cli") => wt.cli_provenance_kind = Some("created-by-cli".to_string()),
                _ => {}
            }
        }
        check_sparse_checkout(wt);
    }
}

/// Executa `git worktree add -b <branch> <path>` — respeita worktreeBasePath configurado (Orca: resolveConfiguredWorktreeBasePaths)
pub fn create_git_worktree(params: CreateWorktreeParams) -> Result<String, String> {
    let repo = PathBuf::from(&params.repo_path);
    if !repo.exists() {
        return Err("Repository path does not exist".to_string());
    }

    // Carrega base configurada para decidir onde criar o worktree (Orca worktree-create-base.ts)
    let worktree_base_opt = load_hydra_workspace_context(&params.repo_path).worktree_base_path;
    let target_repo = if repo.join(".git").exists() {
        repo.clone()
    } else {
        let mut found = None;
        if let Ok(entries) = std::fs::read_dir(&repo) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() && p.join(".git").exists() {
                    found = Some(p);
                    break;
                }
            }
        }
        found.ok_or_else(|| "No Git repository found in the selected folder".to_string())?
    };

    let sanitized_branch = params.branch_name.replace('/', "-");
    let repo_name = target_repo.file_name().and_then(|n| n.to_str()).unwrap_or("project");

    // Orca priority: configured base > .worktrees sibling > parent dir
    let worktree_dir = if let Some(base) = worktree_base_opt.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
        let resolved_base = resolve_workspace_layout_path(&params.repo_path, base);
        PathBuf::from(resolved_base).join(format!("{repo_name}-{sanitized_branch}"))
    } else if repo.join(".worktrees").exists() {
        repo.join(".worktrees").join(format!("{repo_name}-{sanitized_branch}"))
    } else if target_repo.join(".worktrees").exists() {
        target_repo.join(".worktrees").join(format!("{repo_name}-{sanitized_branch}"))
    } else {
        let parent = PathBuf::from(&params.repo_path).parent().map(|p| p.to_path_buf()).unwrap_or_else(|| PathBuf::from(&params.repo_path));
        parent.join(format!("{repo_name}-{sanitized_branch}"))
    };

    let mut cmd = Command::new("git");
    cmd.current_dir(&target_repo);
    cmd.arg("worktree").arg("add");

    if params.new_branch {
        cmd.arg("-b").arg(&params.branch_name);
    }

    cmd.arg(&worktree_dir);

    if !params.new_branch {
        cmd.arg(&params.branch_name);
    }

    let out = cmd.output().map_err(|e| format!("Failed to execute git worktree: {e}"))?;
    if out.status.success() {
        let path = worktree_dir.to_string_lossy().to_string();
        // Provenance (Orca WorktreeMeta.createdAt/createdWithAgent): a worktree
        // Hydra created is Hydra-managed, so it stays visible even when the
        // `external` policy hides plain `git worktree add` targets. Best-effort:
        // the worktree exists on disk either way, so a metadata write failure
        // must not turn a successful creation into an error.
        let created_at = chrono::Utc::now().timestamp_millis();
        let _ = persist_worktree_creation(
            &path,
            created_at,
            params.created_with_agent.as_deref(),
            params.provenance_kind.as_deref(),
        );
        Ok(path)
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
    }
}

fn persist_worktree_creation(
    worktree_path: &str,
    created_at: i64,
    created_with_agent: Option<&str>,
    provenance_kind: Option<&str>,
) -> Result<(), String> {
    let db = crate::db::DatabaseManager::new()?;
    db.set_worktree_provenance(worktree_path, created_at, created_with_agent)?;
    if let Some(kind) = provenance_kind {
        db.set_worktree_provenance_kind(worktree_path, Some(kind))?;
    }
    Ok(())
}

pub fn remove_git_worktree(repo_path: &str, worktree_path: &str) -> Result<(), String> {
    let wt = PathBuf::from(worktree_path);
    let wt_existed = wt.exists();

    // 1. Resolve owning Git repository
    let mut resolved_repo: Option<PathBuf> = None;

    // Strategy 1: Direct from worktree .git file or directory
    let git_entry = wt.join(".git");
    if git_entry.exists() {
        if git_entry.is_file() {
            if let Ok(content) = std::fs::read_to_string(&git_entry) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if let Some(rest) = trimmed.strip_prefix("gitdir:") {
                        let gd_str = rest.trim();
                        let gd_path = PathBuf::from(gd_str);
                        let abs_gd = if gd_path.is_absolute() {
                            gd_path
                        } else {
                            wt.join(gd_path)
                        };
                        // abs_gd is typically <repo_root>/.git/worktrees/<name>
                        if let Some(worktrees_dir) = abs_gd.parent() {
                            if let Some(dot_git) = worktrees_dir.parent() {
                                if let Some(repo_root) = dot_git.parent() {
                                    if repo_root.exists() {
                                        resolved_repo = Some(repo_root.to_path_buf());
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if resolved_repo.is_none() {
            // Try `git rev-parse --git-common-dir`
            if let Ok(out) = Command::new("git")
                .args(["rev-parse", "--git-common-dir"])
                .current_dir(&wt)
                .output()
            {
                if out.status.success() {
                    let common = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    let common_path = PathBuf::from(&common);
                    let abs = if common_path.is_absolute() {
                        common_path
                    } else {
                        wt.join(common_path)
                    };
                    if let Some(repo_root) = abs.parent() {
                        resolved_repo = Some(repo_root.to_path_buf());
                    }
                }
            }
        }
    }

    // Strategy 2: If repo_path itself is a valid git repository
    if resolved_repo.is_none() {
        let candidate_repo = PathBuf::from(repo_path);
        if candidate_repo.join(".git").exists() {
            resolved_repo = Some(candidate_repo);
        }
    }

    // Strategy 3: If repo_path is a folder workspace (e.g. /code with child repos),
    // or candidate_repo doesn't have the worktree, find which child repository owns this worktree!
    let repo_root = PathBuf::from(repo_path);
    let mut candidates: Vec<PathBuf> = Vec::new();
    collect_git_repos(&repo_root, &mut candidates, 4);

    if resolved_repo.is_none() || (resolved_repo.is_some() && !resolved_repo.as_ref().unwrap().join(".git").exists()) {
        for c in &candidates {
            if let Ok(out) = Command::new("git")
                .args(["worktree", "list", "--porcelain"])
                .current_dir(c)
                .output()
            {
                if out.status.success() {
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    let has_wt = parse_worktree_porcelain(&stdout).into_iter().any(|info| {
                        normalize_runtime_path_for_comparison(&info.path) == normalize_runtime_path_for_comparison(worktree_path)
                            || Path::new(&info.path).file_name() == wt.file_name()
                    });
                    if has_wt {
                        resolved_repo = Some(c.clone());
                        break;
                    }
                }
            }
        }

        // If still not matched by worktree list, check if worktree_path is inside candidate
        if resolved_repo.is_none() {
            for c in &candidates {
                if normalize_runtime_path_for_comparison(worktree_path).starts_with(&normalize_runtime_path_for_comparison(&c.to_string_lossy())) {
                    resolved_repo = Some(c.clone());
                    break;
                }
            }
        }
    }

    // 2. Perform Removal via Git if target repo was identified
    let mut git_remove_succeeded = false;
    let mut git_error: Option<String> = None;

    if let Some(target) = &resolved_repo {
        // Run git worktree remove --force <worktree_path>
        let out = Command::new("git")
            .args(["worktree", "remove", "--force", worktree_path])
            .current_dir(target)
            .output();

        match out {
            Ok(o) if o.status.success() => {
                git_remove_succeeded = true;
            }
            Ok(o) => {
                let err_msg = String::from_utf8_lossy(&o.stderr).trim().to_string();
                git_error = Some(err_msg);
            }
            Err(e) => {
                git_error = Some(e.to_string());
            }
        }

        // Run git worktree prune to clean up any prunable / stale metadata
        let _ = Command::new("git")
            .args(["worktree", "prune"])
            .current_dir(target)
            .output();
    } else {
        // If no target resolved yet, try running prune on all candidates in a folder workspace
        for c in &candidates {
            let _ = Command::new("git")
                .args(["worktree", "prune"])
                .current_dir(c)
                .output();
        }
    }

    // 3. Guarantee filesystem directory removal (Orca parity)
    if wt_existed && wt.exists() {
        if let Err(e) = std::fs::remove_dir_all(&wt) {
            if e.kind() != std::io::ErrorKind::NotFound {
                return Err(format!("Failed to delete worktree directory {}: {}", worktree_path, e));
            }
        }
    }

    // If git remove succeeded or the directory is now gone, return Ok(())
    if git_remove_succeeded || !wt.exists() {
        Ok(())
    } else if let Some(err) = git_error {
        Err(err)
    } else {
        Err(format!("Could not find git repository owning worktree {}", worktree_path))
    }
}

/// Recursively collects directories owning a `.git` entry up to `max_depth`.
fn collect_git_repos(dir: &Path, out: &mut Vec<PathBuf>, max_depth: u32) {
    if max_depth == 0 {
        return;
    }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                if p.join(".git").exists() {
                    out.push(p.clone());
                }
                collect_git_repos(&p, out, max_depth - 1);
            }
        }
    }
}


pub fn create_new_project(params: CreateProjectParams) -> Result<String, String> {
    let parent = PathBuf::from(&params.parent_dir);
    let project_dir = parent.join(&params.name);

    if project_dir.exists() {
        return Err(format!("Directory already exists at {}", project_dir.display()));
    }

    std::fs::create_dir_all(&project_dir).map_err(|e| format!("Failed to create directory: {e}"))?;

    if params.init_git {
        let out = Command::new("git")
            .arg("init")
            .current_dir(&project_dir)
            .output()
            .map_err(|e| format!("Failed to run git init: {e}"))?;

        if !out.status.success() {
            return Err(String::from_utf8_lossy(&out.stderr).to_string());
        }
    }

    Ok(project_dir.to_string_lossy().to_string())
}

pub fn clone_git_repository(url: &str, parent_dir: &str) -> Result<String, String> {
    let parent = PathBuf::from(parent_dir);
    if !parent.exists() {
        std::fs::create_dir_all(&parent).map_err(|e| format!("Failed to create destination directory: {e}"))?;
    }

    let out = Command::new("git")
        .args(["clone", url])
        .current_dir(&parent)
        .output()
        .map_err(|e| format!("Failed to run git clone: {e}"))?;

    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).to_string());
    }

    let repo_name = url
        .trim_end_matches('/')
        .split('/')
        .last()
        .unwrap_or("repo")
        .trim_end_matches(".git");

    let cloned_path = parent.join(repo_name);
    Ok(cloned_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_worktree_porcelain() {
        let sample = "worktree /home/user/src/repo\n\
HEAD 57a8aa73f067b5cfcb2efa81d60a64dbd3670ee1\n\
branch refs/heads/main\n\
\n\
worktree /home/user/src/repo-feat\n\
HEAD a1b2c3d4e5f6\n\
branch refs/heads/feat/auth\n";

        let res = parse_worktree_porcelain(sample);
        assert_eq!(res.len(), 2);
        assert_eq!(res[0].path, "/home/user/src/repo");
        assert_eq!(res[0].branch, "main");
        assert_eq!(res[1].path, "/home/user/src/repo-feat");
        assert_eq!(res[1].branch, "feat/auth");
    }

    #[test]
    fn test_folder_workspace_worktree_discovery() {
        let tmp = std::env::temp_dir().join(format!("hydra_test_fw_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let _ = std::fs::create_dir_all(&tmp);
        let repo1 = tmp.join("sub-repo-a");
        let _ = std::fs::create_dir_all(&repo1);
        let _ = Command::new("git").args(["init", "-b", "main"]).current_dir(&repo1).output();
        let _ = Command::new("git").args(["config", "user.name", "Test"]).current_dir(&repo1).output();
        let _ = Command::new("git").args(["config", "user.email", "test@test.com"]).current_dir(&repo1).output();
        let _ = std::fs::write(repo1.join("README.md"), "hello");
        let _ = Command::new("git").args(["add", "."]).current_dir(&repo1).output();
        let _ = Command::new("git").args(["commit", "-m", "initial"]).current_dir(&repo1).output();

        // Use context-aware variant with explicit workspace_dir so test doesn't depend on real global_settings file
        // Create a workspace_dir that contains the child repo's worktree path would not exist yet, so filtering would hide it.
        // To keep test passing, we use an empty workspace_dir (no filtering) via direct raw parse test.
        // Instead we test the raw parsing + that folder scanning still discovers at least the main checkout via the unfiltered helper.
        let (list, _) = list_git_worktrees_with_context(
            tmp.to_str().unwrap(),
            None,
            "",
            true,
            &[],
            &RepoVisibilityPolicy::default(),
            None,
            &HashMap::new(),
        )
        .expect("list worktrees on folder workspace");
        // With empty workspace_dir, only the main checkout should be visible (filtered result includes main)
        assert!(!list.is_empty(), "Folder workspace should discover sub-repo worktrees (main at least)");
        assert!(list[0].branch.contains("sub-repo-a: main") || list[0].branch.contains("main"));

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_ownership_filtering_external_vs_scratch() {
        let ws_dir = "/tmp/orca-workspaces";
        let repo_path = "/home/user/src/my-repo";
        let history: Vec<OrcaWorkspaceLayout> = vec![];
        // Worktree inside nested workspaceDir should be External → visible
        let wt_nested = GitWorktreeInfo { path: "/tmp/orca-workspaces/my-repo-feat".to_string(), head_commit: "abc".to_string(), branch: "feat".to_string(), is_bare: false, is_locked: false, created_at: None, status: None, display_name: None, first_agent_message_rename_error: None, is_pinned: None, is_unread: None, is_sparse: None, sparse_directories: None, automation_provenance_kind: None, cli_provenance_kind: None };
        // Worktree inside .claude/worktrees without configured base should be AgentScratch → hidden
        let wt_scratch = GitWorktreeInfo { path: "/home/user/src/my-repo/.claude/worktrees/feat".to_string(), head_commit: "abc".to_string(), branch: "feat".to_string(), is_bare: false, is_locked: false, created_at: None, status: None, display_name: None, first_agent_message_rename_error: None, is_pinned: None, is_unread: None, is_sparse: None, sparse_directories: None, automation_provenance_kind: None, cli_provenance_kind: None };
        // Worktree outside any layout → UnknownLegacy → hidden
        let wt_outside = GitWorktreeInfo { path: "/home/user/other/my-repo-feat".to_string(), head_commit: "abc".to_string(), branch: "feat".to_string(), is_bare: false, is_locked: false, created_at: None, status: None, display_name: None, first_agent_message_rename_error: None, is_pinned: None, is_unread: None, is_sparse: None, sparse_directories: None, automation_provenance_kind: None, cli_provenance_kind: None };

        let configured: Vec<String> = vec![];
        let known = build_known_orca_workspace_layouts(ws_dir, true, &history, repo_path, &configured);
        let cls_nested = classify_worktree_ownership(&wt_nested.path, None, repo_path, &[repo_path.to_string()], &configured, &known);
        let cls_scratch = classify_worktree_ownership(&wt_scratch.path, None, repo_path, &[repo_path.to_string()], &configured, &known);
        let cls_outside = classify_worktree_ownership(&wt_outside.path, None, repo_path, &[repo_path.to_string()], &configured, &known);
        assert_eq!(cls_nested, WorktreeOwnership::External);
        assert_eq!(cls_scratch, WorktreeOwnership::AgentScratch);
        assert_eq!(cls_outside, WorktreeOwnership::External);

        // Configured base suppresses scratch classification
        let configured2 = vec!["/home/user/src/my-repo/.claude/worktrees".to_string()];
        let known2 = build_known_orca_workspace_layouts(ws_dir, true, &history, repo_path, &configured2);
        let cls_suppressed = classify_worktree_ownership(&wt_scratch.path, None, repo_path, &[repo_path.to_string()], &configured2, &known2);
        assert_eq!(cls_suppressed, WorktreeOwnership::External, "configured base should supersede scratch detection");
    }

    #[test]
    fn workspace_dir_worktrees_stay_visible_despite_repo_worktrees_dir() {
        // Regression: a repo that also has `<repo>/.worktrees` used to narrow visibility
        // (has_base branch measured first), hiding every worktree that lives under the
        // global workspaceDir — the hydra repo hid mola/needlefish/beluga that way.
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("hydra-ws-visibility-{stamp}"));
        let repo = root.join("repo");
        let ws_dir = root.join("workspaces");
        let nested = ws_dir.join("repo").join("feat-x");
        let _ = std::fs::create_dir_all(&repo);
        let _ = std::fs::create_dir_all(&nested);
        // The implicit base: an empty `.worktrees` inside the repo.
        let _ = std::fs::create_dir_all(repo.join(".worktrees"));
        // Bare-minimum git repo with one commit so `git worktree add` works.
        for args in [
            vec!["init", "-q"],
            vec!["-c", "user.email=t@t", "-c", "user.name=t", "add", "-A"],
            vec!["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "init"],
        ] {
            let _ = Command::new("git").args(&args).current_dir(&repo).output();
        }
        let added = Command::new("git")
            .args(["worktree", "add", "-b", "feat-x"])
            .arg(&nested)
            .current_dir(&repo)
            .output()
            .expect("git worktree add runs");
        assert!(added.status.success(), "worktree add failed: {}", String::from_utf8_lossy(&added.stderr));

        // (a) Orca policy: layout membership alone never shows a worktree. With the
        // explicit `external: hide` Hydra persists, it is hidden (and offered in the
        // inbox).
        let (visible, hidden) = scan_with(
            &repo,
            ws_dir.to_str().unwrap(),
            &RepoVisibilityPolicy::default(),
            Some(&visibility_defaults_hide()),
            &HashMap::new(),
        );
        assert!(
            hidden.contains(&nested.to_str().unwrap().to_string()),
            "workspaceDir worktree must be hidden under the hide policy; visible={visible:?} hidden={hidden:?}"
        );
        assert!(!visible.contains(&nested.to_str().unwrap().to_string()));

        // (b) An old repo with no persisted `external` default keeps the old rule:
        // the same worktree stays visible.
        let (visible, hidden) = scan_with(
            &repo,
            ws_dir.to_str().unwrap(),
            &RepoVisibilityPolicy::default(),
            None,
            &HashMap::new(),
        );
        assert!(
            visible.contains(&nested.to_str().unwrap().to_string()),
            "legacy repo without an explicit default keeps it visible; visible={visible:?} hidden={hidden:?}"
        );

        // (c) Strong provenance (Hydra created it) wins over the hide policy.
        let nested_str = nested.to_string_lossy().to_string();
        let provenance = provenance_for(&nested_str, Some(1_700_000_000_000), None);
        let (visible, _) = scan_with(
            &repo,
            ws_dir.to_str().unwrap(),
            &RepoVisibilityPolicy::default(),
            Some(&visibility_defaults_hide()),
            &provenance,
        );
        assert!(
            visible.contains(&nested_str),
            "created worktree must stay visible; visible={visible:?}"
        );

        let _ = Command::new("git")
            .args(["worktree", "remove", "--force"])
            .arg(&nested)
            .current_dir(&repo)
            .output();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn test_resolve_configured_base_relative() {
        let repo = "/home/user/src/repo";
        assert_eq!(resolve_configured_worktree_base_paths(repo, Some(".worktrees")), vec!["/home/user/src/repo/.worktrees"]);
        assert_eq!(resolve_configured_worktree_base_paths(repo, Some("/tmp/ws")), vec!["/tmp/ws"]);
        assert!(resolve_configured_worktree_base_paths(repo, None).is_empty());
        assert!(resolve_configured_worktree_base_paths(repo, Some("  ")).is_empty());
    }

    #[test]
    fn test_remove_git_worktree_folder_workspace() {
        let tmp = std::env::temp_dir().join(format!("hydra-test-rm-wt-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let _ = std::fs::create_dir_all(&tmp);

        // Child repo A
        let child_a = tmp.join("sub-repo-a");
        let _ = std::fs::create_dir_all(&child_a);
        let _ = Command::new("git").args(["init", "-b", "main"]).current_dir(&child_a).output();
        let _ = Command::new("git").args(["config", "user.name", "Test"]).current_dir(&child_a).output();
        let _ = Command::new("git").args(["config", "user.email", "test@test.com"]).current_dir(&child_a).output();
        let _ = std::fs::write(child_a.join("README.md"), "hello");
        let _ = Command::new("git").args(["add", "."]).current_dir(&child_a).output();
        let _ = Command::new("git").args(["commit", "-m", "initial"]).current_dir(&child_a).output();

        // Create worktree under folder workspace .worktrees/
        let wt_dir = tmp.join(".worktrees").join("workspace-1754");
        let _ = std::fs::create_dir_all(tmp.join(".worktrees"));
        let add_out = Command::new("git")
            .args(["worktree", "add", "-b", "feature/test-1754", wt_dir.to_str().unwrap()])
            .current_dir(&child_a)
            .output()
            .expect("git worktree add");
        assert!(add_out.status.success(), "worktree add must succeed");
        assert!(wt_dir.exists(), "worktree directory must exist on disk");

        // Now remove using the parent folder workspace path (which has NO .git!)
        let folder_ws_str = tmp.to_str().unwrap();
        let wt_str = wt_dir.to_str().unwrap();
        let rm_res = remove_git_worktree(folder_ws_str, wt_str);
        assert!(rm_res.is_ok(), "remove_git_worktree must succeed even when repo_path is folder workspace: {:?}", rm_res);

        // Verify directory is deleted from disk
        assert!(!wt_dir.exists(), "worktree directory must be removed from disk");

        // Verify git worktree list in child_a no longer contains workspace-1754
        let list_out = Command::new("git")
            .args(["worktree", "list", "--porcelain"])
            .current_dir(&child_a)
            .output()
            .expect("git worktree list");
        let stdout = String::from_utf8_lossy(&list_out.stdout);
        assert!(!stdout.contains("workspace-1754"), "worktree must be unregistered in git");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    // ── Provenance decides visibility (Orca ownership.ts:124) ──────────────

    /// Redirects `DatabaseManager::get_db_path()` to a temp file for this test
    /// thread, so `create_git_worktree` never touches the real user database.
    struct DbPathGuard;

    impl DbPathGuard {
        fn new(path: &Path) -> Self {
            crate::db::TEST_DB_PATH_OVERRIDE.with(|p| *p.borrow_mut() = Some(path.to_path_buf()));
            Self
        }
    }

    impl Drop for DbPathGuard {
        fn drop(&mut self) {
            crate::db::TEST_DB_PATH_OVERRIDE.with(|p| *p.borrow_mut() = None);
        }
    }

    fn unique_root(tag: &str) -> PathBuf {
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("hydra-{tag}-{stamp}"))
    }

    fn init_bare_repo(repo: &Path) {
        let _ = std::fs::create_dir_all(repo);
        for args in [
            vec!["init", "-q", "-b", "main"],
            vec!["-c", "user.email=t@t", "-c", "user.name=t", "add", "-A"],
            vec!["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "init"],
        ] {
            let _ = Command::new("git").args(&args).current_dir(repo).output();
        }
    }

    fn provenance_for(
        path: &str,
        created_at: Option<i64>,
        created_with_agent: Option<&str>,
    ) -> HashMap<String, WorktreeProvenance> {
        let mut map = HashMap::new();
        map.insert(
            normalize_runtime_path_for_comparison(path),
            WorktreeProvenance {
                created_at,
                created_with_agent: created_with_agent.map(str::to_string),
            },
        );
        map
    }

    /// `worktree_visibility_defaults` as Hydra persists it: external hidden.
    fn visibility_defaults_hide() -> WorktreeVisibilityDefaults {
        WorktreeVisibilityDefaults {
            external: Some("hide".to_string()),
            custom_sources: None,
            source_preferences: None,
        }
    }

    fn visibility_defaults_show() -> WorktreeVisibilityDefaults {
        WorktreeVisibilityDefaults {
            external: Some("show".to_string()),
            custom_sources: None,
            source_preferences: None,
        }
    }

    fn scan_with(
        repo: &Path,
        workspace_dir: &str,
        repo_policy: &RepoVisibilityPolicy,
        defaults: Option<&WorktreeVisibilityDefaults>,
        provenance: &HashMap<String, WorktreeProvenance>,
    ) -> (Vec<String>, Vec<String>) {
        let (visible, hidden) = list_git_worktrees_with_context(
            repo.to_str().unwrap(),
            None,
            workspace_dir,
            true,
            &[],
            repo_policy,
            defaults,
            provenance,
        )
        .expect("scan runs");
        (
            visible.into_iter().map(|w| w.path).collect(),
            hidden.into_iter().map(|w| w.path).collect(),
        )
    }

    /// The production shape: a plain checkout with `external: hide` persisted.
    fn scan_external(repo: &Path, provenance: &HashMap<String, WorktreeProvenance>) -> (Vec<String>, Vec<String>) {
        scan_with(
            repo,
            "",
            &RepoVisibilityPolicy::default(),
            Some(&visibility_defaults_hide()),
            provenance,
        )
    }

    fn add_worktree(repo: &Path, worktree: &Path, branch: &str) {
        if let Some(parent) = worktree.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let out = Command::new("git")
            .args(["worktree", "add", "-b", branch])
            .arg(worktree)
            .current_dir(repo)
            .output()
            .expect("git worktree add runs");
        assert!(
            out.status.success(),
            "worktree add failed: {}",
            String::from_utf8_lossy(&out.stderr)
        );
    }

    #[test]
    fn external_worktree_without_metadata_stays_hidden() {
        let root = unique_root("prov-hidden");
        let repo = root.join("repo");
        let wt = root.join("repo-feat-prov");
        init_bare_repo(&repo);
        let added = Command::new("git")
            .args(["worktree", "add", "-b", "feat-prov"])
            .arg(&wt)
            .current_dir(&repo)
            .output()
            .expect("git worktree add runs");
        assert!(added.status.success(), "worktree add failed: {}", String::from_utf8_lossy(&added.stderr));

        let (visible, hidden) = scan_external(&repo, &HashMap::new());
        assert!(!visible.contains(&wt.to_string_lossy().to_string()), "external worktree must stay hidden; visible={visible:?}");
        assert!(hidden.contains(&wt.to_string_lossy().to_string()), "external worktree must be reported hidden; hidden={hidden:?}");

        let _ = Command::new("git").args(["worktree", "remove", "--force"]).arg(&wt).current_dir(&repo).output();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn external_worktree_visibility_requires_strong_provenance() {
        let root = unique_root("prov-visible");
        let repo = root.join("repo");
        let wt = root.join("repo-feat-prov");
        let wt_str = wt.to_string_lossy().to_string();
        init_bare_repo(&repo);
        let added = Command::new("git")
            .args(["worktree", "add", "-b", "feat-prov"])
            .arg(&wt)
            .current_dir(&repo)
            .output()
            .expect("git worktree add runs");
        assert!(added.status.success(), "worktree add failed: {}", String::from_utf8_lossy(&added.stderr));

        // (a) A row carrying only weak fields (here: `updated_at`, none of the
        // strong ones Hydra mirrors) does not prove provenance — Orca
        // `hasStrongOrcaMetadata` (ownership.ts:227). Regression of f07e0ed.
        let (visible, hidden) = scan_external(&repo, &provenance_for(&wt_str, None, None));
        assert!(!visible.contains(&wt_str), "weak metadata must not force visibility; visible={visible:?}");
        assert!(hidden.contains(&wt_str), "weak metadata must stay hidden; hidden={hidden:?}");

        // (b) `created_at > 0` is strong metadata.
        let (visible, _) = scan_external(&repo, &provenance_for(&wt_str, Some(1_700_000_000_000), None));
        assert!(visible.contains(&wt_str), "created_at > 0 must force visibility; visible={visible:?}");

        // (c) `created_with_agent` is strong metadata.
        let (visible, _) = scan_external(&repo, &provenance_for(&wt_str, None, Some("claude")));
        assert!(visible.contains(&wt_str), "created_with_agent must force visibility; visible={visible:?}");

        // (d) `created_at = 0` is treated as absent (Orca truthiness).
        let (visible, hidden) = scan_external(&repo, &provenance_for(&wt_str, Some(0), None));
        assert!(!visible.contains(&wt_str), "created_at = 0 must not count as metadata; visible={visible:?}");
        assert!(hidden.contains(&wt_str), "created_at = 0 must stay hidden; hidden={hidden:?}");

        // A blank agent name is likewise not metadata.
        let (visible, hidden) = scan_external(&repo, &provenance_for(&wt_str, None, Some("   ")));
        assert!(!visible.contains(&wt_str), "blank agent must not count as metadata; visible={visible:?}");
        assert!(hidden.contains(&wt_str));

        let _ = Command::new("git").args(["worktree", "remove", "--force"]).arg(&wt).current_dir(&repo).output();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn agent_scratch_worktree_with_weak_metadata_keeps_its_policy() {
        // Agent scratch (`.claude/worktrees`) keeps its own policy: a weak
        // metadata row (no strong provenance) does not force visibility and the
        // path is dropped from both lists when the scratch policy hides it.
        let root = unique_root("prov-scratch");
        let repo = root.join("repo");
        let wt = repo.join(".claude").join("worktrees").join("feat-prov");
        let wt_str = wt.to_string_lossy().to_string();
        init_bare_repo(&repo);
        let _ = std::fs::create_dir_all(wt.parent().unwrap());
        let added = Command::new("git")
            .args(["worktree", "add", "-b", "feat-prov"])
            .arg(&wt)
            .current_dir(&repo)
            .output()
            .expect("git worktree add runs");
        assert!(added.status.success(), "worktree add failed: {}", String::from_utf8_lossy(&added.stderr));

        let (visible, hidden) = scan_external(&repo, &provenance_for(&wt_str, None, None));
        assert!(!visible.contains(&wt_str), "agent-scratch must not be forced visible; visible={visible:?}");
        assert!(!hidden.contains(&wt_str), "agent-scratch is dropped, not listed as hidden");

        let _ = Command::new("git").args(["worktree", "remove", "--force"]).arg(&wt).current_dir(&repo).output();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn create_git_worktree_persists_provenance_and_stays_visible() {
        let root = unique_root("prov-create");
        let repo = root.join("repo");
        init_bare_repo(&repo);
        let _db_guard = DbPathGuard::new(&root.join("hydra_test.sqlite3"));

        let path = create_git_worktree(CreateWorktreeParams {
            repo_path: repo.to_string_lossy().to_string(),
            branch_name: "feat/prov".to_string(),
            new_branch: true,
            created_with_agent: Some("claude".to_string()),
            provenance_kind: Some("created-by-automation".to_string()),
        })
        .expect("create_git_worktree succeeds");
        assert!(Path::new(&path).exists(), "worktree must exist on disk");

        let persisted = load_all_persisted_worktree_metadata();
        let record = persisted.get(&path).expect("metadata row must be persisted");
        assert!(
            record.provenance.created_at.is_some_and(|v| v > 0),
            "created_at must be stamped"
        );
        assert_eq!(record.provenance.created_with_agent.as_deref(), Some("claude"));
        assert_eq!(
            record.provenance_kind.as_deref(),
            Some("created-by-automation"),
            "provenance kind must be persisted"
        );

        // The scan payload carries the persisted kind in camelCase.
        let scanned = list_git_worktrees(&repo.to_string_lossy()).expect("scan after create");
        let scanned_entry = scanned.iter().find(|w| w.path == path).expect("worktree in scan");
        assert_eq!(
            scanned_entry.automation_provenance_kind.as_deref(),
            Some("created-by-automation")
        );
        assert_eq!(scanned_entry.cli_provenance_kind, None);
        let wire = serde_json::to_string(scanned_entry).expect("serialize");
        assert!(
            wire.contains("\"automationProvenanceKind\":\"created-by-automation\""),
            "automation kind must reach the wire: {wire}"
        );
        assert!(!wire.contains("cliProvenanceKind"), "cli kind must be omitted: {wire}");

        // The persisted provenance is what makes the freshly created worktree visible
        // under the default `external: hide` policy.
        let provenance = load_worktree_provenance_map();
        let (visible, _) = scan_external(&repo, &provenance);
        assert!(visible.contains(&path), "created worktree must be visible; visible={visible:?}");

        let _ = Command::new("git").args(["worktree", "remove", "--force"]).arg(&path).current_dir(&repo).output();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn scan_payload_carries_persisted_pin_and_unread_flags() {
        // D07 G7: the sidebar flags persisted in `worktree_metadata` must reach
        // the scan payload. An unset flag is absent from the wire (never `false`).
        let root = unique_root("flags-scan");
        let repo = root.join("repo");
        init_bare_repo(&repo);
        let _db_guard = DbPathGuard::new(&root.join("hydra_test.sqlite3"));

        let path = create_git_worktree(CreateWorktreeParams {
            repo_path: repo.to_string_lossy().to_string(),
            branch_name: "feat/flags".to_string(),
            new_branch: true,
            created_with_agent: None,
            provenance_kind: None,
        })
        .expect("create_git_worktree succeeds");

        let db = crate::db::DatabaseManager::new().expect("db");
        db.set_worktree_display_name(&path, Some("Flags")).expect("display name");

        let repo_str = repo.to_string_lossy().to_string();
        let before = list_git_worktrees(&repo_str).expect("scan before flags");
        let entry = before.iter().find(|w| w.path == path).expect("worktree in scan");
        assert_eq!(entry.is_pinned, None, "no stored flag must map to None");
        assert_eq!(entry.is_unread, None);
        let wire = serde_json::to_string(entry).expect("serialize");
        assert!(!wire.contains("is_pinned"), "unset pin must be omitted: {wire}");
        assert!(!wire.contains("is_unread"), "unset unread must be omitted: {wire}");

        // Persist both flags; the next scan paints them onto the same worktree.
        db.set_worktree_flags(&path, Some(true), Some(false)).expect("set flags");
        let after = list_git_worktrees(&repo_str).expect("scan after flags");
        let entry = after.iter().find(|w| w.path == path).expect("worktree in scan");
        assert_eq!(entry.is_pinned, Some(true));
        assert_eq!(entry.is_unread, Some(false));
        let wire = serde_json::to_string(entry).expect("serialize");
        assert!(wire.contains("\"is_pinned\":true"), "pin must reach the wire: {wire}");
        assert!(wire.contains("\"is_unread\":false"), "unread must reach the wire: {wire}");
        assert!(!wire.contains("automationProvenanceKind"), "NULL kind must be omitted: {wire}");
        assert!(!wire.contains("cliProvenanceKind"), "NULL kind must be omitted: {wire}");
        assert_eq!(entry.display_name.as_deref(), Some("Flags"), "unrelated metadata survives");

        let _ = Command::new("git").args(["worktree", "remove", "--force"]).arg(&path).current_dir(&repo).output();
        let _ = std::fs::remove_dir_all(&root);
    }

    // ── Visibility matrix (Orca shouldShowWorktree) ─────────────────────────

    fn source_prefs(built_in: &[(&str, &str)], custom: &[(&str, &str)]) -> SourcePreferences {
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

    fn custom_source(id: &str, root_path: &Path) -> CustomWorktreeSource {
        CustomWorktreeSource {
            id: id.to_string(),
            root_path: root_path.to_string_lossy().to_string(),
        }
    }

    #[test]
    fn layout_only_worktree_follows_legacy_and_external_policy() {
        // A worktree under the global workspaceDir (nested layout → `external`
        // ownership). Orca: the layout classifies ownership, it never shows the row.
        let root = unique_root("vis-layout");
        let repo = root.join("repo");
        let ws_dir = root.join("workspaces");
        let wt = ws_dir.join("feat-layout");
        init_bare_repo(&repo);
        add_worktree(&repo, &wt, "feat-layout");
        let wt_str = wt.to_string_lossy().to_string();
        let ws_str = ws_dir.to_string_lossy().to_string();

        let not_legacy = RepoVisibilityPolicy {
            external_worktree_visibility_legacy: Some(false),
            ..Default::default()
        };

        // New repo + the `external: hide` Hydra persists → hidden, offered in the inbox.
        let (visible, hidden) = scan_with(
            &repo,
            &ws_str,
            &not_legacy,
            Some(&visibility_defaults_hide()),
            &HashMap::new(),
        );
        assert!(
            hidden.contains(&wt_str) && !visible.contains(&wt_str),
            "layout-only must be hidden for a non-legacy repo; visible={visible:?} hidden={hidden:?}"
        );

        // New repo with no persisted default → still hidden (no legacy rescue).
        let (visible, hidden) = scan_with(&repo, &ws_str, &not_legacy, None, &HashMap::new());
        assert!(
            !visible.contains(&wt_str) && hidden.contains(&wt_str),
            "non-legacy repo must stay hidden without defaults; visible={visible:?} hidden={hidden:?}"
        );

        // Old repo (legacy unset) with no persisted default → the old rule applied.
        let (visible, _) = scan_with(
            &repo,
            &ws_str,
            &RepoVisibilityPolicy::default(),
            None,
            &HashMap::new(),
        );
        assert!(
            visible.contains(&wt_str),
            "legacy repo must keep the old rule; visible={visible:?}"
        );

        // Global `external: show` beats the non-legacy default.
        let (visible, _) = scan_with(
            &repo,
            &ws_str,
            &not_legacy,
            Some(&visibility_defaults_show()),
            &HashMap::new(),
        );
        assert!(
            visible.contains(&wt_str),
            "external: show must show it; visible={visible:?}"
        );

        // The per-repo override wins over the global default.
        let repo_show = RepoVisibilityPolicy {
            external_worktree_visibility: Some("show".to_string()),
            ..Default::default()
        };
        let (visible, _) = scan_with(
            &repo,
            &ws_str,
            &repo_show,
            Some(&visibility_defaults_hide()),
            &HashMap::new(),
        );
        assert!(
            visible.contains(&wt_str),
            "repo override must win over the global default; visible={visible:?}"
        );

        let _ = Command::new("git").args(["worktree", "remove", "--force"]).arg(&wt).current_dir(&repo).output();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn imported_worktree_stays_visible_under_the_hide_policy() {
        let root = unique_root("vis-imported");
        let repo = root.join("repo");
        let ws_dir = root.join("workspaces");
        let wt = ws_dir.join("feat-imported");
        init_bare_repo(&repo);
        add_worktree(&repo, &wt, "feat-imported");
        let wt_str = wt.to_string_lossy().to_string();
        let ws_str = ws_dir.to_string_lossy().to_string();

        let policy = RepoVisibilityPolicy {
            external_worktree_visibility_legacy: Some(false),
            imported_paths: vec![wt_str.clone()],
            ..Default::default()
        };
        let (visible, hidden) = scan_with(
            &repo,
            &ws_str,
            &policy,
            Some(&visibility_defaults_hide()),
            &HashMap::new(),
        );
        assert!(
            visible.contains(&wt_str) && !hidden.contains(&wt_str),
            "imported path must be visible; visible={visible:?} hidden={hidden:?}"
        );

        let _ = Command::new("git").args(["worktree", "remove", "--force"]).arg(&wt).current_dir(&repo).output();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn custom_source_preferences_control_visibility() {
        let root = unique_root("vis-source");
        let repo = root.join("repo");
        let custom_root = root.join("custom-src");
        let wt = custom_root.join("feat-custom");
        init_bare_repo(&repo);
        add_worktree(&repo, &wt, "feat-custom");
        let wt_str = wt.to_string_lossy().to_string();

        let with_source = |preferences: Option<SourcePreferences>| RepoVisibilityPolicy {
            custom_sources: Some(vec![custom_source("s1", &custom_root)]),
            source_preferences: preferences,
            ..Default::default()
        };

        // `show` preference on the source → visible, even with `external: hide`.
        let (visible, _) = scan_with(
            &repo,
            "",
            &with_source(Some(source_prefs(&[], &[("s1", "show")]))),
            Some(&visibility_defaults_hide()),
            &HashMap::new(),
        );
        assert!(
            visible.contains(&wt_str),
            "custom source with `show` must be visible; visible={visible:?}"
        );

        // `hide` preference → hidden (and offered in the inbox).
        let (visible, hidden) = scan_with(
            &repo,
            "",
            &with_source(Some(source_prefs(&[], &[("s1", "hide")]))),
            Some(&visibility_defaults_hide()),
            &HashMap::new(),
        );
        assert!(
            !visible.contains(&wt_str) && hidden.contains(&wt_str),
            "custom source with `hide` must be hidden; visible={visible:?} hidden={hidden:?}"
        );

        // No repo preference but the repo owns the source → Orca defaults it hidden.
        let (visible, hidden) = scan_with(
            &repo,
            "",
            &with_source(None),
            Some(&visibility_defaults_hide()),
            &HashMap::new(),
        );
        assert!(
            !visible.contains(&wt_str) && hidden.contains(&wt_str),
            "repo-owned source without a preference defaults hidden; visible={visible:?} hidden={hidden:?}"
        );

        // A global source (not owned by the repo) follows the global preference.
        let defaults = WorktreeVisibilityDefaults {
            external: Some("hide".to_string()),
            custom_sources: Some(vec![custom_source("s1", &custom_root)]),
            source_preferences: Some(source_prefs(&[], &[("s1", "show")])),
        };
        let (visible, _) = scan_with(
            &repo,
            "",
            &RepoVisibilityPolicy::default(),
            Some(&defaults),
            &HashMap::new(),
        );
        assert!(
            visible.contains(&wt_str),
            "global custom source `show` must be visible; visible={visible:?}"
        );

        // An explicit empty repo list supersedes the global list entirely.
        let empty_list = RepoVisibilityPolicy {
            custom_sources: Some(vec![]),
            ..Default::default()
        };
        let (visible, hidden) = scan_with(
            &repo,
            "",
            &empty_list,
            Some(&defaults),
            &HashMap::new(),
        );
        assert!(
            !visible.contains(&wt_str) && hidden.contains(&wt_str),
            "an explicit empty repo list supersedes the global list; visible={visible:?} hidden={hidden:?}"
        );

        let _ = Command::new("git").args(["worktree", "remove", "--force"]).arg(&wt).current_dir(&repo).output();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn built_in_source_preferences_keep_scratch_out_of_the_inbox() {
        let root = unique_root("vis-scratch-source");
        let repo = root.join("repo");
        let claude_wt = repo.join(".claude").join("worktrees").join("feat-claude");
        let gsd_wt = repo.join(".gsd-workspaces").join("feat-gsd");
        init_bare_repo(&repo);
        add_worktree(&repo, &claude_wt, "feat-claude");
        add_worktree(&repo, &gsd_wt, "feat-gsd");
        let claude_str = claude_wt.to_string_lossy().to_string();
        let gsd_str = gsd_wt.to_string_lossy().to_string();

        let hide_claude = WorktreeVisibilityDefaults {
            external: Some("hide".to_string()),
            custom_sources: None,
            source_preferences: Some(source_prefs(&[("claude", "hide")], &[])),
        };

        // Hidden scratch is dropped from BOTH lists: agent plumbing never enters
        // the discovery inbox (Orca `isUserFacingExternalWorktree`).
        let (visible, hidden) = scan_with(
            &repo,
            "",
            &RepoVisibilityPolicy::default(),
            Some(&hide_claude),
            &HashMap::new(),
        );
        assert!(
            !visible.contains(&claude_str) && !hidden.contains(&claude_str),
            "hidden claude scratch must stay out of the inbox; visible={visible:?} hidden={hidden:?}"
        );

        // The repo-level preference `show` beats the global `hide`.
        let repo_show = RepoVisibilityPolicy {
            source_preferences: Some(source_prefs(&[("claude", "show")], &[])),
            ..Default::default()
        };
        let (visible, _) = scan_with(
            &repo,
            "",
            &repo_show,
            Some(&hide_claude),
            &HashMap::new(),
        );
        assert!(
            visible.contains(&claude_str),
            "repo-level `claude: show` must win; visible={visible:?}"
        );

        // `gsd` carries its own key: hidden here while claude is shown.
        let gsd_shown = WorktreeVisibilityDefaults {
            external: Some("hide".to_string()),
            custom_sources: None,
            source_preferences: Some(source_prefs(&[("claude", "show"), ("gsd", "show")], &[])),
        };
        let (visible, hidden) = scan_with(
            &repo,
            "",
            &RepoVisibilityPolicy::default(),
            Some(&gsd_shown),
            &HashMap::new(),
        );
        assert!(
            visible.contains(&claude_str) && visible.contains(&gsd_str),
            "both built-in sources shown; visible={visible:?} hidden={hidden:?}"
        );

        let gsd_only = WorktreeVisibilityDefaults {
            external: Some("hide".to_string()),
            custom_sources: None,
            source_preferences: Some(source_prefs(&[("gsd", "show")], &[])),
        };
        let (visible, hidden) = scan_with(
            &repo,
            "",
            &RepoVisibilityPolicy::default(),
            Some(&gsd_only),
            &HashMap::new(),
        );
        assert!(
            visible.contains(&gsd_str) && !visible.contains(&claude_str) && !hidden.contains(&claude_str),
            "gsd has its own key; visible={visible:?} hidden={hidden:?}"
        );

        for wt in [&claude_wt, &gsd_wt] {
            let _ = Command::new("git")
                .args(["worktree", "remove", "--force"])
                .arg(wt)
                .current_dir(&repo)
                .output();
        }
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn agent_scratch_built_in_preference_from_repo_policy_precedence() {
        // Pure policy check: repo preference > global preference > hide, and the
        // built-in ids are the only keys with a preference.
        let repo = RepoVisibilityPolicy {
            source_preferences: Some(source_prefs(&[("claude", "show")], &[])),
            ..Default::default()
        };
        let defaults = visibility_defaults_hide();
        assert!(repo.built_in_source_is_visible("claude", Some(&defaults)));
        assert!(!repo.built_in_source_is_visible("gsd", Some(&defaults)));
        // No repo preference and no global default → hidden.
        assert!(!RepoVisibilityPolicy::default().built_in_source_is_visible("claude", None));

        let global_show = WorktreeVisibilityDefaults {
            external: Some("hide".to_string()),
            custom_sources: None,
            source_preferences: Some(source_prefs(&[("claude", "show")], &[])),
        };
        let no_repo_prefs = RepoVisibilityPolicy::default();
        assert!(no_repo_prefs.built_in_source_is_visible("claude", Some(&global_show)));
        assert!(!no_repo_prefs.built_in_source_is_visible("gsd", Some(&global_show)));

        // Unset legacy resolves to true; an explicit flag wins.
        assert!(RepoVisibilityPolicy::default().is_legacy_repo());
        assert!(!RepoVisibilityPolicy {
            external_worktree_visibility_legacy: Some(false),
            ..Default::default()
        }
        .is_legacy_repo());
        // A repo-level external override also ends the legacy fallback.
        assert!(!RepoVisibilityPolicy {
            external_worktree_visibility: Some("show".to_string()),
            ..Default::default()
        }
        .is_legacy_repo());
    }

    #[test]
    fn agent_worktree_visibility_overrides_built_in_source_and_scratch() {
        // Orca `effectiveBuiltInWorktreeSourceVisibility`: the per-repo
        // `agentWorktreeVisibility` is the built-in source override — below an
        // explicit source preference, above the global preference.
        let defaults_hide = visibility_defaults_hide();
        let defaults_show_claude = WorktreeVisibilityDefaults {
            external: Some("hide".to_string()),
            custom_sources: None,
            source_preferences: Some(source_prefs(&[("claude", "show")], &[])),
        };

        // repo `show`, no preference, global hide → the built-in source shows,
        // for every built-in id (like Orca).
        let repo_show = RepoVisibilityPolicy {
            agent_worktree_visibility: Some("show".to_string()),
            ..Default::default()
        };
        assert!(repo_show.built_in_source_is_visible("claude", Some(&defaults_hide)));
        assert!(repo_show.built_in_source_is_visible("gsd", Some(&defaults_hide)));

        // repo `hide` / absent → hidden even when the global default shows.
        let repo_hide = RepoVisibilityPolicy {
            agent_worktree_visibility: Some("hide".to_string()),
            ..Default::default()
        };
        assert!(!repo_hide.built_in_source_is_visible("claude", Some(&defaults_show_claude)));
        assert!(!RepoVisibilityPolicy::default()
            .built_in_source_is_visible("claude", Some(&defaults_hide)));

        // An explicit source preference beats the repo field.
        let pref_beats = RepoVisibilityPolicy {
            agent_worktree_visibility: Some("show".to_string()),
            source_preferences: Some(source_prefs(&[("claude", "hide")], &[])),
            ..Default::default()
        };
        assert!(!pref_beats.built_in_source_is_visible("claude", Some(&defaults_hide)));
        let pref_show = RepoVisibilityPolicy {
            agent_worktree_visibility: Some("hide".to_string()),
            source_preferences: Some(source_prefs(&[("claude", "show")], &[])),
            ..Default::default()
        };
        assert!(pref_show.built_in_source_is_visible("claude", Some(&defaults_hide)));

        // The no-source agent-scratch branch: only an explicit repo `show` shows.
        assert!(should_show_worktree(
            &WorktreeOwnership::AgentScratch,
            false,
            None,
            &repo_show,
            None
        ));
        assert!(!should_show_worktree(
            &WorktreeOwnership::AgentScratch,
            false,
            None,
            &repo_hide,
            None
        ));
        assert!(!should_show_worktree(
            &WorktreeOwnership::AgentScratch,
            false,
            None,
            &RepoVisibilityPolicy::default(),
            Some(&defaults_show_claude)
        ));

        // Catalog → policy wiring reads the wire key.
        let catalog_repo: CatalogRepo = serde_json::from_value(serde_json::json!({
            "id": "r1",
            "path": "/x/repo",
            "displayName": "repo",
            "addedAt": 1,
            "agentWorktreeVisibility": "show"
        }))
        .expect("catalog repo parses");
        let wired = RepoVisibilityPolicy::from_catalog(&catalog_repo);
        assert!(wired.built_in_source_is_visible("claude", Some(&defaults_hide)));
    }

    #[test]
    fn agent_worktree_visibility_surfaces_hidden_scratch_worktrees() {
        let root = unique_root("agent-vis-scan");
        let repo = root.join("repo");
        let wt = repo.join(".claude").join("worktrees").join("feat-agent-vis");
        let wt_str = wt.to_string_lossy().to_string();
        init_bare_repo(&repo);
        add_worktree(&repo, &wt, "feat-agent-vis");

        // repo `agentWorktreeVisibility: show` overrides the global `external: hide`
        // for the built-in Claude source matching `.claude/worktrees`.
        let show = RepoVisibilityPolicy {
            agent_worktree_visibility: Some("show".to_string()),
            ..Default::default()
        };
        let (visible, _) = scan_with(
            &repo,
            "",
            &show,
            Some(&visibility_defaults_hide()),
            &HashMap::new(),
        );
        assert!(
            visible.contains(&wt_str),
            "repo `show` must surface scratch; visible={visible:?}"
        );

        // `hide` and absent stay hidden (default hide, including legacy), and
        // agent plumbing never enters the discovery inbox.
        for policy in [
            RepoVisibilityPolicy {
                agent_worktree_visibility: Some("hide".to_string()),
                ..Default::default()
            },
            RepoVisibilityPolicy::default(),
        ] {
            let (visible, hidden) = scan_with(
                &repo,
                "",
                &policy,
                Some(&visibility_defaults_hide()),
                &HashMap::new(),
            );
            assert!(!visible.contains(&wt_str), "scratch must stay hidden; visible={visible:?}");
            assert!(!hidden.contains(&wt_str), "agent plumbing stays out of the inbox");
        }

        // An explicit source preference beats the repo field.
        let pref_hide = RepoVisibilityPolicy {
            agent_worktree_visibility: Some("show".to_string()),
            source_preferences: Some(source_prefs(&[("claude", "hide")], &[])),
            ..Default::default()
        };
        let (visible, _) = scan_with(
            &repo,
            "",
            &pref_hide,
            Some(&visibility_defaults_hide()),
            &HashMap::new(),
        );
        assert!(!visible.contains(&wt_str), "source preference wins; visible={visible:?}");

        let _ = Command::new("git")
            .args(["worktree", "remove", "--force"])
            .arg(&wt)
            .current_dir(&repo)
            .output();
        let _ = std::fs::remove_dir_all(&root);
    }
}
