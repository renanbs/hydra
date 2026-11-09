//! Git remote/sync operations: upstream status, fast-forward, rebase,
//! fork sync, commit compare, hosted remote URLs.
//!
//! Ported from Orca `main/git/upstream.ts` (+ `shared/git-effective-upstream`),
//! `main/git/fork-sync.ts`, `main/git/hosted-remote-url.ts`,
//! `main/git/repo.ts` (`getRemoteCommitUrl/getRemoteFileUrl`) and the
//! `git-remote/*` + `filesystem-git-url-handlers` IPC layer. SSH-provider
//! branches (`connectionId`) are not ported: Hydra git commands run on local
//! paths (worktrees), never through a relay provider.

use std::process::Command;

/// Upstream status. Mirrors Orca `GitUpstreamStatus` (subset without
/// push-target variants — Hydra has no push-target model).
#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GitUpstreamStatus {
    pub has_upstream: bool,
    pub upstream_name: Option<String>,
    pub ahead: u32,
    pub behind: u32,
}

fn git(repo_path: &str, args: &[&str]) -> Result<String, String> {
    let out = Command::new("git")
        .args(["-C", repo_path])
        .args(args)
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

/// `git rev-parse --abbrev-ref @{u}` — empty/Err means no upstream.
fn upstream_name(repo_path: &str) -> Option<String> {
    git(repo_path, &["rev-parse", "--abbrev-ref", "@{u}"])
        .ok()
        .filter(|s| !s.is_empty())
}

/// Mirrors Orca `readUpstreamStatus` (fetch-excluded path): ahead/behind via
/// `rev-list --left-right --count HEAD...<upstream>`. Only clearly-no-upstream
/// signals map to `hasUpstream: false`; other errors surface.
pub fn git_upstream_status(repo_path: &str) -> Result<GitUpstreamStatus, String> {
    let Some(upstream) = upstream_name(repo_path) else {
        return Ok(GitUpstreamStatus {
            has_upstream: false,
            upstream_name: None,
            ahead: 0,
            behind: 0,
        });
    };
    match git(repo_path, &["rev-list", "--left-right", "--count", &format!("HEAD...{upstream}")]) {
        Ok(counts) => {
            let mut it = counts.split_whitespace();
            let ahead: u32 = it.next().unwrap_or("0").parse().unwrap_or(0);
            let behind: u32 = it.next().unwrap_or("0").parse().unwrap_or(0);
            Ok(GitUpstreamStatus {
                has_upstream: true,
                upstream_name: Some(upstream),
                ahead,
                behind,
            })
        }
        Err(err) if is_no_upstream_error(&err) => Ok(GitUpstreamStatus {
            has_upstream: false,
            upstream_name: None,
            ahead: 0,
            behind: 0,
        }),
        Err(err) => Err(err),
    }
}

fn is_no_upstream_error(err: &str) -> bool {
    let lower = err.to_lowercase();
    lower.contains("no upstream configured")
        || lower.contains("no upstream branch")
        || lower.contains("has no upstream")
}

/// Ahead/behind between two refs. Mirrors Orca `git:commitCompare`.
pub fn git_commit_compare(
    repo_path: &str,
    left: &str,
    right: &str,
) -> Result<GitUpstreamStatus, String> {
    let counts = git(
        repo_path,
        &["rev-list", "--left-right", "--count", &format!("{left}...{right}")],
    )?;
    let mut it = counts.split_whitespace();
    Ok(GitUpstreamStatus {
        has_upstream: true,
        upstream_name: Some(right.to_string()),
        ahead: it.next().unwrap_or("0").parse().unwrap_or(0),
        behind: it.next().unwrap_or("0").parse().unwrap_or(0),
    })
}

/// `git merge --ff-only <ref>`. Mirrors Orca `branch-mutation fastForward`.
pub fn git_fast_forward(repo_path: &str, target_ref: &str) -> Result<String, String> {
    git(repo_path, &["merge", "--ff-only", target_ref])
}

/// `git rebase <base>`. Mirrors Orca `branch-mutation rebaseFromBase`.
/// Conflicts surface as Err (stderr) for the renderer to display.
pub fn git_rebase_from_base(repo_path: &str, base: &str) -> Result<String, String> {
    git(repo_path, &["rebase", base])
}

/// Sync a fork's default branch from `upstream`: fetch + ff-merge the
/// local tracking branch. Mirrors Orca `gitSyncForkDefaultBranch` (local
/// subset: no SSH provider, no refspec surgery — fetch upstream then
/// `merge --ff-only <upstream>/<branch>`).
pub fn git_sync_fork(repo_path: &str, upstream_remote: &str, branch: &str) -> Result<String, String> {
    git(repo_path, &["fetch", upstream_remote, branch])?;
    git(repo_path, &["merge", "--ff-only", &format!("{upstream_remote}/{branch}")])
}

fn trim_git_suffix(path: &str) -> String {
    path.strip_suffix(".git").unwrap_or(path).to_string()
}

fn clean_remote_path(path: &str) -> Option<String> {
    let normalized = trim_git_suffix(path.trim().trim_matches('/'));
    let parts: Vec<&str> = normalized.split('/').filter(|p| !p.is_empty()).collect();
    if parts.len() < 2 {
        return None;
    }
    Some(parts.join("/"))
}

fn parse_hosted_remote(remote_url: &str) -> Option<(String, String, &'static str)> {
    let trimmed = remote_url.trim();
    // scp-like: [user@]host:path
    if let Some(colon) = trimmed.find(':') {
        let before = &trimmed[..colon];
        let after = &trimmed[colon + 1..];
        if !after.starts_with('/') && !before.contains('/') && !before.contains(' ') {
            let host = before.split('@').next_back().unwrap_or(before).to_lowercase();
            let provider = match host.as_str() {
                "github.com" | "ssh.github.com" => Some(("github.com", "github")),
                "gitlab.com" => Some(("gitlab.com", "gitlab")),
                "bitbucket.org" => Some(("bitbucket.org", "bitbucket")),
                _ => None,
            };
            if let Some((canonical, prov)) = provider {
                if let Some(path) = clean_remote_path(after) {
                    return Some((canonical.to_string(), path, prov));
                }
            }
        }
    }
    // URL form: scheme://[user@]host/path — parsed by hand.
    if let Some(rest) = trimmed.split_once("://").map(|(_, r)| r) {
        let (authority, path) = rest.split_once('/').unwrap_or((rest, ""));
        let host = authority.split('@').next_back().unwrap_or(authority).to_lowercase();
        let (canonical, prov) = match host.as_str() {
            "github.com" => ("github.com", "github"),
            "gitlab.com" => ("gitlab.com", "gitlab"),
            "bitbucket.org" => ("bitbucket.org", "bitbucket"),
            _ => return None,
        };
        if let Some(path) = clean_remote_path(path) {
            return Some((canonical.to_string(), path, prov));
        }
    }
    None
}

fn remote_origin_url(repo_path: &str) -> Option<String> {
    git(repo_path, &["remote", "get-url", "origin"]).ok().filter(|s| !s.is_empty())
}

/// Mirrors Orca `getRemoteCommitUrl`.
pub fn git_remote_commit_url(repo_path: &str, sha: &str) -> Option<String> {
    let remote = remote_origin_url(repo_path)?;
    let (host, path, prov) = parse_hosted_remote(&remote)?;
    Some(match prov {
        "bitbucket" => format!("https://{host}/{path}/commits/{sha}"),
        _ => format!("https://{host}/{path}/commit/{sha}"),
    })
}

/// Mirrors Orca `getRemoteFileUrl` (default branch via `origin/HEAD`).
pub fn git_remote_file_url(repo_path: &str, relative_path: &str, line: u32) -> Option<String> {
    let remote = remote_origin_url(repo_path)?;
    let (host, path, prov) = parse_hosted_remote(&remote)?;
    let branch = default_branch(repo_path)?;
    let anchor = if line > 0 {
        match prov {
            "gitlab" => format!("#L{line}"),
            "bitbucket" => format!("#lines-{line}"),
            _ => format!("#L{line}"),
        }
    } else {
        String::new()
    };
    Some(match prov {
        "gitlab" => format!("https://{host}/{path}/-/blob/{branch}/{relative_path}{anchor}"),
        "bitbucket" => format!("https://{host}/{path}/src/{branch}/{relative_path}{anchor}"),
        _ => format!("https://{host}/{path}/blob/{branch}/{relative_path}{anchor}"),
    })
}

fn default_branch(repo_path: &str) -> Option<String> {
    // `origin/HEAD -> origin/main` symbolic ref.
    if let Ok(head) = git(repo_path, &["rev-parse", "--abbrev-ref", "origin/HEAD"]) {
        if let Some(branch) = head.strip_prefix("origin/") {
            if !branch.is_empty() {
                return Some(branch.to_string());
            }
        }
    }
    // Fallback: current branch name.
    git(repo_path, &["rev-parse", "--abbrev-ref", "HEAD"])
        .ok()
        .filter(|s| !s.is_empty() && s != "HEAD")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_scp_github() {
        let (host, path, prov) = parse_hosted_remote("git@github.com:renanbs/hydra.git").unwrap();
        assert_eq!((host.as_str(), path.as_str(), prov), ("github.com", "renanbs/hydra", "github"));
    }

    #[test]
    fn parses_https_gitlab_subgroup() {
        let (host, path, prov) =
            parse_hosted_remote("https://gitlab.com/group/sub/repo.git").unwrap();
        assert_eq!((host.as_str(), path.as_str(), prov), ("gitlab.com", "group/sub/repo", "gitlab"));
    }

    #[test]
    fn parses_ssh_bitbucket() {
        let (host, path, prov) =
            parse_hosted_remote("ssh://git@bitbucket.org/team/repo.git").unwrap();
        assert_eq!((host.as_str(), path.as_str(), prov), ("bitbucket.org", "team/repo", "bitbucket"));
    }

    #[test]
    fn rejects_unknown_host_and_short_path() {
        assert!(parse_hosted_remote("git@selfhosted.example:repo.git").is_none());
        assert!(parse_hosted_remote("https://github.com/onlyone").is_none());
    }

    #[test]
    fn commit_url_shapes() {
        // Pure shape check without a repo: emulate via direct builder path.
        let (host, path, prov) = parse_hosted_remote("git@github.com:o/r.git").unwrap();
        let url = match prov {
            "bitbucket" => format!("https://{host}/{path}/commits/abc"),
            _ => format!("https://{host}/{path}/commit/abc"),
        };
        assert_eq!(url, "https://github.com/o/r/commit/abc");
    }
}
