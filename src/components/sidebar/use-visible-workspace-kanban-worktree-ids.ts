// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-visible-workspace-kanban-worktree-ids.ts
//
// D15a-012: the workspace board reads all workspaces on its own, but membership
// must match the sidebar exactly. The sidebar's host-scope filter is the one
// predicate that list does not already apply through `getProjectWorktrees`, so
// the board builds this host-qualified visible set and drops everything else.
import { useMemo } from 'react'
import { useAppStore } from '@/store'
import type { Repo } from '../../shared/repo-types'
import type { Worktree } from '../../shared/worktree/types'
import { getSettingsFocusedExecutionHostId } from '../../shared/execution-host'
import { getWorktreeHostIdentity } from '../../shared/worktree/host-qualified-identity'
import {
  getVisibleWorkspaceHostIdSet,
  worktreeMatchesVisibleHost
} from './visible-worktree-host-scope'

/**
 * Host-qualified identities the board may paint.
 *
 * Why identity, not worktree id: two hosts can publish the same workspace id
 * (STA-4343), so an id-only set would let a visible local twin vouch for a
 * filtered remote row. The sidebar's own drag math already speaks identities.
 *
 * `null` means "no host narrowing": the board keeps its existing membership.
 * A set (even an empty one) is authoritative and hides everything outside it.
 */
export function useVisibleWorkspaceKanbanWorktreeIds(args: {
  allWorktrees: readonly Worktree[]
  repoMap: Map<string, Repo>
}): ReadonlySet<string> | null {
  const workspaceHostScope = useAppStore((s) => s.workspaceHostScope)
  const visibleWorkspaceHostIds = useAppStore((s) => s.visibleWorkspaceHostIds)
  const settings = useAppStore((s) => s.settings)

  return useMemo(() => {
    const scope = getVisibleWorkspaceHostIdSet({
      workspaceHostScope,
      visibleWorkspaceHostIds
    })
    // Why empty means "no narrowing": persistence normalizes `[]` to `null` (all
    // hosts), and the scope menu refuses to uncheck the last visible host. Raw
    // empty arrays only reach here from older snapshots/tests, where they meant
    // "everything", so they must not hide the board.
    const visibleHostIdSet = scope && scope.size > 0 ? scope : null
    if (!visibleHostIdSet) {
      return null
    }
    const defaultHostId = getSettingsFocusedExecutionHostId(settings)
    return new Set(
      args.allWorktrees
        .filter(
          (worktree) =>
            !worktree.isArchived &&
            worktreeMatchesVisibleHost(worktree, visibleHostIdSet, args.repoMap, defaultHostId)
        )
        .map(getWorktreeHostIdentity)
    )
  }, [
    args.allWorktrees,
    args.repoMap,
    settings,
    visibleWorkspaceHostIds,
    workspaceHostScope
  ])
}
