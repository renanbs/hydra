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
    let branch_out = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map_err(|e| format!("Failed to run git branch: {e}"))?;

    let branch = if branch_out.status.success() {
        String::from_utf8_lossy(&branch_out.stdout).trim().to_string()
    } else {
        "main".to_string()
    };

    let status_out = Command::new("git")
        .args(["status", "-s"])
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
        .args(["rev-parse", "--short", "HEAD"])
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
