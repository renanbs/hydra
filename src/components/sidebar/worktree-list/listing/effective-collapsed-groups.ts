// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/listing/use-collapsed-groups.ts
//
// While the agent send picker targets a workspace, every section that hides that
// workspace must paint open — otherwise the picker's own target has no visible row to
// point at. Orca keeps the persisted set intact and derives an *effective* set per render;
// this module is that derivation, without the hook wrapper, so the row pipeline and its
// tests read the exact same answer.
import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { ProjectGroup } from '../../../../shared/project-group-types'
import type { Repo } from '../../../../shared/repo-types'
import type { WorkspaceStatusDefinition, Worktree } from '../../../../shared/worktree/types'
import type { WorktreeLineage } from '../../../../shared/worktree/lineage-types'
import type { AppState } from '../../../../store/types'
import { getFolderWorkspaceRevealGroupKeys } from '../../sidebar-reveal-lookups'
import { getWorktreeLineageAncestors } from '../../worktree-lineage-projection'
import { PINNED_GROUP_KEY, getWorktreeLineageGroupKey } from '../grouping/group-keys'
import type { PinnedWorktreeDisplayPolicy, WorktreeGroupBy } from '../grouping/row-types'
import { getGroupKeysForWorktree } from '../grouping/worktree-group-keys'

export type EffectiveCollapsedGroupsArgs = {
  collapsedGroups: ReadonlySet<string>
  /** The workspace the agent send picker targets, or null when the picker is closed. */
  agentSendTargetWorktreeId: string | null
  groupBy: WorktreeGroupBy
  pinnedDisplayPolicy: PinnedWorktreeDisplayPolicy
  /** Every workspace the list may paint (the visible slice, target force-included). */
  worktrees: readonly Worktree[]
  worktreeMap: ReadonlyMap<string, Worktree>
  worktreeLineageById: Readonly<Record<string, WorktreeLineage>>
  folderWorkspaces: readonly FolderWorkspace[]
  projectGroups: readonly ProjectGroup[]
  repoMap: Map<string, Repo>
  prCache: Record<string, unknown> | null
  workspaceStatuses?: readonly WorkspaceStatusDefinition[]
  settings?: AppState['settings']
  /** Paths the list paints in the Pinned lane (Hydra's persisted pin set). */
  pinnedWorktreePaths?: ReadonlySet<string>
}

/**
 * The collapsed set the painted list should use. Identical to the persisted set until a
 * send target exists; then it is a copy with every hiding header opened:
 *
 * - the workspace's natural lane (status / PR / All) and every project-group ancestor,
 * - the Pinned lane when the workspace is pinned (Orca `single-location` paints the
 *   pinned copy instead of the natural lane, so there is nothing else to open),
 * - every collapsed lineage fold above it, or the row still cannot mount.
 *
 * Folder workspaces are absent from `worktrees`, so they resolve through their own row
 * key plus the project-group ancestry (Orca `getFolderWorkspaceRevealGroupKeys`).
 */
export function getEffectiveCollapsedGroups(
  args: EffectiveCollapsedGroupsArgs
): ReadonlySet<string> {
  const { agentSendTargetWorktreeId, collapsedGroups } = args
  // Why the identity return: the row pipeline keys its memo on this set; a fresh copy
  // per render would rebuild every row on every tick of an unrelated store field.
  if (!agentSendTargetWorktreeId || collapsedGroups.size === 0) {
    return collapsedGroups
  }

  const keysToOpen = new Set<string>()
  const targetWorktree =
    args.worktreeMap.get(agentSendTargetWorktreeId) ??
    args.worktrees.find((worktree) => worktree.id === agentSendTargetWorktreeId)

  if (targetWorktree) {
    const isPinned =
      args.pinnedWorktreePaths?.has(targetWorktree.path) === true ||
      targetWorktree.isPinned === true
    if (args.pinnedDisplayPolicy === 'single-location' && isPinned) {
      keysToOpen.add(PINNED_GROUP_KEY)
    } else {
      for (const groupKey of getGroupKeysForWorktree(
        args.groupBy,
        targetWorktree,
        args.repoMap,
        args.prCache,
        args.workspaceStatuses,
        args.settings,
        args.projectGroups,
        undefined,
        isPinned
      )) {
        keysToOpen.add(groupKey)
      }
    }
    for (const parent of getWorktreeLineageAncestors(
      targetWorktree,
      args.worktreeLineageById,
      args.worktreeMap
    )) {
      keysToOpen.add(getWorktreeLineageGroupKey(parent))
    }
  } else {
    const folderWorkspace = args.folderWorkspaces.find(
      (workspace) => workspace.id === agentSendTargetWorktreeId
    )
    if (!folderWorkspace) {
      return collapsedGroups
    }
    for (const groupKey of getFolderWorkspaceRevealGroupKeys(folderWorkspace, args.projectGroups)) {
      keysToOpen.add(groupKey)
    }
  }

  const stillCollapsed = [...keysToOpen].filter((key) => collapsedGroups.has(key))
  if (stillCollapsed.length === 0) {
    return collapsedGroups
  }
  const next = new Set(collapsedGroups)
  for (const key of stillCollapsed) {
    next.delete(key)
  }
  return next
}
