//! Resolve PR/MR start points for worktree creation.
//!
//! Ported from Orca `main/github/pr-start-point.ts`,
//! `main/github/pr-head-tracking-ref.ts` and the
//! `register-review-base-handlers` IPC layer (local subset: no SSH provider,
//! no WSL, no push-target model — Hydra returns null pushTarget; the composer
//! decides push policy without it).
//!
//! PR (GitHub): `gh pr view` for head/base refs + fork metadata, then fetch
//! `refs/pull/<N>/head` (works for fork and same-repo heads alike) and
//! `rev-parse` the durable SHA. MR (GitLab): pure-git
//! `refs/merge-requests/<iid>/head` fetch from origin — no `glab`/API needed.

use serde::{Deserialize, Serialize};
use std::process::Command;

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

fn gh_json(repo: &str, args: &[&str]) -> Result<serde_json::Value, String> {
    let out = Command::new("gh")
        .args(args)
        .current_dir(repo)
        .output()
        .map_err(|e| format!("gh not available: {e}"))?;
    if out.status.success() {
        serde_json::from_slice::<serde_json::Value>(&out.stdout).map_err(|e| e.to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct PrStartPoint {
    pub base_branch: String,
    pub compare_base_ref: Option<String>,
    pub push_target: Option<String>,
    pub head_sha: Option<String>,
    pub branch_name_override: Option<String>,
    pub maintainer_can_modify: Option<bool>,
    pub is_cross_repository: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct PrStartPointError {
    error: String,
}

/// `worktrees:resolvePrBase` — GitHub PR start point.
#[tauri::command]
pub async fn worktrees_resolve_pr_base(
    repo_path: String,
    pr_number: u64,
    head_ref_name: Option<String>,
    base_ref_name: Option<String>,
    is_cross_repository: Option<bool>,
) -> Result<PrStartPoint, String> {
    tokio::task::spawn_blocking(move || {
        let info = gh_json(
            &repo_path,
            &[
                "pr",
                "view",
                &pr_number.to_string(),
                "--json",
                "headRefName,baseRefName,headRepositoryOwner,maintainerCanModify,isCrossRepository",
            ],
        )
        .map_err(|e| format!("gh pr view failed: {e}"))?;
        let head = head_ref_name
            .filter(|s| !s.trim().is_empty())
            .or_else(|| info.get("headRefName").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .unwrap_or_default();
        if head.is_empty() {
            return Err(format!("PR #{pr_number} has no head branch."));
        }
        let base = base_ref_name
            .filter(|s| !s.trim().is_empty())
            .or_else(|| info.get("baseRefName").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .unwrap_or_else(|| "main".to_string());
        let cross = is_cross_repository.unwrap_or_else(|| {
            info.get("isCrossRepository").and_then(|v| v.as_bool()).unwrap_or(false)
        });
        let maintainer = info
            .get("maintainerCanModify")
            .and_then(|v| v.as_bool());
        // Fork PR heads live on a remote we don't have configured; GitHub
        // exposes every PR head as refs/pull/<N>/head on the upstream repo.
        let local_ref = format!("refs/remotes/origin/pr/{pr_number}");
        git(
            &repo_path,
            &["fetch", "origin", &format!("+refs/pull/{pr_number}/head:{local_ref}")],
        )
        .map_err(|e| format!("Failed to fetch refs/pull/{pr_number}/head: {e}"))?;
        let sha = git(&repo_path, &["rev-parse", "--verify", &format!("{local_ref}^{{commit}}")])
            .map_err(|_| {
                format!("Could not resolve fork PR #{pr_number} head after fetch.")
            })?;
        // Same-repo heads can reuse the branch name directly for checkout.
        let same_repo = !cross
            && info
                .get("headRepositoryOwner")
                .and_then(|v| v.get("login"))
                .and_then(|v| v.as_str())
                .is_some();
        Ok(PrStartPoint {
            base_branch: sha.clone(),
            compare_base_ref: Some(format!("refs/remotes/origin/{base}")),
            push_target: None,
            head_sha: Some(sha),
            branch_name_override: if same_repo { Some(head) } else { None },
            maintainer_can_modify: maintainer,
            is_cross_repository: cross,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// `worktrees:resolveMrBase` — GitLab MR start point (pure git, no API).
/// Fetches `refs/merge-requests/<iid>/head` from origin; base defaults to
/// the given target branch or origin/HEAD.
#[tauri::command]
pub async fn worktrees_resolve_mr_base(
    repo_path: String,
    mr_iid: u64,
    source_branch: Option<String>,
    target_branch: Option<String>,
    _is_cross_repository: Option<bool>,
) -> Result<PrStartPoint, String> {
    tokio::task::spawn_blocking(move || {
        let local_ref = format!("refs/remotes/origin/mr/{mr_iid}");
        git(
            &repo_path,
            &[
                "fetch",
                "origin",
                &format!("+refs/merge-requests/{mr_iid}/head:{local_ref}"),
            ],
        )
        .map_err(|e| format!("Failed to fetch refs/merge-requests/{mr_iid}/head: {e}"))?;
        let sha = git(&repo_path, &["rev-parse", "--verify", &format!("{local_ref}^{{commit}}")])
            .map_err(|_| format!("Could not resolve MR !{mr_iid} head after fetch."))?;
        let base = target_branch
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| {
                git(&repo_path, &["rev-parse", "--abbrev-ref", "origin/HEAD"])
                    .ok()
                    .and_then(|h| h.strip_prefix("origin/").map(|s| s.to_string()))
                    .unwrap_or_else(|| "main".to_string())
            });
        Ok(PrStartPoint {
            base_branch: sha.clone(),
            compare_base_ref: Some(format!("refs/remotes/origin/{base}")),
            push_target: None,
            head_sha: Some(sha),
            branch_name_override: source_branch.filter(|s| !s.trim().is_empty()),
            maintainer_can_modify: None,
            is_cross_repository: false,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[allow(dead_code)]
fn _pr_error_shape() -> PrStartPointError {
    PrStartPointError {
        error: String::new(),
    }
}
