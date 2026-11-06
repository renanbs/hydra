//! Read-only IPC behind the sidebar's setup-script prompt, the CLI
//! availability probe and the feedback dialog's GitHub identity.
//!
//! Nothing here executes repository code: hooks and setup candidates are only
//! read from disk, and the CLI/`gh` probes just ask a binary for its version or
//! for the authenticated user.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use crate::worktree_ops::{orca_yaml_script, parse_orca_yaml};

/// Tag on the error returned when inspection is asked for a host whose files
/// this process cannot read. Direct SSH and runtime environments need a remote
/// transport that Hydra does not implement yet; claiming "no hooks" for them
/// would hide the gap.
pub const REMOTE_INSPECTION_UNSUPPORTED_PREFIX: &str = "remote-inspection-unsupported:";
/// Tag on the error returned when `gh` is missing or has no authenticated user.
/// The renderer maps it to the anonymous path instead of an error toast.
pub const GH_NOT_AUTHENTICATED_PREFIX: &str = "gh-not-authenticated:";

const ORCA_YAML_FILE: &str = "orca.yaml";
const ORCA_YAML_MAX_BYTES: usize = 256 * 1024;
const MAX_SCRIPT_FIELD_BYTES: usize = 64 * 1024;
/// Top-level `orca.yaml` keys this build understands. Any other key makes the
/// file "may need update" instead of a hard parse error (Orca parity).
const RECOGNIZED_ORCA_YAML_KEYS: &[&str] = &[
    "scripts",
    "setupAgentStartupPolicy",
    "issueCommand",
    "defaultTabs",
    "environmentRecipes",
    "worktree",
];

const SETUP_IMPORT_FILE_MAX_BYTES: usize = 256 * 1024;
const SETUP_IMPORT_MAX_COMMAND_PARTS: usize = 256;
const SETUP_IMPORT_MAX_CMUX_COMMANDS: usize = 256;
const SETUP_IMPORT_MAX_KEYWORDS: usize = 64;
const SETUP_IMPORT_MAX_TOML_LINES: usize = 4_096;
const SETUP_IMPORT_MAX_UNSUPPORTED_FIELDS: usize = 128;

const CLI_VERSION_MAX_CHARS: usize = 120;
const CLI_VERSION_TIMEOUT: Duration = Duration::from_secs(3);
const GH_VIEWER_TIMEOUT: Duration = Duration::from_secs(5);

/// Agent CLIs the sidebar offers as launch targets. Order is the card's order.
/// `orca` rides the same probe: the Linear skill setup checks it on PATH
/// (Rosetta D02c-004) the same way the launcher cards check theirs.
pub const AGENT_CLI_IDS: &[&str] = &["omp", "claude", "cursor-agent", "codex", "orca"];

// ─── Hooks ───────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeHookScripts {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub setup: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub archive: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeHooks {
    pub scripts: RuntimeHookScripts,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub setup_agent_startup_policy: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub issue_command: Option<String>,
}

/// Key material for the renderer's trust gate. Hydra deliberately does not
/// claim whether a script is trusted: the host executes hooks only after the
/// renderer records a decision, so this struct carries the hashes that decision
/// is keyed on, not a verdict.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HookTrustMaterial {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub setup_content_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub archive_content_hash: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HookCheckResult {
    /// `ok` or `error`; mirrors the runtime RPC contract the renderer reads.
    pub status: String,
    pub has_hooks: bool,
    pub hooks: Option<RuntimeHooks>,
    pub may_need_update: bool,
    pub trust: HookTrustMaterial,
}

fn is_within_script_field_limit(value: &str) -> bool {
    value.len() <= MAX_SCRIPT_FIELD_BYTES
}

fn empty_hook_result(has_hooks: bool) -> HookCheckResult {
    HookCheckResult {
        status: "ok".to_string(),
        has_hooks,
        hooks: None,
        may_need_update: false,
        trust: HookTrustMaterial::default(),
    }
}

/// True when the file has a top-level key this build cannot interpret. Scanned
/// line-by-line (not through the YAML parser) so a broken or oversized file can
/// still suggest an update, like Orca does.
fn has_unrecognized_orca_yaml_keys(content: &str) -> bool {
    for line in content.lines() {
        let line = line.trim_end_matches('\r');
        let Some(colon) = line.find(':') else {
            continue;
        };
        let key = &line[..colon];
        let mut chars = key.chars();
        if !chars.next().is_some_and(|c| c.is_ascii_alphabetic()) {
            continue;
        }
        if !chars.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
            continue;
        }
        let rest = &line[colon + 1..];
        let followed_by_space = rest
            .chars()
            .next()
            .map(|c| c == ' ' || c == '\t')
            .unwrap_or(true);
        if followed_by_space && !RECOGNIZED_ORCA_YAML_KEYS.contains(&key) {
            return true;
        }
    }
    false
}

fn parse_runtime_hooks(yaml: &serde_yaml::Value) -> Option<RuntimeHooks> {
    let setup = orca_yaml_script(yaml, "setup").filter(|value| is_within_script_field_limit(value));
    let archive =
        orca_yaml_script(yaml, "archive").filter(|value| is_within_script_field_limit(value));
    let setup_agent_startup_policy = yaml
        .get("setupAgentStartupPolicy")
        .and_then(|value| value.as_str())
        .filter(|value| {
            matches!(*value, "start-immediately" | "wait-for-setup")
                && is_within_script_field_limit(value)
        })
        .map(str::to_string);
    let issue_command = yaml
        .get("issueCommand")
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty() && is_within_script_field_limit(value))
        .map(str::to_string);

    if setup.is_none()
        && archive.is_none()
        && setup_agent_startup_policy.is_none()
        && issue_command.is_none()
    {
        return None;
    }

    Some(RuntimeHooks {
        scripts: RuntimeHookScripts { setup, archive },
        setup_agent_startup_policy,
        issue_command,
    })
}

fn sha256_hex(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}

fn trust_material(hooks: &RuntimeHooks) -> HookTrustMaterial {
    HookTrustMaterial {
        setup_content_hash: hooks.scripts.setup.as_deref().map(sha256_hex),
        archive_content_hash: hooks.scripts.archive.as_deref().map(sha256_hex),
    }
}

/// Reads the repo's committed `orca.yaml` and reports the hooks the sidebar
/// prompt acts on. Absent or unparsable files are "no known hooks"; a file with
/// unrecognized keys is flagged so the prompt can suggest an app update.
pub fn check_repo_hooks(root: &Path) -> HookCheckResult {
    let yaml_path = root.join(ORCA_YAML_FILE);
    let Ok(content) = std::fs::read_to_string(&yaml_path) else {
        // A truncated/unreadable file still exists; report it the way Orca does
        // instead of guessing that the repo has no hooks at all.
        return empty_hook_result(yaml_path.exists());
    };

    let within_limit = content.len() <= ORCA_YAML_MAX_BYTES;
    let yaml = within_limit.then(|| parse_orca_yaml(&content)).flatten();
    let hooks = yaml.as_ref().and_then(parse_runtime_hooks);
    let may_need_update = hooks.is_none() && has_unrecognized_orca_yaml_keys(&content);
    let trust = hooks.as_ref().map(trust_material).unwrap_or_default();

    HookCheckResult {
        status: "ok".to_string(),
        has_hooks: true,
        hooks,
        may_need_update,
        trust,
    }
}

// ─── Setup-script imports ────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SetupScriptImportCandidate {
    pub provider: String,
    pub label: String,
    pub files: Vec<String>,
    pub setup: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub archive: Option<String>,
    #[serde(default)]
    pub unsupported_fields: Vec<String>,
}

fn push_unsupported(fields: &mut Vec<String>, value: String) {
    if fields.len() < SETUP_IMPORT_MAX_UNSUPPORTED_FIELDS {
        fields.push(value);
    }
}

fn file_exists(root: &Path, relative: &str) -> bool {
    root.join(relative).is_file()
}

/// Reads a repo-relative manifest with the same 256 KiB ceiling the renderer's
/// import contract documents, so one huge file cannot stall the prompt.
fn read_limited(root: &Path, relative: &str) -> Option<String> {
    let path = root.join(relative);
    let metadata = std::fs::metadata(&path).ok()?;
    if !metadata.is_file() || metadata.len() > SETUP_IMPORT_FILE_MAX_BYTES as u64 {
        return None;
    }
    std::fs::read_to_string(path).ok()
}

fn json_object(content: Option<String>) -> Option<serde_json::Map<String, serde_json::Value>> {
    let value: serde_json::Value = serde_json::from_str(&content?).ok()?;
    value.as_object().cloned()
}

fn normalize_command_string(value: &str) -> Option<String> {
    if value.len() > MAX_SCRIPT_FIELD_BYTES {
        return None;
    }
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed.to_string())
}

fn join_commands(parts: Vec<String>) -> Option<String> {
    let mut command = String::new();
    for part in parts.into_iter().filter(|part| !part.is_empty()) {
        let next = if command.is_empty() {
            part
        } else {
            format!("{command}\n{part}")
        };
        if next.len() > MAX_SCRIPT_FIELD_BYTES {
            return None;
        }
        command = next;
    }
    if command.is_empty() {
        None
    } else {
        Some(command)
    }
}

/// Normalizes a command field that may be a string or a list of strings, the
/// shape Superset and Conductor configs use.
fn normalize_command(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(text) => normalize_command_string(text),
        serde_json::Value::Array(items) => {
            if items.len() > SETUP_IMPORT_MAX_COMMAND_PARTS {
                return None;
            }
            join_commands(
                items
                    .iter()
                    .filter_map(|item| item.as_str())
                    .filter_map(normalize_command_string)
                    .collect(),
            )
        }
        _ => None,
    }
}

fn inspect_superset(root: &Path) -> Option<SetupScriptImportCandidate> {
    let config = json_object(read_limited(root, ".superset/config.json"))?;
    let local = json_object(read_limited(root, ".superset/config.local.json"));
    let mut unsupported = Vec::new();
    for field in ["run", "cwd"] {
        if config.contains_key(field) {
            push_unsupported(&mut unsupported, field.to_string());
        }
    }
    if let Some(local) = &local {
        for field in ["run", "cwd"] {
            if local.contains_key(field) {
                push_unsupported(&mut unsupported, format!("config.local.{field}"));
            }
        }
    }

    let setup = resolve_superset_script(
        config.get("setup"),
        local.as_ref().and_then(|local| local.get("setup")),
        "setup",
        &mut unsupported,
    )?;
    collect_unsupported_script_object_fields(config.get("setup"), "setup", &mut unsupported);
    collect_unsupported_script_object_fields(config.get("teardown"), "teardown", &mut unsupported);
    let archive = resolve_superset_script(
        config.get("teardown"),
        local.as_ref().and_then(|local| local.get("teardown")),
        "teardown",
        &mut unsupported,
    );

    let mut files = vec![".superset/config.json".to_string()];
    if local.is_some() {
        files.push(".superset/config.local.json".to_string());
    }
    Some(SetupScriptImportCandidate {
        provider: "superset".to_string(),
        label: "Superset".to_string(),
        files,
        setup,
        archive,
        unsupported_fields: unsupported,
    })
}

fn resolve_superset_script(
    base: Option<&serde_json::Value>,
    local: Option<&serde_json::Value>,
    key: &str,
    unsupported: &mut Vec<String>,
) -> Option<String> {
    let base_command = base.and_then(normalize_command).unwrap_or_default();
    let Some(local) = local else {
        return join_commands(vec![base_command]);
    };
    match local {
        serde_json::Value::String(_) | serde_json::Value::Array(_) => normalize_command(local),
        serde_json::Value::Object(map) => {
            for field in map.keys() {
                if field != "before" && field != "after" {
                    push_unsupported(unsupported, format!("config.local.{key}.{field}"));
                }
            }
            let before = map
                .get("before")
                .and_then(normalize_command)
                .unwrap_or_default();
            let after = map
                .get("after")
                .and_then(normalize_command)
                .unwrap_or_default();
            join_commands(vec![before, base_command, after])
        }
        _ => {
            push_unsupported(unsupported, format!("config.local.{key}"));
            join_commands(vec![base_command])
        }
    }
}

fn collect_unsupported_script_object_fields(
    value: Option<&serde_json::Value>,
    prefix: &str,
    unsupported: &mut Vec<String>,
) {
    let Some(serde_json::Value::Object(map)) = value else {
        return;
    };
    for field in ["before", "after"] {
        if map.contains_key(field) {
            push_unsupported(unsupported, format!("{prefix}.{field}"));
        }
    }
}

fn inspect_conductor(root: &Path) -> Option<SetupScriptImportCandidate> {
    let config = json_object(read_limited(root, "conductor.json"))?;
    let scripts = config.get("scripts")?.as_object()?;
    let setup = scripts.get("setup").and_then(normalize_command)?;

    let mut unsupported = Vec::new();
    for field in ["enterpriseDataPrivacy", "runScriptMode"] {
        if config.contains_key(field) {
            push_unsupported(&mut unsupported, field.to_string());
        }
    }
    for field in ["run", "teardown"] {
        if scripts.get(field).and_then(normalize_command).is_some() {
            push_unsupported(&mut unsupported, format!("scripts.{field}"));
        }
    }

    Some(SetupScriptImportCandidate {
        provider: "conductor".to_string(),
        label: "Conductor".to_string(),
        files: vec!["conductor.json".to_string()],
        setup,
        archive: scripts.get("archive").and_then(normalize_command),
        unsupported_fields: unsupported,
    })
}

// ── cmux ─────────────────────────────────────────────────────────────

const CMUX_CONFIG_PATHS: [&str; 2] = [".cmux/cmux.json", "cmux.json"];
const CMUX_SETUP_LABELS: [&str; 4] = [
    "setup",
    "project setup",
    "workspace setup",
    "repository setup",
];
const CMUX_SETUP_KEYWORDS: [&str; 4] = ["setup", "init", "initialize", "install"];

fn normalize_match_text(value: &str) -> String {
    if value.len() > MAX_SCRIPT_FIELD_BYTES {
        return String::new();
    }
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn normalize_match_value(value: Option<&serde_json::Value>) -> String {
    value
        .and_then(|value| value.as_str())
        .map(normalize_match_text)
        .unwrap_or_default()
}

fn cmux_command_has_setup_keyword(command: &serde_json::Map<String, serde_json::Value>) -> bool {
    let labels = [
        normalize_match_value(command.get("name")),
        normalize_match_value(command.get("title")),
    ];
    if labels
        .iter()
        .any(|label| CMUX_SETUP_LABELS.contains(&label.as_str()))
    {
        return true;
    }
    let keywords = command
        .get("keywords")
        .and_then(|value| value.as_array())
        .filter(|values| values.len() <= SETUP_IMPORT_MAX_KEYWORDS)
        .map(|values| {
            values
                .iter()
                .filter_map(|value| value.as_str())
                .map(normalize_match_text)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let has_setup_keyword = keywords
        .iter()
        .any(|keyword| CMUX_SETUP_KEYWORDS.contains(&keyword.as_str()));
    if !has_setup_keyword {
        return false;
    }
    let command_text = normalize_match_value(command.get("command"));
    labels.iter().any(|label| label.contains("setup"))
        || command_text
            .split(|c: char| !c.is_alphanumeric() && c != '_')
            .any(|word| word == "setup")
}

fn inspect_cmux(root: &Path) -> Option<SetupScriptImportCandidate> {
    for config_path in CMUX_CONFIG_PATHS {
        let Some(config) = json_object(read_limited(root, config_path)) else {
            continue;
        };
        let Some(commands) = config.get("commands").and_then(|value| value.as_array()) else {
            continue;
        };
        if commands.len() > SETUP_IMPORT_MAX_CMUX_COMMANDS {
            continue;
        }
        for (index, command) in commands.iter().enumerate() {
            let Some(command) = command.as_object() else {
                continue;
            };
            if !cmux_command_has_setup_keyword(command) {
                continue;
            }
            let Some(setup) = command.get("command").and_then(normalize_command) else {
                continue;
            };
            let mut unsupported = Vec::new();
            for field in command.keys() {
                if !matches!(
                    field.as_str(),
                    "name" | "title" | "description" | "keywords" | "command"
                ) {
                    push_unsupported(&mut unsupported, format!("commands.{index}.{field}"));
                }
            }
            return Some(SetupScriptImportCandidate {
                provider: "cmux".to_string(),
                label: "cmux".to_string(),
                files: vec![config_path.to_string()],
                setup,
                archive: None,
                unsupported_fields: unsupported,
            });
        }
    }
    None
}

// ── Codex environment TOML ───────────────────────────────────────────

const CODEX_ENVIRONMENT_PATH: &str = ".codex/environments/environment.toml";

#[derive(Default)]
struct CodexEnvironment {
    setup: Option<String>,
    cleanup: Option<String>,
    unsupported: Vec<String>,
}

fn is_codex_script_assignment(line: &str) -> Option<&str> {
    let rest = line.trim_start().strip_prefix("script")?;
    let rest = rest.trim_start().strip_prefix('=')?;
    Some(rest)
}

fn toml_section(trimmed: &str) -> Option<&str> {
    if !trimmed.starts_with('[') {
        return None;
    }
    let end = trimmed.find(']')?;
    let name = &trimmed[1..end];
    let rest = trimmed[end + 1..].trim_start();
    if !(rest.is_empty() || rest.starts_with('#')) {
        return None;
    }
    if name.is_empty()
        || !name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-')
    {
        return None;
    }
    Some(name)
}

fn find_toml_string_end(value: &[char], quote: char) -> usize {
    for index in 1..value.len() {
        if value[index] != quote {
            continue;
        }
        if quote == '\'' || !is_escaped(value, index) {
            return index;
        }
    }
    value.len().saturating_sub(1)
}

fn is_escaped(value: &[char], index: usize) -> bool {
    let mut slash_count = 0;
    let mut cursor = index;
    while cursor > 0 && value[cursor - 1] == '\\' {
        slash_count += 1;
        cursor -= 1;
    }
    slash_count % 2 == 1
}

fn parse_toml_basic_string(value: &str) -> String {
    let chars: Vec<char> = value.chars().collect();
    let end = find_toml_string_end(&chars, '"');
    let raw: String = chars.iter().take(end + 1).collect();
    serde_json::from_str::<String>(&raw).unwrap_or_else(|_| {
        raw.chars()
            .skip(1)
            .collect::<String>()
            .trim_end_matches('"')
            .to_string()
    })
}

fn parse_toml_literal_string(value: &str) -> String {
    let chars: Vec<char> = value.chars().collect();
    let end = find_toml_string_end(&chars, '\'');
    chars.iter().skip(1).take(end.saturating_sub(1)).collect()
}

fn parse_toml_multiline_string(
    lines: &[&str],
    start_line: usize,
    first_remainder: &str,
    delimiter: &str,
) -> (String, usize) {
    let mut retained = String::new();
    let mut oversized = false;
    let mut remainder = first_remainder.to_string();

    for index in start_line..lines.len() {
        if index > start_line {
            remainder = lines[index].to_string();
        }
        if let Some(close) = remainder.find(delimiter) {
            if !oversized {
                let before = &remainder[..close];
                if retained.len() + before.len() > MAX_SCRIPT_FIELD_BYTES {
                    oversized = true;
                } else {
                    retained.push_str(before);
                }
            }
            return (if oversized { String::new() } else { retained }, index);
        }
        if !oversized {
            if retained.len() + remainder.len() + 1 > MAX_SCRIPT_FIELD_BYTES {
                oversized = true;
                retained.clear();
            } else {
                retained.push_str(&remainder);
                retained.push('\n');
            }
        }
    }
    let value = if oversized {
        String::new()
    } else {
        retained.trim_end().to_string()
    };
    (value, lines.len().saturating_sub(1))
}

/// Returns `(value, last consumed line index)` for the TOML string starting at
/// `start_line` with `raw_value` (everything after `=`).
fn parse_toml_string_value(lines: &[&str], start_line: usize, raw_value: &str) -> (String, usize) {
    let value = raw_value.trim_start();
    if let Some(rest) = value.strip_prefix("\"\"\"") {
        return parse_toml_multiline_string(lines, start_line, rest, "\"\"\"");
    }
    if let Some(rest) = value.strip_prefix("'''") {
        return parse_toml_multiline_string(lines, start_line, rest, "'''");
    }
    if value.starts_with('"') {
        return (parse_toml_basic_string(value), start_line);
    }
    if value.starts_with('\'') {
        return (parse_toml_literal_string(value), start_line);
    }
    let without_comment = value.split('#').next().unwrap_or("").trim();
    (without_comment.to_string(), start_line)
}

fn parse_codex_environment(content: &str) -> CodexEnvironment {
    let lines: Vec<&str> = content
        .split('\n')
        .map(|line| line.trim_end_matches('\r'))
        .collect();
    let mut environment = CodexEnvironment::default();
    if lines.len() > SETUP_IMPORT_MAX_TOML_LINES {
        return environment;
    }

    let mut section = String::new();
    let mut index = 0;
    while index < lines.len() {
        let trimmed = lines[index].trim();
        if trimmed.trim_start().starts_with("actions")
            && trimmed.trim_start()["actions".len()..]
                .trim_start()
                .starts_with('=')
        {
            push_unsupported(&mut environment.unsupported, "actions".to_string());
        }
        if let Some(name) = toml_section(trimmed) {
            section = name.to_string();
            if section == "actions" || section.starts_with("actions.") {
                push_unsupported(&mut environment.unsupported, format!("[{section}]"));
            }
            index += 1;
            continue;
        }
        if section != "setup" && section != "cleanup" {
            index += 1;
            continue;
        }
        let Some(raw_value) = is_codex_script_assignment(lines[index]) else {
            index += 1;
            continue;
        };
        let (value, end_line) = parse_toml_string_value(&lines, index, raw_value);
        if section == "setup" {
            environment.setup = Some(value);
        } else {
            environment.cleanup = Some(value);
        }
        index = end_line + 1;
    }
    environment
}

fn normalize_codex_script(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty() && value.len() <= MAX_SCRIPT_FIELD_BYTES)
}

fn inspect_codex_environment(root: &Path) -> Option<SetupScriptImportCandidate> {
    let parsed = parse_codex_environment(&read_limited(root, CODEX_ENVIRONMENT_PATH)?);
    let setup = normalize_codex_script(parsed.setup)?;
    Some(SetupScriptImportCandidate {
        provider: "codex".to_string(),
        label: "Codex environment".to_string(),
        files: vec![CODEX_ENVIRONMENT_PATH.to_string()],
        setup,
        archive: normalize_codex_script(parsed.cleanup),
        unsupported_fields: parsed.unsupported,
    })
}

// ── package manifests ────────────────────────────────────────────────

const PACKAGE_MANAGER_LOCKFILES: [(&str, &str, &str); 6] = [
    ("pnpm-lock.yaml", "pnpm", "pnpm install"),
    ("bun.lock", "bun", "bun install"),
    ("bun.lockb", "bun", "bun install"),
    ("yarn.lock", "yarn", "yarn install"),
    ("package-lock.json", "npm", "npm install"),
    ("npm-shrinkwrap.json", "npm", "npm install"),
];

fn package_manager_name(value: Option<&serde_json::Value>) -> Option<&'static str> {
    let value = value?.as_str()?.trim().to_lowercase();
    if value.starts_with("pnpm@") {
        Some("pnpm")
    } else if value.starts_with("bun@") {
        Some("bun")
    } else if value.starts_with("yarn@") {
        Some("yarn")
    } else if value.starts_with("npm@") {
        Some("npm")
    } else {
        None
    }
}

fn package_manager_install(manager: &str) -> Option<&'static str> {
    PACKAGE_MANAGER_LOCKFILES
        .iter()
        .find(|(_, name, _)| *name == manager)
        .map(|(_, _, setup)| *setup)
}

fn package_manager_run_script(manager: &str, script: &str) -> Option<String> {
    let command = if manager == "yarn" {
        format!("yarn {script}")
    } else {
        format!("{manager} run {script}")
    };
    normalize_command_string(&command)
}

struct PackageManifest {
    manager: Option<&'static str>,
    has_setup_script: bool,
    lockfile: Option<&'static str>,
}

fn read_package_manifest(root: &Path) -> Option<PackageManifest> {
    let package_json = json_object(read_limited(root, "package.json"))?;
    let manager = package_manager_name(package_json.get("packageManager"));
    let has_setup_script = package_json
        .get("scripts")
        .and_then(|value| value.as_object())
        .and_then(|scripts| scripts.get("setup"))
        .and_then(|value| value.as_str())
        .and_then(normalize_command_string)
        .is_some();
    let lockfiles: Vec<&str> = PACKAGE_MANAGER_LOCKFILES
        .iter()
        .filter(|(path, _, _)| file_exists(root, path))
        .map(|(path, _, _)| *path)
        .collect();
    // Two lockfiles from the same manager (`bun.lock` + `bun.lockb`) still
    // resolve to one manager; only a genuine conflict is ambiguous.
    let mut managers: Vec<&str> = Vec::new();
    for path in &lockfiles {
        if let Some((_, manager, _)) = PACKAGE_MANAGER_LOCKFILES
            .iter()
            .find(|(candidate, _, _)| candidate == path)
        {
            if !managers.contains(manager) {
                managers.push(manager);
            }
        }
    }
    let lockfile = if managers.len() == 1 {
        lockfiles.first().copied()
    } else {
        None
    };
    Some(PackageManifest {
        manager,
        has_setup_script,
        lockfile,
    })
}

fn inspect_package_manager(root: &Path) -> Option<SetupScriptImportCandidate> {
    let manifest = read_package_manifest(root)?;
    let manager = manifest.manager.or_else(|| {
        manifest.lockfile.and_then(|path| {
            PACKAGE_MANAGER_LOCKFILES
                .iter()
                .find(|(candidate, _, _)| *candidate == path)
                .map(|(_, manager, _)| *manager)
        })
    });
    // A `setup` npm script is the repo's own setup entry point and is more
    // specific than installing dependencies.
    let setup = if manifest.has_setup_script {
        package_manager_run_script(manager.unwrap_or("npm"), "setup")
    } else {
        manager
            .and_then(package_manager_install)
            .map(str::to_string)
    }
    .unwrap_or_else(|| "npm install".to_string());
    let files = vec![manifest.lockfile.unwrap_or("package.json").to_string()];
    Some(SetupScriptImportCandidate {
        provider: "package-manager".to_string(),
        label: "package manager".to_string(),
        files,
        setup,
        archive: None,
        unsupported_fields: Vec::new(),
    })
}

fn inspect_python_manifest(root: &Path) -> Option<SetupScriptImportCandidate> {
    if let Some(pyproject) = read_limited(root, "pyproject.toml") {
        let setup = if pyproject.contains("[tool.poetry]") {
            "poetry install"
        } else if pyproject.contains("[tool.uv]") || file_exists(root, "uv.lock") {
            "uv sync"
        } else {
            "pip install -e ."
        };
        return Some(SetupScriptImportCandidate {
            provider: "package-manager".to_string(),
            label: "Python".to_string(),
            files: vec!["pyproject.toml".to_string()],
            setup: setup.to_string(),
            archive: None,
            unsupported_fields: Vec::new(),
        });
    }
    if let Some(requirements) = read_limited(root, "requirements.txt") {
        if requirements
            .lines()
            .map(str::trim)
            .any(|line| !line.is_empty() && !line.starts_with('#'))
        {
            return Some(SetupScriptImportCandidate {
                provider: "package-manager".to_string(),
                label: "Python".to_string(),
                files: vec!["requirements.txt".to_string()],
                setup: "pip install -r requirements.txt".to_string(),
                archive: None,
                unsupported_fields: Vec::new(),
            });
        }
    }
    None
}

const MAKEFILE_NAMES: [&str; 3] = ["Makefile", "makefile", "GNUmakefile"];
const MAKEFILE_SETUP_TARGETS: [&str; 4] = ["setup", "install", "bootstrap", "dev"];

fn makefile_setup_target(content: &str) -> Option<&'static str> {
    let mut found: Vec<&'static str> = Vec::new();
    for line in content.lines() {
        if line.starts_with('\t') {
            continue;
        }
        let Some((name, rest)) = line.split_once(':') else {
            continue;
        };
        if rest.starts_with('=') {
            continue;
        }
        let name = name.trim();
        if let Some(target) = MAKEFILE_SETUP_TARGETS
            .iter()
            .find(|target| **target == name)
        {
            found.push(*target);
        }
    }
    MAKEFILE_SETUP_TARGETS
        .iter()
        .find(|target| found.contains(target))
        .copied()
}

fn inspect_makefile(root: &Path) -> Option<SetupScriptImportCandidate> {
    for name in MAKEFILE_NAMES {
        let Some(content) = read_limited(root, name) else {
            continue;
        };
        let Some(target) = makefile_setup_target(&content) else {
            continue;
        };
        return Some(SetupScriptImportCandidate {
            provider: "package-manager".to_string(),
            label: "Makefile".to_string(),
            files: vec![name.to_string()],
            setup: format!("make {target}"),
            archive: None,
            unsupported_fields: Vec::new(),
        });
    }
    None
}

/// Detected setup commands, most specific first. External tool manifests keep
/// Orca's provider order; Python and Make targets follow because they are the
/// generic manifests a plain repo is most likely to expose.
pub fn inspect_setup_script_imports(root: &Path) -> Vec<SetupScriptImportCandidate> {
    [
        inspect_superset,
        inspect_conductor,
        inspect_codex_environment,
        inspect_cmux,
        inspect_package_manager,
        inspect_python_manifest,
        inspect_makefile,
    ]
    .into_iter()
    .filter_map(|inspect| inspect(root))
    .collect()
}

// ─── CLI availability ────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CliInstallStatus {
    pub id: String,
    pub installed: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}

fn first_non_empty_line(stdout: &str, stderr: &str) -> Option<String> {
    stdout
        .lines()
        .chain(stderr.lines())
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| line.chars().take(CLI_VERSION_MAX_CHARS).collect())
}

fn run_with_timeout(mut command: Command, timeout: Duration) -> Option<std::process::Output> {
    let mut child = command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .ok()?;
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => return child.wait_with_output().ok(),
            Ok(None) if started.elapsed() >= timeout => {
                let _ = child.kill();
                let _ = child.wait();
                return None;
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(20)),
            Err(_) => return None,
        }
    }
}

fn probe_cli_version(binary: &str) -> Option<String> {
    let mut command = Command::new(binary);
    command.arg("--version");
    let output = run_with_timeout(command, CLI_VERSION_TIMEOUT)?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    first_non_empty_line(&stdout, &stderr)
}

fn collect_cli_install_status(
    ids: &[&str],
    is_installed: impl Fn(&str) -> bool,
    read_version: impl Fn(&str) -> Option<String>,
) -> Vec<CliInstallStatus> {
    ids.iter()
        .map(|id| {
            let installed = is_installed(id);
            CliInstallStatus {
                id: (*id).to_string(),
                installed,
                version: if installed { read_version(id) } else { None },
            }
        })
        .collect()
}

pub fn probe_cli_install_status() -> Vec<CliInstallStatus> {
    collect_cli_install_status(
        AGENT_CLI_IDS,
        |binary| which::which(binary).is_ok(),
        probe_cli_version,
    )
}

// ─── GitHub viewer ───────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubViewer {
    pub login: String,
    pub email: Option<String>,
}

fn parse_gh_viewer_response(
    succeeded: bool,
    stdout: &str,
    stderr: &str,
) -> Result<GitHubViewer, String> {
    if !succeeded {
        let detail = first_non_empty_line(stderr, stdout)
            .unwrap_or_else(|| "gh api user failed".to_string());
        return Err(format!("{GH_NOT_AUTHENTICATED_PREFIX} {detail}"));
    }
    let value: serde_json::Value = serde_json::from_str(stdout.trim())
        .map_err(|error| format!("gh api user returned invalid JSON: {error}"))?;
    let login = value
        .get("login")
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|login| !login.is_empty())
        .ok_or_else(|| "gh api user returned no login".to_string())?;
    let email = value
        .get("email")
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|email| !email.is_empty())
        .map(str::to_string);
    Ok(GitHubViewer {
        login: login.to_string(),
        email,
    })
}

pub fn read_github_viewer() -> Result<GitHubViewer, String> {
    let mut command = Command::new("gh");
    command.args(["api", "user"]);
    let output = run_with_timeout(command, GH_VIEWER_TIMEOUT).ok_or_else(|| {
        format!(
            "{GH_NOT_AUTHENTICATED_PREFIX} GitHub CLI is not installed on PATH or did not answer in time."
        )
    })?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    parse_gh_viewer_response(output.status.success(), &stdout, &stderr)
}

// ─── Commands ────────────────────────────────────────────────────────

/// Rejects inspection requests for hosts whose filesystem this process cannot
/// read. Returning an empty hook set for an SSH worktree would tell the sidebar
/// prompt that there is nothing to set up when the truth is "not inspected".
fn ensure_local_host(host_id: Option<&str>) -> Result<(), String> {
    match host_id.map(str::trim).filter(|value| !value.is_empty()) {
        None | Some("local") => Ok(()),
        Some(other) => Err(format!(
            "{REMOTE_INSPECTION_UNSUPPORTED_PREFIX} hook inspection is only available for local repositories (requested host: {other})"
        )),
    }
}

fn resolve_repo_root(repo_path: &str) -> Result<PathBuf, String> {
    let trimmed = repo_path.trim();
    if trimmed.is_empty() {
        return Err("Repository path is empty".to_string());
    }
    let root = PathBuf::from(trimmed);
    if !root.is_dir() {
        return Err(format!("Repository path does not exist: {trimmed}"));
    }
    Ok(root)
}

#[tauri::command]
pub async fn check_runtime_hooks(
    repo_path: String,
    host_id: Option<String>,
) -> Result<HookCheckResult, String> {
    tokio::task::spawn_blocking(move || {
        ensure_local_host(host_id.as_deref())?;
        let root = resolve_repo_root(&repo_path)?;
        Ok(check_repo_hooks(&root))
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn inspect_runtime_setup_script_imports(
    repo_path: String,
    host_id: Option<String>,
) -> Result<Vec<SetupScriptImportCandidate>, String> {
    tokio::task::spawn_blocking(move || {
        ensure_local_host(host_id.as_deref())?;
        let root = resolve_repo_root(&repo_path)?;
        Ok(inspect_setup_script_imports(&root))
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn cli_install_status() -> Result<Vec<CliInstallStatus>, String> {
    tokio::task::spawn_blocking(probe_cli_install_status)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn gh_viewer() -> Result<GitHubViewer, String> {
    tokio::task::spawn_blocking(read_github_viewer)
        .await
        .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(prefix: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "hydra-test-{prefix}-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&path).unwrap();
        path
    }

    fn write(root: &Path, relative: &str, content: &str) {
        let path = root.join(relative);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).unwrap();
        }
        std::fs::write(path, content).unwrap();
    }

    fn candidate_for<'a>(
        candidates: &'a [SetupScriptImportCandidate],
        provider: &str,
    ) -> &'a SetupScriptImportCandidate {
        candidates
            .iter()
            .find(|candidate| candidate.provider == provider)
            .unwrap_or_else(|| panic!("missing {provider} candidate: {candidates:?}"))
    }

    #[test]
    fn absent_orca_yaml_reports_no_hooks() {
        let root = temp_dir("hooks-absent");
        let result = check_repo_hooks(&root);
        assert_eq!(result.status, "ok");
        assert!(!result.has_hooks);
        assert!(result.hooks.is_none());
        assert!(!result.may_need_update);
        assert_eq!(result.trust, HookTrustMaterial::default());
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn hooks_report_scripts_and_trust_hashes() {
        let root = temp_dir("hooks-present");
        write(
            &root,
            "orca.yaml",
            "scripts:\n  setup: '  pnpm install  '\n  archive: 'docker compose down'\nissueCommand: 'gh issue view'\n",
        );
        let result = check_repo_hooks(&root);
        let hooks = result.hooks.expect("hooks");
        assert_eq!(hooks.scripts.setup.as_deref(), Some("pnpm install"));
        assert_eq!(
            hooks.scripts.archive.as_deref(),
            Some("docker compose down")
        );
        assert_eq!(hooks.issue_command.as_deref(), Some("gh issue view"));
        assert_eq!(
            result.trust.setup_content_hash.as_deref(),
            Some(sha256_hex("pnpm install").as_str())
        );
        assert_eq!(
            result.trust.archive_content_hash.as_deref(),
            Some(sha256_hex("docker compose down").as_str())
        );
        assert!(!result.may_need_update);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn unrecognized_top_level_key_marks_update() {
        let root = temp_dir("hooks-update");
        write(&root, "orca.yaml", "futureFeature: true\n");
        let result = check_repo_hooks(&root);
        assert!(result.has_hooks);
        assert!(result.hooks.is_none());
        assert!(result.may_need_update);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn remote_hosts_are_refused_instead_of_read_locally() {
        let error = ensure_local_host(Some("ssh:dev-box")).expect_err("ssh host");
        assert!(error.starts_with(REMOTE_INSPECTION_UNSUPPORTED_PREFIX));
        assert!(ensure_local_host(Some("runtime:peer")).is_err());
        assert!(ensure_local_host(None).is_ok());
        assert!(ensure_local_host(Some("local")).is_ok());
    }

    #[test]
    fn package_manager_prefers_package_json_setup_script() {
        let root = temp_dir("imports-package");
        write(
            &root,
            "package.json",
            r#"{"packageManager":"pnpm@9.0.0","scripts":{"setup":"prisma migrate deploy"}}"#,
        );
        write(&root, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
        let candidates = inspect_setup_script_imports(&root);
        let candidate = candidate_for(&candidates, "package-manager");
        assert_eq!(candidate.setup, "pnpm run setup");
        assert_eq!(candidate.files, vec!["pnpm-lock.yaml".to_string()]);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn package_manager_falls_back_to_install_and_rejects_conflicting_lockfiles() {
        let root = temp_dir("imports-lock");
        write(&root, "package.json", r#"{"name":"app"}"#);
        write(&root, "bun.lock", "");
        let candidates = inspect_setup_script_imports(&root);
        assert_eq!(
            candidate_for(&candidates, "package-manager").setup,
            "bun install"
        );

        write(&root, "yarn.lock", "");
        let candidates = inspect_setup_script_imports(&root);
        let candidate = candidate_for(&candidates, "package-manager");
        assert_eq!(candidate.setup, "npm install");
        assert_eq!(candidate.files, vec!["package.json".to_string()]);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn conductor_and_superset_overlays_are_imported() {
        let root = temp_dir("imports-conductor");
        write(
            &root,
            "conductor.json",
            r#"{"runScriptMode":"concurrent","scripts":{"setup":"bun install","archive":"docker compose down","run":"bun dev"}}"#,
        );
        let candidates = inspect_setup_script_imports(&root);
        let conductor = candidate_for(&candidates, "conductor");
        assert_eq!(conductor.setup, "bun install");
        assert_eq!(conductor.archive.as_deref(), Some("docker compose down"));
        assert!(conductor
            .unsupported_fields
            .contains(&"runScriptMode".to_string()));
        assert!(conductor
            .unsupported_fields
            .contains(&"scripts.run".to_string()));
        let _ = std::fs::remove_dir_all(&root);

        let root = temp_dir("imports-superset");
        write(
            &root,
            ".superset/config.json",
            r#"{"setup":["bun install"],"teardown":["docker compose down"],"run":["bun dev"]}"#,
        );
        write(
            &root,
            ".superset/config.local.json",
            r#"{"setup":{"before":["corepack enable"],"after":["bun run db:migrate"]}}"#,
        );
        let candidates = inspect_setup_script_imports(&root);
        let superset = candidate_for(&candidates, "superset");
        assert_eq!(
            superset.setup,
            "corepack enable\nbun install\nbun run db:migrate"
        );
        assert_eq!(superset.archive.as_deref(), Some("docker compose down"));
        assert_eq!(superset.unsupported_fields, vec!["run".to_string()]);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn codex_environment_toml_and_cmux_configs_are_read() {
        let root = temp_dir("imports-codex");
        write(
            &root,
            ".codex/environments/environment.toml",
            "[setup]\nscript = \"\"\"pnpm install\npnpm db:migrate\"\"\"\n[cleanup]\nscript = 'docker compose down'\n",
        );
        let candidates = inspect_setup_script_imports(&root);
        let codex = candidate_for(&candidates, "codex");
        assert_eq!(codex.setup, "pnpm install\npnpm db:migrate");
        assert_eq!(codex.archive.as_deref(), Some("docker compose down"));
        let _ = std::fs::remove_dir_all(&root);

        let root = temp_dir("imports-cmux");
        write(
            &root,
            ".cmux/cmux.json",
            r#"{"commands":[{"name":"Build","command":"make build"},{"name":"Setup","command":"pnpm install"}]}"#,
        );
        let candidates = inspect_setup_script_imports(&root);
        let cmux = candidate_for(&candidates, "cmux");
        assert_eq!(cmux.setup, "pnpm install");
        assert_eq!(cmux.files, vec![".cmux/cmux.json".to_string()]);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn python_and_make_manifests_are_detected_without_execution() {
        let root = temp_dir("imports-python");
        write(&root, "pyproject.toml", "[tool.poetry]\nname = \"app\"\n");
        let candidates = inspect_setup_script_imports(&root);
        let python = candidate_for(&candidates, "package-manager");
        assert_eq!(python.setup, "poetry install");
        assert_eq!(python.files, vec!["pyproject.toml".to_string()]);
        let _ = std::fs::remove_dir_all(&root);

        let root = temp_dir("imports-make");
        write(
            &root,
            "Makefile",
            ".PHONY: setup build\nsetup:\n\t./scripts/setup.sh\nbuild:\n\tmake -C app\n",
        );
        let candidates = inspect_setup_script_imports(&root);
        let makefile = candidate_for(&candidates, "package-manager");
        assert_eq!(makefile.setup, "make setup");
        assert_eq!(makefile.files, vec!["Makefile".to_string()]);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn cli_status_uses_versions_only_for_installed_binaries() {
        let installed = ["omp", "claude"];
        let statuses = collect_cli_install_status(
            &["omp", "claude", "cursor-agent", "codex"],
            |binary| installed.contains(&binary),
            |binary| Some(format!("{binary} 1.2.3")),
        );
        assert_eq!(statuses.len(), 4);
        assert!(statuses[0].installed);
        assert_eq!(statuses[0].version.as_deref(), Some("omp 1.2.3"));
        assert!(!statuses[2].installed);
        assert_eq!(statuses[2].version, None);
        assert_eq!(statuses[3].id, "codex");
    }

    #[test]
    fn version_output_takes_the_first_non_empty_line_and_stays_bounded() {
        assert_eq!(
            first_non_empty_line("\n\n  1.2.3\nsecond", "").as_deref(),
            Some("1.2.3")
        );
        assert_eq!(
            first_non_empty_line("", "warn\n2.0.0").as_deref(),
            Some("warn")
        );
        let long = "v".repeat(CLI_VERSION_MAX_CHARS + 20);
        assert_eq!(
            first_non_empty_line(&long, "").unwrap().chars().count(),
            CLI_VERSION_MAX_CHARS
        );
    }

    #[test]
    fn gh_viewer_parses_identity_and_tags_unauthenticated_errors() {
        let viewer = parse_gh_viewer_response(
            true,
            r#"{"login":"octocat","email":"octo@example.com"}"#,
            "",
        )
        .expect("viewer");
        assert_eq!(viewer.login, "octocat");
        assert_eq!(viewer.email.as_deref(), Some("octo@example.com"));

        let anonymous = parse_gh_viewer_response(true, r#"{"login":"octocat","email":""}"#, "")
            .expect("viewer without public email");
        assert_eq!(anonymous.email, None);

        let error = parse_gh_viewer_response(false, "", "gh auth login required")
            .expect_err("unauthenticated");
        assert!(error.starts_with(GH_NOT_AUTHENTICATED_PREFIX));
        assert!(error.contains("gh auth login required"));

        assert!(parse_gh_viewer_response(true, "not json", "").is_err());
    }
}
