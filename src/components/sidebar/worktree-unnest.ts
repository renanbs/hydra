// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-unnest.ts
import { toast } from 'sonner'
import { translate } from '../../i18n/i18n'

/**
 * Clear the parent link on each workspace and report a single failure toast.
 *
 * Shared by every un-nest entry point (the row menus, the picker's remove action and the drag
 * drop that moves a nested row out of its tree). The writer can reject — the lineage store is
 * persisted asynchronously — so a bare fire-and-forget call would surface as an unhandled
 * rejection and the action would look like it succeeded.
 */
export async function unnestWorktrees(
  childPaths: readonly string[],
  clearParent: (childPath: string) => Promise<void>,
  options: { showError?: (message: string) => void } = {}
): Promise<void> {
  if (childPaths.length === 0) {
    return
  }
  try {
    await Promise.all(childPaths.map((childPath) => clearParent(childPath)))
  } catch (error) {
    console.error('Failed to unnest workspace:', error)
    const fail = options.showError ?? toast.error
    fail(
      translate(
        'auto.components.sidebar.WorktreeList.failedUnnestWorkspace',
        'Failed to unnest workspace'
      )
    )
  }
}
