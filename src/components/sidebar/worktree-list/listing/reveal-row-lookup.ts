// Orca `use-reveal-requests` lookups: a reveal by row key must match the painted
// row union, and a reveal by worktree prefers the item row over a header that
// merely contains it.
import type { FolderWorkspace } from "../../../../shared/folder-workspace-types";
import { getWorktreeHostIdentity } from "../../../../shared/worktree/host-qualified-identity";
import type { Worktree } from "../../../../shared/worktree/types";
import type { HostSectionRow } from "../../host-section-rows";

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
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.type === "item" && renderRowContainsWorktree(row, worktree, folderWorkspaces)) {
      return index;
    }
    if (fallback < 0 && renderRowContainsWorktree(row, worktree, folderWorkspaces)) {
      fallback = index;
    }
  }
  return fallback;
}
