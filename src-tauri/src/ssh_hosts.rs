use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::LazyLock;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::AppState;

pub const SSH_CONFIG_HOST_RESULT_LIMIT: usize = 100;
pub const RUNTIME_OWNED_SSH_TARGET_ID_PREFIX: &str = "runtime-ssh-";

static ID_COUNTER: AtomicU64 = AtomicU64::new(1);
static CONFIG_HOSTS_CACHE: LazyLock<Mutex<Option<Vec<SshConfigHost>>>> =
    LazyLock::new(|| Mutex::new(None));

// ─── TYPES & DATA STRUCTURES ──────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshTargetOwner {
    pub r#type: String,
    pub runtime_id: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SavedPortForward {
    pub local_port: u16,
    pub remote_host: String,
    pub remote_port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshTarget {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owner: Option<SshTargetOwner>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config_host: Option<String>,
    pub host: String,
    pub port: u16,
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity_file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity_agent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identities_only: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gssapi_authentication: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proxy_command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jump_host: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relay_grace_period_seconds: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_required_passphrase: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port_forwards: Option<Vec<SavedPortForward>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_ssh_connection_reuse: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generation: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshTargetCreateInput {
    pub label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner: Option<SshTargetOwner>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub config_host: Option<String>,
    pub host: String,
    #[serde(default = "default_ssh_port")]
    pub port: u16,
    #[serde(default)]
    pub username: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub identity_file: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub identity_agent: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub identities_only: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gssapi_authentication: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub proxy_command: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub jump_host: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub relay_grace_period_seconds: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_required_passphrase: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub port_forwards: Option<Vec<SavedPortForward>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system_ssh_connection_reuse: Option<bool>,
}

fn default_ssh_port() -> u16 {
    22
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshTargetUpdateInput {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner: Option<SshTargetOwner>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub config_host: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub identity_file: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub identity_agent: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub identities_only: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gssapi_authentication: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub proxy_command: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub jump_host: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub relay_grace_period_seconds: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_required_passphrase: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub port_forwards: Option<Vec<SavedPortForward>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system_ssh_connection_reuse: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshTargetSummary {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generation: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote_platform: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connected: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connection_status: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RemovedSshTargetTombstone {
    pub old_target_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config_host: Option<String>,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub label: String,
    pub removed_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshRepoReadoption {
    pub old_target_id: String,
    pub new_target_id: String,
    pub repo_ids: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshTargetAddResult {
    pub target: SshTarget,
    pub repo_readoptions: Vec<SshRepoReadoption>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshConfigImportResult {
    pub targets: Vec<SshTarget>,
    pub repo_readoptions: Vec<SshRepoReadoption>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshRemoveTargetResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tombstone: Option<RemovedSshTargetTombstone>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suppressed_alias: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshConfigHostSummary {
    pub alias: String,
    pub hostname: String,
    pub port: u16,
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity_file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proxy_command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jump_host: Option<String>,
    pub already_in_orca: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previously_removed: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshConfigHostListResult {
    pub hosts: Vec<SshConfigHostSummary>,
    pub total_host_count: usize,
    pub new_host_count: usize,
    pub match_count: usize,
    pub has_more: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SshConfigHostResolution {
    pub alias: String,
    pub hostname: String,
    pub port: u16,
    pub username: String,
    pub identity_files: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity_agent: Option<String>,
    pub identities_only: bool,
    pub forward_agent: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gssapi_authentication: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proxy_command: Option<String>,
    pub proxy_use_fdpass: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jump_host: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersistedSshState {
    #[serde(default)]
    pub ssh_targets: Vec<SshTarget>,
    #[serde(default)]
    pub ssh_target_generation_counter: u64,
    #[serde(default)]
    pub deleted_ssh_config_aliases: Vec<String>,
    #[serde(default)]
    pub removed_ssh_target_tombstones: Vec<RemovedSshTargetTombstone>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct SshConfigHost {
    pub host: String,
    pub hostname: Option<String>,
    pub port: Option<u16>,
    pub user: Option<String>,
    pub identity_file: Option<String>,
    pub identity_agent: Option<String>,
    pub identities_only: Option<bool>,
    pub gssapi_authentication: Option<bool>,
    pub proxy_command: Option<String>,
    pub proxy_use_fdpass: Option<bool>,
    pub proxy_jump: Option<String>,
}

// ─── HELPERS & NORMALIZATION ──────────────────────────────────────────

pub fn normalize_ssh_config_alias(alias: &str) -> String {
    alias.trim().to_lowercase()
}

pub fn is_runtime_owned_ssh_target(target: &SshTarget) -> bool {
    target.id.starts_with(RUNTIME_OWNED_SSH_TARGET_ID_PREFIX)
        || target
            .owner
            .as_ref()
            .map(|o| o.r#type == "on-demand-runtime")
            .unwrap_or(false)
}

pub fn generate_ssh_target_id() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let count = ID_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("ssh-{millis}-{count}")
}

pub fn resolve_generation_high_water_mark(state: &PersistedSshState) -> u64 {
    let mut max_gen = state.ssh_target_generation_counter;
    for target in &state.ssh_targets {
        if let Some(gen) = target.generation {
            if gen > max_gen {
                max_gen = gen;
            }
        }
    }
    max_gen
}

pub fn allocate_ssh_target_generation(state: &mut PersistedSshState) -> u64 {
    let current_high = resolve_generation_high_water_mark(state);
    let next_gen = current_high + 1;
    state.ssh_target_generation_counter = next_gen;
    next_gen
}

pub fn reclaim_alias(deleted_aliases: &mut Vec<String>, alias: Option<&str>) {
    let Some(alias) = alias else { return };
    let norm = normalize_ssh_config_alias(alias);
    if norm.is_empty() {
        return;
    }
    deleted_aliases.retain(|stored| normalize_ssh_config_alias(stored) != norm);
}

pub fn resolve_ssh_config_home_path(filepath: &str) -> String {
    let home = crate::db::user_home_dir();
    let home_str = home.to_string_lossy();
    if filepath == "~" {
        return home_str.to_string();
    }
    if let Some(rest) = filepath.strip_prefix("~/").or_else(|| filepath.strip_prefix("~\\")) {
        let mut path = home;
        for part in rest.split(['/', '\\']) {
            if !part.is_empty() {
                path.push(part);
            }
        }
        return path.to_string_lossy().to_string();
    }
    filepath.to_string()
}

// ─── PARSER: ~/.ssh/config ───────────────────────────────────────────

pub fn split_openssh_arguments(input: &str) -> Vec<String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut escaped = false;

    for ch in input.chars() {
        if escaped {
            current.push(ch);
            escaped = false;
            continue;
        }

        if in_quotes && ch == '\\' {
            escaped = true;
            continue;
        }

        if ch == '"' {
            in_quotes = !in_quotes;
            continue;
        }

        if !in_quotes && ch == '#' {
            break;
        }

        if !in_quotes && ch.is_whitespace() {
            if !current.is_empty() {
                args.push(current);
                current = String::new();
            }
            continue;
        }

        current.push(ch);
    }

    if !current.is_empty() {
        args.push(current);
    }

    args
}

fn parse_config_directive(line: &str) -> Option<(String, String)> {
    let line = line.trim();
    if line.is_empty() || line.starts_with('#') {
        return None;
    }

    let chars: Vec<char> = line.chars().collect();
    let mut key = String::new();
    let mut rest_idx = 0;
    let mut i = 0;
    while i < chars.len() {
        let ch = chars[i];
        if ch == '=' || ch.is_whitespace() {
            rest_idx = i;
            break;
        }
        key.push(ch);
        i += 1;
    }

    if key.is_empty() {
        return None;
    }

    let mut j = rest_idx;
    let mut saw_eq = false;
    while j < chars.len() {
        let ch = chars[j];
        if ch == '=' && !saw_eq {
            saw_eq = true;
            j += 1;
        } else if ch.is_whitespace() {
            j += 1;
        } else {
            break;
        }
    }

    let raw_value: String = chars[j..].iter().collect();
    Some((key.to_lowercase(), raw_value.trim().to_string()))
}

fn parse_scalar_config_value(input: &str) -> String {
    split_openssh_arguments(input)
        .into_iter()
        .next()
        .unwrap_or_default()
}

pub fn parse_ssh_config(content: &str) -> Vec<SshConfigHost> {
    let mut hosts = Vec::new();
    let mut current: Vec<SshConfigHost> = Vec::new();

    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let Some((key, raw_value)) = parse_config_directive(line) else {
            continue;
        };

        if key == "host" {
            if !current.is_empty() {
                hosts.append(&mut current);
            }

            let patterns = split_openssh_arguments(&raw_value);
            let concrete_patterns: Vec<String> = patterns
                .into_iter()
                .filter(|p| !p.starts_with('!') && !p.contains('*') && !p.contains('?'))
                .collect();

            if concrete_patterns.is_empty() {
                current = Vec::new();
                continue;
            }

            current = concrete_patterns
                .into_iter()
                .map(|p| SshConfigHost {
                    host: p,
                    ..Default::default()
                })
                .collect();
            continue;
        }

        if key == "match" {
            if !current.is_empty() {
                hosts.append(&mut current);
            }
            current = Vec::new();
            continue;
        }

        if current.is_empty() {
            continue;
        }

        let value = parse_scalar_config_value(&raw_value);

        match key.as_str() {
            "hostname" => {
                for host in &mut current {
                    if host.hostname.is_none() {
                        host.hostname = Some(value.clone());
                    }
                }
            }
            "port" => {
                let parsed_port = value.parse::<u16>().unwrap_or(22);
                for host in &mut current {
                    if host.port.is_none() {
                        host.port = Some(parsed_port);
                    }
                }
            }
            "user" => {
                for host in &mut current {
                    if host.user.is_none() {
                        host.user = Some(value.clone());
                    }
                }
            }
            "identityfile" => {
                let resolved = resolve_ssh_config_home_path(&value);
                for host in &mut current {
                    host.identity_file = Some(resolved.clone());
                }
            }
            "identityagent" => {
                let resolved = resolve_ssh_config_home_path(&value);
                for host in &mut current {
                    if host.identity_agent.is_none() {
                        host.identity_agent = Some(resolved.clone());
                    }
                }
            }
            "identitiesonly" => {
                let b = value.eq_ignore_ascii_case("yes");
                for host in &mut current {
                    if host.identities_only.is_none() {
                        host.identities_only = Some(b);
                    }
                }
            }
            "gssapiauthentication" => {
                let b = value.eq_ignore_ascii_case("yes");
                for host in &mut current {
                    if host.gssapi_authentication.is_none() {
                        host.gssapi_authentication = Some(b);
                    }
                }
            }
            "proxycommand" => {
                let raw_cmd = raw_value.trim().to_string();
                for host in &mut current {
                    if host.proxy_command.is_none() {
                        host.proxy_command = Some(raw_cmd.clone());
                    }
                }
            }
            "proxyusefdpass" => {
                let b = value.eq_ignore_ascii_case("yes");
                for host in &mut current {
                    if host.proxy_use_fdpass.is_none() {
                        host.proxy_use_fdpass = Some(b);
                    }
                }
            }
            "proxyjump" => {
                for host in &mut current {
                    if host.proxy_jump.is_none() {
                        host.proxy_jump = Some(value.clone());
                    }
                }
            }
            _ => {}
        }
    }

    if !current.is_empty() {
        hosts.append(&mut current);
    }

    hosts
}

// ─── INCLUDE EXPANSION ───────────────────────────────────────────────

const MAX_INCLUDE_DEPTH: usize = 16;
const MAX_INCLUDE_FILE_BYTES: u64 = 1024 * 1024; // 1MB

pub fn expand_ssh_config_includes(config_path: &Path) -> String {
    let mut visited = HashSet::new();
    expand_ssh_config_file(config_path, 0, &mut visited)
}

fn expand_ssh_config_file(
    file_path: &Path,
    depth: usize,
    visited: &mut HashSet<PathBuf>,
) -> String {
    if depth > MAX_INCLUDE_DEPTH {
        return String::new();
    }

    let canonical = file_path.canonicalize().unwrap_or_else(|_| file_path.to_path_buf());

    if visited.contains(&canonical) {
        return String::new();
    }
    visited.insert(canonical.clone());

    let Ok(metadata) = std::fs::metadata(file_path) else {
        return String::new();
    };
    if metadata.len() > MAX_INCLUDE_FILE_BYTES {
        return String::new();
    }

    let Ok(content) = std::fs::read_to_string(file_path) else {
        return String::new();
    };

    let base_dir = file_path.parent().unwrap_or_else(|| Path::new("."));
    let mut out_lines = Vec::new();

    for raw_line in content.lines() {
        let trimmed = raw_line.trim();
        if trimmed.starts_with('#') || trimmed.is_empty() {
            out_lines.push(raw_line.to_string());
            continue;
        }

        if let Some((key, raw_value)) = parse_config_directive(trimmed) {
            if key == "include" {
                let include_patterns = split_openssh_arguments(&raw_value);
                for pattern in include_patterns {
                    let resolved_files = resolve_include_pattern(&pattern, base_dir);
                    for included_file in resolved_files {
                        let expanded_child =
                            expand_ssh_config_file(&included_file, depth + 1, visited);
                        if !expanded_child.is_empty() {
                            out_lines.push(expanded_child);
                        }
                    }
                }
                continue;
            }
        }

        out_lines.push(raw_line.to_string());
    }

    out_lines.join("\n")
}

fn resolve_include_pattern(pattern: &str, base_dir: &Path) -> Vec<PathBuf> {
    let home = crate::db::user_home_dir();
    let ssh_dir = home.join(".ssh");

    let resolved_pattern = if pattern == "~" {
        home.to_string_lossy().to_string()
    } else if let Some(rest) = pattern.strip_prefix("~/").or_else(|| pattern.strip_prefix("~\\")) {
        home.join(rest).to_string_lossy().to_string()
    } else if Path::new(pattern).is_absolute() {
        pattern.to_string()
    } else {
        // Relative include: OpenSSH resolves relative to ~/.ssh or base_dir
        if base_dir.exists() && base_dir.join(pattern).exists() {
            base_dir.join(pattern).to_string_lossy().to_string()
        } else {
            ssh_dir.join(pattern).to_string_lossy().to_string()
        }
    };

    let path_obj = Path::new(&resolved_pattern);
    if resolved_pattern.contains('*') || resolved_pattern.contains('?') {
        let parent = path_obj.parent().unwrap_or_else(|| Path::new("."));
        let file_pattern = path_obj
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or_default();

        let Ok(entries) = std::fs::read_dir(parent) else {
            return Vec::new();
        };

        let mut matched_files = Vec::new();
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if wildcard_match(file_pattern, &name_str) {
                let entry_path = entry.path();
                if entry_path.is_file() {
                    matched_files.push(entry_path);
                }
            }
        }
        matched_files.sort();
        matched_files
    } else if path_obj.is_file() {
        vec![path_obj.to_path_buf()]
    } else {
        Vec::new()
    }
}

fn wildcard_match(pattern: &str, input: &str) -> bool {
    if pattern == "*" {
        return true;
    }
    let p_chars: Vec<char> = pattern.chars().collect();
    let i_chars: Vec<char> = input.chars().collect();
    let (mut pi, mut ii) = (0, 0);
    let (mut star_idx, mut match_idx) = (None, 0);

    while ii < i_chars.len() {
        if pi < p_chars.len() && (p_chars[pi] == '?' || p_chars[pi] == i_chars[ii]) {
            pi += 1;
            ii += 1;
        } else if pi < p_chars.len() && p_chars[pi] == '*' {
            star_idx = Some(pi);
            pi += 1;
            match_idx = ii;
        } else if let Some(s_idx) = star_idx {
            pi = s_idx + 1;
            match_idx += 1;
            ii = match_idx;
        } else {
            return false;
        }
    }

    while pi < p_chars.len() && p_chars[pi] == '*' {
        pi += 1;
    }

    pi == p_chars.len()
}

pub fn default_ssh_config_path() -> PathBuf {
    crate::db::user_home_dir().join(".ssh").join("config")
}

pub fn load_user_ssh_config(custom_path: Option<&Path>) -> Vec<SshConfigHost> {
    let path = custom_path
        .map(PathBuf::from)
        .unwrap_or_else(default_ssh_config_path);

    if !path.exists() {
        return Vec::new();
    }

    let expanded = expand_ssh_config_includes(&path);
    parse_ssh_config(&expanded)
}

pub fn get_user_ssh_config_hosts(refresh: bool, custom_path: Option<&Path>) -> Vec<SshConfigHost> {
    if !refresh {
        let cache = CONFIG_HOSTS_CACHE.lock();
        if let Some(cached) = &*cache {
            return cached.clone();
        }
    }

    let hosts = load_user_ssh_config(custom_path);
    let mut cache = CONFIG_HOSTS_CACHE.lock();
    *cache = Some(hosts.clone());
    hosts
}

pub fn invalidate_user_ssh_config_host_cache() {
    let mut cache = CONFIG_HOSTS_CACHE.lock();
    *cache = None;
}

// ─── SEARCH & PICKER ─────────────────────────────────────────────────

pub fn search_ssh_config_hosts(
    hosts: &[SshConfigHost],
    existing_targets: &[SshTarget],
    query: &str,
    suppressed_aliases: &[String],
) -> SshConfigHostListResult {
    let mut existing_aliases = HashSet::new();
    for t in existing_targets {
        if let Some(ch) = &t.config_host {
            let n = normalize_ssh_config_alias(ch);
            if !n.is_empty() {
                existing_aliases.insert(n);
            }
        }
        let n = normalize_ssh_config_alias(&t.label);
        if !n.is_empty() {
            existing_aliases.insert(n);
        }
    }

    let normalized_query = query.trim().to_lowercase();
    let suppressed_alias_set: HashSet<String> = suppressed_aliases
        .iter()
        .map(|a| normalize_ssh_config_alias(a))
        .collect();

    let mut summaries = Vec::new();
    let mut seen_aliases = HashSet::new();
    let mut total_host_count = 0;
    let mut new_host_count = 0;
    let mut match_count = 0;

    for entry in hosts {
        let normalized_alias = normalize_ssh_config_alias(&entry.host);
        if seen_aliases.contains(&normalized_alias) {
            continue;
        }
        seen_aliases.insert(normalized_alias.clone());

        let already_in_orca = existing_aliases.contains(&normalized_alias);
        let previously_removed =
            !already_in_orca && suppressed_alias_set.contains(&normalized_alias);

        total_host_count += 1;
        if !already_in_orca && !previously_removed {
            new_host_count += 1;
        }

        if !matches_query(entry, &normalized_query) {
            continue;
        }

        match_count += 1;
        if summaries.len() < SSH_CONFIG_HOST_RESULT_LIMIT {
            summaries.push(SshConfigHostSummary {
                alias: entry.host.clone(),
                hostname: entry.hostname.clone().unwrap_or_else(|| entry.host.clone()),
                port: entry.port.unwrap_or(22),
                username: entry.user.clone().unwrap_or_default(),
                identity_file: entry.identity_file.clone(),
                proxy_command: entry.proxy_command.clone(),
                jump_host: entry.proxy_jump.clone(),
                already_in_orca,
                previously_removed: if previously_removed { Some(true) } else { None },
            });
        }
    }

    let has_more = match_count > summaries.len();

    SshConfigHostListResult {
        hosts: summaries,
        total_host_count,
        new_host_count,
        match_count,
        has_more,
    }
}

fn matches_query(entry: &SshConfigHost, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    entry.host.to_lowercase().contains(query)
        || entry
            .hostname
            .as_deref()
            .unwrap_or(&entry.host)
            .to_lowercase()
            .contains(query)
        || entry
            .user
            .as_deref()
            .unwrap_or("")
            .to_lowercase()
            .contains(query)
}

// ─── IMPORT & SYNC ────────────────────────────────────────────────────

pub fn import_from_ssh_config(
    state: &mut PersistedSshState,
    config_hosts: &[SshConfigHost],
    re_adopt: bool,
) -> Vec<SshTarget> {
    if re_adopt {
        state.deleted_ssh_config_aliases.clear();
    }

    let deleted_aliases: HashSet<String> = state
        .deleted_ssh_config_aliases
        .iter()
        .map(|a| normalize_ssh_config_alias(a))
        .collect();

    let mut manual_aliases = HashSet::new();
    let mut syncable_by_alias: HashMap<String, usize> = HashMap::new();

    for (idx, existing) in state.ssh_targets.iter().enumerate() {
        let alias = normalize_ssh_config_alias(
            existing.config_host.as_deref().unwrap_or(&existing.label),
        );
        if existing.source.as_deref() == Some("manual")
            || (existing.source.is_none() && !is_legacy_config_import_target(existing))
        {
            if !alias.is_empty() {
                manual_aliases.insert(alias);
            }
            continue;
        }
        if !alias.is_empty() && !syncable_by_alias.contains_key(&alias) {
            syncable_by_alias.insert(alias, idx);
        }
    }

    let candidates = ssh_config_hosts_to_targets(config_hosts);
    let mut changed = Vec::new();
    let mut processed_aliases = HashSet::new();

    for candidate in candidates {
        let alias = normalize_ssh_config_alias(
            candidate.config_host.as_deref().unwrap_or(&candidate.label),
        );
        if manual_aliases.contains(&alias) {
            continue;
        }
        if deleted_aliases.contains(&alias) {
            continue;
        }
        if processed_aliases.contains(&alias) {
            continue;
        }
        processed_aliases.insert(alias.clone());

        if let Some(&existing_idx) = syncable_by_alias.get(&alias) {
            let existing = &state.ssh_targets[existing_idx];
            let is_dirty = existing.source.as_deref() != Some("ssh-config")
                || existing.config_host != candidate.config_host
                || existing.host != candidate.host
                || existing.port != candidate.port
                || existing.username != candidate.username
                || existing.identity_file != candidate.identity_file
                || existing.identity_agent != candidate.identity_agent
                || existing.identities_only != candidate.identities_only
                || existing.gssapi_authentication != candidate.gssapi_authentication
                || existing.proxy_command != candidate.proxy_command
                || existing.jump_host != candidate.jump_host;

            if !is_dirty {
                continue;
            }

            let existing_mut = &mut state.ssh_targets[existing_idx];
            existing_mut.config_host = candidate.config_host;
            existing_mut.host = candidate.host;
            existing_mut.port = candidate.port;
            existing_mut.username = candidate.username;
            existing_mut.identity_file = candidate.identity_file;
            existing_mut.identity_agent = candidate.identity_agent;
            existing_mut.identities_only = candidate.identities_only;
            existing_mut.gssapi_authentication = candidate.gssapi_authentication;
            existing_mut.proxy_command = candidate.proxy_command;
            existing_mut.jump_host = candidate.jump_host;
            existing_mut.source = Some("ssh-config".to_string());

            changed.push(existing_mut.clone());
        } else {
            let next_gen = allocate_ssh_target_generation(state);
            let mut inserted = candidate;
            inserted.id = generate_ssh_target_id();
            inserted.source = Some("ssh-config".to_string());
            inserted.generation = Some(next_gen);
            state.ssh_targets.push(inserted.clone());
            changed.push(inserted);
        }
    }

    changed
}

fn is_legacy_config_import_target(target: &SshTarget) -> bool {
    let alias = target.config_host.as_deref().unwrap_or(&target.label);
    !alias.is_empty()
        && target.label == alias
        && target.config_host.as_deref() == Some(alias)
        && target.host != alias
}

fn ssh_config_hosts_to_targets(hosts: &[SshConfigHost]) -> Vec<SshTarget> {
    let mut targets = Vec::new();
    let mut seen_labels = HashSet::new();

    for entry in hosts {
        let label = entry.host.clone();
        let effective_host = entry.hostname.clone().unwrap_or_else(|| entry.host.clone());

        let norm_label = normalize_ssh_config_alias(&label);
        if seen_labels.contains(&norm_label) {
            continue;
        }
        seen_labels.insert(norm_label);

        targets.push(SshTarget {
            id: String::new(),
            label: label.clone(),
            owner: None,
            config_host: Some(entry.host.clone()),
            host: effective_host,
            port: entry.port.unwrap_or(22),
            username: entry.user.clone().unwrap_or_default(),
            identity_file: entry.identity_file.clone(),
            identity_agent: entry.identity_agent.clone(),
            identities_only: entry.identities_only,
            gssapi_authentication: entry.gssapi_authentication,
            proxy_command: entry.proxy_command.clone(),
            jump_host: entry.proxy_jump.clone(),
            source: Some("ssh-config".to_string()),
            relay_grace_period_seconds: None,
            last_required_passphrase: None,
            port_forwards: None,
            system_ssh_connection_reuse: None,
            generation: None,
        });
    }

    targets
}

// ─── RESOLUTION: ssh -G ──────────────────────────────────────────────

pub trait SshGRunner: Send + Sync {
    fn run_ssh_g(&self, alias: &str) -> Result<String, String>;
}

pub struct SystemSshGRunner;

impl SshGRunner for SystemSshGRunner {
    fn run_ssh_g(&self, alias: &str) -> Result<String, String> {
        run_system_ssh_g(alias, Duration::from_secs(5))
    }
}

fn run_system_ssh_g(alias: &str, timeout: Duration) -> Result<String, String> {
    let home_config_path = default_ssh_config_path();
    let mut cmd = Command::new("ssh");

    if home_config_path.exists() {
        cmd.arg("-F").arg(&home_config_path);
    }
    cmd.arg("-G").arg("--").arg(alias);

    let output = run_command_with_timeout(cmd, timeout)?;
    if !output.status.success() {
        return Err(format!(
            "ssh -G exited with status {}",
            output.status.code().unwrap_or(-1)
        ));
    }

    String::from_utf8(output.stdout).map_err(|e| format!("Invalid UTF-8 from ssh -G: {e}"))
}

fn run_command_with_timeout(
    mut cmd: Command,
    _timeout: Duration,
) -> Result<std::process::Output, String> {
    cmd.output()
        .map_err(|e| format!("Failed to spawn ssh -G: {e}"))
}

pub fn parse_ssh_g_output(stdout: &str) -> SshResolvedConfig {
    let mut map = HashMap::new();
    let mut identity_files = Vec::new();

    for line in stdout.lines() {
        let Some(space_idx) = line.find(' ') else {
            continue;
        };
        let key = line[..space_idx].to_lowercase();
        let value = line[space_idx + 1..].trim();
        if key == "identityfile" {
            identity_files.push(resolve_ssh_config_home_path(value));
        } else {
            map.insert(key, value.to_string());
        }
    }

    build_ssh_resolved_config(map, identity_files)
}

#[derive(Debug, Clone, Default)]
pub struct SshResolvedConfig {
    pub hostname: String,
    pub user: Option<String>,
    pub port: u16,
    pub identity_file: Vec<String>,
    pub identity_agent: Option<String>,
    pub identities_only: bool,
    pub forward_agent: bool,
    pub gssapi_authentication: bool,
    pub proxy_command: Option<String>,
    pub proxy_use_fdpass: bool,
    pub proxy_jump: Option<String>,
}

fn build_ssh_resolved_config(
    map: HashMap<String, String>,
    identity_files: Vec<String>,
) -> SshResolvedConfig {
    let raw_proxy = map.get("proxycommand").cloned();
    let proxy_command = if let Some(cmd) = raw_proxy {
        if cmd != "none" && !cmd.is_empty() {
            Some(cmd)
        } else {
            None
        }
    } else {
        None
    };

    let raw_jump = map.get("proxyjump").cloned();
    let proxy_jump = if let Some(jump) = raw_jump {
        if jump != "none" && !jump.is_empty() {
            Some(jump)
        } else {
            None
        }
    } else {
        None
    };

    let raw_identity_agent = map.get("identityagent").cloned();
    let identity_agent = if let Some(agent) = raw_identity_agent {
        if agent != "none" && !agent.is_empty() {
            Some(resolve_ssh_config_home_path(&agent))
        } else {
            None
        }
    } else {
        None
    };

    SshResolvedConfig {
        hostname: map.get("hostname").cloned().unwrap_or_default(),
        user: map.get("user").filter(|u| !u.is_empty()).cloned(),
        port: map
            .get("port")
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(22),
        identity_file: identity_files,
        identity_agent,
        identities_only: map.get("identitiesonly").map(|v| v == "yes").unwrap_or(false),
        forward_agent: map.get("forwardagent").map(|v| v == "yes").unwrap_or(false),
        gssapi_authentication: map
            .get("gssapiauthentication")
            .map(|v| v == "yes")
            .unwrap_or(false),
        proxy_command,
        proxy_use_fdpass: map
            .get("proxyusefdpass")
            .map(|v| v == "yes")
            .unwrap_or(false),
        proxy_jump,
    }
}

pub fn config_host_matches(hosts: &[SshConfigHost], alias: &str) -> bool {
    let norm = normalize_ssh_config_alias(alias);
    if norm.is_empty() {
        return false;
    }
    hosts
        .iter()
        .any(|entry| normalize_ssh_config_alias(&entry.host) == norm)
}

pub fn config_host_requests_gssapi(hosts: &[SshConfigHost], alias: &str) -> Option<bool> {
    let norm = normalize_ssh_config_alias(alias);
    if norm.is_empty() {
        return None;
    }
    for entry in hosts {
        if normalize_ssh_config_alias(&entry.host) == norm
            && entry.gssapi_authentication == Some(true)
        {
            return Some(true);
        }
    }
    None
}

pub fn resolve_user_ssh_config_host_with_runner(
    alias: &str,
    custom_path: Option<&Path>,
    runner: &dyn SshGRunner,
) -> Result<Option<SshConfigHostResolution>, String> {
    let config_hosts = load_user_ssh_config(custom_path);
    if !config_host_matches(&config_hosts, alias) {
        return Ok(None);
    }

    let stdout = match runner.run_ssh_g(alias) {
        Ok(out) => out,
        Err(_) => return Ok(None),
    };

    let resolved = parse_ssh_g_output(&stdout);
    if resolved.hostname.is_empty() {
        return Ok(None);
    }

    let gssapi_authentication = config_host_requests_gssapi(&config_hosts, alias);

    Ok(Some(SshConfigHostResolution {
        alias: alias.to_string(),
        hostname: resolved.hostname,
        port: resolved.port,
        username: resolved.user.unwrap_or_default(),
        identity_files: resolved.identity_file,
        identity_agent: resolved.identity_agent,
        identities_only: resolved.identities_only,
        forward_agent: resolved.forward_agent,
        gssapi_authentication,
        proxy_command: resolved.proxy_command,
        proxy_use_fdpass: resolved.proxy_use_fdpass,
        jump_host: resolved.proxy_jump,
    }))
}

pub fn resolve_user_ssh_config_host(
    alias: &str,
) -> Result<Option<SshConfigHostResolution>, String> {
    resolve_user_ssh_config_host_with_runner(alias, None, &SystemSshGRunner)
}

// ─── TAURI COMMANDS ──────────────────────────────────────────────────

#[tauri::command]
pub async fn ssh_list_targets(state: State<'_, AppState>) -> Result<Vec<SshTarget>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let persisted = db.get_ssh_state()?;
        let targets = persisted
            .ssh_targets
            .into_iter()
            .filter(|t| !is_runtime_owned_ssh_target(t))
            .collect();
        Ok(targets)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ssh_list_removed_target_labels(
    state: State<'_, AppState>,
) -> Result<HashMap<String, String>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let persisted = db.get_ssh_state()?;
        let mut labels = HashMap::new();
        for tombstone in persisted.removed_ssh_target_tombstones {
            labels.insert(tombstone.old_target_id, tombstone.label);
        }
        Ok(labels)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ssh_list_suppressed_aliases(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let persisted = db.get_ssh_state()?;
        Ok(persisted.deleted_ssh_config_aliases)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ssh_add_target(
    target: SshTargetCreateInput,
    state: State<'_, AppState>,
) -> Result<SshTargetAddResult, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let mut persisted = db.get_ssh_state()?;
        let next_gen = allocate_ssh_target_generation(&mut persisted);
        let id = generate_ssh_target_id();
        let config_host = target.config_host.clone().or_else(|| Some(target.host.clone()));
        let source = target.source.clone().or_else(|| Some("manual".to_string()));

        let full = SshTarget {
            id,
            label: target.label,
            owner: target.owner,
            config_host,
            host: target.host,
            port: target.port,
            username: target.username,
            identity_file: target.identity_file,
            identity_agent: target.identity_agent,
            identities_only: target.identities_only,
            gssapi_authentication: target.gssapi_authentication,
            proxy_command: target.proxy_command,
            jump_host: target.jump_host,
            source,
            relay_grace_period_seconds: target.relay_grace_period_seconds,
            last_required_passphrase: target.last_required_passphrase,
            port_forwards: target.port_forwards,
            system_ssh_connection_reuse: target.system_ssh_connection_reuse,
            generation: Some(next_gen),
        };

        let alias_to_reclaim = full.config_host.as_deref().unwrap_or(&full.label);
        reclaim_alias(&mut persisted.deleted_ssh_config_aliases, Some(alias_to_reclaim));

        persisted.ssh_targets.push(full.clone());
        db.save_ssh_state(&persisted)?;

        Ok(SshTargetAddResult {
            target: full,
            repo_readoptions: vec![],
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ssh_update_target(
    id: String,
    updates: SshTargetUpdateInput,
    state: State<'_, AppState>,
) -> Result<Option<SshTarget>, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let mut persisted = db.get_ssh_state()?;
        let Some(pos) = persisted.ssh_targets.iter().position(|t| t.id == id) else {
            return Ok(None);
        };

        let target = &mut persisted.ssh_targets[pos];
        if let Some(label) = updates.label {
            target.label = label;
        }
        if updates.owner.is_some() {
            target.owner = updates.owner;
        }
        if updates.config_host.is_some() {
            target.config_host = updates.config_host;
        }
        if let Some(host) = updates.host {
            target.host = host;
        }
        if let Some(port) = updates.port {
            target.port = port;
        }
        if let Some(username) = updates.username {
            target.username = username;
        }
        if updates.identity_file.is_some() {
            target.identity_file = updates.identity_file;
        }
        if updates.identity_agent.is_some() {
            target.identity_agent = updates.identity_agent;
        }
        if updates.identities_only.is_some() {
            target.identities_only = updates.identities_only;
        }
        if updates.gssapi_authentication.is_some() {
            target.gssapi_authentication = updates.gssapi_authentication;
        }
        if updates.proxy_command.is_some() {
            target.proxy_command = updates.proxy_command;
        }
        if updates.jump_host.is_some() {
            target.jump_host = updates.jump_host;
        }
        if updates.source.is_some() {
            target.source = updates.source;
        }
        if updates.relay_grace_period_seconds.is_some() {
            target.relay_grace_period_seconds = updates.relay_grace_period_seconds;
        }
        if updates.last_required_passphrase.is_some() {
            target.last_required_passphrase = updates.last_required_passphrase;
        }
        if updates.port_forwards.is_some() {
            target.port_forwards = updates.port_forwards;
        }
        if updates.system_ssh_connection_reuse.is_some() {
            target.system_ssh_connection_reuse = updates.system_ssh_connection_reuse;
        }

        let updated = target.clone();
        let alias_to_reclaim = updated.config_host.as_deref().unwrap_or(&updated.label);
        reclaim_alias(&mut persisted.deleted_ssh_config_aliases, Some(alias_to_reclaim));

        db.save_ssh_state(&persisted)?;
        Ok(Some(updated))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ssh_remove_target(
    id: String,
    state: State<'_, AppState>,
) -> Result<SshRemoveTargetResult, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let mut persisted = db.get_ssh_state()?;
        let mut tombstone = None;
        let mut suppressed_alias = None;

        if let Some(pos) = persisted.ssh_targets.iter().position(|t| t.id == id) {
            let target = persisted.ssh_targets.remove(pos);
            if !is_runtime_owned_ssh_target(&target) {
                let alias = target
                    .config_host
                    .clone()
                    .unwrap_or_else(|| target.label.clone());
                let norm = normalize_ssh_config_alias(&alias);
                if !norm.is_empty() {
                    if !persisted
                        .deleted_ssh_config_aliases
                        .iter()
                        .any(|a| normalize_ssh_config_alias(a) == norm)
                    {
                        persisted.deleted_ssh_config_aliases.push(alias.clone());
                    }
                    suppressed_alias = Some(alias.clone());
                }

                let now_ms = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);

                let t = RemovedSshTargetTombstone {
                    old_target_id: target.id,
                    config_host: target.config_host,
                    host: target.host,
                    port: target.port,
                    username: target.username,
                    label: target.label,
                    removed_at: now_ms,
                };
                persisted.removed_ssh_target_tombstones.push(t.clone());
                tombstone = Some(t);
            }
            db.save_ssh_state(&persisted)?;
        }

        Ok(SshRemoveTargetResult {
            tombstone,
            suppressed_alias,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ssh_import_config(
    re_adopt: Option<bool>,
    state: State<'_, AppState>,
) -> Result<SshConfigImportResult, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let mut persisted = db.get_ssh_state()?;
        let config_hosts = load_user_ssh_config(None);
        let changed = import_from_ssh_config(
            &mut persisted,
            &config_hosts,
            re_adopt.unwrap_or(false),
        );
        db.save_ssh_state(&persisted)?;
        Ok(SshConfigImportResult {
            targets: changed,
            repo_readoptions: vec![],
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ssh_list_config_hosts(
    query: Option<String>,
    refresh: Option<bool>,
    state: State<'_, AppState>,
) -> Result<SshConfigHostListResult, String> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let persisted = db.get_ssh_state()?;
        let config_hosts = get_user_ssh_config_hosts(refresh.unwrap_or(false), None);
        let result = search_ssh_config_hosts(
            &config_hosts,
            &persisted.ssh_targets,
            &query.unwrap_or_default(),
            &persisted.deleted_ssh_config_aliases,
        );
        Ok(result)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ssh_resolve_config_host(
    alias: String,
) -> Result<Option<SshConfigHostResolution>, String> {
    tokio::task::spawn_blocking(move || resolve_user_ssh_config_host(&alias))
        .await
        .map_err(|e| e.to_string())?
}

// ─── UNIT TESTS ───────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    struct MockSshGRunner {
        output: String,
        should_succeed: bool,
    }

    impl SshGRunner for MockSshGRunner {
        fn run_ssh_g(&self, _alias: &str) -> Result<String, String> {
            if self.should_succeed {
                Ok(self.output.clone())
            } else {
                Err("ssh -G failed".to_string())
            }
        }
    }

    #[test]
    fn test_ssh_target_json_serialization_matches_ts_types() {
        let target = SshTarget {
            id: "ssh-123-1".to_string(),
            label: "Production DB".to_string(),
            owner: Some(SshTargetOwner {
                r#type: "on-demand-runtime".to_string(),
                runtime_id: "rt-abc".to_string(),
            }),
            config_host: Some("prod-db".to_string()),
            host: "db.example.com".to_string(),
            port: 2222,
            username: "admin".to_string(),
            identity_file: Some("/home/user/.ssh/id_rsa".to_string()),
            identity_agent: Some("/run/user/1000/ssh.sock".to_string()),
            identities_only: Some(true),
            gssapi_authentication: Some(false),
            proxy_command: Some("ssh -W %h:%p jump".to_string()),
            jump_host: Some("jump.example.com".to_string()),
            source: Some("ssh-config".to_string()),
            relay_grace_period_seconds: Some(3600),
            last_required_passphrase: Some(true),
            port_forwards: Some(vec![SavedPortForward {
                local_port: 5432,
                remote_host: "127.0.0.1".to_string(),
                remote_port: 5432,
                label: Some("postgres".to_string()),
            }]),
            system_ssh_connection_reuse: Some(true),
            generation: Some(5),
        };

        let json = serde_json::to_string(&target).unwrap();
        assert!(json.contains("\"id\":\"ssh-123-1\""));
        assert!(json.contains("\"label\":\"Production DB\""));
        assert!(json.contains("\"owner\":{\"type\":\"on-demand-runtime\",\"runtimeId\":\"rt-abc\"}"));
        assert!(json.contains("\"configHost\":\"prod-db\""));
        assert!(json.contains("\"identityFile\":\"/home/user/.ssh/id_rsa\""));
        assert!(json.contains("\"identityAgent\":\"/run/user/1000/ssh.sock\""));
        assert!(json.contains("\"identitiesOnly\":true"));
        assert!(json.contains("\"gssapiAuthentication\":false"));
        assert!(json.contains("\"proxyCommand\":\"ssh -W %h:%p jump\""));
        assert!(json.contains("\"jumpHost\":\"jump.example.com\""));
        assert!(json.contains("\"source\":\"ssh-config\""));
        assert!(json.contains("\"relayGracePeriodSeconds\":3600"));
        assert!(json.contains("\"lastRequiredPassphrase\":true"));
        assert!(json.contains("\"portForwards\":[{\"localPort\":5432,\"remoteHost\":\"127.0.0.1\",\"remotePort\":5432,\"label\":\"postgres\"}]"));
        assert!(json.contains("\"systemSshConnectionReuse\":true"));
        assert!(json.contains("\"generation\":5"));

        // Round-trip check
        let deserialized: SshTarget = serde_json::from_str(&json).unwrap();
        assert_eq!(target, deserialized);
    }

    #[test]
    fn test_ssh_types_summary_and_tombstone_serialization() {
        let tombstone = RemovedSshTargetTombstone {
            old_target_id: "ssh-old-1".to_string(),
            config_host: Some("alias1".to_string()),
            host: "1.2.3.4".to_string(),
            port: 22,
            username: "user".to_string(),
            label: "Old Label".to_string(),
            removed_at: 1700000000000,
        };
        let tombstone_json = serde_json::to_string(&tombstone).unwrap();
        assert!(tombstone_json.contains("\"oldTargetId\":\"ssh-old-1\""));
        assert!(tombstone_json.contains("\"configHost\":\"alias1\""));
        assert!(tombstone_json.contains("\"removedAt\":1700000000000"));

        let summary = SshConfigHostSummary {
            alias: "myhost".to_string(),
            hostname: "myhost.com".to_string(),
            port: 22,
            username: "root".to_string(),
            identity_file: None,
            proxy_command: None,
            jump_host: None,
            already_in_orca: true,
            previously_removed: Some(true),
        };
        let summary_json = serde_json::to_string(&summary).unwrap();
        assert!(summary_json.contains("\"alreadyInOrca\":true"));
        assert!(summary_json.contains("\"previouslyRemoved\":true"));

        let resolution = SshConfigHostResolution {
            alias: "res-alias".to_string(),
            hostname: "resolved.host".to_string(),
            port: 222,
            username: "dev".to_string(),
            identity_files: vec!["/path/key".to_string()],
            identity_agent: None,
            identities_only: false,
            forward_agent: true,
            gssapi_authentication: Some(true),
            proxy_command: None,
            proxy_use_fdpass: false,
            jump_host: Some("jump1".to_string()),
        };
        let res_json = serde_json::to_string(&resolution).unwrap();
        assert!(res_json.contains("\"identityFiles\":[\"/path/key\"]"));
        assert!(res_json.contains("\"forwardAgent\":true"));
        assert!(res_json.contains("\"jumpHost\":\"jump1\""));
    }

    #[test]
    fn test_generation_monotonic_and_survives_restart() {
        let temp_dir = std::env::temp_dir().join(format!("hydra-ssh-test-{}", generate_ssh_target_id()));
        std::fs::create_dir_all(&temp_dir).unwrap();
        let db_path = temp_dir.join("test.sqlite3");

        // First instance
        {
            let conn = rusqlite::Connection::open(&db_path).unwrap();
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS ssh_state (key TEXT PRIMARY KEY, json TEXT NOT NULL);",
            )
            .unwrap();

            let mut state = PersistedSshState::default();
            let gen1 = allocate_ssh_target_generation(&mut state);
            assert_eq!(gen1, 1);
            let gen2 = allocate_ssh_target_generation(&mut state);
            assert_eq!(gen2, 2);

            let t1 = SshTarget {
                id: "ssh-1".to_string(),
                label: "Host 1".to_string(),
                owner: None,
                config_host: Some("h1".to_string()),
                host: "h1.com".to_string(),
                port: 22,
                username: "u1".to_string(),
                identity_file: None,
                identity_agent: None,
                identities_only: None,
                gssapi_authentication: None,
                proxy_command: None,
                jump_host: None,
                source: Some("manual".to_string()),
                relay_grace_period_seconds: None,
                last_required_passphrase: None,
                port_forwards: None,
                system_ssh_connection_reuse: None,
                generation: Some(gen1),
            };
            state.ssh_targets.push(t1);

            let json_str = serde_json::to_string(&state).unwrap();
            conn.execute(
                "INSERT OR REPLACE INTO ssh_state (key, json) VALUES ('default', ?1)",
                rusqlite::params![json_str],
            )
            .unwrap();
        }

        // Second instance reading the exact same DB after "restart"
        {
            let conn = rusqlite::Connection::open(&db_path).unwrap();
            let mut stmt = conn
                .prepare("SELECT json FROM ssh_state WHERE key = 'default'")
                .unwrap();
            let mut rows = stmt.query([]).unwrap();
            let row = rows.next().unwrap().unwrap();
            let json_str: String = row.get(0).unwrap();
            let mut loaded: PersistedSshState = serde_json::from_str(&json_str).unwrap();

            assert_eq!(loaded.ssh_targets.len(), 1);
            assert_eq!(loaded.ssh_target_generation_counter, 2);

            let gen3 = allocate_ssh_target_generation(&mut loaded);
            assert_eq!(gen3, 3);
        }

        let _ = std::fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_ssh_target_crud_tombstone_and_alias_reclaim() {
        let mut state = PersistedSshState::default();

        // 1. Add target
        let input = SshTargetCreateInput {
            label: "My Server".to_string(),
            owner: None,
            config_host: Some("myserver".to_string()),
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "root".to_string(),
            ..Default::default()
        };

        let gen1 = allocate_ssh_target_generation(&mut state);
        let target = SshTarget {
            id: generate_ssh_target_id(),
            label: input.label,
            owner: input.owner,
            config_host: input.config_host,
            host: input.host,
            port: input.port,
            username: input.username,
            identity_file: None,
            identity_agent: None,
            identities_only: None,
            gssapi_authentication: None,
            proxy_command: None,
            jump_host: None,
            source: Some("manual".to_string()),
            relay_grace_period_seconds: None,
            last_required_passphrase: None,
            port_forwards: None,
            system_ssh_connection_reuse: None,
            generation: Some(gen1),
        };
        state.ssh_targets.push(target.clone());
        assert_eq!(state.ssh_targets.len(), 1);

        // 2. Remove target -> tombstone & alias suppression
        let removed = state.ssh_targets.remove(0);
        let alias = removed.config_host.clone().unwrap();
        state.deleted_ssh_config_aliases.push(alias.clone());
        state.removed_ssh_target_tombstones.push(RemovedSshTargetTombstone {
            old_target_id: removed.id.clone(),
            config_host: removed.config_host.clone(),
            host: removed.host.clone(),
            port: removed.port,
            username: removed.username.clone(),
            label: removed.label.clone(),
            removed_at: 1000,
        });

        assert_eq!(state.deleted_ssh_config_aliases.len(), 1);
        assert_eq!(state.removed_ssh_target_tombstones.len(), 1);

        // 3. Re-add target with same alias -> lifts/reclaims suppressed alias
        reclaim_alias(&mut state.deleted_ssh_config_aliases, Some("MyServer"));
        assert!(state.deleted_ssh_config_aliases.is_empty());
    }

    #[test]
    fn test_ssh_config_parser_wildcards_negation_and_directives() {
        let config_text = r#"
# Global wildcard - ignored for host enumeration
Host *
  User globaluser
  Port 22

# Negation and wildcard pattern - ignored as concrete host
Host !prod-secret *.internal
  User internaluser

# Concrete host with multiple aliases
Host web1 web2
  HostName 192.168.1.10
  User webuser
  Port 2222
  IdentityFile ~/.ssh/web_rsa
  IdentitiesOnly yes
  GSSAPIAuthentication yes
  ProxyCommand ssh -W %h:%p bastion
  ProxyJump jump.example.com

Match host test*
  User testuser
"#;

        let hosts = parse_ssh_config(config_text);
        assert_eq!(hosts.len(), 2);

        let web1 = hosts.iter().find(|h| h.host == "web1").unwrap();
        assert_eq!(web1.hostname.as_deref(), Some("192.168.1.10"));
        assert_eq!(web1.user.as_deref(), Some("webuser"));
        assert_eq!(web1.port, Some(2222));
        assert_eq!(web1.identities_only, Some(true));
        assert_eq!(web1.gssapi_authentication, Some(true));
        assert_eq!(web1.proxy_command.as_deref(), Some("ssh -W %h:%p bastion"));
        assert_eq!(web1.proxy_jump.as_deref(), Some("jump.example.com"));

        let web2 = hosts.iter().find(|h| h.host == "web2").unwrap();
        assert_eq!(web2.hostname.as_deref(), Some("192.168.1.10"));
        assert_eq!(web2.user.as_deref(), Some("webuser"));
    }

    #[test]
    fn test_ssh_config_include_recursive_and_limits() {
        let temp_dir = std::env::temp_dir().join(format!("hydra-ssh-inc-{}", generate_ssh_target_id()));
        let conf_d = temp_dir.join("conf.d");
        std::fs::create_dir_all(&conf_d).unwrap();

        let main_config = temp_dir.join("config");
        let sub1 = conf_d.join("a.conf");
        let sub2 = conf_d.join("b.conf");
        let cyclic = conf_d.join("cycle.conf");

        std::fs::write(&main_config, format!("Include {}/*.conf\nHost main\n  HostName main.host\n", conf_d.to_string_lossy())).unwrap();
        std::fs::write(&sub1, "Host host-a\n  HostName a.host\n  Port 1001\n").unwrap();
        std::fs::write(&sub2, "Host host-b\n  HostName b.host\n  Port 1002\n").unwrap();
        // Cycle attempt: includes main_config
        std::fs::write(&cyclic, format!("Include {}\nHost host-c\n  HostName c.host\n", main_config.to_string_lossy())).unwrap();

        let hosts = load_user_ssh_config(Some(&main_config));
        assert!(hosts.iter().any(|h| h.host == "main"));
        assert!(hosts.iter().any(|h| h.host == "host-a"));
        assert!(hosts.iter().any(|h| h.host == "host-b"));
        assert!(hosts.iter().any(|h| h.host == "host-c"));

        let _ = std::fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_ssh_config_import_idempotency_and_rules() {
        let mut state = PersistedSshState::default();

        // 1. Initial config hosts
        let config_hosts_v1 = vec![
            SshConfigHost {
                host: "server-a".to_string(),
                hostname: Some("a.com".to_string()),
                port: Some(22),
                user: Some("deploy".to_string()),
                ..Default::default()
            },
            SshConfigHost {
                host: "server-b".to_string(),
                hostname: Some("b.com".to_string()),
                port: Some(22),
                user: Some("deploy".to_string()),
                ..Default::default()
            },
        ];

        // Add a manual target
        let manual_target = SshTarget {
            id: generate_ssh_target_id(),
            label: "Manual Server".to_string(),
            owner: None,
            config_host: Some("manual-srv".to_string()),
            host: "manual.com".to_string(),
            port: 22,
            username: "root".to_string(),
            identity_file: None,
            identity_agent: None,
            identities_only: None,
            gssapi_authentication: None,
            proxy_command: None,
            jump_host: None,
            source: Some("manual".to_string()),
            relay_grace_period_seconds: None,
            last_required_passphrase: None,
            port_forwards: None,
            system_ssh_connection_reuse: None,
            generation: Some(1),
        };
        state.ssh_targets.push(manual_target);

        // First import
        let imported = import_from_ssh_config(&mut state, &config_hosts_v1, false);
        assert_eq!(imported.len(), 2);
        let id_a = state.ssh_targets.iter().find(|t| t.host == "a.com").unwrap().id.clone();

        // Second import without changes -> returns 0 changed targets (idempotent)
        let imported_again = import_from_ssh_config(&mut state, &config_hosts_v1, false);
        assert_eq!(imported_again.len(), 0);

        // V2 config: rotated port for server-a, attempt to override manual-srv, add server-c
        let config_hosts_v2 = vec![
            SshConfigHost {
                host: "server-a".to_string(),
                hostname: Some("a.com".to_string()),
                port: Some(2222), // rotated port
                user: Some("deploy".to_string()),
                ..Default::default()
            },
            SshConfigHost {
                host: "manual-srv".to_string(),
                hostname: Some("overridden.com".to_string()),
                port: Some(9999),
                user: Some("hacker".to_string()),
                ..Default::default()
            },
            SshConfigHost {
                host: "server-c".to_string(),
                hostname: Some("c.com".to_string()),
                port: Some(22),
                user: Some("app".to_string()),
                ..Default::default()
            },
        ];

        let changed = import_from_ssh_config(&mut state, &config_hosts_v2, false);
        assert_eq!(changed.len(), 2); // server-a updated, server-c added

        // Server-a kept same ID, updated port
        let target_a = state.ssh_targets.iter().find(|t| t.id == id_a).unwrap();
        assert_eq!(target_a.port, 2222);

        // Manual server is intact
        let manual = state.ssh_targets.iter().find(|t| t.config_host.as_deref() == Some("manual-srv")).unwrap();
        assert_eq!(manual.port, 22);
        assert_eq!(manual.host, "manual.com");

        // Tombstone / suppressed alias test: remove server-c
        let pos_c = state.ssh_targets.iter().position(|t| t.label == "server-c").unwrap();
        state.ssh_targets.remove(pos_c);
        state.deleted_ssh_config_aliases.push("server-c".to_string());

        // Passive import -> server-c is NOT re-added
        let re_import = import_from_ssh_config(&mut state, &config_hosts_v2, false);
        assert_eq!(re_import.len(), 0);
        assert!(!state.ssh_targets.iter().any(|t| t.label == "server-c"));

        // Import with reAdopt = true -> server-c is restored
        let re_adopt_import = import_from_ssh_config(&mut state, &config_hosts_v2, true);
        assert_eq!(re_adopt_import.len(), 1);
        assert_eq!(re_adopt_import[0].label, "server-c");
    }

    #[test]
    fn test_search_and_picker_matching() {
        let hosts = vec![
            SshConfigHost {
                host: "prod-db".to_string(),
                hostname: Some("db.production.net".to_string()),
                port: Some(5432),
                user: Some("postgres".to_string()),
                ..Default::default()
            },
            SshConfigHost {
                host: "staging-app".to_string(),
                hostname: Some("app.staging.net".to_string()),
                port: Some(22),
                user: Some("ubuntu".to_string()),
                ..Default::default()
            },
        ];

        let targets = vec![SshTarget {
            id: "ssh-1".to_string(),
            label: "prod-db".to_string(),
            owner: None,
            config_host: Some("prod-db".to_string()),
            host: "db.production.net".to_string(),
            port: 5432,
            username: "postgres".to_string(),
            identity_file: None,
            identity_agent: None,
            identities_only: None,
            gssapi_authentication: None,
            proxy_command: None,
            jump_host: None,
            source: Some("ssh-config".to_string()),
            relay_grace_period_seconds: None,
            last_required_passphrase: None,
            port_forwards: None,
            system_ssh_connection_reuse: None,
            generation: Some(1),
        }];

        let suppressed = vec!["staging-app".to_string()];

        let result = search_ssh_config_hosts(&hosts, &targets, "staging", &suppressed);
        assert_eq!(result.total_host_count, 2);
        assert_eq!(result.match_count, 1);
        assert_eq!(result.hosts.len(), 1);
        assert_eq!(result.hosts[0].alias, "staging-app");
        assert_eq!(result.hosts[0].already_in_orca, false);
        assert_eq!(result.hosts[0].previously_removed, Some(true));

        let result_all = search_ssh_config_hosts(&hosts, &targets, "", &suppressed);
        assert_eq!(result_all.total_host_count, 2);
        assert_eq!(result_all.match_count, 2);
        assert_eq!(result_all.new_host_count, 0); // 1 alreadyInOrca, 1 previouslyRemoved
    }

    #[test]
    fn test_ssh_g_resolution_with_mock_runner() {
        let temp_dir = std::env::temp_dir().join(format!("hydra-ssh-res-{}", generate_ssh_target_id()));
        std::fs::create_dir_all(&temp_dir).unwrap();
        let config_file = temp_dir.join("config");

        std::fs::write(
            &config_file,
            "Host prod-box\n  HostName prod.box.com\n  User deploy\n  GSSAPIAuthentication yes\n",
        )
        .unwrap();

        let mock_stdout = r#"
hostname prod.box.com
user deploy
port 2222
identityfile ~/.ssh/id_rsa
identityfile ~/.ssh/id_ed25519
identitiesonly yes
forwardagent yes
gssapiauthentication yes
proxycommand none
proxyjump jump.box.com
proxyusefdpass no
"#;

        let runner = MockSshGRunner {
            output: mock_stdout.to_string(),
            should_succeed: true,
        };

        // 1. Success case
        let resolution = resolve_user_ssh_config_host_with_runner(
            "prod-box",
            Some(&config_file),
            &runner,
        )
        .unwrap()
        .unwrap();

        assert_eq!(resolution.alias, "prod-box");
        assert_eq!(resolution.hostname, "prod.box.com");
        assert_eq!(resolution.port, 2222);
        assert_eq!(resolution.username, "deploy");
        assert_eq!(resolution.identity_files.len(), 2);
        assert_eq!(resolution.identities_only, true);
        assert_eq!(resolution.forward_agent, true);
        assert_eq!(resolution.gssapi_authentication, Some(true));
        assert_eq!(resolution.jump_host.as_deref(), Some("jump.box.com"));

        // 2. Host absent from config file -> rejected before calling runner
        let absent = resolve_user_ssh_config_host_with_runner(
            "unknown-host",
            Some(&config_file),
            &runner,
        )
        .unwrap();
        assert!(absent.is_none());

        let _ = std::fs::remove_dir_all(temp_dir);
    }
}
