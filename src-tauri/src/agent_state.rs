use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentState {
    /// Agente executando comandos, compilando ou gerando código.
    Working,
    /// Agente bloqueado aguardando autorização de tool ou confirmação humana.
    Blocked,
    /// Agente aguardando resposta a uma pergunta aberta (sem confirmação y/n).
    Waiting,
    /// Agente ocioso: prompt pronto, sem tarefa ativa associada.
    Idle,
    /// Agente concluiu a tarefa: transição de estado ativo para prompt pronto.
    Done,
    /// Prompt de shell comum ou estado não reconhecido.
    Unknown,
}

impl AgentState {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Working => "working",
            Self::Blocked => "blocked",
            Self::Waiting => "waiting",
            Self::Idle => "idle",
            Self::Done => "done",
            Self::Unknown => "unknown",
        }
    }
}

/// Resultado da detecção de estado: `matched` é `true` apenas quando um padrão
/// explícito bateu (Blocked/Waiting/Working/Done); os fallbacks de prompt comum
/// (Idle) e não reconhecido (Unknown) reportam `false`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgentStateDetection {
    pub state: AgentState,
    pub matched: bool,
}

/// Analisa as linhas do buffer vt100 (Herdr strategy) para classificar o estado
/// do agente, com semântica de transição: `Done` só é reportado quando um estado
/// ativo anterior (Working/Waiting/Blocked) viu o prompt voltar pronto.
/// Ordem de precedência: Blocked → Waiting → Working → Done/Idle → Unknown.
pub fn detect_agent_state_detection(
    screen_text: &str,
    previous_state: Option<AgentState>,
) -> AgentStateDetection {
    let lines: Vec<&str> = screen_text
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();

    if lines.is_empty() {
        return AgentStateDetection { state: AgentState::Idle, matched: false };
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
        || tail.contains("allow this action")
    {
        return AgentStateDetection { state: AgentState::Blocked, matched: true };
    }

    // 2. Padrões de estado AGUARDANDO INPUT (pergunta aberta do agente, sem
    // confirmação y/n — avaliados após Blocked: quem traz y/n/approve é bloqueio)
    if tail.contains("waiting for your input")
        || tail.contains("waiting for")
        || tail.contains("do you want")
    {
        return AgentStateDetection { state: AgentState::Waiting, matched: true };
    }

    // 3. Padrões de estado TRABALHANDO (Compilação, Download, Execução ativa e
    // spinners de título dos agentes — ✳ ✢ • ✶ ✻ ✽ — e o dwim do Codex)
    if tail.contains("compiling ")
        || tail.contains("building ")
        || tail.contains("downloading ")
        || tail.contains("running ")
        || tail.contains("thinking...")
        || tail.contains("progress:")
        || tail.contains("fetching ")
        || tail.contains('✳')
        || tail.contains('✢')
        || tail.contains('•')
        || tail.contains('✶')
        || tail.contains('✻')
        || tail.contains('✽')
        || tail.contains("dwim")
    {
        return AgentStateDetection { state: AgentState::Working, matched: true };
    }

    // 4. Prompt pronto: conclusão por transição (estado ativo → prompt) ou
    // apenas um prompt comum. Os retornos acima já garantem que um tail que
    // chega aqui não contém padrão working/blocked/waiting.
    if tail.ends_with('$') || tail.ends_with('#') || tail.ends_with('>') || tail.ends_with('%') {
        return match previous_state {
            Some(AgentState::Working) | Some(AgentState::Waiting) | Some(AgentState::Blocked) => {
                AgentStateDetection { state: AgentState::Done, matched: true }
            }
            _ => AgentStateDetection { state: AgentState::Idle, matched: false },
        };
    }

    AgentStateDetection { state: AgentState::Unknown, matched: false }
}

/// Assinatura histórica preservada para os callers existentes (terminal.rs,
/// lib.rs) — sem estado anterior conhecido, `Done` nunca dispara.
pub fn detect_agent_state(screen_text: &str) -> AgentState {
    detect_agent_state_detection(screen_text, None).state
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
    fn test_detect_blocked_patterns() {
        // [y/n] clássico
        let text = "Run cargo build? [y/n]";
        assert_eq!(detect_agent_state_detection(text, None).state, AgentState::Blocked);

        // Approve + deny juntos (tool approval)
        let text2 = "Allow command? [1] Approve [2] Deny";
        assert_eq!(detect_agent_state_detection(text2, None).state, AgentState::Blocked);

        // "do you want to continue" é blocked (não waiting)
        let text3 = "Do you want to continue?";
        assert_eq!(detect_agent_state_detection(text3, None).state, AgentState::Blocked);
    }

    #[test]
    fn test_detect_waiting_patterns() {
        let text = "Waiting for your input...";
        let det = detect_agent_state_detection(text, None);
        assert_eq!(det.state, AgentState::Waiting);
        assert!(det.matched);

        // "waiting for" genérico (Droid: "Droid is waiting for your input")
        let text2 = "Droid is waiting for your input";
        assert_eq!(detect_agent_state_detection(text2, None).state, AgentState::Waiting);

        // "do you want" (sem y/n) é waiting
        let text3 = "Do you want to add tests for this?";
        assert_eq!(detect_agent_state_detection(text3, None).state, AgentState::Waiting);
    }

    #[test]
    fn test_detect_working_patterns() {
        // Compiling clássico
        assert_eq!(
            detect_agent_state_detection("Compiling serde v1.0.219", None).state,
            AgentState::Working
        );

        // Spinner ✳ (glyph de título do Claude) conta como working
        assert_eq!(
            detect_agent_state_detection("✳ dry-run", None).state,
            AgentState::Working
        );

        // dwim (Codex) conta como working
        assert_eq!(
            detect_agent_state_detection("dwim", None).state,
            AgentState::Working
        );
    }

    #[test]
    fn test_detect_done_requires_active_previous_state() {
        // Done via transição: Working → prompt pronto
        let det = detect_agent_state_detection("~ $", Some(AgentState::Working));
        assert_eq!(det.state, AgentState::Done);
        assert!(det.matched);

        // Mesma transição a partir de Waiting e Blocked
        assert_eq!(
            detect_agent_state_detection("~ $", Some(AgentState::Waiting)).state,
            AgentState::Done
        );
        assert_eq!(
            detect_agent_state_detection("~ $", Some(AgentState::Blocked)).state,
            AgentState::Done
        );

        // Mesmo tail SEM previous_state → Idle (prompt comum), não Done
        let det2 = detect_agent_state_detection("~ $", None);
        assert_eq!(det2.state, AgentState::Idle);
        assert!(!det2.matched);

        // Previous Idle também não promove para Done
        assert_eq!(
            detect_agent_state_detection("~ $", Some(AgentState::Idle)).state,
            AgentState::Idle
        );
    }

    #[test]
    fn test_detect_done_not_with_working_tail() {
        // Tail ainda mostra compilação ativa → Working, nunca Done
        let det = detect_agent_state_detection("Compiling serde", Some(AgentState::Working));
        assert_eq!(det.state, AgentState::Working);
        assert!(det.matched);
    }

    #[test]
    fn test_detect_unknown_fallback() {
        let text = "some random text";
        let det = detect_agent_state_detection(text, None);
        assert_eq!(det.state, AgentState::Unknown);
        assert!(!det.matched);

        // Unknown com previous_state ativo também não vira Done
        let det2 = detect_agent_state_detection(text, Some(AgentState::Working));
        assert_eq!(det2.state, AgentState::Unknown);
    }

    #[test]
    fn test_as_str_covers_all_states() {
        assert_eq!(AgentState::Working.as_str(), "working");
        assert_eq!(AgentState::Blocked.as_str(), "blocked");
        assert_eq!(AgentState::Waiting.as_str(), "waiting");
        assert_eq!(AgentState::Idle.as_str(), "idle");
        assert_eq!(AgentState::Done.as_str(), "done");
        assert_eq!(AgentState::Unknown.as_str(), "unknown");
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
