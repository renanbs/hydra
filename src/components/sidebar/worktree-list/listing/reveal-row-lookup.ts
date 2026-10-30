// Orca `use-reveal-requests` lookups: a reveal by row key must match the painted
// row union, and a reveal by worktree prefers the item row over a header that
// merely contains it.
import type { FolderWorkspace } from "../../../../shared/folder-workspace-types";
import { getWorktreeHostIdentity } from "../../../../shared/worktree/host-qualified-identity";
import type { Worktree } from "../../../../shared/worktree/types";
import type { HostSectionRow } from "../../host-section-rows";
import { PINNED_GROUP_KEY } from "../grouping/group-keys";

export function rowKeyMatchesRenderRow(row: HostSectionRow, key: string): boolean {
  if (row.type === "item") return row.rowKey === key;
  return "key" in row && row.key === key;
}

export function renderRowContainsWorktree(
  row: HostSectionRow,
  worktree: Pick<Worktree, "id" | "hostId" | "path">,
  folderWorkspaces: readonly FolderWorkspace[] = []
): boolean {
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
 * Prefer the row that IS the worktree (item) over a section header that contains
 * it; fall back to the first containing row so a collapsed section still yields a
 * scroll target.
 */
export function findPreferredRenderRowIndexForWorktree(
  rows: readonly HostSectionRow[],
  worktree: Pick<Worktree, "id" | "hostId" | "path">,
  folderWorkspaces: readonly FolderWorkspace[] = []
): number {
  let fallback = -1;
  let pinnedFallback = -1;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.type === "item" && renderRowContainsWorktree(row, worktree, folderWorkspaces)) {
      // Why: under `duplicate-in-groups` the same workspace paints in Pinned and
      // in its natural section; the natural copy is the canonical reveal target.
      if (row.sectionKey !== PINNED_GROUP_KEY) {
        return index;
      }
      if (pinnedFallback < 0) {
        pinnedFallback = index;
      }
      continue;
    }
    if (fallback < 0 && renderRowContainsWorktree(row, worktree, folderWorkspaces)) {
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
 * collapsed header never wins over the expanded natural row.
 */
export function findRevealRowIndex(
  rows: readonly HostSectionRow[],
  revealPath: string
): number {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.type === "folder-workspace" && row.folderWorkspace.folderPath === revealPath) {
      return index;
    }
    if (row.type === "item" && row.worktree.path === revealPath) {
      return findPreferredRenderRowIndexForWorktree(rows, row.worktree);
    }
  }
  return -1;
}
