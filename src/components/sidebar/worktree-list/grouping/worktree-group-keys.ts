import type { ProjectGroup } from '../../../../shared/project-group-types'
import type { Repo } from '../../../../shared/repo-types'
import type { WorkspaceStatusDefinition, Worktree } from '../../../../shared/worktree/types'
import { getWorkspaceStatus, getWorkspaceStatusGroupKey } from '../../workspace-status'
import { cloneDefaultWorkspaceStatuses } from '../../../../shared/workspace-statuses'
import type { AppState } from '../../../../store/types'
import {
  ALL_GROUP_KEY,
  PINNED_GROUP_KEY,
  getPRGroupKey,
  getProjectGroupHeaderKey
} from './group-keys'
import { buildProjectGroupingIndex, getProjectGroupingForRepo } from './project-grouping'
import type { ProjectGroupingModel } from './project-grouping'
import type { WorktreeGroupBy } from './row-types'

export function getGroupKeyForWorktree(
  groupBy: WorktreeGroupBy,
  worktree: Worktree,
  repoMap: Map<string, Repo>,
  prCache: Record<string, unknown> | null,
  workspaceStatuses: readonly WorkspaceStatusDefinition[] = cloneDefaultWorkspaceStatuses(),
  settings?: AppState['settings'],
  projectGrouping?: ProjectGroupingModel
): string | null {
  if (groupBy === 'none') {
    return ALL_GROUP_KEY
  }
  if (groupBy === 'workspace-status') {
    return getWorkspaceStatusGroupKey(getWorkspaceStatus(worktree, workspaceStatuses))
  }
  if (groupBy === 'repo') {
    return getProjectGroupingForRepo(
      worktree.repoId,
      repoMap,
      buildProjectGroupingIndex(projectGrouping)
    ).key
  }
  return `pr:${getPRGroupKey(worktree, repoMap, prCache, settings)}`
}

export function getGroupKeysForWorktree(
  groupBy: WorktreeGroupBy,
  worktree: Worktree,
  repoMap: Map<string, Repo>,
  prCache: Record<string, unknown> | null,
  workspaceStatuses: readonly WorkspaceStatusDefinition[] = cloneDefaultWorkspaceStatuses(),
  settings?: AppState['settings'],
  projectGroups: readonly ProjectGroup[] = [],
  projectGrouping?: ProjectGroupingModel,
  isPinnedSectionWorktree = false
): string[] {
  const groupKey = getGroupKeyForWorktree(
    groupBy,
    worktree,
    repoMap,
    prCache,
    workspaceStatuses,
    settings,
    projectGrouping
  )
  const keys: string[] = []
  if (groupKey && groupBy !== 'repo') {
    keys.push(groupKey)
  }
  if (groupKey && groupBy === 'repo') {
    const repo = repoMap.get(worktree.repoId)
    const groupIds: string[] = []
    const groupsById = new Map(projectGroups.map((group) => [group.id, group]))
    const visited = new Set<string>()
    let currentGroupId = repo?.projectGroupId ?? null
    while (currentGroupId && !visited.has(currentGroupId)) {
      const group = groupsById.get(currentGroupId)
      if (!group) {
        // Why: repos can arrive before their remote Project Group metadata; reveal
        // keys must match the top-level fallback rows buildRows actually renders.
        break
      }
      visited.add(currentGroupId)
      groupIds.unshift(currentGroupId)
      const parentId = group.parentGroupId ?? null
      currentGroupId = parentId && groupsById.has(parentId) ? parentId : null
    }
    keys.push(...groupIds.map((id) => getProjectGroupHeaderKey(id)), groupKey)
  }
  // Why: the Pinned section is painted independently of `groupBy`, so a reveal of a
  // pinned worktree that is already visible in its natural group still has to open
  // this header too, or the pinned duplicate stays hidden.
  if (isPinnedSectionWorktree && !keys.includes(PINNED_GROUP_KEY)) {
    keys.unshift(PINNED_GROUP_KEY)
  }
  return keys
}

/**
 * Collapsed group headers a reveal must open before the target row can be painted.
 *
 * Reveal (`WorktreeSidebar` → viewport) cannot scroll to a row that a collapsed
 * section does not emit, so it asks this module which keys are still closed.
 * Kept pure so both the reveal path and its tests exercise the same ancestry.
 */
export function getRevealGroupKeysToExpand(args: {
  groupBy: WorktreeGroupBy
  worktree: Worktree
  repoMap: Map<string, Repo>
  prCache: Record<string, unknown> | null
  collapsedGroups: ReadonlySet<string>
  workspaceStatuses?: readonly WorkspaceStatusDefinition[]
  settings?: AppState['settings']
  projectGroups?: readonly ProjectGroup[]
  projectGrouping?: ProjectGroupingModel
  isPinnedSectionWorktree?: boolean
}): string[] {
  return getGroupKeysForWorktree(
    args.groupBy,
    args.worktree,
    args.repoMap,
    args.prCache,
    args.workspaceStatuses,
    args.settings,
    args.projectGroups,
    args.projectGrouping,
    args.isPinnedSectionWorktree
  ).filter((groupKey) => args.collapsedGroups.has(groupKey))
}
