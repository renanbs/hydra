// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: worktree-list/navigation/use-active-row.ts
//
// A workspace can paint twice when the Pinned section duplicates a card. Exactly one
// copy is the primary active surface; the other is secondary, so the ring/activation
// never looks like two selected workspaces.
import type { HostSectionRow } from "../../host-section-rows";
import type { WorktreeRow } from "../grouping/row-types";

export type ActiveSurfaceVariant = "primary" | "secondary";

export function resolvePrimaryActiveRowKey(
  rows: readonly HostSectionRow[],
  activeWorktreePath: string | null | undefined,
  pinnedSectionKey: string
): string | null {
  if (!activeWorktreePath) {
    return null;
  }
  const matches = rows.filter(
    (row): row is WorktreeRow =>
      row.type === "item" && row.worktree.path === activeWorktreePath
  );
  if (matches.length === 0) {
    return null;
  }
  // Why prefer the non-pinned copy: the Pinned section is a mirror; the natural row
  // is the one the user is looking at when they are not in the pinned section.
  const natural = matches.find((row) => row.sectionKey !== pinnedSectionKey);
  return (natural ?? matches[0])?.rowKey ?? null;
}

export function resolveActiveSurfaceVariant(
  rowKey: string,
  primaryRowKey: string | null
): ActiveSurfaceVariant | undefined {
  if (!primaryRowKey) {
    return undefined;
  }
  return rowKey === primaryRowKey ? "primary" : "secondary";
}
