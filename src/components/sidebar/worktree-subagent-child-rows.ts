// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-subagent-child-rows.ts
import type { AgentRowState } from '../../lib/agent-row-decay-state'
import type { AgentStatusEntry } from '../../shared/agent-status-types'
import { resolveAgentChildWorkFreshness } from '../../shared/agent-status-child-work-freshness'
import type { TerminalTab } from '../../shared/terminal-tab-types'
import type { WorktreeAgentRow } from './worktree-agent-row-types'
import { worktreeAgentTabSessionId } from './worktree-agent-row-types'

/** Row-identity key for an in-process subagent child row. The NUL separator
 *  cannot appear in real pane keys, so synthetic keys can never collide with
 *  one. Never parsed back — activation goes through `activationPaneKey` /
 *  `orchestration.parentPaneKey` instead. */
function subagentRowKey(parentPaneKey: string, subagentId: string): string {
  return `${parentPaneKey}\u0000subagent:${subagentId}`
}

/**
 * Derive indented child rows for the live in-process subagents/teammates a
 * pane's agent has spawned (entry.subagents, reported via agent hooks). These
 * children have no PTY or tab of their own: the rows reuse the parent's tab,
 * activate the parent's pane, and link into the existing lineage tree through
 * `orchestration.parentPaneKey`.
 */
export function buildSubagentChildRows(args: {
  parentEntry: AgentStatusEntry
  tab: TerminalTab
  /** Freshness of the parent's hook stream. A stale parent means active child
   *  states are equally unverifiable. */
  parentIsFresh: boolean
}): WorktreeAgentRow[] {
  const subagents = args.parentEntry.subagents
  if (!subagents || subagents.length === 0) {
    return []
  }
  return subagents.map((subagent) => {
    const freshness = resolveAgentChildWorkFreshness({
      state: subagent.state,
      membership: 'live',
      parentEvidenceFresh: args.parentIsFresh,
      transportObservation: args.parentEntry.subagentObservation ?? 'live'
    })
    const state: AgentRowState =
      freshness === 'done'
        ? 'idle'
        : freshness === 'monitoring'
          ? 'working'
          : (freshness as AgentRowState)
    const activeState = state !== 'idle' && state !== 'unverifiable' ? state : undefined
    const startedAt = subagent.startedAt > 0 ? subagent.startedAt : args.parentEntry.stateStartedAt
    const paneKey = subagentRowKey(args.parentEntry.paneKey, subagent.id)
    const entry: AgentStatusEntry = {
      state: activeState ?? 'done',
      prompt: subagent.description ?? subagent.agentType ?? '',
      updatedAt: args.parentEntry.updatedAt,
      stateStartedAt: startedAt,
      agentType: subagent.agentType,
      model: subagent.model,
      paneKey,
      worktreeId: args.parentEntry.worktreeId,
      tabId: args.parentEntry.tabId,
      stateHistory: [],
      orchestration: {
        taskId: `subagent:${subagent.id}`,
        dispatchId: `subagent:${subagent.id}`,
        displayName: subagent.description,
        parentPaneKey: args.parentEntry.paneKey
      }
    }
    return {
      paneKey,
      entry,
      tab: args.tab,
      agentType: subagent.agentType ?? 'unknown',
      rowSource: 'subagent',
      state,
      activationPaneKey: args.parentEntry.paneKey,
      sessionId: worktreeAgentTabSessionId(args.tab),
      startedAt
    }
  })
}
