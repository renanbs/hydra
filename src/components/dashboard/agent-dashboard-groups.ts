// Groups the sidebar's agent threads into the dashboard's four buckets.
//
// Why threads and not a dashboard-only row pipeline: the sidebar Agents view, the
// drawer and the pop-out must agree on what an "agent" is. `buildAgentsThreads` is
// already that authority (live hook rows, retained completions, headless daemon
// sessions, and headless sessions deduped against live rows).
import type { AgentsThread } from '../sidebar/agents-thread-model'
import type { AgentDashboardPopoutRow } from '../../shared/agent-dashboard-snapshot'
import {
  DASHBOARD_BUCKET_ORDER,
  EMPTY_DASHBOARD_BUCKET_COUNTS,
  type DashboardBucket,
  type DashboardBucketCounts,
} from '../../shared/dashboard-buckets'
import { dashboardBucketForState } from './dashboard-bucket'

export type AgentDashboardGroups = Record<DashboardBucket, AgentsThread[]>

export function groupAgentThreadsByBucket(threads: readonly AgentsThread[]): AgentDashboardGroups {
  const groups: AgentDashboardGroups = {
    attention: [],
    working: [],
    done: [],
    idle: [],
  }
  for (const thread of threads) {
    groups[dashboardBucketForState(thread.state)].push(thread)
  }
  for (const bucket of DASHBOARD_BUCKET_ORDER) {
    // Most recent activity first inside each bucket; the bucket order itself is the
    // priority order (Needs You before Working before Done before Idle).
    groups[bucket].sort((a, b) => b.latestTimestamp - a.latestTimestamp)
  }
  return groups
}

export function countAgentBuckets(groups: AgentDashboardGroups): DashboardBucketCounts {
  if (
    groups.attention.length === 0 &&
    groups.working.length === 0 &&
    groups.done.length === 0 &&
    groups.idle.length === 0
  ) {
    return EMPTY_DASHBOARD_BUCKET_COUNTS
  }
  return {
    attention: groups.attention.length,
    working: groups.working.length,
    done: groups.done.length,
    idle: groups.idle.length,
  }
}

export function countAgentThreadsByBucket(threads: readonly AgentsThread[]): DashboardBucketCounts {
  if (threads.length === 0) {
    return EMPTY_DASHBOARD_BUCKET_COUNTS
  }
  const counts: DashboardBucketCounts = { attention: 0, working: 0, done: 0, idle: 0 }
  for (const thread of threads) {
    counts[dashboardBucketForState(thread.state)] += 1
  }
  return counts
}

/** Plain-data projection for the pop-out window (Tauri events carry JSON only). */
export function toAgentDashboardPopoutRows(
  threads: readonly AgentsThread[]
): AgentDashboardPopoutRow[] {
  return threads.map((thread) => ({
    paneKey: thread.paneKey,
    sessionId: thread.sessionId,
    title: thread.title,
    agentType: thread.agentType,
    state: thread.state,
    bucket: dashboardBucketForState(thread.state),
    worktreePath: thread.worktreePath,
    projectName: thread.projectName,
    branch: thread.branch,
    updatedAt: thread.updatedAt,
    unread: thread.unread,
  }))
}
