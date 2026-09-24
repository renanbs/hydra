use serde::{Deserialize, Serialize};

// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Orca: shared/agent-status-freshness.ts AGENT_STATUS_STALE_AFTER_MS.

/// Freshness TTL for buffer-scraped agent state (PR-6 "state doesn't lie forever").
/// Orca's AGENT_STATUS_STALE_AFTER_MS is 30 * 60 * 1000 because its status stream is
/// hook-fed (Claude/Codex emit a hook per turn event), so silence means "hook missed".
/// Hydra's detection scrapes the vt100 buffer: the last matched pattern is not
/// re-confirmed on subsequent chunks, so a stale frame keeps asserting "working"
/// long after the agent died. Hence a much more aggressive TTL: after this long
/// without a fresh match, decay_state releases the held state.
pub const AGENT_STATE_STALE_AFTER_MS: u64 = 90_000;

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

/// Decay a state whose TTL has elapsed. The "Unverifiable" visual state of the
/// sidebar plan (PR-7 frontend) maps to `AgentState::Unknown` + live PTY: the
/// process still exists but the buffer no longer proves any state. It is NOT a
/// new serde variant — the `agent:state` wire contract stays the 6 known
/// strings, so the frontend never sees an unknown value. Semantics:
/// - Working/Waiting/Blocked held past the TTL: `Unknown` when the PTY is
///   alive (stream silent), `Idle` when it is dead (session is over).
/// - Done held past the TTL: `Idle` — Done is terminal, the next fresh
///   detection rebuilds truth from the buffer.
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

/// Detection with freshness decay (PR-6): classify the current buffer against the
/// previous state, then hold-or-release the held state.
///
/// Hold: a frame that matches NO explicit pattern (`matched == false`) is not
/// evidence the agent finished — a full-screen redraw or scroll can transiently
/// hide the pattern. Within the TTL the previous active state is kept as-is
/// (a matched re-detection still counts as fresh evidence, renewing its own
/// TTL via the caller's state_started_at update).
///
/// Release: once the TTL elapses, the stale active state is dropped via
/// decay_state (Unknown with a live PTY / Idle without one). A matched
/// detection always wins over decay — it IS the fresh evidence.
///
/// Inactive previous states (Idle/Unknown) keep the core's own no-match
/// reading: their fallbacks ARE the correct answer, so overwriting them with
/// `previous` would freeze a session in `unknown` forever even when the
/// buffer clearly shows an idle prompt.
pub fn detect_with_decay(
    screen_text: &str,
    previous: AgentState,
    state_started_at: u64,
    now_ms: u64,
    pty_alive: bool,
) -> AgentStateDetection {
    let detection = detect_agent_state_detection(screen_text, Some(previous));
    if detection.matched {
        return detection;
    }
    match previous {
        AgentState::Working | AgentState::Waiting | AgentState::Blocked | AgentState::Done => {
            let decayed = decay_state(previous, state_started_at, now_ms, pty_alive);
            AgentStateDetection { state: decayed, matched: false }
        }
        AgentState::Idle | AgentState::Unknown => detection,
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

    // ─── PR-6: freshness TTL + decay_state + detect_with_decay ──────────────

    #[test]
    fn test_decay_state_active_past_ttl() {
        let started = 1_000u64;
        let now = started + AGENT_STATE_STALE_AFTER_MS + 1;

        // PTY vivo → Unknown (o "Unverifiable" visual do plano: processo existe,
        // buffer não prova nada)
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
        // Exatamente no limiar (> estrito): 90s inteiros ainda é "fresco"
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
    fn test_detect_with_decay_matched_wins_and_renews() {
        let started = 1_000u64;

        // matched=true dentro do TTL: o mesmo estado volta, matched preservado
        let det = detect_with_decay("Compiling hydra-core", AgentState::Working, started, started + 10_000, true);
        assert_eq!(det.state, AgentState::Working);
        assert!(det.matched);

        // matched=true MESMO após o TTL vence o decay: evidência fresca é fresca
        let det_stale = detect_with_decay(
            "Compiling hydra-core",
            AgentState::Working,
            started,
            started + AGENT_STATE_STALE_AFTER_MS + 10_000,
            true,
        );
        assert_eq!(det_stale.state, AgentState::Working);
        assert!(det_stale.matched);

        // Transição real matched: Working → prompt pronto = Done (matched)
        let det_done = detect_with_decay(
            "~ $",
            AgentState::Working,
            started,
            started + 10_000,
            true,
        );
        assert_eq!(det_done.state, AgentState::Done);
        assert!(det_done.matched);
    }

    #[test]
    fn test_detect_with_decay_holds_within_ttl() {
        let started = 1_000u64;
        // Frame sem padrão dentro do TTL → mantém o estado ativo (hold),
        // matched=false (não é evidência nova)
        let det = detect_with_decay("some redraw noise", AgentState::Working, started, started + 10_000, true);
        assert_eq!(det.state, AgentState::Working);
        assert!(!det.matched);

        let det_blocked = detect_with_decay("redraw", AgentState::Blocked, started, started + 60_000, false);
        assert_eq!(det_blocked.state, AgentState::Blocked);
        assert!(!det_blocked.matched);
    }

    #[test]
    fn test_detect_with_decay_releases_after_ttl() {
        let started = 1_000u64;
        let now = started + AGENT_STATE_STALE_AFTER_MS + 1;

        // matched=false + TTL expirado: decai — Unknown com PTY vivo, Idle com morto
        let det_alive = detect_with_decay("some redraw noise", AgentState::Working, started, now, true);
        assert_eq!(det_alive.state, AgentState::Unknown);
        assert!(!det_alive.matched);

        let det_dead = detect_with_decay("some redraw noise", AgentState::Working, started, now, false);
        assert_eq!(det_dead.state, AgentState::Idle);
        assert!(!det_dead.matched);

        let det_waiting = detect_with_decay("redraw", AgentState::Waiting, started, now, true);
        assert_eq!(det_waiting.state, AgentState::Unknown);

        let det_done = detect_with_decay("redraw", AgentState::Done, started, now, true);
        assert_eq!(det_done.state, AgentState::Idle);
    }

    #[test]
    fn test_detect_with_decay_inactive_passthrough() {
        let started = 1_000u64;
        let now = started + AGENT_STATE_STALE_AFTER_MS + 1;

        // Previous Idle/Unknown em frame sem padrão: passa through (o fallback
        // de detecção normal já responde a leitura correta)
        let det = detect_with_decay("user@host $", AgentState::Idle, started, now, true);
        assert_eq!(det.state, AgentState::Idle);
        assert!(!det.matched);

        let det_unknown = detect_with_decay("some random text", AgentState::Unknown, started, now, true);
        assert_eq!(det_unknown.state, AgentState::Unknown);
        assert!(!det_unknown.matched);

        // Regression: a sessão que já decaiu para Unknown precisa escapar dele
        // quando o buffer volta a mostrar um prompt pronto — a leitura do core
        // (Idle) vence, o previous NÃO é seguro (senão `unknown` grudaria para
        // sempre apesar do prompt visível).
        let det_escaped = detect_with_decay("user@host $", AgentState::Unknown, started, now, true);
        assert_eq!(det_escaped.state, AgentState::Idle);
        assert!(!det_escaped.matched);

        // Idem para previous Idle: prompt comum continua Idle (nunca vira hold)
        let det_idle_prompt = detect_with_decay("user@host $", AgentState::Idle, started, now, false);
        assert_eq!(det_idle_prompt.state, AgentState::Idle);
    }

    #[test]
    fn test_now_epoch_ms_sane() {
        let now = now_epoch_ms();
        // Século XXI em ms: qualquer clock razoável está acima disso; um valor
        // menor só pode ser clock quebrado (o helper retorna o que houver, o
        // caller trata 0 como "sempre fresco").
        assert!(now == 0 || now > 946_684_800_000, "now_epoch_ms should be a plausible epoch ms: {now}");
    }
}
