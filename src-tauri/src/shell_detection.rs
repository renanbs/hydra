use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvailableShell {
    pub id: String,       // executable name e.g. "bash"
    pub path: String,     // full path e.g. "/usr/bin/bash"
    pub label: String,    // display label e.g. "Bash (/usr/bin/bash)"
}

fn which_shell(name: &str) -> Option<String> {
    // Try PATH lookup via `which` crate logic: check binary in PATH
    if let Ok(path) = which::which(name) {
        return Some(path.to_string_lossy().to_string());
    }
    // Fallback: check common absolute paths
    for p in [format!("/usr/bin/{name}"), format!("/bin/{name}"), format!("/usr/local/bin/{name}") ] {
        if std::path::Path::new(&p).exists() {
            return Some(p);
        }
    }
    None
}
pub fn get_system_default_shell() -> AvailableShell {
    if let Ok(shell_path) = std::env::var("SHELL") {
        let p = std::path::Path::new(&shell_path);
        if p.exists() {
            let name = p.file_name().and_then(|s| s.to_str()).unwrap_or("bash");
            return AvailableShell {
                id: name.to_string(),
                path: shell_path.clone(),
                label: format!("{} ({})", match name {
                    "bash" => "Bash",
                    "zsh" => "Zsh",
                    "fish" => "Fish",
                    "nu" => "Nushell",
                    "sh" => "POSIX sh",
                    _ => name,
                }, shell_path),
            };
        }
    }
    for name in ["zsh", "bash", "sh"] {
        if let Some(path) = which_shell(name) {
            return AvailableShell {
                id: name.to_string(),
                path: path.clone(),
                label: format!("{} ({})", name, path),
            };
        }
    }
    AvailableShell {
        id: "bash".to_string(),
        path: "/bin/bash".to_string(),
        label: "Bash (/bin/bash)".to_string(),
    }
}


pub fn list_available_shells() -> Vec<AvailableShell> {
    let candidates = ["bash", "zsh", "fish", "nu", "sh", "dash", "powershell", "pwsh", "elvish", "xonsh"];
    let mut shells = Vec::new();
    for name in candidates {
        if let Some(path) = which_shell(name) {
            shells.push(AvailableShell {
                id: name.to_string(),
                path: path.clone(),
                label: format!("{} ({})", match name {
                    "bash" => "Bash",
                    "zsh" => "Zsh",
                    "fish" => "Fish",
                    "nu" => "Nushell",
                    "sh" => "POSIX sh",
                    "dash" => "Dash",
                    "powershell" => "PowerShell",
                    "pwsh" => "PowerShell Core",
                    "elvish" => "Elvish",
                    "xonsh" => "Xonsh",
                    _ => name,
                }, path),
            });
        }
    }
    // Also check /etc/shells for additional shells not in candidates
    if let Ok(content) = std::fs::read_to_string("/etc/shells") {
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') { continue; }
            if let Some(fname) = std::path::Path::new(line).file_name().and_then(|s| s.to_str()) {
                if !candidates.contains(&fname) && std::path::Path::new(line).exists() {
                    // Use which to avoid duplicates
                    if !shells.iter().any(|s| s.path == line) {
                        shells.push(AvailableShell {
                            id: fname.to_string(),
                            path: line.to_string(),
                            label: format!("{} ({})", fname, line),
                        });
                    }
                }
            }
        }
    }
    // Deduplicate by id, keep first
    let mut seen = std::collections::HashSet::new();
    shells.retain(|s| seen.insert(s.id.clone()));
    shells.sort_by(|a,b| a.id.cmp(&b.id));
    shells
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_available_shells() {
        let shells = list_available_shells();
        assert!(!shells.is_empty(), "Should discover at least one system shell (e.g. sh or bash)");
        assert!(shells.iter().any(|s| s.id == "bash" || s.id == "sh"), "Should discover bash or sh");
    }
}
