// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-visible-workspace-kanban-worktree-ids.ts (sampling half)
//
// The live-agent sample both the sidebar list and the workspace board must agree
// on. Orca keys the sample on `agentStatusEpoch` rather than `Date.now()` so two
// surfaces rendered from the same epoch cannot disagree about which agents are
// still fresh, and so unrelated store writes do not rescan every agent.
import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { getAgentStatusEpochNow } from '@/lib/agent-status-epoch-clock'
import { getWorktreeIdsWithLiveAgent } from '@/lib/worktree-activity-state'

const EMPTY_WORKTREE_ID_SET: ReadonlySet<string> = new Set<string>()

/** Tabs shaped as the activity sampler expects; the store's rows carry an id. */
type SampledTabsByWorktree = Record<string, readonly { id: string }[]>

/**
 * Live agent workspace ids, sampled once per agent-status epoch.
 *
 * `showSleepingWorkspaces` is the opt-out sentinel: the epoch subscription reads
 * `0` and no clock is sampled, so a sleeping-workspaces view cannot evict the
 * sample the live views share.
 */
export function useLiveAgentWorktreeIds(showSleepingWorkspaces: boolean): ReadonlySet<string> {
  const agentStatusEpoch = useAppStore((state) =>
    !showSleepingWorkspaces ? state.agentStatusEpoch : 0
  )
  // Why: skip the clock entirely when the epoch is the opt-out sentinel.
  const agentStatusNow = showSleepingWorkspaces ? 0 : getAgentStatusEpochNow(agentStatusEpoch)
  // Why subscribe to the tab map: a terminal mounting is a membership signal even
  // without an agent status write. The high-churn status map is read as a snapshot
  // in the memo instead, so every agent ping does not repaint the board.
  const tabsByWorktree = useAppStore((state) =>
    !showSleepingWorkspaces ? (state.tabsByWorktree as SampledTabsByWorktree) : null
  )
  return useMemo(() => {
    void agentStatusEpoch
    return !showSleepingWorkspaces
      ? getWorktreeIdsWithLiveAgent(
          useAppStore.getState().agentStatusByPaneKey,
          tabsByWorktree,
          agentStatusNow
        )
      : EMPTY_WORKTREE_ID_SET
  }, [agentStatusEpoch, agentStatusNow, showSleepingWorkspaces, tabsByWorktree])
}
