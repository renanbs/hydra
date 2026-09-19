use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HydraProject {
    pub id: String,
    pub name: String,
    pub path: String,
    pub is_git: bool,
    pub current_branch: String,
}

pub fn list_local_projects() -> Vec<HydraProject> {
    let mut projects = Vec::new();

    // 1. O próprio diretório atual
    if let Ok(current) = std::env::current_dir() {
        let name = current
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("hydra")
            .to_string();
        let path_str = current.to_string_lossy().to_string();
        let is_git = current.join(".git").exists();
        let branch = if is_git {
            get_branch_for_path(&current)
        } else {
            "none".to_string()
        };

        projects.push(HydraProject {
            id: "proj_current".to_string(),
            name,
            path: path_str,
            is_git,
            current_branch: branch,
        });
    }

    // 2. Varredura rápida em ~/src (se existir)
    if let Ok(home) = std::env::var("HOME") {
        let src_dir = PathBuf::from(home).join("src");
        if let Ok(entries) = std::fs::read_dir(&src_dir) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() {
                        let path = entry.path();
                        let name = entry.file_name().to_string_lossy().to_string();
                        if name == "hydra" || name.starts_with('.') {
                            continue;
                        }
                        let is_git = path.join(".git").exists();
                        let branch = if is_git {
                            get_branch_for_path(&path)
                        } else {
                            "none".to_string()
                        };

                        projects.push(HydraProject {
                            id: format!("proj_{name}"),
                            name,
                            path: path.to_string_lossy().to_string(),
                            is_git,
                            current_branch: branch,
                        });
                    }
                }
            }
        }
    }

    projects
}

fn get_branch_for_path(path: &Path) -> String {
    std::process::Command::new("git")
        .args(["-C", path.to_string_lossy().as_ref(), "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map(|out| {
            if out.status.success() {
                String::from_utf8_lossy(&out.stdout).trim().to_string()
            } else {
                "main".to_string()
            }
        })
        .unwrap_or_else(|_| "main".to_string())
}
