use serde::{Deserialize, Serialize};

// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Orca: shared/agent-status-freshness.ts AGENT_STATUS_STALE_AFTER_MS.

/// Freshness TTL for hook-fed agent state (T8 "state doesn't lie forever").
/// Pins Orca's AGENT_STATUS_STALE_AFTER_MS (30 * 60 * 1000): the status stream
/// is hook-fed (Claude/Codex emit a hook per turn event), so silence means
/// "hook missed" and a held active state is released via decay_state only
/// after this long without a fresh hook transition. Buffer scraping is gone —
/// no working state is ever invented client-side; a session with no hook is
/// neutral `unknown`.
pub const AGENT_STATE_STALE_AFTER_MS: u64 = 30 * 60 * 1000;

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

/// Milliseconds since the UNIX epoch right now (0 on clock errors — a pre-epoch
/// timestamp can only come from a broken clock and always reads as "fresh",
/// the safe direction: never decays a genuinely active state early).
pub fn now_epoch_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
/// Decay a hook-fed state whose TTL has elapsed (T8). The "Unverifiable" visual
/// state of the sidebar plan maps to `AgentState::Unknown` + live PTY: the
/// process still exists but no hook has confirmed any state recently. It is NOT
/// a new serde variant — the `agent:state` wire contract stays the 6 known
/// strings, so the frontend never sees an unknown value. Semantics:
/// - Working/Waiting/Blocked held past the TTL: `Unknown` when the PTY is
///   alive (hook stream silent), `Idle` when it is dead (session is over).
/// - Done held past the TTL: `Idle` — Done is terminal, the next hook
///   transition rebuilds truth.
/// - Everything else (Idle/Unknown, or TTL not yet elapsed): pass through.
pub fn decay_state(last_state: AgentState, state_started_at: u64, now_ms: u64, pty_alive: bool) -> AgentState {
    match last_state {
        AgentState::Working | AgentState::Waiting | AgentState::Blocked
            if now_ms.saturating_sub(state_started_at) > AGENT_STATE_STALE_AFTER_MS =>
        {
            if pty_alive { AgentState::Unknown } else { AgentState::Idle }
        }
        AgentState::Done if now_ms.saturating_sub(state_started_at) > AGENT_STATE_STALE_AFTER_MS => {
            AgentState::Idle
        }
        _ => last_state,
    }
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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgentSubagentSnapshot {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub state: String,
    pub started_at: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgentDetailedStatus {
    pub session_id: String,
    pub state: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub working_mode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_input: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_assistant_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_pane_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub coordinator_handle: Option<String>,
    pub subagents: Vec<AgentSubagentSnapshot>,
    pub updated_at: u64,
}

/// Hook-fed detailed status (T8): the struct stays the `agent:state` detail bag,
/// but every field is filled from the hook payload — never from buffer
/// scraping. `state` pins the 6-string wire contract; callers pass the hook
/// transition's state (or `Unknown` when the session has no hook yet — never
/// an invented `working`). Detail fields ride verbatim from the sidecar's
/// `ParsedAgentStatusPayload` (`HookTransition`); absent payload means `None`
/// / empty roster.
pub fn extract_agent_detailed_status(
    session_id: &str,
    state: AgentState,
    tool_name: Option<String>,
    tool_input: Option<String>,
    last_assistant_message: Option<String>,
    subagents: Vec<AgentSubagentSnapshot>,
    coordinator_handle: Option<String>,
) -> AgentDetailedStatus {
    AgentDetailedStatus {
        session_id: session_id.to_string(),
        state: state.as_str().to_string(),
        working_mode: None,
        tool_name,
        tool_input,
        last_assistant_message,
        parent_pane_key: None,
        coordinator_handle,
        subagents,
        updated_at: now_epoch_ms(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_extract_agent_detailed_status_hook_fed() {
        // Hook-fed: payload do hook preenche os detalhes; sem payload = vazio.
        let status = extract_agent_detailed_status(
            "test-sess-1",
            AgentState::Working,
            Some("Bash".to_string()),
            Some("ls -la".to_string()),
            Some("Checking the failures.".to_string()),
            Vec::new(),
            None,
        );
        assert_eq!(status.session_id, "test-sess-1");
        assert_eq!(status.state, "working");
        assert_eq!(status.tool_name.as_deref(), Some("Bash"));
        assert_eq!(status.tool_input.as_deref(), Some("ls -la"));
        assert_eq!(status.last_assistant_message.as_deref(), Some("Checking the failures."));
        assert!(status.subagents.is_empty());
        assert_eq!(status.coordinator_handle, None);
    }

    #[test]
    fn test_extract_agent_detailed_status_no_hook_is_neutral() {
        // Sem hook na sessão = unknown neutro: nenhum working inventado.
        let status = extract_agent_detailed_status(
            "test-sess-2",
            AgentState::Unknown,
            None,
            None,
            None,
            Vec::new(),
            None,
        );
        assert_eq!(status.state, "unknown");
        assert_eq!(status.tool_name, None);
        assert!(status.subagents.is_empty());
    }

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

    // ─── Hook-fed freshness TTL (T8): decay_state over hook transitions ──

    #[test]
    fn test_decay_state_active_past_ttl() {
        let started = 1_000u64;
        let now = started + AGENT_STATE_STALE_AFTER_MS + 1;

        // PTY vivo → Unknown (o "Unverifiable" visual do plano: processo existe,
        // nenhum hook confirmou estado recentemente)
        assert_eq!(decay_state(AgentState::Working, started, now, true), AgentState::Unknown);
        assert_eq!(decay_state(AgentState::Waiting, started, now, true), AgentState::Unknown);
        assert_eq!(decay_state(AgentState::Blocked, started, now, true), AgentState::Unknown);

        // PTY morto → Idle (sessão acabou; não há processo para verificar)
        assert_eq!(decay_state(AgentState::Working, started, now, false), AgentState::Idle);
        assert_eq!(decay_state(AgentState::Waiting, started, now, false), AgentState::Idle);
        assert_eq!(decay_state(AgentState::Blocked, started, now, false), AgentState::Idle);
    }

    #[test]
    fn test_decay_state_within_ttl_keeps_state() {
        let started = 1_000u64;
        // Bem dentro do TTL → mantém
        assert_eq!(
            decay_state(AgentState::Working, started, started + AGENT_STATE_STALE_AFTER_MS, true),
            AgentState::Working
        );
        assert_eq!(
            decay_state(AgentState::Blocked, started, started + 1_000, false),
            AgentState::Blocked
        );
        // Exatamente no limiar (> estrito): 30min inteiros ainda é "fresco"
        assert_eq!(
            decay_state(AgentState::Working, started, started + AGENT_STATE_STALE_AFTER_MS, true),
            AgentState::Working
        );
    }

    #[test]
    fn test_decay_state_done_and_inactive_passthrough() {
        let started = 1_000u64;
        let now = started + AGENT_STATE_STALE_AFTER_MS + 1;

        // Done é terminal: decai para Idle após o TTL
        assert_eq!(decay_state(AgentState::Done, started, now, true), AgentState::Idle);
        assert_eq!(decay_state(AgentState::Done, started, now, false), AgentState::Idle);
        // Done dentro do TTL permanece Done
        assert_eq!(
            decay_state(AgentState::Done, started, started + 1_000, true),
            AgentState::Done
        );

        // Idle/Unknown passam through mesmo após o TTL (não há estado a mentir)
        assert_eq!(decay_state(AgentState::Idle, started, now, true), AgentState::Idle);
        assert_eq!(decay_state(AgentState::Unknown, started, now, true), AgentState::Unknown);
    }

    #[test]
    fn test_decay_state_clock_rollback_is_safe() {
        // now antes de state_started_at (clock rollback/restart): saturating_sub
        // → 0, nunca decai. Pre-epoch (broken clock) idem.
        assert_eq!(
            decay_state(AgentState::Working, 5_000, 1_000, true),
            AgentState::Working
        );
        assert_eq!(
            decay_state(AgentState::Working, 1, 0, true),
            AgentState::Working
        );
    }

    #[test]
    fn test_now_epoch_ms_sane() {
        let now = now_epoch_ms();
        // Século XXI em ms: qualquer clock razoável está acima disso; um valor
        // menor só pode ser clock quebrado (o helper retorna o que houver, o
        // caller trata 0 como "sempre fresco").
        assert!(now == 0 || now > 946_684_800_000, "now_epoch_ms should be a plausible epoch ms: {now}");
    }
    #[test]
    fn test_hook_ttl_is_thirty_minutes() {
        assert_eq!(
            AGENT_STATE_STALE_AFTER_MS,
            30 * 60 * 1000,
            "hook-fed TTL pins Orca AGENT_STATUS_STALE_AFTER_MS parity"
        );
    }
}
