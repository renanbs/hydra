use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

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

pub fn create_git_worktree(params: CreateWorktreeParams) -> Result<String, String> {
    let repo = PathBuf::from(&params.repo_path);
    if !repo.exists() {
        return Err("Repository path does not exist".to_string());
    }

    // Cria diretório irmão do repositório para o worktree (Orca pattern: ../repo-branch)
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
