// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/focused-agent-row-highlight.ts
import { useAppStore } from '@/store'
import type { AppState } from '@/store/types'
import { isTerminalLeafId, makePaneKey } from '../../shared/stable-pane-id'

export type FocusedAgentRowHighlightState = Pick<
  AppState,
  | 'activeWorktreeId'
  | 'activeTabId'
  | 'activeTabIdByWorktree'
  | 'tabsByWorktree'
  | 'terminalLayoutsByTabId'
  | 'agentStatusByPaneKey'
  | 'retainedAgentsByPaneKey'
> & {
  migrationUnsupportedByPtyId: Record<string, { paneKey: string } | undefined>
}

/** Resolves which inline agent row (by pane key) belongs to the terminal pane
 *  focused right now, or null when the worktree is not the active surface.
 *
 *  Hydra keeps per-worktree focus in `activeTabIdByWorktree`, so this reads the
 *  worktree's own active tab instead of the app-global one Orca uses. */
export function getFocusedAgentPaneKeyForWorktree(
  state: FocusedAgentRowHighlightState,
  worktreeId: string
): string | null {
  if (state.activeWorktreeId !== worktreeId) {
    return null
  }

  const activeTabId = state.activeTabIdByWorktree?.[worktreeId] ?? state.activeTabId
  if (!activeTabId) {
    return null
  }

  const activeTabBelongsToWorktree = (state.tabsByWorktree[worktreeId] ?? []).some(
    (tab: { id: string }) => tab.id === activeTabId
  )
  if (!activeTabBelongsToWorktree) {
    return null
  }

  const activeLeafId = state.terminalLayoutsByTabId[activeTabId]?.activeLeafId
  if (!activeLeafId || !isTerminalLeafId(activeLeafId)) {
    return null
  }

  const activePaneKey = makePaneKey(activeTabId, activeLeafId)
  // Why: the inline card lists every agent attributed to this worktree, even
  // after its status decays to idle. Highlight whichever displayed row matches
  // the focused pane — gating on freshness left clicked-into stale rows with no
  // selection coloring.
  if (state.agentStatusByPaneKey[activePaneKey]) {
    return activePaneKey
  }

  if (state.retainedAgentsByPaneKey[activePaneKey]?.worktreeId === worktreeId) {
    return activePaneKey
  }

  const hasMigrationUnsupportedRow = Object.values(state.migrationUnsupportedByPtyId).some(
    (entry: { paneKey: string } | undefined) => entry?.paneKey === activePaneKey
  )
  return hasMigrationUnsupportedRow ? activePaneKey : null
}

export function useFocusedAgentPaneKey(worktreeId: string): string | null {
  return useAppStore((state) => getFocusedAgentPaneKeyForWorktree(state, worktreeId))
}
