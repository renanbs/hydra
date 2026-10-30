// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/folder-workspace-card-pr-display.ts
//
// A folder workspace is not a git checkout, so its card has no PR of its own. Orca
// synthesizes one from the worktrees attached to the folder (workspace lineage
// children, then their worktree lineage descendants) and paints the most urgent
// review. Hydra's review source on the painted path is `prByPath` (the host PR
// lookup), so this port reads that map instead of the prCache/hostedReviewCache pair.
import type { PrDisplay } from '../../pr-display'
import type { WorkspaceLineage, WorktreeLineage } from '../../../../shared/worktree/lineage-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { folderWorkspaceKey, parseWorkspaceKey } from '../../../../shared/workspace-scope'
import { getProjectedWorktreeLineageChildrenByParentId } from '../../worktree-lineage-projection'

const REVIEW_STATUS_PRIORITY: Record<NonNullable<PrDisplay['status']>, number> = {
  failure: 0,
  pending: 1,
  success: 2
}

/**
 * The review a folder workspace card shows: the attached worktrees' reviews, most
 * urgent first (failing checks → pending → passing; no check status sorts last).
 */
export function getFolderWorkspaceCardPrDisplay(args: {
  folderWorkspaceId: string
  workspaceLineageByChildKey?: Readonly<Record<string, WorkspaceLineage>> | null
  worktreeLineageById?: Readonly<Record<string, WorktreeLineage>> | null
  worktreeById: ReadonlyMap<string, Worktree>
  prByPath?: Readonly<Record<string, PrDisplay>> | null
}): PrDisplay | null {
  const attached = getAttachedWorktreesForFolderWorkspaceCard(args)
  const displays: PrDisplay[] = []
  for (const worktree of attached) {
    const display = args.prByPath?.[worktree.path]
    if (display) displays.push(display)
  }
  if (displays.length === 0) return null
  return displays.sort(
    (left, right) => reviewDisplayPriority(left) - reviewDisplayPriority(right)
  )[0] ?? null
}

function reviewDisplayPriority(review: PrDisplay): number {
  return review.status ? REVIEW_STATUS_PRIORITY[review.status] : 3
}

/** Direct workspace-lineage children of the folder, then their worktree descendants. */
function getAttachedWorktreesForFolderWorkspaceCard(args: {
  folderWorkspaceId: string
  workspaceLineageByChildKey?: Readonly<Record<string, WorkspaceLineage>> | null
  worktreeLineageById?: Readonly<Record<string, WorktreeLineage>> | null
  worktreeById: ReadonlyMap<string, Worktree>
}): Worktree[] {
  const folderKey = folderWorkspaceKey(args.folderWorkspaceId)
  const directChildren: Worktree[] = []
  for (const lineage of Object.values(args.workspaceLineageByChildKey ?? {})) {
    if (lineage.parentWorkspaceKey !== folderKey) continue
    const childScope = parseWorkspaceKey(lineage.childWorkspaceKey)
    if (childScope?.type !== 'worktree') continue
    const worktree = args.worktreeById.get(childScope.worktreeId)
    if (!worktree || worktree.isArchived) continue
    if (lineage.childInstanceId && lineage.childInstanceId !== worktree.instanceId) continue
    directChildren.push(worktree)
  }

  const included = new Map(directChildren.map((worktree) => [worktree.id, worktree]))
  const childrenByParentId = getProjectedWorktreeLineageChildrenByParentId(
    args.worktreeLineageById ?? {},
    args.worktreeById
  )
  for (let index = 0; index < directChildren.length; index += 1) {
    for (const child of childrenByParentId.get(directChildren[index].id) ?? []) {
      if (child.isArchived || included.has(child.id)) continue
      included.set(child.id, child)
      directChildren.push(child)
    }
  }
  return [...included.values()]
}
