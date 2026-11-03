// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/empty-project-placeholder-repos.ts
import type { Repo } from '../../shared/repo-types'
import type { WorktreeGroupBy } from './worktree-list/grouping/row-types'

/**
 * Repos that must keep a section even with no visible cards.
 *
 * Two cases: a repo whose scan found no worktrees (so its header still renders),
 * and a repo that belongs to a project group but whose cards are hidden by a
 * workspace filter — a persisted group must not lose its membership just
 * because every member is filtered out. Grouped rendering only.
 */
export function getEmptyProjectPlaceholderRepoIds(args: {
  groupBy: WorktreeGroupBy
  repos: readonly Repo[]
  worktreesByRepo: Readonly<Record<string, readonly { repoId: string }[] | undefined>>
  visibleWorktrees: readonly { repoId: string }[]
  filterRepoIds: readonly string[]
}): Set<string> {
  if (args.groupBy !== 'repo') return new Set()

  const filterSet = args.filterRepoIds.length > 0 ? new Set(args.filterRepoIds) : null
  const visibleRepoIds = new Set(args.visibleWorktrees.map((worktree) => worktree.repoId))
  const placeholderRepoIds = new Set<string>()
  for (const repo of args.repos) {
    if (filterSet && !filterSet.has(repo.id)) continue
    const hasNoWorktrees = (args.worktreesByRepo[repo.id]?.length ?? 0) === 0
    const isFilteredProjectGroupMember =
      repo.projectGroupId != null && !visibleRepoIds.has(repo.id)
    if (hasNoWorktrees || isFilteredProjectGroupMember) {
      placeholderRepoIds.add(repo.id)
    }
  }
  return placeholderRepoIds
}
