// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/hovered-workspace-delete.ts
// Immediate delete of the workspace under the pointer (Backspace/Delete while
// Alt is held). Guarded against open modals, editable fields, main checkouts,
// in-flight deletes and duplicate folder requests.
import { isEditableTarget } from '../../lib/editable-target'
import type { ExecutionHostId } from '../../shared/execution-host'
import { getExecutionHostIdFromWorktreeHostIdentity } from '../../shared/worktree/host-qualified-identity'

export type HoveredWorkspaceRow = {
  id: string
  instanceId?: string
  hostId?: ExecutionHostId
  path: string
  repoPath?: string
  isMainWorktree?: boolean
  isDeleting?: boolean
}

export type HoveredWorkspaceFolder = {
  id: string
  path: string
}

export type HoveredWorkspaceDeleteTarget =
  | {
      kind: 'folder'
      executionHostId: ExecutionHostId
      folderWorkspaceId: string
      workspaceKey: string
    }
  | {
      kind: 'worktree'
      worktree: HoveredWorkspaceRow
    }

export type HoveredWorkspaceDeleteDependencies = {
  deleteWorktree: (worktree: HoveredWorkspaceRow) => void
  deleteFolderWorkspace: (folderWorkspaceId: string, hostId: ExecutionHostId) => Promise<boolean>
  isModalOpen: () => boolean
  findWorktree: (workspaceId: string, hostIdentity: string) => HoveredWorkspaceRow | null
  findFolderWorkspace: (
    workspaceId: string,
    hostIdentity: string
  ) => HoveredWorkspaceFolder | null
}

export type HoveredWorkspaceDeleteDocument = Pick<Document, 'activeElement' | 'querySelectorAll'>

// Why dedupe folder requests: the same hovered row can receive repeated
// Backspace presses while the async catalog removal is already running.
const pendingFolderDeletes = new Set<string>()

export function getHoveredWorkspaceIdentity(
  doc: HoveredWorkspaceDeleteDocument = document
): { hostIdentity: string; workspaceId: string } | null {
  const hoveredRows = doc.querySelectorAll<HTMLElement>(
    '[data-worktree-sidebar] [role="option"][data-worktree-id]:hover'
  )
  const row = hoveredRows.item(hoveredRows.length - 1)
  const workspaceId = row?.dataset.worktreeId
  const hostIdentity = row?.dataset.worktreeHostIdentity
  return workspaceId && hostIdentity ? { workspaceId, hostIdentity } : null
}

export function resolveHoveredWorkspaceDeleteTarget(
  deps: HoveredWorkspaceDeleteDependencies,
  doc: HoveredWorkspaceDeleteDocument = document
): HoveredWorkspaceDeleteTarget | null {
  if (deps.isModalOpen()) return null
  const active = doc.activeElement
  if (active && isEditableTarget(active)) return null
  const hovered = getHoveredWorkspaceIdentity(doc)
  if (!hovered) return null

  const folder = deps.findFolderWorkspace(hovered.workspaceId, hovered.hostIdentity)
  if (folder) {
    const executionHostId = getExecutionHostIdFromWorktreeHostIdentity(hovered.hostIdentity)
    if (!executionHostId) return null
    return {
      kind: 'folder',
      executionHostId,
      folderWorkspaceId: folder.id,
      workspaceKey: hovered.workspaceId,
    }
  }

  const worktree = deps.findWorktree(hovered.workspaceId, hovered.hostIdentity)
  return worktree && !worktree.isMainWorktree && !worktree.isDeleting
    ? { kind: 'worktree', worktree }
    : null
}

export function deleteHoveredWorkspaceImmediately(
  deps: HoveredWorkspaceDeleteDependencies,
  target: HoveredWorkspaceDeleteTarget | null = resolveHoveredWorkspaceDeleteTarget(deps)
): boolean {
  if (!target) return false
  if (target.kind === 'folder') {
    const pendingIdentity = `${target.executionHostId}|${target.workspaceKey}`
    if (pendingFolderDeletes.has(pendingIdentity)) return false
    pendingFolderDeletes.add(pendingIdentity)
    void deps
      .deleteFolderWorkspace(target.folderWorkspaceId, target.executionHostId)
      .finally(() => pendingFolderDeletes.delete(pendingIdentity))
    return true
  }
  deps.deleteWorktree(target.worktree)
  return true
}

/** Exposed for tests: the dedupe set survives module reloads otherwise. */
export function clearPendingFolderDeletesForTests(): void {
  pendingFolderDeletes.clear()
}
