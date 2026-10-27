// Pure status-definition edits for the workspace board's settings menu.
//
// Ported from Orca `use-workspace-kanban-status-actions.ts`, minus the store and the
// telemetry: this module only turns one `WorkspaceStatusDefinition[]` into the next one,
// so the React wiring (`use-workspace-board-status-actions`) and the removal migration
// stay testable without mounting anything.
import type { WorkspaceStatusDefinition } from '../../../shared/worktree/types'
import { getWorkspaceStatus, makeWorkspaceStatusId } from '../../../shared/workspace-statuses'

/** Anything the app keeps per worktree that carries its persisted workspace status. */
export type WorkspaceStatusCarrier = { path: string; status?: string | null }

export type WorkspaceStatusMigration = {
  worktreePath: string
  /** The surviving status every worktree of the removed lane is written to. */
  status: string
}

export type WorkspaceStatusRemovalPlan = {
  /** The definitions that survive. */
  statuses: WorkspaceStatusDefinition[]
  /** The surviving lane the removed lane's worktrees migrate to. */
  fallbackStatusId: string
  /** Worktrees that were in the removed lane, in the order they were found. */
  migrations: WorkspaceStatusMigration[]
}

/** Orca's "Add status": the next free `Status N` label, id de-duplicated against the list. */
export function addWorkspaceStatus(
  statuses: readonly WorkspaceStatusDefinition[]
): WorkspaceStatusDefinition[] {
  const label = `Status ${statuses.length + 1}`
  return [...statuses, { id: makeWorkspaceStatusId(label, statuses), label }]
}

export function renameWorkspaceStatus(
  statuses: readonly WorkspaceStatusDefinition[],
  statusId: string,
  label: string
): WorkspaceStatusDefinition[] {
  const trimmed = label.trim()
  if (!trimmed) {
    return [...statuses]
  }
  return statuses.map((status) => (status.id === statusId ? { ...status, label: trimmed } : status))
}

export function setWorkspaceStatusColor(
  statuses: readonly WorkspaceStatusDefinition[],
  statusId: string,
  color: string
): WorkspaceStatusDefinition[] {
  return statuses.map((status) => (status.id === statusId ? { ...status, color } : status))
}

export function setWorkspaceStatusIcon(
  statuses: readonly WorkspaceStatusDefinition[],
  statusId: string,
  icon: string
): WorkspaceStatusDefinition[] {
  return statuses.map((status) => (status.id === statusId ? { ...status, icon } : status))
}

/** Moves one lane one slot left (`-1`) or right (`1`); out-of-range moves are a no-op. */
export function moveWorkspaceStatus(
  statuses: readonly WorkspaceStatusDefinition[],
  statusId: string,
  direction: -1 | 1
): WorkspaceStatusDefinition[] {
  const index = statuses.findIndex((status) => status.id === statusId)
  const nextIndex = index + direction
  if (index === -1 || nextIndex < 0 || nextIndex >= statuses.length) {
    return [...statuses]
  }
  const next = [...statuses]
  const [moved] = next.splice(index, 1)
  next.splice(nextIndex, 0, moved)
  return next
}

/**
 * Orca's removal: the surviving lane is the one that slides into the removed lane's slot
 * (`next[min(index, last)]`), and every worktree whose *effective* status (including the
 * default-status fallback) was the removed id migrates there.
 *
 * Returns `null` when the removal is refused — the last lane can never be removed, and an
 * unknown id is a no-op.
 */
export function planWorkspaceStatusRemoval(
  statuses: readonly WorkspaceStatusDefinition[],
  statusId: string,
  worktrees: readonly WorkspaceStatusCarrier[]
): WorkspaceStatusRemovalPlan | null {
  if (statuses.length <= 1) {
    return null
  }
  const index = statuses.findIndex((status) => status.id === statusId)
  if (index === -1) {
    return null
  }
  const next = statuses.filter((status) => status.id !== statusId)
  const fallbackStatusId = (next[Math.min(index, next.length - 1)] ?? next[0]).id
  const migrations: WorkspaceStatusMigration[] = []
  for (const worktree of worktrees) {
    const effectiveStatus = getWorkspaceStatus(
      { workspaceStatus: worktree.status ?? undefined },
      statuses
    )
    if (effectiveStatus === statusId) {
      migrations.push({ worktreePath: worktree.path, status: fallbackStatusId })
    }
  }
  return { statuses: next, fallbackStatusId, migrations }
}
