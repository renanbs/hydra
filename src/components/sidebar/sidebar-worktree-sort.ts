// Sidebar sort: one entry point for the painted list, delegating the comparison to the
// ported Orca comparator (`smart-sort.ts`). The sidebar's menu predates the port and only
// knew name/recent/agent-activity; the comparator additionally implements Project (repo)
// and Manual, the recent-activity grace floor, and the trimmed-label name sort. Keeping
// the mapping here means the painted path and the closed-sidebar path cannot drift.
import type { Repo } from "../../shared/repo-types";
import type { Worktree } from "../../shared/worktree/types";
import {
  buildWorktreeComparator,
  buildWorktreeSortLabels,
  type SortBy,
} from "./smart-sort";
import type { WorktreeAttention } from "./smart-attention";

/** Values the display options may carry; `smart` is accepted from persisted prefs. */
export type SidebarSortMode =
  | "agent-activity"
  | "smart"
  | "name"
  | "recent"
  | "project"
  | "repo"
  | "manual";

/** The menu's legacy "Agent Activity" is the Orca `smart` comparator. */
export function resolveComparatorSortBy(mode: SidebarSortMode): SortBy {
  switch (mode) {
    case "agent-activity":
    case "smart":
      return "smart";
    case "project":
    case "repo":
      return "repo";
    case "manual":
      return "manual";
    case "recent":
      return "recent";
    case "name":
      return "name";
  }
}

/**
 * Overlay the fields the painted projection zeroes or loses: the row bridge stamps
 * `sortOrder: 0` and `lastActivityAt = createdAt`, and it has no `manualOrder` at all.
 * Manual and Recent sorts are meaningless without the store's values, so the caller
 * passes the persisted rows and they win by id (then by path, for legacy ids).
 */
export function applyPersistedWorktreeOrder(
  rows: readonly Worktree[],
  persisted: readonly Worktree[] | null | undefined
): Worktree[] {
  if (!persisted || persisted.length === 0) {
    return [...rows];
  }
  const byId = new Map<string, Worktree>();
  const byPath = new Map<string, Worktree>();
  for (const worktree of persisted) {
    byId.set(worktree.id, worktree);
    byPath.set(worktree.path, worktree);
  }
  return rows.map((row) => {
    const source = byId.get(row.id) ?? byPath.get(row.path);
    if (!source) {
      return row;
    }
    return {
      ...row,
      sortOrder: source.sortOrder,
      manualOrder: source.manualOrder,
      lastActivityAt: source.lastActivityAt,
      createdAt: source.createdAt,
    };
  });
}

/**
 * Sort one project's worktrees for the painted list.
 *
 * `attentionByWorktree` is keyed by worktree id and only read for the smart modes; pass
 * an empty map otherwise. `repoMap` only matters for Project sort (within one project the
 * repo name is constant, so the comparator falls through to the label).
 */
export function sortSidebarWorktrees(args: {
  worktrees: readonly Worktree[];
  mode: SidebarSortMode;
  repoMap: Map<string, Repo>;
  now: number;
  attentionByWorktree?: ReadonlyMap<string, WorktreeAttention>;
}): Worktree[] {
  const { worktrees, mode, repoMap, now } = args;
  const rows = [...worktrees];
  if (rows.length < 2) {
    return rows;
  }
  const labels = buildWorktreeSortLabels(rows);
  const attention = args.attentionByWorktree ?? new Map<string, WorktreeAttention>();
  return rows.sort(
    buildWorktreeComparator(resolveComparatorSortBy(mode), repoMap, now, new Map(attention), labels)
  );
}
