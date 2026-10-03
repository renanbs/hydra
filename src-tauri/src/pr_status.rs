//! PR status for a branch, backed by the optional `gh` CLI.
//!
//! Hydra has no other PR source: when `gh` is missing, exits non-zero, times
//! out or returns an empty list we report "no PR" (`None`) — never an error.
//! The state/checks vocabulary mirrors Orca so the sidebar glyph and tone
//! agree across both apps:
//! - `mapPRState`       — `src/main/github/mappers.ts:112`
//! - `classifyCheckOutcome` / `resolveProviderCheckState` — `src/shared/provider-check-summary.ts`
//! - `normalizeRollupCheck` — `src/shared/pr-check-status.ts`

use serde::{Deserialize, Serialize};
use std::io::Read;
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

/// Ceiling for the whole `gh` invocation; a slow network must not stall the UI.
const GH_TIMEOUT: Duration = Duration::from_secs(5);
const POLL_INTERVAL: Duration = Duration::from_millis(50);
const GH_JSON_FIELDS: &str = "number,state,isDraft,url,statusCheckRollup";

const PASSED_CONCLUSIONS: &[&str] = &["success", "skipped"];
const FAILED_CONCLUSIONS: &[&str] = &[
    "failure",
    "error",
    "startup_failure",
    "timed_out",
    "cancelled",
    "action_required",
];

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct PrStatus {
    pub number: u64,
    /// `open | merged | closed | draft`.
    pub state: String,
    pub url: String,
    /// `success | failure | pending`; `None` when the rollup has nothing to report.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub checks: Option<String>,
}

/// Resolves the PR whose head is `branch` inside `repo_path`.
///
/// Fail-open by contract: `None` means "no PR known", covering gh absent,
/// failure, timeout, no matching PR and unparseable output alike.
pub fn fetch_pr_status(repo_path: &str, branch: &str) -> Option<PrStatus> {
    let branch = branch.trim();
    if branch.is_empty() || !Path::new(repo_path).is_dir() {
        return None;
    }
    let args = [
        "pr",
        "list",
        "--head",
        branch,
        "--state",
        "all",
        "--limit",
        "1",
        "--json",
        GH_JSON_FIELDS,
    ];
    let stdout = run_command("gh", &args, repo_path, GH_TIMEOUT)?;
    parse_pr_status_json(&stdout)
}

/// Runs `program` with `args` in `cwd`, returning stdout on success.
///
/// `None` on spawn failure (binary absent), non-zero exit or timeout. The
/// child is killed if it outlives `timeout`.
fn run_command(program: &str, args: &[&str], cwd: &str, timeout: Duration) -> Option<String> {
    let mut child = Command::new(program)
        .args(args)
        .current_dir(cwd)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .ok()?;

    // Drain stdout on a helper thread: waiting with `try_wait` alone deadlocks
    // once the child fills the pipe buffer.
    let stdout = child.stdout.take();
    let reader = std::thread::spawn(move || {
        let mut buf = String::new();
        if let Some(mut out) = stdout {
            let _ = out.read_to_string(&mut buf);
        }
        buf
    });

    let deadline = Instant::now() + timeout;
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let out = reader.join().unwrap_or_default();
                return if status.success() { Some(out) } else { None };
            }
            Ok(None) if Instant::now() >= deadline => {
                let _ = child.kill();
                let _ = child.wait();
                let _ = reader.join();
                return None;
            }
            Ok(None) => std::thread::sleep(POLL_INTERVAL),
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                let _ = reader.join();
                return None;
            }
        }
    }
}

/// Parses the JSON array emitted by `gh pr list --json …`; first entry wins.
fn parse_pr_status_json(raw: &str) -> Option<PrStatus> {
    let value: serde_json::Value = serde_json::from_str(raw.trim()).ok()?;
    let first = value.as_array()?.first()?;
    let number = first.get("number")?.as_u64()?;
    let url = first.get("url")?.as_str()?.to_string();
    let raw_state = first.get("state").and_then(|v| v.as_str()).unwrap_or("");
    let is_draft = first
        .get("isDraft")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    Some(PrStatus {
        number,
        state: map_pr_state(raw_state, is_draft),
        url,
        checks: map_checks(first.get("statusCheckRollup")),
    })
}

/// Orca `mapPRState`: merged/closed win over draft, which wins over open.
fn map_pr_state(raw_state: &str, is_draft: bool) -> String {
    match raw_state.to_ascii_uppercase().as_str() {
        "MERGED" => "merged".to_string(),
        "CLOSED" => "closed".to_string(),
        _ if is_draft => "draft".to_string(),
        _ => "open".to_string(),
    }
}

#[derive(Debug, PartialEq, Eq)]
enum CheckOutcome {
    Passed,
    Failed,
    Pending,
    Neutral,
}

/// Mirrors `classifyCheckOutcome` over `normalizeRollupCheck` output.
fn classify_check(raw: &serde_json::Value) -> CheckOutcome {
    let status = lower(raw.get("status"));
    let conclusion = lower(raw.get("conclusion"));
    // Legacy commit statuses arrive as `{ state }` with no conclusion.
    let state = lower(raw.get("state"));

    let normalized = if conclusion == "error" || conclusion == "startup_failure" {
        "failure"
    } else if !conclusion.is_empty() {
        conclusion.as_str()
    } else if state == "failure" || state == "error" {
        "failure"
    } else if state == "success" {
        "success"
    } else {
        ""
    };

    let is_pending = matches!(status.as_str(), "queued" | "in_progress" | "pending")
        || state == "pending"
        || conclusion == "pending";
    if is_pending {
        return CheckOutcome::Pending;
    }
    if FAILED_CONCLUSIONS.contains(&normalized) {
        return CheckOutcome::Failed;
    }
    if PASSED_CONCLUSIONS.contains(&normalized) {
        return CheckOutcome::Passed;
    }
    // Anything not terminal is still running, whatever it calls itself.
    if normalized == "pending" || status != "completed" {
        return CheckOutcome::Pending;
    }
    CheckOutcome::Neutral
}

fn lower(value: Option<&serde_json::Value>) -> String {
    value
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_ascii_lowercase()
}

/// `resolveProviderCheckState` collapsed to Hydra's three-state contract:
/// failure > pending > success; no checks or all-neutral → `None`.
fn map_checks(rollup: Option<&serde_json::Value>) -> Option<String> {
    let items = rollup?.as_array()?;
    if items.is_empty() {
        return None;
    }
    let mut failed = 0usize;
    let mut pending = 0usize;
    let mut passed = 0usize;
    for item in items {
        match classify_check(item) {
            CheckOutcome::Failed => failed += 1,
            CheckOutcome::Pending => pending += 1,
            CheckOutcome::Passed => passed += 1,
            CheckOutcome::Neutral => {}
        }
    }
    if failed > 0 {
        Some("failure".to_string())
    } else if pending > 0 {
        Some("pending".to_string())
    } else if passed > 0 {
        Some("success".to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Recorded from `gh pr list --head <branch> --state all --limit 1 --json
    // number,state,isDraft,url,statusCheckRollup` (gh 2.102.0, orca repo).
    const OPEN: &str = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/tests/fixtures/pr_status/open.json"
    ));
    const DRAFT: &str = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/tests/fixtures/pr_status/draft.json"
    ));
    const MERGED: &str = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/tests/fixtures/pr_status/merged.json"
    ));
    const CLOSED: &str = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/tests/fixtures/pr_status/closed.json"
    ));

    #[test]
    fn parses_open_pr_with_running_checks() {
        let pr = parse_pr_status_json(OPEN).expect("open fixture parses");
        assert_eq!(pr.number, 24924);
        assert_eq!(pr.state, "open");
        assert_eq!(pr.url, "https://github.com/stablyai/orca/pull/24924");
        // QUEUED/IN_PROGRESS runs outrank the finished SUCCESS one.
        assert_eq!(pr.checks.as_deref(), Some("pending"));
    }

    #[test]
    fn parses_draft_pr_as_draft_state() {
        let pr = parse_pr_status_json(DRAFT).expect("draft fixture parses");
        assert_eq!(pr.number, 24921);
        assert_eq!(pr.state, "draft");
        // SKIPPED counts as passed (provider-check-summary.ts PASSED_CONCLUSIONS).
        assert_eq!(pr.checks.as_deref(), Some("success"));
    }

    #[test]
    fn parses_merged_pr() {
        let pr = parse_pr_status_json(MERGED).expect("merged fixture parses");
        assert_eq!(pr.number, 24919);
        assert_eq!(pr.state, "merged");
        assert_eq!(pr.checks.as_deref(), Some("success"));
    }

    #[test]
    fn parses_closed_pr_with_failing_checks() {
        let pr = parse_pr_status_json(CLOSED).expect("closed fixture parses");
        assert_eq!(pr.number, 24651);
        assert_eq!(pr.state, "closed");
        assert_eq!(pr.checks.as_deref(), Some("failure"));
    }

    #[test]
    fn empty_pr_list_is_none() {
        assert_eq!(parse_pr_status_json("[]"), None);
    }

    #[test]
    fn unparseable_output_is_none() {
        assert_eq!(parse_pr_status_json(""), None);
        assert_eq!(parse_pr_status_json("not json"), None);
        assert_eq!(
            parse_pr_status_json("gh: Not Found (HTTP 404)"),
            None,
            "gh stderr on stdout must not panic"
        );
        assert_eq!(parse_pr_status_json("{}"), None, "object is not a list");
    }

    #[test]
    fn legacy_commit_status_contexts_are_classified() {
        let json = r#"[{"number":7,"state":"OPEN","isDraft":false,"url":"u",
            "statusCheckRollup":[{"__typename":"StatusContext","state":"SUCCESS"}]}]"#;
        assert_eq!(
            parse_pr_status_json(json).unwrap().checks.as_deref(),
            Some("success")
        );
        let json = r#"[{"number":7,"state":"OPEN","isDraft":false,"url":"u",
            "statusCheckRollup":[{"__typename":"StatusContext","state":"FAILURE"},
                                 {"__typename":"StatusContext","state":"PENDING"}]}]"#;
        assert_eq!(
            parse_pr_status_json(json).unwrap().checks.as_deref(),
            Some("failure"),
            "failure outranks pending"
        );
        let json = r#"[{"number":7,"state":"OPEN","isDraft":false,"url":"u",
            "statusCheckRollup":[{"__typename":"StatusContext","state":"EXPECTED"}]}]"#;
        assert_eq!(
            parse_pr_status_json(json).unwrap().checks.as_deref(),
            Some("pending"),
            "EXPECTED is not terminal"
        );
        let json = r#"[{"number":7,"state":"OPEN","isDraft":false,"url":"u",
            "statusCheckRollup":[{"__typename":"CheckRun","status":"COMPLETED","conclusion":"NEUTRAL"}]}]"#;
        assert_eq!(
            parse_pr_status_json(json).unwrap().checks,
            None,
            "all-neutral carries no signal in Hydra's three-state contract"
        );
    }

    #[test]
    fn missing_binary_is_none() {
        assert_eq!(
            run_command(
                "__hydra_missing_gh_binary__",
                &["--version"],
                ".",
                Duration::from_secs(1)
            ),
            None
        );
    }

    #[test]
    fn timeout_is_none() {
        let start = Instant::now();
        assert_eq!(
            run_command("sleep", &["5"], ".", Duration::from_millis(200)),
            None
        );
        assert!(
            start.elapsed() < Duration::from_secs(4),
            "timeout must kill the child promptly"
        );
    }

    #[test]
    fn fetch_on_missing_repo_is_none() {
        assert_eq!(fetch_pr_status("/nonexistent/hydra/repo", "main"), None);
        assert_eq!(fetch_pr_status(".", "   "), None);
    }
}
