// Orca `use-reveal-requests` lookups: a reveal by row key must match the painted
// row union, and a reveal by worktree prefers the item row over a header that
// merely contains it.
//
// D03a-080: a lineage group is one painted row that contains a whole subtree, so a
// reveal naming a child lands on the group's index — the child itself is painted inline
// and never owns a virtual slot of its own.
import type { FolderWorkspace } from "../../../../shared/folder-workspace-types";
import { getWorktreeHostIdentity } from "../../../../shared/worktree/host-qualified-identity";
import type { Worktree } from "../../../../shared/worktree/types";
import { PINNED_GROUP_KEY } from "../grouping/group-keys";
import { getRenderRowItemRows, type RenderRow } from "./render-row";

export function rowKeyMatchesRenderRow(row: RenderRow, key: string): boolean {
  if (row.type === "lineage-group") {
    return row.rows.some((item) => item.rowKey === key);
  }
  if (row.type === "item") return row.rowKey === key;
  return "key" in row && row.key === key;
}

export function renderRowContainsWorktree(
  row: RenderRow,
  worktree: Pick<Worktree, "id" | "hostId" | "path">,
  folderWorkspaces: readonly FolderWorkspace[] = []
): boolean {
  if (row.type === "lineage-group") {
    return row.rows.some(
      (item) => getWorktreeHostIdentity(item.worktree) === getWorktreeHostIdentity(worktree)
    );
  }
  if (row.type === "item") {
    return getWorktreeHostIdentity(row.worktree) === getWorktreeHostIdentity(worktree);
  }
  if (row.type === "folder-workspace") {
    return (
      row.folderWorkspace.folderPath === worktree.path ||
      folderWorkspaces.some(
        (folderWorkspace) => folderWorkspace.id === worktree.id
      )
    );
  }
  // Section headers carry the ids they paint; host-qualified matching is not
  // possible there, so compare the bare id.
  return (
    row.type === "header" &&
    (row.worktreeIds?.includes(worktree.id) === true)
  );
}

/**
 * Prefer the row that IS the worktree (item, or the lineage group painting it) over a
 * section header that contains it; fall back to the first containing row so a collapsed
 * section still yields a scroll target.
 */
export function findPreferredRenderRowIndexForWorktree(
  rows: readonly RenderRow[],
  worktree: Pick<Worktree, "id" | "hostId" | "path">,
  folderWorkspaces: readonly FolderWorkspace[] = []
): number {
  let fallback = -1;
  let pinnedFallback = -1;
  const identity = getWorktreeHostIdentity(worktree);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row || !renderRowContainsWorktree(row, worktree, folderWorkspaces)) {
      continue;
    }
    const itemRow = getRenderRowItemRows(row).find(
      (item) => getWorktreeHostIdentity(item.worktree) === identity
    );
    if (itemRow) {
      // Why: under `duplicate-in-groups` the same workspace paints in Pinned and
      // in its natural section; the natural copy is the canonical reveal target.
      if (itemRow.sectionKey !== PINNED_GROUP_KEY) {
        return index;
      }
      if (pinnedFallback < 0) {
        pinnedFallback = index;
      }
      continue;
    }
    if (fallback < 0) {
      fallback = index;
    }
  }
  return pinnedFallback >= 0 ? pinnedFallback : fallback;
}

/**
 * Resolve the row a path reveal should scroll to.
 *
 * Folder-workspace reveals keep their exact row. Worktree reveals go through
 * {@link findPreferredRenderRowIndexForWorktree} so a Pinned duplicate or a
 * collapsed header never wins over the expanded natural row — and a child folded
 * into its parent's lineage group resolves to that group's slot.
 */
export function findRevealRowIndex(
  rows: readonly RenderRow[],
  revealPath: string
): number {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row) continue;
    if (row.type === "folder-workspace" && row.folderWorkspace.folderPath === revealPath) {
      return index;
    }
    if (row.type === "item" && row.worktree.path === revealPath) {
      return findPreferredRenderRowIndexForWorktree(rows, row.worktree);
    }
    if (
      row.type === "lineage-group" &&
      row.rows.some((item) => item.worktree.path === revealPath)
    ) {
      const worktree = row.rows.find((item) => item.worktree.path === revealPath)!.worktree;
      return findPreferredRenderRowIndexForWorktree(rows, worktree);
    }
  }
  return -1;
}
