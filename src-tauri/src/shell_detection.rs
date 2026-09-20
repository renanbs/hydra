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
