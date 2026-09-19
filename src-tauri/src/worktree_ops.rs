use serde::{Deserialize, Serialize};
use std::path::{PathBuf};
use std::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitWorktreeInfo {
    pub path: String,
    pub head_commit: String,
    pub branch: String,
    pub is_bare: bool,
    pub is_locked: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CreateWorktreeParams {
    pub repo_path: String,
    pub branch_name: String,
    pub new_branch: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CreateProjectParams {
    pub name: String,
    pub parent_dir: String,
    pub init_git: bool,
}

/// Executa `git worktree list --porcelain` no repositório ativo (Orca 100% worktree discovery)
pub fn list_git_worktrees(repo_path: &str) -> Result<Vec<GitWorktreeInfo>, String> {
    let repo = PathBuf::from(repo_path);
    if !repo.exists() {
        return Err("Repository path does not exist".to_string());
    }

    let out = Command::new("git")
        .args(["worktree", "list", "--porcelain"])
        .current_dir(&repo)
        .output()
        .map_err(|e| format!("Failed to list git worktrees: {e}"))?;

    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&out.stdout);
    let mut worktrees = Vec::new();
    let mut current_path = String::new();
    let mut current_head = String::new();
    let mut current_branch = String::new();
    let mut is_bare = false;
    let mut is_locked = false;

    for line in stdout.lines() {
        if line.starts_with("worktree ") {
            if !current_path.is_empty() {
                worktrees.push(GitWorktreeInfo {
                    path: current_path,
                    head_commit: current_head,
                    branch: current_branch,
                    is_bare,
                    is_locked,
                });
                current_head = String::new();
                current_branch = String::new();
                is_bare = false;
                is_locked = false;
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
        }
    }

    if !current_path.is_empty() {
        worktrees.push(GitWorktreeInfo {
            path: current_path,
            head_commit: current_head,
            branch: current_branch,
            is_bare,
            is_locked,
        });
    }

    Ok(worktrees)
}

/// Executa `git worktree add -b <branch> <path>`
pub fn create_git_worktree(params: CreateWorktreeParams) -> Result<String, String> {
    let repo = PathBuf::from(&params.repo_path);
    if !repo.exists() {
        return Err("Repository path does not exist".to_string());
    }

    let parent = repo.parent().unwrap_or(&repo);
    let sanitized_branch = params.branch_name.replace('/', "-");
    let repo_name = repo.file_name().and_then(|n| n.to_str()).unwrap_or("project");
    let worktree_dir = parent.join(format!("{repo_name}-{sanitized_branch}"));

    let mut cmd = Command::new("git");
    cmd.current_dir(&repo);
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
        Ok(worktree_dir.to_string_lossy().to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
    }
}

/// Executa `git worktree remove --force <path>` (Orca worktree cleanup)
pub fn remove_git_worktree(repo_path: &str, worktree_path: &str) -> Result<(), String> {
    let repo = PathBuf::from(repo_path);
    let out = Command::new("git")
        .args(["worktree", "remove", "--force", worktree_path])
        .current_dir(&repo)
        .output()
        .map_err(|e| format!("Failed to remove git worktree: {e}"))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
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
