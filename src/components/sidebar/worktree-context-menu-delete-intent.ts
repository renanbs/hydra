// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-context-menu-delete-intent.ts
// A context-menu delete is a typed INTENT: which rows were confirmed (identity,
// not path), and whether the menu was a single row, a multi-selection or a folder
// workspace. The modal opens on a later task so the menu's close/focus cycle
// finishes first (Orca `deferWorktreeContextMenuDeleteIntent`).
import type { ExecutionHostId } from '../../shared/execution-host'
import type { WorktreeDeleteIdentity } from './worktree-delete-request'

export type WorktreeContextMenuDeleteIntent =
  | { kind: 'worktree'; worktree: WorktreeDeleteIdentity }
  | { kind: 'batch'; worktrees: readonly WorktreeDeleteIdentity[] }
  | {
      kind: 'folder'
      folderWorkspaceId: string
      executionHostId?: ExecutionHostId
    }

export type WorktreeDeleteIntentRow = Pick<
  WorktreeDeleteIdentity,
  'id' | 'instanceId' | 'hostId'
>

export function createWorktreeContextMenuDeleteIntent(args: {
  worktree: WorktreeDeleteIntentRow
  batchDeleteWorktrees: readonly WorktreeDeleteIntentRow[]
  isMultiContext: boolean
  folderWorkspaceId?: string | null
}): WorktreeContextMenuDeleteIntent {
  if (args.isMultiContext) {
    return {
      kind: 'batch',
      // Why map: the intent must not keep rich rows alive after the menu closes;
      // identity is everything the confirmation revalidates.
      worktrees: args.batchDeleteWorktrees.map(({ id, instanceId, hostId }) => ({
        id,
        instanceId,
        hostId,
      })),
    }
  }
  if (args.folderWorkspaceId) {
    return {
      kind: 'folder',
      folderWorkspaceId: args.folderWorkspaceId,
      ...(args.worktree.hostId ? { executionHostId: args.worktree.hostId } : {}),
    }
  }
  const { id, instanceId, hostId } = args.worktree
  return { kind: 'worktree', worktree: { id, instanceId, hostId } }
}

export type WorktreeContextMenuDeleteHandlers = {
  /** Opens the single/batch confirmation for the confirmed identities. */
  openDelete: (targets: readonly WorktreeDeleteIdentity[]) => void
  /** Folder workspaces only remove the entry; the folder stays on disk. */
  deleteFolderWorkspace: (
    folderWorkspaceId: string,
    executionHostId?: ExecutionHostId
  ) => Promise<boolean> | boolean
}

export async function runWorktreeContextMenuDeleteIntent(
  intent: WorktreeContextMenuDeleteIntent,
  handlers: WorktreeContextMenuDeleteHandlers
): Promise<void> {
  if (intent.kind === 'batch') {
    handlers.openDelete(intent.worktrees)
    return
  }
  if (intent.kind === 'worktree') {
    handlers.openDelete([intent.worktree])
    return
  }
  await handlers.deleteFolderWorkspace(intent.folderWorkspaceId, intent.executionHostId)
}

export function deferWorktreeContextMenuDeleteIntent(
  intent: WorktreeContextMenuDeleteIntent,
  handlers: WorktreeContextMenuDeleteHandlers,
  onDispatched?: () => void,
  defer: (callback: () => void) => void = (callback) => window.setTimeout(callback, 0)
): void {
  defer(() => {
    void runWorktreeContextMenuDeleteIntent(intent, handlers)
    onDispatched?.()
  })
}

/** Orca `planDeleteTargets`: unique (id, host) pairs, main checkouts dropped. */
export function dedupeDeleteIntentTargets(
  targets: readonly WorktreeDeleteIdentity[],
  opts: {
    isMainWorktree?: (identity: WorktreeDeleteIdentity) => boolean
    isDeleting?: (identity: WorktreeDeleteIdentity) => boolean
  } = {}
): WorktreeDeleteIdentity[] {
  const seen = new Set<string>()
  const result: WorktreeDeleteIdentity[] = []
  for (const target of targets) {
    const key = `${target.hostId ?? ''}\0${target.id}`
    if (seen.has(key)) continue
    if (opts.isMainWorktree?.(target)) continue
    if (opts.isDeleting?.(target)) continue
    seen.add(key)
    result.push(target)
  }
  return result
}
