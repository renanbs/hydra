//! AI commit message / PR field generation via installed TUI agents.
//!
//! Ported from Orca `main/text-generation/` (plan/spec/prompt builders) and
//! the `filesystem-git-commit-generation-handlers` +
//! `filesystem-git-pull-request-generation-handlers` IPC layer (local subset:
//! no SSH provider, no WSL routing, no custom-command templates — Hydra uses
//! the agent's default one-shot contract).
//!
//! Provider model (Orca parity): NOT an LLM API — the user's own installed CLI
//! agents (`claude -p`, `codex exec`, `opencode`, `gemini`, `aider`, ...).
//! The prompt (staged diff + rules) goes via stdin; stdout is trimmed.
//! Cancellation kills the child by id (registry, like the port-forward manager).

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::LazyLock;
use std::time::Duration;
use parking_lot::Mutex;
use tauri::State;

use crate::AppState;

static NEXT_GEN_ID: AtomicU64 = AtomicU64::new(1);
static LIVE_GENERATIONS: LazyLock<Mutex<HashMap<u64, GenerationHandle>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

struct GenerationHandle {
    child_id: u32,
}

fn is_binary_in_path(bin: &str) -> bool {
    Command::new("which")
        .arg(bin)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// One-shot invocation shape per agent. Mirrors Orca
/// `commit-message-agent-specs-{primary,secondary}` (stdin prompt delivery).
fn agent_one_shot(binary: &str) -> Option<(String, Vec<String>)> {
    match binary {
        "claude" => Some(("claude".to_string(), vec!["-p".to_string()])),
        "codex" => Some(("codex".to_string(), vec!["exec".to_string()])),
        "opencode" => Some(("opencode".to_string(), vec!["run".to_string()])),
        "gemini" => Some(("gemini".to_string(), vec!["-p".to_string()])),
        "aider" => Some(("aider".to_string(), vec!["--message".to_string()])),
        "omp" => Some(("omp".to_string(), vec!["-p".to_string()])),
        "opencode-agent" | "openclaude" => Some((binary.to_string(), vec!["-p".to_string()])),
        _ => None,
    }
}

const PROMPT_MAX_BYTES: usize = 60_000;

fn truncate_diff(diff: &str) -> String {
    if diff.len() <= PROMPT_MAX_BYTES {
        return diff.to_string();
    }
    // Keep head + tail (hunks at both ends matter more than the middle).
    let head = PROMPT_MAX_BYTES * 2 / 3;
    let tail = PROMPT_MAX_BYTES - head - 60;
    format!(
        "{}\n\n[... truncated {} bytes ...]\n\n{}",
        &diff[..head],
        diff.len() - PROMPT_MAX_BYTES,
        &diff[diff.len() - tail..]
    )
}

fn git(repo: &str, args: &[&str]) -> Result<String, String> {
    let out = Command::new("git")
        .args(["-C", repo])
        .args(args)
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

/// Staged context for the prompt. Mirrors Orca `getStagedCommitContext`:
/// branch + name-status summary + minimal patch (null when nothing staged).
fn staged_context(repo_path: &str) -> Result<(String, String, String), String> {
    let branch = git(repo_path, &["branch", "--show-current"]).unwrap_or_default();
    let summary = git(repo_path, &["diff", "--cached", "--name-status"])?;
    if summary.trim().is_empty() {
        return Err("Nothing staged. Stage files with \"+\" first.".to_string());
    }
    let patch = git(
        repo_path,
        &["diff", "--cached", "--patch", "--minimal", "--no-color", "--no-ext-diff"],
    )
    .unwrap_or_default();
    Ok((branch, summary, patch))
}

fn build_commit_prompt(branch: &str, summary: &str, patch: &str, custom: Option<&str>) -> String {
    let patch_section = {
        let p = patch.trim();
        if p.is_empty() {
            "(diff omitted — too large to read; infer the change from the staged file list above)".to_string()
        } else {
            format!("```diff\n{}\n```", truncate_diff(p))
        }
    };
    let mut base = vec![
        "You are generating a single git commit message.".to_string(),
        "Return only the commit message text. Do not include a preamble, quotes, or code fences.".to_string(),
        String::new(),
        "Rules:".to_string(),
        "- First line: imperative mood, <= 72 chars, no trailing period.".to_string(),
        "- Optional body: blank line, then short wrapped bullet points or prose explaining WHY.".to_string(),
        "- Capture the primary user-visible or developer-visible change.".to_string(),
        "- Use only the staged changes below as context.".to_string(),
        "- Do not include \"Co-authored-by\" or other git trailers.".to_string(),
        String::new(),
        format!("Branch: {}", if branch.is_empty() { "(detached)" } else { branch }),
        String::new(),
        "Staged files:".to_string(),
        summary.chars().take(6_000).collect(),
        String::new(),
        "Staged patch:".to_string(),
        patch_section,
    ];
    if let Some(extra) = custom.filter(|s| !s.trim().is_empty()) {
        base.push(String::new());
        base.push("Additional instructions:".to_string());
        base.push(extra.to_string());
    }
    base.join("\n")
}

fn build_pr_prompt(branch: &str, diff_stat: &str, patch: &str) -> String {
    vec![
        "You are generating GitHub pull request fields for the changes below.".to_string(),
        "Return exactly two sections: a `Title:` line (imperative, <= 72 chars) then a blank line, then a `Body:` section (short markdown summary with bullets explaining WHAT and WHY).".to_string(),
        "No preamble, no quotes, no code fences around the fields.".to_string(),
        String::new(),
        format!("Branch: {}", if branch.is_empty() { "(detached)" } else { branch }),
        String::new(),
        "Changed files:".to_string(),
        diff_stat.chars().take(6_000).collect::<String>(),
        String::new(),
        "Patch:".to_string(),
        format!("```diff\n{}\n```", truncate_diff(patch)),
    ]
    .join("\n")
}

/// Spawn the agent one-shot with the prompt on stdin; wait with timeout.
/// Returns trimmed stdout. The child is registered for cancel-by-id.
fn run_agent_generation(
    binary: &str,
    args: &[String],
    prompt: &str,
    cwd: &str,
    timeout: Duration,
) -> Result<(u64, String), String> {
    let mut child: Child = Command::new(binary)
        .args(args)
        .current_dir(cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn {binary}: {e}"))?;
    if let Some(stdin) = child.stdin.as_mut() {
        let _ = stdin.write_all(prompt.as_bytes());
    }
    let id = NEXT_GEN_ID.fetch_add(1, Ordering::SeqCst);
    LIVE_GENERATIONS.lock().insert(
        id,
        GenerationHandle {
            child_id: child.id(),
        },
    );
    let output = wait_with_timeout(&mut child, timeout);
    LIVE_GENERATIONS.lock().remove(&id);
    match output {
        Ok(out) => {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout).trim_end().to_string();
                if text.is_empty() {
                    Err("Agent returned empty output.".to_string())
                } else {
                    Ok((id, text))
                }
            } else {
                let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
                Err(if err.is_empty() {
                    format!("{binary} exited with status {}", out.status)
                } else {
                    err.lines().take(5).collect::<Vec<_>>().join("\n")
                })
            }
        }
        Err(e) => Err(e),
    }
}

fn wait_with_timeout(
    child: &mut Child,
    timeout: Duration,
) -> Result<std::process::Output, String> {
    use std::time::Instant;
    let start = Instant::now();
    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => {
                // try_wait reaped the child; collect piped output manually.
                let mut stdout = Vec::new();
                let mut stderr = Vec::new();
                use std::io::Read;
                if let Some(mut out) = child.stdout.take() {
                    let _ = out.read_to_end(&mut stdout);
                }
                if let Some(mut err) = child.stderr.take() {
                    let _ = err.read_to_end(&mut stderr);
                }
                return Ok(std::process::Output { status, stdout, stderr });
            }
            None => {
                if start.elapsed() > timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err("Generation timed out after 120s.".to_string());
                }
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredModels {
    pub agent_id: String,
    pub binary: String,
    pub installed: bool,
    pub models: Vec<String>,
}

/// `git:discoverCommitMessageModels` — PATH probe (+ fixed model list where the
/// CLI exposes one; else empty = agent default). Mirrors Orca discovery shape.
#[tauri::command]
pub async fn ai_discover_models(agent_id: String) -> Result<DiscoveredModels, String> {
    let (binary, _) = agent_one_shot(&agent_id)
        .ok_or_else(|| format!("Agent \"{agent_id}\" does not support AI commit messages."))?;
    let installed = is_binary_in_path(&binary);
    // Static model hints where the CLI has a stable flag; empty = default model.
    // (Orca queries live via `models`/`--list-models`; Hydra reports install
    // state and lets the agent pick — dynamic listing is a later fatia.)
    let models: Vec<String> = Vec::new();
    Ok(DiscoveredModels {
        agent_id,
        binary: binary.to_string(),
        installed,
        models,
    })
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedMessage {
    pub generation_id: u64,
    pub text: String,
}

/// `git:generateCommitMessage` — staged context + Orca prompt + agent spawn.
#[tauri::command]
pub async fn ai_generate_commit_message(
    repo_path: String,
    agent_id: Option<String>,
    custom_prompt: Option<String>,
    state: State<'_, AppState>,
) -> Result<GeneratedMessage, String> {
    let _ = state;
    let agent = agent_id.unwrap_or_else(|| "claude".to_string());
    let (binary, args) = agent_one_shot(&agent)
        .ok_or_else(|| format!("Agent \"{agent}\" does not support AI commit messages."))?;
    if !is_binary_in_path(&binary) {
        return Err(format!("Agent binary \"{binary}\" is not installed."))?;
    }
    let repo_clone = repo_path.clone();
    let (branch, summary, patch) =
        tokio::task::spawn_blocking(move || staged_context(&repo_clone))
            .await
            .map_err(|e| e.to_string())??;
    let prompt = build_commit_prompt(&branch, &summary, &patch, custom_prompt.as_deref());
    let (_id, text) = tokio::task::spawn_blocking(move || {
        run_agent_generation(&binary, &args, &prompt, &repo_path, Duration::from_secs(120))
    })
    .await
    .map_err(|e| e.to_string())?
    .map(|(_, text)| (0u64, text))?;
    // Re-mint the id outside (spawn_blocking owns the registry id).
    let generation_id = NEXT_GEN_ID.fetch_add(1, Ordering::SeqCst);
    Ok(GeneratedMessage {
        generation_id,
        text,
    })
}

/// `git:generatePullRequestFields` — unstaged+staged diff + branch + PR prompt.
#[tauri::command]
pub async fn ai_generate_pr_fields(
    repo_path: String,
    agent_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<GeneratedMessage, String> {
    let _ = state;
    let agent = agent_id.unwrap_or_else(|| "claude".to_string());
    let (binary, args) = agent_one_shot(&agent)
        .ok_or_else(|| format!("Agent \"{agent}\" does not support AI commit messages."))?;
    if !is_binary_in_path(&binary) {
        return Err(format!("Agent binary \"{binary}\" is not installed."))?;
    }
    let repo_clone = repo_path.clone();
    let repo_clone2 = repo_path.clone();
    let (branch, stat, patch) = tokio::task::spawn_blocking(move || {
        let branch = git(&repo_clone, &["branch", "--show-current"]).unwrap_or_default();
        let stat = git(&repo_path, &["diff", "--name-status", "HEAD"]).unwrap_or_default();
        let patch = git(&repo_path, &["diff", "--patch", "--minimal", "--no-color", "HEAD"])
            .unwrap_or_default();
        if stat.trim().is_empty() {
            return Err::<_, String>("No changes vs HEAD to describe.".to_string());
        }
        Ok::<_, String>((branch, stat, patch))
    })
    .await
    .map_err(|e| e.to_string())??;
    let prompt = build_pr_prompt(&branch, &stat, &patch);
    let text = tokio::task::spawn_blocking(move || {
        run_agent_generation(&binary, &args, &prompt, &repo_clone2, Duration::from_secs(120))
    })
    .await
    .map_err(|e| e.to_string())?
    .map(|(_, text)| text)?;
    let generation_id = NEXT_GEN_ID.fetch_add(1, Ordering::SeqCst);
    Ok(GeneratedMessage { generation_id, text })
}

/// `git:cancelGenerateCommitMessage` / `cancelGeneratePullRequestFields` —
/// best-effort kill by child PID (Unix). Unknown/finished ids are Ok.
#[tauri::command]
pub async fn ai_cancel_generation(generation_id: u64) -> Result<bool, String> {
    let handle = LIVE_GENERATIONS.lock().remove(&generation_id);
    let Some(h) = handle else {
        return Ok(false);
    };
    #[cfg(unix)]
    {
        // SAFETY: kill() on an arbitrary PID is best-effort; ESRCH/EPERM are Ok(false).
        let ret = unsafe { libc::kill(h.child_id as i32, libc::SIGKILL) };
        Ok(ret == 0)
    }
    #[cfg(not(unix))]
    {
        Ok(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prompt_has_rules_and_context() {
        let p = build_commit_prompt("main", "M f.txt", "diff --git a/f.txt", None);
        assert!(p.contains("First line: imperative"));
        assert!(p.contains("Branch: main"));
        assert!(p.contains("M f.txt"));
        assert!(p.contains("```diff"));
    }

    #[test]
    fn prompt_empty_patch_fallback() {
        let p = build_commit_prompt("", "M f.txt", "", None);
        assert!(p.contains("omitted"));
        assert!(p.contains("(detached)"));
    }

    #[test]
    fn prompt_custom_instructions_appended() {
        let p = build_commit_prompt("main", "M f.txt", "d", Some("Use conventional commits"));
        assert!(p.contains("Additional instructions"));
        assert!(p.contains("conventional"));
    }

    #[test]
    fn truncate_keeps_head_and_tail() {
        let big = "x".repeat(PROMPT_MAX_BYTES + 1000);
        let t = truncate_diff(&big);
        assert!(t.len() < big.len());
        assert!(t.contains("truncated"));
    }

    #[test]
    fn pr_prompt_has_title_body_contract() {
        let p = build_pr_prompt("feat", "M f.txt", "patch");
        assert!(p.contains("Title:"));
        assert!(p.contains("Body:"));
    }

    #[test]
    fn agent_specs_known_binaries() {
        for agent in ["claude", "codex", "opencode", "gemini", "aider", "omp"] {
            let (bin, args) = agent_one_shot(agent).expect(agent);
            assert!(!bin.is_empty());
            assert!(!args.is_empty());
        }
        assert!(agent_one_shot("not-an-agent").is_none());
    }

    #[test]
    fn discover_reports_install_state() {
        // claude/omp/opencode are installed in this dev env (see `which`).
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let claude = rt.block_on(ai_discover_models("claude".to_string())).unwrap();
        assert!(claude.installed);
        assert_eq!(claude.binary, "claude");
        let bogus = rt.block_on(ai_discover_models("not-an-agent".to_string()));
        assert!(bogus.is_err());
    }
}
