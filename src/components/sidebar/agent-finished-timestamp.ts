// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// src/renderer/src/components/dashboard/agent-finished-timestamp.ts
import { agentEntryCompletionAt } from '../../shared/agent-completion-time'
import type { AgentRow } from './worktree-card-agent-summary'

/**
 * The moment an agent last entered `done`, or null if it never finished (still
 * working / idle without a prior completion). Shared by the left worktree
 * sidebar and the pop-out dashboard so both time from the SAME event: a finished
 * agent reads "N since it finished", an active one falls through to its start.
 */
export function lastEnteredDoneAt(
  agent: Pick<AgentRow, 'rowSource' | 'state' | 'entry'>
): number | null {
  // Why: a subagent's synthetic entry may say done while its row is idle or unverifiable.
  if (agent.rowSource === 'subagent' && agent.state !== 'done') {
    return null
  }
  const entry = agent.entry
  // Why: the sidebar entry's state union adds `idle`/`unknown`; the completion clock only
  // distinguishes `done`, so every other value maps to a non-done state.
  const completionState =
    entry.state === 'done'
      ? ('done' as const)
      : entry.state === 'blocked'
        ? ('blocked' as const)
        : entry.state === 'waiting'
          ? ('waiting' as const)
          : ('working' as const)
  // Why: same primitive Smart Sort ranks on, so the displayed age and Done eligibility share a clock.
  // (Session-boundary `done` means the session connected idle — STA-3386 — so it resolves to the real
  // completion it displaced, if any.)
  const completedAt = agentEntryCompletionAt({
    state: completionState,
    stateStartedAt: entry.stateStartedAt,
    stateHistory: entry.stateHistory ?? [],
    interrupted: entry.interrupted,
    sessionBoundary: entry.sessionBoundary
  })
  if (completedAt !== null) {
    return completedAt
  }
  // Why: display is looser than ranking — an interrupted turn still shows when it stopped.
  if (entry.state === 'done' && entry.interrupted === true && entry.sessionBoundary !== true) {
    return entry.stateStartedAt
  }
  const history = entry.stateHistory ?? []
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].state === 'done') {
      return history[i].startedAt
    }
  }
  return null
}
