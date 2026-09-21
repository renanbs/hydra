use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PreflightStatus {
    pub git_installed: bool,
    pub gh_installed: bool,
    pub gh_authenticated: bool,
}

pub fn check_preflight_tools() -> PreflightStatus {
    let git_installed = Command::new("git")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let gh_installed = Command::new("gh")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let gh_authenticated = if gh_installed {
        Command::new("gh")
            .args(["auth", "status"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    } else {
        false
    };

    PreflightStatus {
        git_installed,
        gh_installed,
        gh_authenticated,
    }
}

pub fn check_github_starred(repo: &str) -> Option<bool> {
    if !repo.chars().all(|c| c.is_alphanumeric() || c == '/' || c == '-' || c == '_' || c == '.') {
        return None;
    }

    let out = Command::new("gh")
        .args(["api", "--include", &format!("user/starred/{repo}")])
        .output()
        .ok()?;

    let combined = format!(
        "{}\n{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );

    if combined.contains(" 204 ")
        || combined.contains(" 200 ")
        || combined.contains("HTTP/1.1 204")
        || combined.contains("HTTP/2 204")
        || combined.contains("HTTP/1.1 200")
        || combined.contains("HTTP/2 200")
    {
        return Some(true);
    }
    if combined.contains(" 404 ")
        || combined.contains("HTTP/1.1 404")
        || combined.contains("HTTP/2 404")
        || combined.contains("Not Found")
    {
        return Some(false);
    }
    None
}

pub fn star_github_repo(repo: &str) -> Result<bool, String> {
    if !repo.chars().all(|c| c.is_alphanumeric() || c == '/' || c == '-' || c == '_' || c == '.') {
        return Err("Invalid repository name".to_string());
    }

    let out = Command::new("gh")
        .args(["api", "-X", "PUT", &format!("user/starred/{repo}")])
        .output()
        .map_err(|e| e.to_string())?;

    if out.status.success() {
        Ok(true)
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
    }
}

pub fn open_external_url(url: &str) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid URL protocol: only http and https are permitted".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
