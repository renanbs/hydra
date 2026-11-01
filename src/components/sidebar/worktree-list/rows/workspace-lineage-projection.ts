// D03a-077: a folder workspace card's synthetic review walks workspace lineage
// (`folder-workspace-card-pr-display.ts`), but the live store only carries the
// worktree-level records — `workspaceLineageByChildKey` is declared on the slice
// type and hydrated from host snapshots, never composed into the live AppState.
// So the sidebar projects the lineage it already builds (Orca keeps the two record
// sets separate; here both come from the same sources) into the workspace-keyed
// map the folder walk reads.
//
// Parent resolution is the point: a worktree nested under a FOLDER workspace must
// yield `parentWorkspaceKey: 'folder:<id>'`, otherwise the folder card never sees
// its attached worktrees and paints no review at all.
import type { FolderWorkspace, WorkspaceKey } from '../../../../shared/folder-workspace-types'
import type { WorkspaceLineage, WorktreeLineage } from '../../../../shared/worktree/lineage-types'
import type { Worktree } from '../../../../shared/worktree/types'
import {
  folderWorkspaceKey,
  parseWorkspaceKey,
  worktreeWorkspaceKey
} from '../../../../shared/workspace-scope'

export type WorkspaceLineageProjectionArgs = {
  /**
   * Rich records the row pipeline already projected (`projectedLineageById`: the
   * store's records plus the app's path map). Their origin/capture metadata is
   * carried through as-is.
   */
  lineageById?: Readonly<Record<string, WorktreeLineage>> | null
  /**
   * The app's own lineage map (child path → parent path) — the single writer the
   * row menus and delete use. It is read raw because a folder-workspace parent has
   * no checkout row, so the worktree projection cannot express that edge.
   */
  lineageByPath?: Readonly<Record<string, string>> | null
  /** The worktrees the list paints, by bare id. */
  worktreeById: ReadonlyMap<string, Worktree>
  /** Folder workspaces the list paints, so their paths resolve to folder keys. */
  folderWorkspaces?: readonly FolderWorkspace[] | null
}

/**
 * Workspace lineage keyed by child workspace key, for the folder card's synthetic
 * review walk. Returns an empty record when nothing is attached to anything.
 */
export function getProjectedWorkspaceLineageByChildKey(
  args: WorkspaceLineageProjectionArgs
): Record<WorkspaceKey, WorkspaceLineage> {
  const workspaceKeyByPath = new Map<string, WorkspaceKey>()
  for (const worktree of args.worktreeById.values()) {
    workspaceKeyByPath.set(worktree.path, worktreeWorkspaceKey(worktree.id))
  }
  // Why: a checkout wins the path when both name the same directory — it is the row
  // the sidebar paints, and the folder workspace is the project group's anchor.
  for (const folder of args.folderWorkspaces ?? []) {
    if (workspaceKeyByPath.has(folder.folderPath)) continue
    workspaceKeyByPath.set(folder.folderPath, folderWorkspaceKey(folder.id))
  }

  const lineageByChildKey: Record<WorkspaceKey, WorkspaceLineage> = {}
  for (const [worktreeId, lineage] of Object.entries(args.lineageById ?? {})) {
    const childWorkspaceKey = worktreeWorkspaceKey(worktreeId)
    // A parent id is either already a workspace key (a folder row's synthetic
    // `folder:<id>` id, which nest/create flows pass around as a worktree id) or a
    // bare worktree id.
    const parentWorkspaceKey = parseWorkspaceKey(lineage.parentWorktreeId)
      ? (lineage.parentWorktreeId as WorkspaceKey)
      : worktreeWorkspaceKey(lineage.parentWorktreeId)
    lineageByChildKey[childWorkspaceKey] = {
      childWorkspaceKey,
      childInstanceId: lineage.worktreeInstanceId || null,
      parentWorkspaceKey,
      parentInstanceId: lineage.parentWorktreeInstanceId || null,
      origin: lineage.origin,
      capture: lineage.capture,
      ...(lineage.taskId ? { taskId: lineage.taskId } : {}),
      ...(lineage.orchestrationRunId ? { orchestrationRunId: lineage.orchestrationRunId } : {}),
      ...(lineage.coordinatorHandle ? { coordinatorHandle: lineage.coordinatorHandle } : {}),
      ...(lineage.createdByTerminalHandle
        ? { createdByTerminalHandle: lineage.createdByTerminalHandle }
        : {}),
      createdAt: lineage.createdAt
    }
  }

  // The path map is the row menus' single writer, so it wins the same way the
  // worktree projection lets it win — and it is the only source that can name a
  // folder workspace as a parent.
  for (const [childPath, parentPath] of Object.entries(args.lineageByPath ?? {})) {
    const childWorkspaceKey = workspaceKeyByPath.get(childPath)
    const parentWorkspaceKey = workspaceKeyByPath.get(parentPath)
    if (!childWorkspaceKey || !parentWorkspaceKey) continue
    if (childWorkspaceKey === parentWorkspaceKey) continue
    lineageByChildKey[childWorkspaceKey] = {
      childWorkspaceKey,
      childInstanceId: getWorkspaceInstanceId(childWorkspaceKey, args.worktreeById),
      parentWorkspaceKey,
      parentInstanceId: getWorkspaceInstanceId(parentWorkspaceKey, args.worktreeById),
      origin: 'manual',
      capture: { source: 'manual-action', confidence: 'explicit' },
      createdAt: 0
    }
  }
  return lineageByChildKey
}

/**
 * Instance identity of a workspace key's owner. A folder workspace has no
 * checkout instance; the folder walk then matches on the key alone.
 */
function getWorkspaceInstanceId(
  workspaceKey: WorkspaceKey,
  worktreeById: ReadonlyMap<string, Worktree>
): string | null {
  const scope = parseWorkspaceKey(workspaceKey)
  if (scope?.type !== 'worktree') return null
  return worktreeById.get(scope.worktreeId)?.instanceId ?? null
}
