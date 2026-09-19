use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AvailableAgent {
    pub id: String,
    pub name: String,
    pub executable: String,
    pub is_installed: bool,
}

pub fn probe_available_agents() -> Vec<AvailableAgent> {
    let candidates = vec![
        ("claude", "Claude Code", "claude"),
        ("codex", "Codex CLI", "codex"),
        ("cursor", "Cursor CLI", "cursor"),
        ("omp", "Oh My Pi (OMP)", "omp"),
        ("opencode", "OpenCode CLI", "opencode"),
        ("goose", "Goose CLI", "goose"),
        ("gemini", "Gemini CLI", "gemini"),
        ("bash", "Plain Bash Shell", "bash"),
    ];

    candidates
        .into_iter()
        .map(|(id, name, bin)| {
            let is_installed = is_binary_in_path(bin);
            AvailableAgent {
                id: id.to_string(),
                name: name.to_string(),
                executable: bin.to_string(),
                is_installed,
            }
        })
        .collect()
}

fn is_binary_in_path(bin: &str) -> bool {
    if bin == "bash" {
        return true;
    }
    Command::new("which")
        .arg(bin)
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false)
}
