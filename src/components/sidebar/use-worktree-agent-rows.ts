// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/useWorktreeAgentRows.ts
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store'
import { migrationUnsupportedToAgentStatusEntry } from '../../lib/migration-unsupported-agent-entry'
import { applyAgentRowLineage } from './agent-row-lineage'
import {
  EMPTY_LIVE_PTY_IDS,
  EMPTY_RUNTIME_PANE_TITLES,
  selectLivePtyIdsForWorktree,
  selectRuntimePaneTitlesForWorktree
} from './worktree-card-status-inputs'
import { EMPTY_TABS } from '../../store'
import { buildWorktreeAgentRows } from './worktree-agent-rows'
import {
  EMPTY_LIVE_ENTRIES,
  EMPTY_MIGRATION_UNSUPPORTED_ENTRIES,
  EMPTY_RETAINED,
  EMPTY_TERMINAL_LAYOUTS,
  selectLiveAgentStatusEntriesForWorktree,
  selectMigrationUnsupportedEntriesForWorktree,
  selectRuntimeAgentOrchestrationForWorktree,
  selectRetainedAgentEntriesForWorktree,
  selectTerminalLayoutsForWorktree
} from './worktree-agent-row-selectors'
import { EMPTY_WORKTREE_AGENT_ORCHESTRATION } from './worktree-agent-orchestration-index'
import {
  createWorktreeAgentFreshnessSelector,
  EMPTY_WORKTREE_AGENT_FRESHNESS_SIGNATURE
} from './worktree-agent-freshness-selector'
import type { WorktreeAgentRowWithLineage, WorktreeAgentTabInput } from './worktree-agent-row-types'
import type { AgentStatusEntry } from '../../shared/agent-status-types'
import type { RetainedAgentEntry } from '../../store/slices/agent-status-contract'

/** The slices this hook actually reads; the composed store type is intentionally
 *  widened by the UI-slice stub, so this keeps the selectors checked. */
type AgentRowsStoreView = {
  tabsByWorktree: Record<string, WorktreeAgentTabInput[]>
  agentStatusByPaneKey: Record<string, AgentStatusEntry>
  retainedAgentsByPaneKey: Record<string, RetainedAgentEntry>
}

// Why frozen: shared by every inactive card, and callers only read these rows.
const EMPTY_AGENT_ROWS = Object.freeze([]) as unknown as WorktreeAgentRowWithLineage[]

export { buildWorktreeAgentRows } from './worktree-agent-rows'
export {
  selectLiveAgentStatusEntriesForWorktree,
  selectMigrationUnsupportedEntriesForWorktree,
  selectRuntimeAgentOrchestrationForWorktree,
  selectRetainedAgentEntriesForWorktree
} from './worktree-agent-row-selectors'

/**
 * Narrow per-worktree agent row hook used by the WorktreeCard inline agents
 * list. Produces live hook-reported agents plus retained "done" snapshots,
 * stale-decayed to 'idle' when the hook stream has gone quiet.
 *
 * Uses indexed per-worktree selectors rather than a cross-worktree aggregate.
 * The index is rebuilt once per relevant immutable store slice and then shared
 * by every visible card, avoiding O(cards × agents) selector work on
 * high-frequency agent status pings.
 */
export function useWorktreeAgentRows(
  worktreeId: string,
  active = true
): WorktreeAgentRowWithLineage[] {
  const selectAgentFreshness = useMemo(
    () => createWorktreeAgentFreshnessSelector(worktreeId),
    [worktreeId]
  )
  const tabs = useAppStore((s: AgentRowsStoreView) => (active ? s.tabsByWorktree[worktreeId] : EMPTY_TABS))
  // Why: narrow the subscriptions to only THIS worktree's entries via
  // useShallow. Subscribing to the whole agentStatusByPaneKey map would make
  // every on-screen card re-render on any agent-status update anywhere —
  // O(worktrees²) render amplification. Pre-filtering here means the card
  // only re-renders when something relevant to THIS worktree changes.
  const liveEntries = useAppStore(
    useShallow((s: AgentRowsStoreView) =>
      active ? selectLiveAgentStatusEntriesForWorktree(s, worktreeId) : EMPTY_LIVE_ENTRIES
    )
  )
  // Why: keep the store selector limited to stable raw records. Converting
  // migration entries creates fresh objects with Date.now(), which breaks
  // useSyncExternalStore's cached-snapshot contract and can blank the view.
  const migrationUnsupported = useAppStore(
    useShallow((s: AgentRowsStoreView) =>
      active
        ? selectMigrationUnsupportedEntriesForWorktree(s, worktreeId)
        : EMPTY_MIGRATION_UNSUPPORTED_ENTRIES
    )
  )
  const retained = useAppStore(
    useShallow((s: AgentRowsStoreView) =>
      active ? selectRetainedAgentEntriesForWorktree(s, worktreeId) : EMPTY_RETAINED
    )
  )
  const runtimePaneTitlesByTabId = useAppStore(
    useShallow((s: AgentRowsStoreView) =>
      active ? selectRuntimePaneTitlesForWorktree(s, worktreeId) : EMPTY_RUNTIME_PANE_TITLES
    )
  )
  const ptyIdsByTabId = useAppStore(
    useShallow((s: AgentRowsStoreView) => (active ? selectLivePtyIdsForWorktree(s, worktreeId) : EMPTY_LIVE_PTY_IDS))
  )
  const terminalLayoutsByTabId = useAppStore(
    useShallow((s: AgentRowsStoreView) =>
      active ? selectTerminalLayoutsForWorktree(s, worktreeId) : EMPTY_TERMINAL_LAYOUTS
    )
  )
  const runtimeAgentOrchestrationByPaneKey = useAppStore(
    useShallow((s: AgentRowsStoreView) =>
      active
        ? selectRuntimeAgentOrchestrationForWorktree(s, worktreeId)
        : EMPTY_WORKTREE_AGENT_ORCHESTRATION
    )
  )
  const agentFreshnessSignature = useAppStore((s: AgentRowsStoreView) =>
    active ? selectAgentFreshness(s) : EMPTY_WORKTREE_AGENT_FRESHNESS_SIGNATURE
  )

  return useMemo<WorktreeAgentRowWithLineage[]>(() => {
    if (!active) {
      return EMPTY_AGENT_ROWS
    }
    // Why: Date.now() is read inside the memo so stale-decay recalculates when
    // this worktree's freshness signature changes, even without new PTY data.
    const now = Date.now()
    const entries =
      migrationUnsupported.length > 0
        ? [
            ...liveEntries,
            ...migrationUnsupported.flatMap((unsupported) => {
              const entry = migrationUnsupportedToAgentStatusEntry(unsupported)
              return entry ? [entry] : []
            })
          ]
        : liveEntries
    return applyAgentRowLineage(
      buildWorktreeAgentRows({
        tabs: tabs ?? EMPTY_TABS,
        entries,
        retained,
        runtimePaneTitlesByTabId,
        ptyIdsByTabId,
        terminalLayoutsByTabId,
        runtimeAgentOrchestrationByPaneKey,
        now
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    active,
    tabs,
    liveEntries,
    migrationUnsupported,
    retained,
    runtimePaneTitlesByTabId,
    ptyIdsByTabId,
    terminalLayoutsByTabId,
    runtimeAgentOrchestrationByPaneKey,
    agentFreshnessSignature
  ])
}
