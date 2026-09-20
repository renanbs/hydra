use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentState {
    /// Agente executando comandos, compilando ou gerando código.
    Working,
    /// Agente bloqueado aguardando autorização de tool ou confirmação humana.
    Blocked,
    /// Agente terminou a tarefa e está ocioso.
    Idle,
    /// Prompt de shell comum ou estado não reconhecido.
    Unknown,
}

impl AgentState {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Working => "working",
            Self::Blocked => "blocked",
            Self::Idle => "idle",
            Self::Unknown => "unknown",
        }
    }
}

/// Analisa as linhas do buffer vt100 (Herdr strategy) para classificar o estado do agente
pub fn detect_agent_state(screen_text: &str) -> AgentState {
    let lines: Vec<&str> = screen_text
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();

    if lines.is_empty() {
        return AgentState::Idle;
    }

    // Analisa as últimas 15 linhas (zona ativa do terminal)
    let tail_lines = if lines.len() > 15 {
        &lines[lines.len() - 15..]
    } else {
        &lines[..]
    };
    let tail = tail_lines.join("\n").to_lowercase();

    // 1. Padrões de estado BLOQUEADO (Human-in-the-loop / Tool Approval)
    if tail.contains("[y/n]") 
        || tail.contains("(y/n)")
        || tail.contains("allow this command?")
        || tail.contains("approve") && tail.contains("deny")
        || tail.contains("press enter to continue")
        || tail.contains("do you want to continue")
        || tail.contains("permission denied") && tail.contains("retry?")
        || tail.contains("select an option")
    {
        return AgentState::Blocked;
    }

    // 2. Padrões de estado TRABALHANDO (Compilação, Download, Execução ativa)
    if tail.contains("compiling ")
        || tail.contains("building ")
        || tail.contains("downloading ")
        || tail.contains("running ")
        || tail.contains("thinking...")
        || tail.contains("progress:")
        || tail.contains("fetching ")
    {
        return AgentState::Working;
    }

    // 3. Padrão de prompt pronto / Ocioso
    if tail.ends_with('$') || tail.ends_with('#') || tail.ends_with('>') || tail.ends_with('%') {
        return AgentState::Idle;
    }

    AgentState::Unknown
}

/// Mecanismo de Log Folding: resume saídas gigantes de terminal para poupar tokens de LLM
pub fn fold_terminal_output(raw_text: &str, max_lines: usize) -> String {
    let lines: Vec<&str> = raw_text.lines().collect();
    if lines.len() <= max_lines {
        return raw_text.to_string();
    }

    let head_count = max_lines / 3;
    let tail_count = max_lines - head_count;
    let omitted_count = lines.len() - head_count - tail_count;

    let mut result = Vec::new();
    result.extend_from_slice(&lines[..head_count]);
    result.push("");
    let fold_notice = format!("--- [LOG FOLDING: {} linhas omitidas para economia de tokens] ---", omitted_count);
    result.push(&fold_notice);
    result.push("");
    result.extend_from_slice(&lines[lines.len() - tail_count..]);

    result.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_state_blocked() {
        let text = "Would you like to run `cargo test`? [y/N]";
        assert_eq!(detect_agent_state(text), AgentState::Blocked);

        let text2 = "Tool bash wants to execute `rm -rf target`. Allow this command?";
        assert_eq!(detect_agent_state(text2), AgentState::Blocked);
    }

    #[test]
    fn test_detect_state_working() {
        let text = "Compiling serde_json v1.0.151\nBuilding hydra-core...";
        assert_eq!(detect_agent_state(text), AgentState::Working);

        let text2 = "Agent thinking...\nDownloading dependencies...";
        assert_eq!(detect_agent_state(text2), AgentState::Working);
    }

    #[test]
    fn test_detect_state_idle() {
        let text = "user@workstation:~/hydra $";
        assert_eq!(detect_agent_state(text), AgentState::Idle);

        let text_empty = "";
        assert_eq!(detect_agent_state(text_empty), AgentState::Idle);
    }

    #[test]
    fn test_fold_terminal_output() {
        let raw = (1..=100).map(|i| format!("line {i}")).collect::<Vec<_>>().join("\n");
        let folded = fold_terminal_output(&raw, 30);
        assert!(folded.contains("LOG FOLDING"));
        assert!(folded.contains("line 1"));
        assert!(folded.contains("line 100"));

        // Small output should not be folded
        let short = "line 1\nline 2\nline 3";
        assert_eq!(fold_terminal_output(short, 10), short);
    }
}
