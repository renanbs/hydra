// Ported from Orca `dashboard-card-bucket.ts` + `dashboard-row-bucket.ts` (bucket half).
// The Hydra row pipeline publishes the two attention states separately, so this is the
// single place that folds row states into the four dashboard buckets.
import type { AgentRowState } from '../../lib/agent-row-decay-state'
import type { DashboardBucket } from '../../shared/dashboard-buckets'

export function dashboardBucketForState(state: AgentRowState): DashboardBucket {
  switch (state) {
    case 'blocked':
    case 'waiting':
      return 'attention'
    case 'working':
      return 'working'
    case 'done':
      return 'done'
    // `unverifiable` is renderer-local (Orca publishes it as idle): a pane that stopped
    // reporting is not claimed as finished, and it is not working either.
    case 'unverifiable':
    case 'idle':
      return 'idle'
    // Why a default: row states can arrive from persisted/legacy entries whose union
    // check happened elsewhere; an unrecognized state is quiet, never "working".
    default:
      return 'idle'
  }
}
