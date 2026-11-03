// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-delete-worktree-status-hydration.ts
import { useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { canHydrateDeleteTargetLocally } from './worktree-delete-dispatch'
import { orderDeleteWorktreeStatusHydrationTargets } from './delete-worktree-dirty-change-counts'
import { getWorktreeHostIdentity } from '../../shared/worktree/host-qualified-identity'
import type { ExecutionHostId } from '../../shared/execution-host'

export type DeleteHydrationTarget = {
  id: string
  path: string
  hostId?: ExecutionHostId
}

type DirtyStatusResult = {
  unstaged_count?: number
  untracked_count?: number
  staged_count?: number
}

const EMPTY_DIRTY_COUNTS: Readonly<Record<string, number | null>> = Object.freeze({})

/** Dirty-change counts for every target of the confirmation dialog, hydrated in
 *  dependency order (active row, visible rows, then off-screen descendants) so
 *  the dialog can paint the most interesting row first.
 *
 *  Why a hook rather than an effect in the app shell: the dialog owns this
 *  state's lifetime. A cancelled probe (dialog closed, new target set) must
 *  never write a count onto the next dialog's rows.
 *
 *  Remote targets stay `null` (unknown) instead of borrowing a local count: the
 *  probe runs `git status` in this process, so it can only answer for the local
 *  owner. */
export function useDeleteWorktreeStatusHydration(args: {
  isOpen: boolean
  deleteTargets: readonly DeleteHydrationTarget[]
  visibleTargets: readonly DeleteHydrationTarget[]
  activeWorktreeId: string | null
}): Readonly<Record<string, number | null>> {
  const { isOpen, deleteTargets, visibleTargets, activeWorktreeId } = args
  const [counts, setCounts] = useState<Record<string, number | null>>({})
  const generation = useMemo(
    () =>
      isOpen
        ? deleteTargets.map((target) => getWorktreeHostIdentity(target)).join('\n')
        : '',
    [deleteTargets, isOpen]
  )

  useEffect(() => {
    if (!isOpen) {
      setCounts({})
      return
    }
    let cancelled = false
    setCounts({})
    const orderedTargets = orderDeleteWorktreeStatusHydrationTargets({
      targets: deleteTargets,
      visibleTargets,
      activeWorktreeId
    })
    for (const target of orderedTargets) {
      // Only the local owner can be probed from this process; a remote target
      // shows an unknown count instead of a wrong local one.
      if (!canHydrateDeleteTargetLocally(target.hostId)) {
        setCounts((previous) => ({ ...previous, [target.path]: null }))
        continue
      }
      invoke<DirtyStatusResult>('get_detailed_git_status_cmd', { repoPath: target.path })
        .then((result) => {
          if (cancelled) return
          const dirty =
            (result?.unstaged_count ?? 0) +
            (result?.untracked_count ?? 0) +
            (result?.staged_count ?? 0)
          setCounts((previous) => ({ ...previous, [target.path]: dirty }))
        })
        .catch(() => {
          if (cancelled) return
          setCounts((previous) => ({ ...previous, [target.path]: null }))
        })
    }
    return () => {
      cancelled = true
    }
  }, [activeWorktreeId, deleteTargets, generation, isOpen, visibleTargets])

  return isOpen ? counts : EMPTY_DIRTY_COUNTS
}
