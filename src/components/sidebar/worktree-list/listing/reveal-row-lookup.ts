// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/navigation/render-row-lookup.ts
//
// Render-row lookups for navigation and reveal (D03a-067). Hydra paints flat host
// sections instead of Orca's render-row union: a header's `worktreeIds` is the only
// containment relation left, so "the item row wins over a containing header" means a
// collapsed header must never shadow a rendered item row for the same workspace.
import type { ExecutionHostId } from '../../../../shared/execution-host'
import { folderWorkspaceKey } from '../../../../shared/workspace-scope'
import { getWorktreeHostIdentity } from '../../../../shared/worktree/host-qualified-identity'
import type { HostSectionRow } from '../../host-section-rows'
import { PINNED_GROUP_KEY } from '../grouping/group-keys'
import type { PinnedWorktreeDisplayPolicy, WorktreeRow } from '../grouping/row-types'

/** Sidebar key a row is addressable by (Orca `getRenderRowSidebarKey`). */
export function getHostSectionRowKey(row: HostSectionRow): string | null {
  switch (row.type) {
    case 'header':
      return row.key
    case 'item':
      return row.rowKey
    case 'folder-workspace':
      return folderWorkspaceKey(row.folderWorkspace.id)
    case 'pending-creation':
      return `pending:${row.creationId}`
    case 'imported-worktrees-card':
    case 'new-external-worktrees-inbox':
      return row.key
    case 'host-header':
      return null
  }
}

export function rowKeyMatchesRenderRow(row: HostSectionRow, rowKey: string): boolean {
  return getHostSectionRowKey(row) === rowKey
}

function itemMatchesWorktree(
  item: WorktreeRow,
  worktreeId: string,
  executionHostId?: ExecutionHostId
): boolean {
  if (item.worktree.id !== worktreeId) {
    return false
  }
  // Why: a repo checked out on two hosts publishes the same id twice; a
  // host-qualified lookup must not land on the sibling host's row.
  return (
    executionHostId === undefined ||
    getWorktreeHostIdentity(item.worktree) ===
      getWorktreeHostIdentity({ id: worktreeId, hostId: executionHostId })
  )
}

function getRowWorktreeItem(
  row: HostSectionRow,
  worktreeId: string,
  executionHostId?: ExecutionHostId
): WorktreeRow | null {
  return row.type === 'item' && itemMatchesWorktree(row, worktreeId, executionHostId)
    ? row
    : null
}

function headerContainsWorktree(row: HostSectionRow, worktreeId: string): boolean {
  return row.type === 'header' && (row.worktreeIds?.includes(worktreeId) ?? false)
}

/**
 * True when the row paints the workspace, directly (item/folder row) or
 * indirectly (a collapsed header whose `worktreeIds` still names it).
 */
export function renderRowContainsWorktree(
  row: HostSectionRow,
  worktreeId: string | null,
  executionHostId?: ExecutionHostId
): boolean {
  if (worktreeId === null) {
    return false
  }
  if (row.type === 'folder-workspace') {
    return folderWorkspaceKey(row.folderWorkspace.id) === worktreeId
  }
  return (
    getRowWorktreeItem(row, worktreeId, executionHostId) !== null ||
    headerContainsWorktree(row, worktreeId)
  )
}

/**
 * Prefer the workspace's natural-group item row over its Pinned duplicate, and an
 * item row over a header that merely contains it. Falls back to the first row that
 * contains the workspace when nothing is expanded yet.
 */
export function findPreferredRenderRowIndexForWorktree(
  rows: readonly HostSectionRow[],
  worktreeId: string,
  pinnedDisplayPolicy: PinnedWorktreeDisplayPolicy,
  executionHostId?: ExecutionHostId
): number {
  let fallbackIndex = -1
  let pinnedIndex = -1
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    if (!renderRowContainsWorktree(row, worktreeId, executionHostId)) {
      continue
    }
    if (fallbackIndex === -1) {
      fallbackIndex = index
    }
    const itemRow = getRowWorktreeItem(row, worktreeId, executionHostId)
    if (!itemRow) {
      // Header-only containment: keep walking, an item row may still follow.
      continue
    }
    if (itemRow.sectionKey !== PINNED_GROUP_KEY) {
      return index
    }
    // Why: under `duplicate-in-groups` the same workspace paints twice; the
    // natural-group copy is the canonical reveal target (Orca's comparator).
    if (pinnedDisplayPolicy === 'duplicate-in-groups' && pinnedIndex === -1) {
      pinnedIndex = index
    }
  }
  return pinnedIndex !== -1 ? pinnedIndex : fallbackIndex
}

/**
 * Resolve the row a path reveal should scroll to.
 *
 * Folder-workspace reveals keep their exact row. Worktree reveals go through
 * {@link findPreferredRenderRowIndexForWorktree} so a pinned duplicate or a
 * collapsed header never wins over the expanded natural row.
 */
export function findRevealRowIndex(
  rows: readonly HostSectionRow[],
  revealPath: string,
  pinnedDisplayPolicy: PinnedWorktreeDisplayPolicy = 'single-location'
): number {
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    if (row.type === 'folder-workspace' && row.folderWorkspace.folderPath === revealPath) {
      return index
    }
    if (row.type === 'item' && row.worktree.path === revealPath) {
      return findPreferredRenderRowIndexForWorktree(
        rows,
        row.worktree.id,
        pinnedDisplayPolicy,
        row.worktree.hostId
      )
    }
  }
  return -1
}
