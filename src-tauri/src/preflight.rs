use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PreflightStatus {
    pub git_installed: bool,
    pub gh_installed: bool,
    pub gh_authenticated: bool,
    pub glab_installed: bool,
    pub glab_authenticated: bool,
}

impl Default for PreflightStatus {
    fn default() -> Self {
        Self {
            git_installed: false,
            gh_installed: false,
            gh_authenticated: false,
            glab_installed: false,
            glab_authenticated: false,
        }
    }
}

/// Runs a CLI probe; a missing binary or a non-zero exit both read as `false`.
fn cli_succeeds(program: &str, args: &[&str]) -> bool {
    Command::new(program)
        .args(args)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn check_preflight_tools() -> PreflightStatus {
    let git_installed = cli_succeeds("git", &["--version"]);
    let gh_installed = cli_succeeds("gh", &["--version"]);
    let glab_installed = cli_succeeds("glab", &["--version"]);

    // Auth probes only make sense once the CLI answered `--version`.
    let gh_authenticated = gh_installed && cli_succeeds("gh", &["auth", "status"]);
    let glab_authenticated = glab_installed && cli_succeeds("glab", &["auth", "status"]);

    PreflightStatus {
        git_installed,
        gh_installed,
        gh_authenticated,
        glab_installed,
        glab_authenticated,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_serializes_the_glab_contract_the_renderer_reads() {
        let json = serde_json::to_value(PreflightStatus {
            git_installed: true,
            gh_installed: true,
            gh_authenticated: false,
            glab_installed: true,
            glab_authenticated: true,
        })
        .expect("serialize preflight status");

        assert_eq!(json["glab_installed"], true);
        assert_eq!(json["glab_authenticated"], true);
        assert_eq!(json["gh_authenticated"], false);
    }

    #[test]
    fn missing_cli_is_reported_as_not_installed() {
        assert!(!cli_succeeds("hydra-preflight-definitely-missing-binary", &[]));
    }
}
