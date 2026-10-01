//! Managed hook installers (T7).
//!
//! Ports Orca `claude/hook-service.ts` + `hook-settings.ts` (`CLAUDE_EVENTS`),
//! `codex/hook-service.ts` (`CODEX_EVENTS`), and the posix lanes of
//! `claude/hook-script.ts` / `codex/hook-script.ts`, with the Hydra decisions
//! applied: `HYDRA_*` namespace, opaque pane key (= `session_id`), Claude +
//! Codex v1 scope. Installation runs behind the `agent_status_hooks_enabled`
//! setting (default off); these functions only touch files under the `home`
//! passed in — tests pass a temp dir, never the real `~/.claude`.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// Timeout per managed hook entry. Mirrors Orca `MANAGED_HOOK_TIMEOUT_SECONDS`.
pub const MANAGED_HOOK_TIMEOUT_SECS: u64 = 10;

pub const CLAUDE_SCRIPT_NAME: &str = "hydra-claude-hook.sh";
pub const CODEX_SCRIPT_NAME: &str = "hydra-codex-hook.sh";

pub const CLAUDE_SCRIPT: &str = include_str!("../../assets/hooks/hydra-claude-hook.sh");
pub const CODEX_SCRIPT: &str = include_str!("../../assets/hooks/hydra-codex-hook.sh");

/// Mirrors Orca `CLAUDE_EVENTS` (hook-settings.ts): matcher-carrying events
/// keep `Some("*")`, the rest `None`.
pub const CLAUDE_EVENTS: &[(&str, Option<&str>)] = &[
    ("SessionStart", None),
    ("UserPromptSubmit", None),
    ("Stop", None),
    ("StopFailure", None),
    ("SubagentStart", None),
    ("SubagentStop", None),
    ("TeammateIdle", None),
    ("PreToolUse", Some("*")),
    ("PostToolUse", Some("*")),
    ("PostToolUseFailure", Some("*")),
    ("PermissionRequest", Some("*")),
    ("PostCompact", None),
];

/// Mirrors Orca `CODEX_EVENTS` (codex-hook-definition.ts), without matchers.
pub const CODEX_EVENTS: &[&str] = &[
    "SessionStart",
    "UserPromptSubmit",
    "PreToolUse",
    "PermissionRequest",
    "PostToolUse",
    "SubagentStart",
    "SubagentStop",
    "Stop",
];

/// Codex snake_case trust labels. Mirrors `CODEX_HOOK_EVENT_LABEL`
/// (codex-hook-identity.ts); the trust key uses these while hooks.json uses
/// the PascalCase event names above.
fn codex_event_label(event: &str) -> &'static str {
    match event {
        "SessionStart" => "session_start",
        "UserPromptSubmit" => "user_prompt_submit",
        "SubagentStart" => "subagent_start",
        "SubagentStop" => "subagent_stop",
        "PreToolUse" => "pre_tool_use",
        "PermissionRequest" => "permission_request",
        "PostToolUse" => "post_tool_use",
        "Stop" => "stop",
        _ => "unknown",
    }
}

#[derive(Debug)]
pub enum InstallError {
    Io(io::Error),
    Json(String),
}

impl std::fmt::Display for InstallError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(err) => write!(f, "hook install I/O failed: {err}"),
            Self::Json(err) => write!(f, "hook install JSON failed: {err}"),
        }
    }
}

impl std::error::Error for InstallError {}

impl From<io::Error> for InstallError {
    fn from(err: io::Error) -> Self {
        Self::Io(err)
    }
}

/// Scripts live next to Orca's layout (`.orca/agent-hooks/` → `.hydra/…`)
/// but rooted at the passed-in home so tests never touch the real one.
fn script_path(home: &Path, name: &str) -> PathBuf {
    home.join(".hydra").join("agent-hooks").join(name)
}

fn write_script(home: &Path, name: &str, body: &str) -> Result<PathBuf, InstallError> {
    let path = script_path(home, name);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&path, body)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o755))?;
    }
    Ok(path)
}

/// A hooks entry is ours when its command invokes our script. Matches by file
/// name (not the exact command) so reinstalls sweep stale entries from older
/// builds or relocated homes — mirrors Orca `createManagedCommandMatcher`.
fn is_managed_command(command: &serde_json::Value, script_name: &str) -> bool {
    command
        .as_str()
        .is_some_and(|cmd| cmd.contains(script_name))
}

fn hook_entry_is_managed(entry: &serde_json::Value, script_name: &str) -> bool {
    entry
        .get("hooks")
        .and_then(|hooks| hooks.as_array())
        .is_some_and(|hooks| {
            hooks
                .iter()
                .any(|hook| is_managed_command(&hook["command"], script_name))
        })
}

fn managed_hook_entry(command: &str, matcher: Option<&str>) -> serde_json::Value {
    let mut entry = serde_json::Map::new();
    if let Some(matcher) = matcher {
        entry.insert(
            "matcher".to_string(),
            serde_json::Value::String(matcher.to_string()),
        );
    }
    entry.insert(
        "hooks".to_string(),
        serde_json::json!([{
            "type": "command",
            "command": command,
            "timeout": MANAGED_HOOK_TIMEOUT_SECS,
        }]),
    );
    serde_json::Value::Object(entry)
}

/// Merge managed entries into a `hooks` map: sweep stale managed defs, then
/// prepend the fresh def so the status hook runs before user hooks. User defs
/// and unknown events are preserved untouched.
fn merge_hooks_map(
    hooks: &mut serde_json::Map<String, serde_json::Value>,
    events: &[(&str, Option<&str>)],
    command: &str,
    script_name: &str,
) {
    for (event, matcher) in events {
        let defs = hooks
            .get(*event)
            .and_then(|defs| defs.as_array())
            .cloned()
            .unwrap_or_default();
        let mut kept: Vec<serde_json::Value> = defs
            .into_iter()
            .filter(|def| !hook_entry_is_managed(def, script_name))
            .collect();
        kept.insert(0, managed_hook_entry(command, *matcher));
        hooks.insert((*event).to_string(), serde_json::Value::Array(kept));
    }
    // Sweep managed entries from events we no longer subscribe to (e.g. a
    // prior install's extra event) so they stop firing after upgrade.
    let swept: Vec<(String, Vec<serde_json::Value>)> = hooks
        .iter()
        .filter(|(event, _)| !events.iter().any(|(name, _)| *name == event.as_str()))
        .filter_map(|(event, defs)| {
            let remaining: Vec<serde_json::Value> = defs
                .as_array()?
                .iter()
                .filter(|def| !hook_entry_is_managed(def, script_name))
                .cloned()
                .collect();
            Some((event.clone(), remaining))
        })
        .collect();
    for (event, remaining) in swept {
        if remaining.is_empty() {
            hooks.remove(&event);
        } else {
            hooks.insert(event, serde_json::Value::Array(remaining));
        }
    }
}

/// Strip only managed defs, deleting events left empty. Returns true when at
/// least one managed def was removed.
fn remove_managed_from_map(
    hooks: &mut serde_json::Map<String, serde_json::Value>,
    script_name: &str,
) -> bool {
    let mut removed = false;
    let mut empty = Vec::new();
    for (event, defs) in hooks.iter_mut() {
        let Some(list) = defs.as_array() else { continue };
        let before = list.len();
        let kept: Vec<serde_json::Value> = list
            .iter()
            .filter(|def| !hook_entry_is_managed(def, script_name))
            .cloned()
            .collect();
        if kept.len() != before {
            removed = true;
        }
        if kept.is_empty() {
            empty.push(event.clone());
        } else {
            *defs = serde_json::Value::Array(kept);
        }
    }
    for event in empty {
        hooks.remove(&event);
    }
    removed
}

fn read_json_file(path: &Path) -> Result<(serde_json::Value, bool), InstallError> {
    match fs::read_to_string(path) {
        Ok(text) => serde_json::from_str(&text)
            .map(|value| (value, true))
            .map_err(|err| InstallError::Json(format!("{path:?}: {err}"))),
        Err(err) if err.kind() == io::ErrorKind::NotFound => {
            Ok((serde_json::json!({}), false))
        }
        Err(err) => Err(InstallError::Io(err)),
    }
}

fn write_json_file(path: &Path, value: &serde_json::Value) -> Result<(), InstallError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut text = serde_json::to_string_pretty(value)
        .map_err(|err| InstallError::Json(err.to_string()))?;
    text.push('\n');
    fs::write(path, text)?;
    Ok(())
}

/// Install the Claude managed hooks under `home` (`<home>/.claude/`), merging
/// into the user's `settings.json` without touching their other keys.
/// Idempotent: reinstalling rewrites the same bytes.
pub fn install_claude(home: &Path) -> Result<PathBuf, InstallError> {
    let script = write_script(home, CLAUDE_SCRIPT_NAME, CLAUDE_SCRIPT)?;
    let command = script.to_string_lossy().into_owned();
    let settings_path = home.join(".claude").join("settings.json");
    let (mut config, _) = read_json_file(&settings_path)?;
    let root = config.as_object_mut().ok_or_else(|| {
        InstallError::Json(format!("{settings_path:?} root is not an object"))
    })?;
    let hooks = root
        .entry("hooks")
        .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));
    let map = hooks
        .as_object_mut()
        .ok_or_else(|| InstallError::Json(format!("{settings_path:?} hooks is not an object")))?;
    merge_hooks_map(map, CLAUDE_EVENTS, &command, CLAUDE_SCRIPT_NAME);
    write_json_file(&settings_path, &config)?;
    Ok(settings_path)
}

/// Compute the Codex trust hash for a managed entry. Mirrors
/// `computeCodexTrustedHash` (codex-trust-identity.ts): sha256 over the
/// canonical (recursively key-sorted) identity JSON. Our defs carry no
/// matcher, and `user_prompt_submit`/`stop` ignore matchers anyway, so the
/// identity never has a `matcher` key.
fn codex_trusted_hash(event_label: &str, command: &str) -> String {
    use sha2::Digest as _;
    let command_json =
        serde_json::to_string(command).expect("command serializes to JSON string");
    // Keys pre-sorted (canonicalize): {event_name, hooks:[{async, command,
    // timeout, type}]}.
    let serialized = format!(
        r#"{{"event_name":"{event_label}","hooks":[{{"async":false,"command":{command_json},"timeout":{MANAGED_HOOK_TIMEOUT_SECS},"type":"command"}}]}}"#
    );
    format!("sha256:{:x}", sha2::Sha256::digest(serialized.as_bytes()))
}

/// Trust-table key. Mirrors `computeCodexTrustKey`: the hooks.json path is
/// used verbatim (already absolute here) plus label and 0:0 positions — our
/// managed def is always prepended first with a single hook.
fn codex_trust_key(hooks_path: &Path, event_label: &str) -> String {
    format!(
        "{}:{event_label}:0:0",
        hooks_path.to_string_lossy().replace('\\', "/")
    )
}

fn toml_escape(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn codex_trust_block(key: &str, hash: &str) -> String {
    format!("[hooks.state.\"{key}\"]\nenabled = true\ntrusted_hash = \"{hash}\"")
}

/// Upsert our `[hooks.state."<key>"]` blocks into config.toml text,
/// preserving every user byte outside the blocks we own.
fn upsert_codex_trust(content: &str, owned: &[(&str, String)]) -> String {
    let mut out = content.to_string();
    for (key, hash) in owned {
        let block = codex_trust_block(&toml_escape(key), hash);
        let header = format!("[hooks.state.\"{}\"]", toml_escape(key));
        if let Some(start) = out.find(&header) {
            let rest = &out[start..];
            let end = rest
                .find("\n[")
                .map(|pos| start + pos + 1)
                .unwrap_or(out.len());
            let followed_by_section = end < out.len();
            let mut replacement = block;
            // Keep the blank-line separator before the next section so a
            // reinstall rewrites byte-identical text.
            replacement.push_str(if followed_by_section { "\n\n" } else { "\n" });
            out.replace_range(start..end, &replacement);
        } else {
            if !out.is_empty() && !out.ends_with('\n') {
                out.push('\n');
            }
            if !out.is_empty() {
                out.push('\n');
            }
            out.push_str(&block);
            out.push('\n');
        }
    }
    out
}

/// Remove only our `[hooks.state."<key>"]` blocks from config.toml text.
fn remove_codex_trust(content: &str, script_marker: &str) -> String {
    let mut kept = Vec::new();
    let mut lines = content.lines().peekable();
    let mut removed = false;
    while let Some(line) = lines.next() {
        let trimmed = line.trim();
        if trimmed.starts_with("[hooks.state.") && trimmed.ends_with(']') {
            // Peek the block body: ours iff a trusted_hash line follows
            // before the next section. We tag ownership by re-deriving:
            // drop the block only when its header key contains hooks.json
            // AND the block has no user-only marker… simpler: collect the
            // block, then decide by key prefix list passed via marker.
            let mut block = vec![line];
            while let Some(next) = lines.peek() {
                if next.trim_start().starts_with('[') {
                    break;
                }
                block.push(lines.next().expect("peeked line"));
            }
            let header_key = trimmed
                .strip_prefix("[hooks.state.")
                .and_then(|rest| rest.strip_suffix(']'))
                .unwrap_or("");
            if header_key.contains(script_marker) {
                removed = true;
                continue;
            }
            kept.push(block.join("\n"));
        } else {
            kept.push(line.to_string());
        }
    }
    let mut out = kept.join("\n");
    if content.ends_with('\n') && !out.ends_with('\n') {
        out.push('\n');
    }
    if removed {
        // Collapse runs of 3+ blank lines left by block removal.
        while out.contains("\n\n\n") {
            out = out.replace("\n\n\n", "\n\n");
        }
    }
    out
}

/// Install the Codex managed hooks under `home` (`<home>/.codex/hooks.json`
/// plus trust entries in `<home>/.codex/config.toml`). `config.toml` trust
/// mirrors Orca's `[hooks.state."<key>"]` shape (`enabled` + `trusted_hash`);
/// the hash authority stays Codex's algorithm, replicated 1-1 from
/// codex-trust-identity.ts.
pub fn install_codex(home: &Path) -> Result<PathBuf, InstallError> {
    let script = write_script(home, CODEX_SCRIPT_NAME, CODEX_SCRIPT)?;
    let command = script.to_string_lossy().into_owned();
    let codex_home = home.join(".codex");
    fs::create_dir_all(&codex_home)?;
    let hooks_path = codex_home.join("hooks.json");
    let (mut config, _) = read_json_file(&hooks_path)?;
    let root = config
        .as_object_mut()
        .ok_or_else(|| InstallError::Json(format!("{hooks_path:?} root is not an object")))?;
    let hooks = root
        .entry("hooks")
        .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));
    let map = hooks
        .as_object_mut()
        .ok_or_else(|| InstallError::Json(format!("{hooks_path:?} hooks is not an object")))?;
    let events: Vec<(&str, Option<&str>)> =
        CODEX_EVENTS.iter().map(|event| (*event, None)).collect();
    merge_hooks_map(map, &events, &command, CODEX_SCRIPT_NAME);
    write_json_file(&hooks_path, &config)?;

    let owned: Vec<(String, String)> = CODEX_EVENTS
        .iter()
        .map(|event| {
            let label = codex_event_label(event);
            (
                codex_trust_key(&hooks_path, label),
                codex_trusted_hash(label, &command),
            )
        })
        .collect();
    let owned_refs: Vec<(&str, String)> = owned
        .iter()
        .map(|(key, hash)| (key.as_str(), hash.clone()))
        .collect();
    let toml_path = codex_home.join("config.toml");
    let existing = fs::read_to_string(&toml_path).unwrap_or_default();
    let updated = upsert_codex_trust(&existing, &owned_refs);
    if updated != existing {
        fs::write(&toml_path, updated)?;
    }
    Ok(hooks_path)
}

/// Undo exactly what the installers own: managed hook defs, managed trust
/// blocks, and our script files. User keys/blocks/files stay byte-identical.
pub fn remove(home: &Path) -> Result<(), InstallError> {
    let claude_settings = home.join(".claude").join("settings.json");
    if let (mut config, true) = read_json_file(&claude_settings)? {
        if let Some(map) = config
            .get_mut("hooks")
            .and_then(|hooks| hooks.as_object_mut())
        {
            if remove_managed_from_map(map, CLAUDE_SCRIPT_NAME) {
                write_json_file(&claude_settings, &config)?;
            }
        }
    }

    let codex_home = home.join(".codex");
    let hooks_path = codex_home.join("hooks.json");
    if let (mut config, true) = read_json_file(&hooks_path)? {
        if let Some(map) = config
            .get_mut("hooks")
            .and_then(|hooks| hooks.as_object_mut())
        {
            if remove_managed_from_map(map, CODEX_SCRIPT_NAME) {
                write_json_file(&hooks_path, &config)?;
            }
        }
    }
    let toml_path = codex_home.join("config.toml");
    if let Ok(content) = fs::read_to_string(&toml_path) {
        let marker = hooks_path.to_string_lossy().replace('\\', "/");
        let updated = remove_codex_trust(&content, &marker);
        if updated != content {
            fs::write(&toml_path, updated)?;
        }
    }

    for name in [CLAUDE_SCRIPT_NAME, CODEX_SCRIPT_NAME] {
        let path = script_path(home, name);
        match fs::remove_file(&path) {
            Ok(()) => {}
            Err(err) if err.kind() == io::ErrorKind::NotFound => {}
            Err(err) => return Err(InstallError::Io(err)),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_home(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "hydra-hook-install-test-{}-{}",
            std::process::id(),
            tag
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("temp home");
        dir
    }

    fn read_json(path: &Path) -> serde_json::Value {
        serde_json::from_str(&fs::read_to_string(path).expect("read json")).expect("parse json")
    }

    #[test]
    fn scripts_are_posix_fail_open_hydra_namespaced() {
        for script in [CLAUDE_SCRIPT, CODEX_SCRIPT] {
            assert!(script.starts_with("#!/bin/sh"), "posix shebang");
            assert!(script.contains("HYDRA_AGENT_HOOK_PORT"), "HYDRA_* namespace");
            assert!(script.contains("HYDRA_PANE_KEY"), "pane key env");
            assert!(script.contains("spool_hook_event"), "spool fallback");
            assert!(script.contains("exit 0"), "fail-open");
            assert!(!script.contains("ORCA_"), "no ORCA_* leakage");
        }
        assert!(CLAUDE_SCRIPT.contains("/hook/claude"), "claude POST target");
        assert!(CODEX_SCRIPT.contains("/hook/codex"), "codex POST target");
    }

    #[test]
    fn claude_install_merges_preserves_and_is_idempotent() {
        let home = temp_home("claude");
        let settings = home.join(".claude").join("settings.json");
        fs::create_dir_all(settings.parent().unwrap()).unwrap();
        fs::write(
            &settings,
            r#"{"model": "opus", "hooks": {"Stop": [{"hooks": [{"type": "command", "command": "echo user"}]}]}}"#,
        )
        .unwrap();

        install_claude(&home).expect("install");
        let before = fs::read_to_string(&settings).unwrap();
        let config = read_json(&settings);
        // User keys survive.
        assert_eq!(config["model"], "opus");
        // Every contracted event is present…
        for (event, matcher) in CLAUDE_EVENTS {
            let defs = config["hooks"][*event]
                .as_array()
                .unwrap_or_else(|| panic!("event {event} installed"));
            assert!(
                defs.iter().any(|def| hook_entry_is_managed(def, CLAUDE_SCRIPT_NAME)),
                "event {event} has managed entry"
            );
            let managed = defs
                .iter()
                .find(|def| hook_entry_is_managed(def, CLAUDE_SCRIPT_NAME))
                .unwrap();
            assert_eq!(
                managed.get("matcher").and_then(|m| m.as_str()),
                *matcher,
                "event {event} matcher"
            );
            assert_eq!(
                managed["hooks"][0]["timeout"],
                MANAGED_HOOK_TIMEOUT_SECS,
                "event {event} timeout"
            );
        }
        // …and the user's Stop hook still runs after ours.
        let stop = config["hooks"]["Stop"].as_array().unwrap();
        assert_eq!(stop.len(), 2, "managed prepended before user hook");
        assert_eq!(stop[1]["hooks"][0]["command"], "echo user");

        // Script materialized executable.
        let script = script_path(&home, CLAUDE_SCRIPT_NAME);
        assert_eq!(fs::read_to_string(&script).unwrap(), CLAUDE_SCRIPT);

        // Reinstall rewrites identical bytes.
        install_claude(&home).expect("reinstall");
        assert_eq!(fs::read_to_string(&settings).unwrap(), before, "idempotent");
    }

    fn claude_remove_leaves_user_config_intact() {
        let home = temp_home("claude-rm");
        let settings = home.join(".claude").join("settings.json");
        fs::create_dir_all(settings.parent().unwrap()).unwrap();
        let user_config = r#"{"model": "opus", "hooks": {"Stop": [{"hooks": [{"type": "command", "command": "echo user"}]}]}}"#;
        fs::write(&settings, user_config).unwrap();

        install_claude(&home).expect("install");
        remove(&home).expect("remove");

        let config = read_json(&settings);
        assert_eq!(config["model"], "opus");
        assert_eq!(config["hooks"]["Stop"][0]["hooks"][0]["command"], "echo user");
        assert_eq!(config["hooks"]["Stop"].as_array().unwrap().len(), 1);
        assert!(
            config["hooks"]
                .as_object()
                .unwrap()
                .keys()
                .all(|key| key == "Stop"),
            "only the user event remains"
        );
        assert!(!script_path(&home, CLAUDE_SCRIPT_NAME).exists(), "script removed");
    }

    #[test]
    fn codex_install_trust_and_remove() {
        let home = temp_home("codex");
        let toml_path = home.join(".codex").join("config.toml");
        fs::create_dir_all(toml_path.parent().unwrap()).unwrap();
        fs::write(&toml_path, "model = \"user-model\"\n").unwrap();

        install_codex(&home).expect("install");
        let before_hooks = fs::read_to_string(home.join(".codex").join("hooks.json")).unwrap();
        let before_toml = fs::read_to_string(&toml_path).unwrap();

        let hooks = read_json(&home.join(".codex").join("hooks.json"));
        for event in CODEX_EVENTS {
            let defs = hooks["hooks"][*event]
                .as_array()
                .unwrap_or_else(|| panic!("event {event} installed"));
            assert!(
                defs.iter().any(|def| hook_entry_is_managed(def, CODEX_SCRIPT_NAME)),
                "event {event} has managed entry"
            );
        }
        // Trust blocks for every event; user TOML preserved.
        assert!(before_toml.contains("model = \"user-model\""));
        for event in CODEX_EVENTS {
            let label = codex_event_label(event);
            assert!(
                before_toml.contains(&format!("hooks.json:{label}:0:0")),
                "trust key for {event}"
            );
            assert!(before_toml.contains("trusted_hash = \"sha256:"), "hash for {event}");
        }

        install_codex(&home).expect("reinstall");
        assert_eq!(
            fs::read_to_string(home.join(".codex").join("hooks.json")).unwrap(),
            before_hooks,
            "hooks.json idempotent"
        );
        assert_eq!(fs::read_to_string(&toml_path).unwrap(), before_toml, "toml idempotent");

        remove(&home).expect("remove");
        assert_eq!(fs::read_to_string(&toml_path).unwrap(), "model = \"user-model\"\n");
        assert!(!script_path(&home, CODEX_SCRIPT_NAME).exists(), "script removed");
    }

    #[test]
    fn codex_trust_hash_matches_orca_shape() {
        // Spot-check the replicated algorithm: canonical key-sorted identity.
        let hash = codex_trusted_hash("stop", "/h/.hydra/agent-hooks/hydra-codex-hook.sh");
        assert!(hash.starts_with("sha256:"));
        assert_eq!(hash.len(), "sha256:".len() + 64);
        assert_ne!(
            hash,
            codex_trusted_hash("session_start", "/h/.hydra/agent-hooks/hydra-codex-hook.sh"),
            "label feeds the hash"
        );
    }
}
