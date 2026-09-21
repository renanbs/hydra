use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitRepoStatus {
    pub branch: String,
    pub modified_files: usize,
    pub is_clean: bool,
    pub head_commit: String,
}

pub fn get_git_status() -> Result<GitRepoStatus, String> {
    get_git_status_for_path(".")
}

pub fn get_git_status_for_path(repo_path: &str) -> Result<GitRepoStatus, String> {
    let branch_out = Command::new("git")
        .args(["-C", repo_path, "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map_err(|e| format!("Failed to run git branch: {e}"))?;

    let branch = if branch_out.status.success() {
        String::from_utf8_lossy(&branch_out.stdout).trim().to_string()
    } else {
        "main".to_string()
    };

    let status_out = Command::new("git")
        .args(["-C", repo_path, "status", "-s"])
        .output()
        .map_err(|e| format!("Failed to run git status: {e}"))?;

    let modified_count = if status_out.status.success() {
        String::from_utf8_lossy(&status_out.stdout)
            .lines()
            .filter(|l| !l.trim().is_empty())
            .count()
    } else {
        0
    };

    let commit_out = Command::new("git")
        .args(["-C", repo_path, "rev-parse", "--short", "HEAD"])
        .output()
        .map_err(|e| format!("Failed to run git commit: {e}"))?;

    let head_commit = if commit_out.status.success() {
        String::from_utf8_lossy(&commit_out.stdout).trim().to_string()
    } else {
        "initial".to_string()
    };

    Ok(GitRepoStatus {
        branch,
        modified_files: modified_count,
        is_clean: modified_count == 0,
        head_commit,
    })
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DetailedFileStatus {
    pub path: String,
    pub index_status: String,
    pub worktree_status: String,
    pub is_staged: bool,
    pub is_unstaged: bool,
    pub is_untracked: bool,
    pub is_conflicted: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DetailedGitStatus {
    pub branch: String,
    pub upstream: Option<String>,
    pub ahead: usize,
    pub behind: usize,
    pub is_clean: bool,
    pub head_commit: String,
    pub head_commit_full: String,
    pub files: Vec<DetailedFileStatus>,
    pub staged_count: usize,
    pub unstaged_count: usize,
    pub untracked_count: usize,
    pub conflicted_count: usize,
}

pub fn get_detailed_git_status(repo_path: &str) -> Result<DetailedGitStatus, String> {
    let branch_out = Command::new("git")
        .args(["-C", repo_path, "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map_err(|e| e.to_string())?;
    let branch = if branch_out.status.success() {
        String::from_utf8_lossy(&branch_out.stdout).trim().to_string()
    } else { "main".to_string() };

    let head_out = Command::new("git")
        .args(["-C", repo_path, "rev-parse", "HEAD"])
        .output()
        .map_err(|e| e.to_string())?;
    let head_full = if head_out.status.success() {
        String::from_utf8_lossy(&head_out.stdout).trim().to_string()
    } else { "".to_string() };
    let head_short = if head_full.len() >= 7 { head_full[..7].to_string() } else { head_full.clone() };

    let porcelain = Command::new("git")
        .args(["-C", repo_path, "status", "--porcelain=v1", "-uall", "--branch"])
        .output()
        .map_err(|e| e.to_string())?;
    let raw = String::from_utf8_lossy(&porcelain.stdout).to_string();
    let mut files: Vec<DetailedFileStatus> = Vec::new();
    let mut upstream: Option<String> = None;
    let mut ahead: usize = 0;
    let mut behind: usize = 0;

    for line in raw.lines() {
        if line.starts_with("## ") {
            // ## main...origin/main [ahead 1, behind 2] or ## HEAD (no branch)
            let rest = &line[3..];
            if let Some(idx) = rest.find("...") {
                let after = &rest[idx+3..];
                let end = after.find(' ').unwrap_or(after.len());
                let up = &after[..end];
                if !up.is_empty() { upstream = Some(up.to_string()); }
                if after.contains("ahead") {
                    if let Some(s) = after.split("ahead ").nth(1) {
                        ahead = s.split(|c: char| !c.is_ascii_digit()).next().unwrap_or("0").parse().unwrap_or(0);
                    }
                }
                if after.contains("behind") {
                    if let Some(s) = after.split("behind ").nth(1) {
                        behind = s.split(|c: char| !c.is_ascii_digit()).next().unwrap_or("0").parse().unwrap_or(0);
                    }
                }
            }
            continue;
        }
        if line.len() < 3 { continue; }
        let idx_c = line.chars().nth(0).unwrap_or(' ');
        let wt_c = line.chars().nth(1).unwrap_or(' ');
        let path = line[3..].trim().to_string();
        // handle renames: "R  old -> new"
        let display_path = if path.contains(" -> ") {
            path.split(" -> ").last().unwrap_or(&path).to_string()
        } else { path.clone() };
        let is_untracked = idx_c == '?' && wt_c == '?';
        let is_conflicted = matches!((idx_c, wt_c), ('U', _) | (_, 'U') | ('A','A') | ('D','D'));
        let is_staged = idx_c != ' ' && idx_c != '?' && idx_c != '!';
        let is_unstaged = wt_c != ' ' && wt_c != '?' ;
        // untracked treated as unstaged
        files.push(DetailedFileStatus {
            path: display_path,
            index_status: idx_c.to_string(),
            worktree_status: wt_c.to_string(),
            is_staged,
            is_unstaged: if is_untracked { true } else { is_unstaged },
            is_untracked,
            is_conflicted,
        });
    }

    let is_clean = files.is_empty();
    let staged_count = files.iter().filter(|f| f.is_staged).count();
    let unstaged_count = files.iter().filter(|f| f.is_unstaged && !f.is_untracked).count();
    let untracked_count = files.iter().filter(|f| f.is_untracked).count();
    let conflicted_count = files.iter().filter(|f| f.is_conflicted).count();

    Ok(DetailedGitStatus {
        branch,
        upstream,
        ahead,
        behind,
        is_clean,
        head_commit: head_short,
        head_commit_full: head_full,
        files,
        staged_count,
        unstaged_count,
        untracked_count,
        conflicted_count,
    })
}

pub fn git_stage_file(repo_path: &str, file: &str) -> Result<(), String> {
    let out = Command::new("git").args(["-C", repo_path, "add", "--", file]).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(()) } else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}
pub fn git_unstage_file(repo_path: &str, file: &str) -> Result<(), String> {
    let out = Command::new("git").args(["-C", repo_path, "restore", "--staged", "--", file]).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(()) } else {
        // fallback to reset
        let out2 = Command::new("git").args(["-C", repo_path, "reset", "HEAD", "--", file]).output().map_err(|e| e.to_string())?;
        if out2.status.success() { Ok(()) } else { Err(String::from_utf8_lossy(&out2.stderr).to_string()) }
    }
}
pub fn git_discard_file(repo_path: &str, file: &str) -> Result<(), String> {
    // 1. try checkout/restore for tracked files
    let out = Command::new("git").args(["-C", repo_path, "checkout", "--", file]).output().map_err(|e| e.to_string())?;
    if out.status.success() { return Ok(()); }
    let out2 = Command::new("git").args(["-C", repo_path, "restore", "--", file]).output().map_err(|e| e.to_string())?;
    if out2.status.success() { return Ok(()); }
    // 2. for untracked files, delete from filesystem (copia Orca discard untracked)
    let full = std::path::Path::new(repo_path).join(file);
    if full.exists() {
        if full.is_dir() {
            std::fs::remove_dir_all(&full).map_err(|e| e.to_string())?;
        } else {
            std::fs::remove_file(&full).map_err(|e| e.to_string())?;
        }
        return Ok(());
    }
    Err(String::from_utf8_lossy(&out2.stderr).to_string())
}
pub fn git_commit(repo_path: &str, message: &str) -> Result<String, String> {
    let out = Command::new("git").args(["-C", repo_path, "commit", "-m", message]).output().map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
    }
}
pub fn git_commit_amend(repo_path: &str, message: &str) -> Result<String, String> {
    let out = if message.trim().is_empty() {
        Command::new("git").args(["-C", repo_path, "commit", "--amend", "--no-edit"]).output().map_err(|e| e.to_string())?
    } else {
        Command::new("git").args(["-C", repo_path, "commit", "--amend", "-m", message]).output().map_err(|e| e.to_string())?
    };
    if out.status.success() { Ok(String::from_utf8_lossy(&out.stdout).to_string()) } else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}
pub fn git_diff(repo_path: &str, file: &str, staged: bool) -> Result<String, String> {
    let mut args = vec!["-C", repo_path, "diff"];
    if staged { args.push("--staged"); }
    args.push("--");
    args.push(file);
    let out = Command::new("git").args(&args).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(String::from_utf8_lossy(&out.stdout).to_string()) } else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitCommitEntry {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
}

pub fn get_git_history(repo_path: &str, limit: usize) -> Result<Vec<GitCommitEntry>, String> {
    let lim = limit.min(100).max(5).to_string();
    // Use --pretty format with unit separator to avoid parsing issues
    let out = Command::new("git")
        .args(["-C", repo_path, "log", &format!("--max-count={}", lim), "--pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s", "--date=short"])
        .output()
        .map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).to_string());
    }
    let raw = String::from_utf8_lossy(&out.stdout);
    let mut commits = Vec::new();
    for line in raw.lines() {
        if line.trim().is_empty() { continue; }
        let parts: Vec<&str> = line.split('\x1f').collect();
        if parts.len() < 5 { continue; }
        commits.push(GitCommitEntry {
            hash: parts[0].to_string(),
            short_hash: parts[1].to_string(),
            author: parts[2].to_string(),
            date: parts[3].to_string(),
            message: parts[4].to_string(),
        });
    }
    Ok(commits)
}

pub fn git_stage_all(repo_path: &str) -> Result<(), String> {
    let out = Command::new("git").args(["-C", repo_path, "add", "-A"]).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(()) } else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}
pub fn git_unstage_all(repo_path: &str) -> Result<(), String> {
    let out = Command::new("git").args(["-C", repo_path, "reset", "HEAD"]).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(()) } else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}

pub fn check_git_ignored(repo_path: &str, paths: &[String]) -> Result<Vec<String>, String> {
    if paths.is_empty() { return Ok(vec![]); }
    // Use git check-ignore --stdin -z for performance (batch)
    let mut child = Command::new("git")
        .args(["-C", repo_path, "check-ignore", "--stdin", "-z", "--no-index"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    {
        use std::io::Write;
        if let Some(stdin) = child.stdin.as_mut() {
            for p in paths {
                stdin.write_all(p.as_bytes()).map_err(|e| e.to_string())?;
                stdin.write_all(b"\0").map_err(|e| e.to_string())?;
            }
        }
    }
    let out = child.wait_with_output().map_err(|e| e.to_string())?;
    if out.stdout.is_empty() {
        return Ok(vec![]);
    }
    let ignored = out.stdout.split(|b| *b == 0).filter_map(|s| {
        if s.is_empty() { None } else { Some(String::from_utf8_lossy(s).to_string()) }
    }).collect();
    Ok(ignored)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DiffNumStat {
    pub path: String,
    pub added: usize,
    pub deleted: usize,
}

pub fn get_diff_numstat(repo_path: &str, staged: bool) -> Result<Vec<DiffNumStat>, String> {
    let mut args = vec!["-C", repo_path, "diff", "--numstat"];
    if staged { args.push("--staged"); }
    let out = Command::new("git").args(&args).output().map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Ok(vec![]);
    }
    let raw = String::from_utf8_lossy(&out.stdout);
    let mut stats = Vec::new();
    for line in raw.lines() {
        let mut parts = line.split('\t');
        let added = parts.next().unwrap_or("0").parse::<usize>().unwrap_or(0);
        let deleted = parts.next().unwrap_or("0").parse::<usize>().unwrap_or(0);
        let path = parts.next().unwrap_or("").to_string();
        if path.is_empty() { continue; }
        if added == 0 && deleted == 0 && line.starts_with("-\t-\t") { continue; } // binary
        stats.push(DiffNumStat { path, added, deleted });
    }
    Ok(stats)
}

pub fn get_branch_commits(repo_path: &str, base_ref: &str, limit: usize) -> Result<Vec<GitCommitEntry>, String> {
    let lim = limit.min(100).max(5).to_string();
    let range = if base_ref.trim().is_empty() { format!("HEAD") } else { format!("{}..HEAD", base_ref) };
    let out = Command::new("git")
        .args(["-C", repo_path, "log", &format!("--max-count={}", lim), "--pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s", "--date=short", &range])
        .output()
        .map_err(|e| e.to_string())?;
    if !out.status.success() { return Ok(vec![]); }
    let raw = String::from_utf8_lossy(&out.stdout);
    let mut commits = Vec::new();
    for line in raw.lines() {
        if line.trim().is_empty() { continue; }
        let parts: Vec<&str> = line.split('\x1f').collect();
        if parts.len() < 5 { continue; }
        commits.push(GitCommitEntry { hash: parts[0].to_string(), short_hash: parts[1].to_string(), author: parts[2].to_string(), date: parts[3].to_string(), message: parts[4].to_string() });
    }
    Ok(commits)
}
pub fn git_push(repo_path: &str) -> Result<String, String> {
    let out = Command::new("git").args(["-C", repo_path, "push"]).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(String::from_utf8_lossy(&out.stdout).to_string() + &String::from_utf8_lossy(&out.stderr).to_string()) }
    else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}
pub fn git_pull(repo_path: &str) -> Result<String, String> {
    let out = Command::new("git").args(["-C", repo_path, "pull", "--ff-only"]).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(String::from_utf8_lossy(&out.stdout).to_string() + &String::from_utf8_lossy(&out.stderr).to_string()) }
    else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}
pub fn git_stage_paths(repo_path: &str, paths: &[String]) -> Result<(), String> {
    if paths.is_empty() { return Ok(()); }
    let mut args = vec!["-C", repo_path, "add", "--"];
    for p in paths { args.push(p); }
    let out = Command::new("git").args(&args).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(()) } else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}
pub fn git_unstage_paths(repo_path: &str, paths: &[String]) -> Result<(), String> {
    if paths.is_empty() { return Ok(()); }
    let mut args = vec!["-C", repo_path, "restore", "--staged", "--"];
    for p in paths { args.push(p); }
    let out = Command::new("git").args(&args).output().map_err(|e| e.to_string())?;
    if out.status.success() { return Ok(()); }
    // fallback reset
    let mut args2 = vec!["-C", repo_path, "reset", "HEAD", "--"];
    for p in paths { args2.push(p); }
    let out2 = Command::new("git").args(&args2).output().map_err(|e| e.to_string())?;
    if out2.status.success() { Ok(()) } else { Err(String::from_utf8_lossy(&out2.stderr).to_string()) }
}
pub fn get_submodule_paths(repo_path: &str) -> Vec<String> {
    let gitmodules = std::path::Path::new(repo_path).join(".gitmodules");
    if !gitmodules.exists() { return vec![]; }
    if let Ok(content) = std::fs::read_to_string(&gitmodules) {
        let mut paths = Vec::new();
        for line in content.lines() {
            let t = line.trim();
            if t.starts_with("path =") {
                if let Some(p) = t.strip_prefix("path =") { paths.push(p.trim().to_string()); }
            }
        }
        return paths;
    }
    vec![]
}
pub fn get_submodule_live_status(repo_path: &str) -> Vec<String> {
    // Live 160000 detection via git ls-files --stage (Orca getSubmoduleStatus 160000)
    let out = Command::new("git").args(["-C", repo_path, "ls-files", "--stage"]).output();
    if let Ok(o) = out {
        if o.status.success() {
            let raw = String::from_utf8_lossy(&o.stdout);
            let mut subs = Vec::new();
            for line in raw.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("160000") {
                    // 160000 <hash> 0\tpath
                    if let Some(tab) = trimmed.find('\t') {
                        subs.push(trimmed[tab+1..].to_string());
                    }
                }
            }
            if !subs.is_empty() { return subs; }
        }
    }
    get_submodule_paths(repo_path)
}
pub fn git_stash_list(repo_path: &str) -> Result<Vec<GitCommitEntry>, String> {
    let out = Command::new("git").args(["-C", repo_path, "stash", "list", "--pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s", "--date=short"]).output().map_err(|e| e.to_string())?;
    if !out.status.success() { return Ok(vec![]); }
    let raw = String::from_utf8_lossy(&out.stdout);
    let mut v = Vec::new();
    for line in raw.lines() {
        if line.trim().is_empty() { continue; }
        let p: Vec<&str> = line.split('\x1f').collect();
        if p.len() < 5 { continue; }
        v.push(GitCommitEntry { hash: p[0].to_string(), short_hash: p[1].to_string(), author: p[2].to_string(), date: p[3].to_string(), message: p[4].to_string() });
    }
    Ok(v)
}
pub fn git_stash_push(repo_path: &str, msg: &str) -> Result<String, String> {
    let m = if msg.trim().is_empty() { "hydra stash" } else { msg };
    let out = Command::new("git").args(["-C", repo_path, "stash", "push", "-m", m]).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(String::from_utf8_lossy(&out.stdout).to_string()) } else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}
pub fn git_stash_pop(repo_path: &str) -> Result<String, String> {
    let out = Command::new("git").args(["-C", repo_path, "stash", "pop"]).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(String::from_utf8_lossy(&out.stdout).to_string()) } else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_git_status() {
        let status = get_git_status().expect("git status");
        assert!(!status.branch.is_empty());
        assert!(!status.head_commit.is_empty());
    }
}
