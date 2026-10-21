// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/workspace-delete-lineage.ts`: resolves the
// workspace's descendant tree so a confirmed delete can name every workspace it
// will destroy and delete them child-first.
//
// Deviation from the Orca source: Hydra's lineage is the persisted path map
// (`hydra:worktree_lineage`, childPath -> parentPath), not the rich
// `WorktreeLineage` records, so the tree is rebuilt from paths. Paths repeat
// across execution hosts (two machines can check out into `/work/repo`), so a
// lineage child is resolved on the parent's host; a path that only exists on
// another host is never pulled into the tree.
import type { ExecutionHostId } from '../../shared/execution-host'

export type WorkspaceDeleteLineageRow = {
  id: string
  instanceId?: string
  hostId?: ExecutionHostId
  path: string
  repoPath?: string
  isMainWorktree?: boolean
  displayName?: string
}

export type WorkspaceDeleteLineage<T extends WorkspaceDeleteLineageRow> = {
  descendants: T[]
  /** Post-order: every descendant before its parent, parent last. */
  deleteAllTargets: T[]
}

/**
 * Resolves `parent`'s subtree against the live rows.
 *
 * Rules (Orca `getWorkspaceDeleteLineage`):
 * - only rows on the parent's host join the tree; a colliding path on another
 *   machine is a different checkout and must not be deleted;
 * - a main worktree is listed as a descendant but never targeted for deletion;
 * - cycles and paths that no longer exist are dropped.
 */
export function getWorkspaceDeleteLineage<T extends WorkspaceDeleteLineageRow>(
  parent: T,
  allRows: readonly T[],
  lineageByPath: Readonly<Record<string, string>> | null | undefined
): WorkspaceDeleteLineage<T> {
  if (!lineageByPath) {
    return { descendants: [], deleteAllTargets: [parent] }
  }

  const rowsByPath = new Map<string, T[]>()
  for (const row of allRows) {
    const rows = rowsByPath.get(row.path)
    if (rows) {
      rows.push(row)
    } else {
      rowsByPath.set(row.path, [row])
    }
  }

  const resolveChild = (childPath: string): T | null => {
    const candidates = rowsByPath.get(childPath)
    if (!candidates || candidates.length === 0) {
      return null
    }
    if (parent.hostId) {
      return candidates.find((row) => row.hostId === parent.hostId) ?? null
    }
    // Why: without a parent host the path is only safe when it names one row.
    // Picking one of two hosts would routinely delete the other machine's tree.
    return candidates.length === 1 ? candidates[0] : null
  }

  const childrenByParentPath = new Map<string, T[]>()
  for (const [childPath, parentPath] of Object.entries(lineageByPath)) {
    if (!parentPath || childPath === parentPath) {
      continue
    }
    const child = resolveChild(childPath)
    if (!child || `${child.hostId ?? ''}\0${child.id}` === `${parent.hostId ?? ''}\0${parent.id}`) {
      continue
    }
    const children = childrenByParentPath.get(parentPath)
    if (children) {
      if (!children.some((row) => `${row.hostId ?? ''}\0${row.id}` === `${child.hostId ?? ''}\0${child.id}`)) {
        children.push(child)
      }
    } else {
      childrenByParentPath.set(parentPath, [child])
    }
  }

  const descendants: T[] = []
  const childFirstTargets: T[] = []
  const visiting = new Set<string>()
  const emitted = new Set<string>([`${parent.hostId ?? ''}\0${parent.id}`])

  const visit = (path: string): void => {
    if (visiting.has(path)) {
      return
    }
    visiting.add(path)
    for (const child of childrenByParentPath.get(path) ?? []) {
      const key = `${child.hostId ?? ''}\0${child.id}`
      if (emitted.has(key)) {
        continue
      }
      emitted.add(key)
      descendants.push(child)
      visit(child.path)
      if (!child.isMainWorktree) {
        childFirstTargets.push(child)
      }
    }
    visiting.delete(path)
  }

  visit(parent.path)

  return {
    descendants,
    // Why post-order: a child workspace can live inside the parent directory, so
    // removing the parent first would leave the child as untracked content under
    // a path Git force-deletes.
    deleteAllTargets: [...childFirstTargets, parent],
  }
}
