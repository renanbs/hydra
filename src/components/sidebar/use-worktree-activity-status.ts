// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-worktree-activity-status.ts
//
// D04b-008: the card's activity dot. Orca resolves it from live PTYs, runtime
// pane titles, terminal layouts and explicit agent rows. Hydra's live tab
// records are its own workbench tabs (title follows the shell/agent OSC title),
// and its persisted agent sessions are the rows the sidebar already paints, so
// the final state merges both readings instead of dropping either: an explicit
// agent row wins over the passive tab/PTY state, and the session reading fills
// in what the tab records cannot express.
import { useShallow } from 'zustand/react/shallow'

import { useAppStore } from '../../store'
import { resolveWorktreeStatus, type WorktreeStatus } from '../../lib/worktree-status'
import {
  pickDominantWorktreeStatus,
  workspaceStatusFrom
} from '../../lib/workspace-status-signals'
import type { AgentStatusEntry } from '../../shared/agent-status-types'
import type { TerminalPaneLayoutNode } from '../../shared/terminal-tab-types'
import type { TuiAgent } from '../../shared/tui-agent'
import type { WorktreeSession } from './types'
import { EMPTY_BROWSER_TABS, EMPTY_TABS } from './WorktreeCardHelpers'
import {
  selectLivePtyIdsForWorktree,
  selectRuntimePaneTitlesForWorktree,
  selectTerminalLayoutRootsForWorktree
} from './worktree-card-status-inputs'
import {
  selectWorktreeAgentActivitySummary,
  type WorktreeAgentActivitySummary
} from './worktree-agent-activity-summary'

/** The fields of a Hydra workbench tab the title heuristics read. */
export type WorktreeActivityTab = {
  id: string
  title: string
  launchAgent?: TuiAgent | null
}

/**
 * Store slice `resolveWorktreeStatus` needs. Declared structurally so the
 * selector can be exercised without the live store, and so every field the
 * summary cache reads is stated in one place.
 */
export type WorktreeActivityState = {
  tabsByWorktree?: Record<string, readonly WorktreeActivityTab[]>
  browserTabsByWorktree?: Record<string, readonly { id: string }[]>
  runtimePaneTitlesByTabId?: Record<string, Record<number, string>>
  ptyIdsByTabId?: Record<string, string[]>
  terminalLayoutsByTabId?: Record<string, { root: TerminalPaneLayoutNode | null } | undefined>
  agentStatusEpoch?: number
  agentStatusByPaneKey?: Record<string, AgentStatusEntry>
  migrationUnsupportedByPtyId?: Record<string, unknown>
  retainedAgentsByPaneKey?: Record<string, unknown>
  runtimeAgentOrchestrationByPaneKey?: Record<string, unknown>
}

/** Hydra-only reading of the same workspace, from its persisted sessions. */
export type WorktreeActivityFallback = {
  sessions: readonly WorktreeSession[]
  /** True while a terminal is still mounted for the workspace path. */
  hasLiveTerminal: boolean
}

/** What the activity summary cache accepts as its keyed state. */
type AgentActivityStateView = Parameters<typeof selectWorktreeAgentActivitySummary>[0]
/** What the per-worktree projections accept as their keyed state. */
type StatusInputStateView = Parameters<typeof selectLivePtyIdsForWorktree>[0]

function resolveSummaryStatus(
  state: WorktreeActivityState,
  worktreeId: string,
  summary: WorktreeAgentActivitySummary
): WorktreeStatus {
  const statusInputs = state as StatusInputStateView
  return resolveWorktreeStatus({
    tabs: (state.tabsByWorktree?.[worktreeId] ?? EMPTY_TABS) as never,
    browserTabs: (state.browserTabsByWorktree?.[worktreeId] ?? EMPTY_BROWSER_TABS) as never,
    ptyIdsByTabId: selectLivePtyIdsForWorktree(statusInputs, worktreeId),
    runtimePaneTitlesByTabId: selectRuntimePaneTitlesForWorktree(statusInputs, worktreeId),
    agentStatusPaneIdsByTabId: summary.agentStatusPaneIdsByTabId,
    stalePaneIdsByTabId: summary.stalePaneIdsByTabId,
    terminalLayoutRootsByTabId: selectTerminalLayoutRootsForWorktree(statusInputs, worktreeId),
    hasPermission: summary.hasPermission,
    hasLiveWorking: summary.hasLiveWorking,
    hasLiveMonitoring: summary.hasLiveMonitoring,
    hasInterrupted: summary.hasInterrupted,
    hasLiveDone: summary.hasLiveDone,
    hasRetainedDone: summary.hasRetainedDone
  })
}

/**
 * Activity status for one workspace: the Orca derivation over this workspace's
 * tab/PTY/layout inputs, reconciled with Hydra's session state so agents that
 * only exist as persisted sessions still paint permission/working/done.
 */
export function selectWorktreeActivityStatus(
  state: WorktreeActivityState,
  worktreeId: string,
  fallback?: WorktreeActivityFallback
): WorktreeStatus {
  const summary = selectWorktreeAgentActivitySummary(
    state as AgentActivityStateView,
    worktreeId
  )
  const resolved = resolveSummaryStatus(state, worktreeId, summary)
  return fallback
    ? pickDominantWorktreeStatus(
        resolved,
        workspaceStatusFrom({
          sessions: fallback.sessions,
          hasLiveTerminal: fallback.hasLiveTerminal,
          agentSummary: summary
        })
      )
    : resolved
}

/** The live store keys this module reads, in the shape the selectors expect. */
function activityStateFromStore(state: unknown): WorktreeActivityState {
  return state as WorktreeActivityState
}

export function useWorktreeActivityStatus(
  worktreeId: string,
  fallback?: WorktreeActivityFallback
): WorktreeStatus {
  return useAppStore((state) =>
    selectWorktreeActivityStatus(activityStateFromStore(state), worktreeId, fallback)
  )
}

/**
 * D04b-009: batch reading for the rows the sidebar is about to paint. The map is
 * rebuilt from the same inputs as the single selector, so a row's dot does not
 * depend on which entry point computed it.
 */
export function selectWorktreeActivityStatuses(
  state: WorktreeActivityState,
  worktreeIds: readonly string[],
  fallbacks?: ReadonlyMap<string, WorktreeActivityFallback>
): Map<string, WorktreeStatus> {
  const statuses = new Map<string, WorktreeStatus>()
  for (const worktreeId of worktreeIds) {
    statuses.set(worktreeId, selectWorktreeActivityStatus(state, worktreeId, fallbacks?.get(worktreeId)))
  }
  return statuses
}

/**
 * Batch hook with shallow map equality: a terminal update outside the monitored
 * candidates leaves every painted status — and the map identity — untouched.
 */
export function useWorktreeActivityStatuses(
  worktreeIds: readonly string[],
  fallbacks?: ReadonlyMap<string, WorktreeActivityFallback>
): Map<string, WorktreeStatus> {
  return useAppStore(
    useShallow((state) =>
      selectWorktreeActivityStatuses(activityStateFromStore(state), worktreeIds, fallbacks)
    )
  )
}
