// Sleeping workspace visual source. Orca reads the sleep intent from the store;
// Hydra keeps it synchronous in `lib/worktree-sleep-intent`, so the card subscribes
// through `useSyncExternalStore` and repaints on sleep/wake without a store write.
import { useSyncExternalStore } from 'react'

import {
  hasWorktreeSleepIntent,
  subscribeWorktreeSleepIntent
} from '../../lib/worktree-sleep-intent'

export function useWorktreeSleeping(worktreeId: string | null): boolean {
  return useSyncExternalStore(
    subscribeWorktreeSleepIntent,
    () => hasWorktreeSleepIntent(worktreeId),
    () => false
  )
}
