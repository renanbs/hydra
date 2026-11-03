import { useMemo, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store'
import { useNow } from '@/hooks/use-now'
import {
  buildAgentsThreads,
  type AgentsThread,
  type AgentsThreadState,
} from '../sidebar/agents-thread-model'
import type { HydraProject, WorktreeSession } from '../sidebar/types'
import {
  EMPTY_DASHBOARD_BUCKET_COUNTS,
  dashboardBucketCountsEqual,
  type DashboardBucketCounts,
} from '../../shared/dashboard-buckets'
import {
  countAgentBuckets,
  groupAgentThreadsByBucket,
  type AgentDashboardGroups,
} from './agent-dashboard-groups'

const EMPTY_RECORD: Record<string, never> = Object.freeze({})

type DashboardThreadsStore = AgentsThreadState & {
  acknowledgedAgentsByPaneKey: Record<string, number>
  unreadTerminalPanes: Record<string, unknown>
  unreadAgentCompletionPanes: Record<string, unknown>
  manuallyUnreadTurnsByPaneKey: Record<string, number>
  activityClearedAtByPaneKey: Record<string, number>
}

export type AgentDashboardDataInput = {
  sessions: readonly WorktreeSession[]
  projects: readonly HydraProject[]
  /** False keeps the whole pipeline off (e.g. no pop-out subscriber yet). */
  enabled?: boolean
}

export type AgentDashboardData = {
  threads: readonly AgentsThread[]
  groups: AgentDashboardGroups
  counts: DashboardBucketCounts
}

const EMPTY_GROUPS: AgentDashboardGroups = {
  attention: [],
  working: [],
  done: [],
  idle: [],
}

const EMPTY_DATA: AgentDashboardData = {
  threads: [],
  groups: EMPTY_GROUPS,
  counts: EMPTY_DASHBOARD_BUCKET_COUNTS,
}

// Why a frozen stand-in while disabled: the selector still runs on every store write,
// so returning a shared identity (instead of the live slices) keeps a closed drawer or
// an absent pop-out from rerendering on unrelated agent updates.
const DISABLED_THREAD_STATE: DashboardThreadsStore = Object.freeze({
  tabsByWorktree: EMPTY_RECORD,
  agentStatusByPaneKey: EMPTY_RECORD,
  retainedAgentsByPaneKey: EMPTY_RECORD,
  migrationUnsupportedByPtyId: EMPTY_RECORD,
  runtimeAgentOrchestrationByPaneKey: EMPTY_RECORD,
  terminalLayoutsByTabId: EMPTY_RECORD,
  ptyIdsByTabId: EMPTY_RECORD,
  acknowledgedAgentsByPaneKey: EMPTY_RECORD,
  unreadTerminalPanes: EMPTY_RECORD,
  unreadAgentCompletionPanes: EMPTY_RECORD,
  manuallyUnreadTurnsByPaneKey: EMPTY_RECORD,
  activityClearedAtByPaneKey: EMPTY_RECORD,
})

/**
 * Same slice read-set as the sidebar's Agents view (`SidebarAgentsList`), shaped so the
 * derived rows are identical. `useShallow` keeps an unrelated store write from rerunning
 * the thread pipeline: the four slices are the whole input, and Hydra replaces them by
 * identity on write.
 *
 * `now` is the shared 30s clock: row decay (a `working` entry whose hook stream went
 * quiet) only changes at a staleness boundary, so the dashboard recalculates on the same
 * cadence the Agents list already uses.
 */
export function useAgentDashboardData({
  sessions,
  projects,
  enabled = true,
}: AgentDashboardDataInput): AgentDashboardData {
  const now = useNow(30_000, enabled)
  const threadState = useAppStore(
    useShallow((s) => {
      if (!enabled) {
        return DISABLED_THREAD_STATE
      }
      const view = s as unknown as DashboardThreadsStore
      return {
        tabsByWorktree: view.tabsByWorktree,
        agentStatusByPaneKey: view.agentStatusByPaneKey,
        retainedAgentsByPaneKey: view.retainedAgentsByPaneKey,
        migrationUnsupportedByPtyId: view.migrationUnsupportedByPtyId,
        runtimeAgentOrchestrationByPaneKey: view.runtimeAgentOrchestrationByPaneKey,
        terminalLayoutsByTabId: view.terminalLayoutsByTabId,
        ptyIdsByTabId: view.ptyIdsByTabId,
        acknowledgedAgentsByPaneKey: view.acknowledgedAgentsByPaneKey ?? EMPTY_RECORD,
        unreadTerminalPanes: view.unreadTerminalPanes ?? EMPTY_RECORD,
        unreadAgentCompletionPanes: view.unreadAgentCompletionPanes ?? EMPTY_RECORD,
        manuallyUnreadTurnsByPaneKey: view.manuallyUnreadTurnsByPaneKey ?? EMPTY_RECORD,
        activityClearedAtByPaneKey: view.activityClearedAtByPaneKey ?? EMPTY_RECORD,
      }
    })
  )

  const threads = useMemo(
    () =>
      enabled
        ? buildAgentsThreads({ state: threadState, sessions, projects, now })
        : EMPTY_DATA.threads,
    [enabled, threadState, sessions, projects, now]
  )
  const groups = useMemo(
    () => (enabled ? groupAgentThreadsByBucket(threads) : EMPTY_GROUPS),
    [enabled, threads]
  )

  // Why keep the previous object: the entry subscribes to the counts, and a thread
  // rebuild that changes nothing (a title ping, a tool step) must not rerender it.
  const countsRef = useRef<DashboardBucketCounts>(EMPTY_DASHBOARD_BUCKET_COUNTS)
  const counts = useMemo(() => {
    const next = enabled ? countAgentBuckets(groups) : EMPTY_DASHBOARD_BUCKET_COUNTS
    const previous = countsRef.current
    if (dashboardBucketCountsEqual(previous, next)) {
      return previous
    }
    countsRef.current = next
    return next
  }, [enabled, groups])

  return { threads, groups, counts }
}

/** Sidebar-entry view: only the four totals, no row references. */
export function useAgentBucketCounts(input: AgentDashboardDataInput): DashboardBucketCounts {
  return useAgentDashboardData(input).counts
}
