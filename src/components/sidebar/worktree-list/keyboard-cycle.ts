// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Keyboard cycling over the rows the sidebar actually rendered. Orca reference:
// src/renderer/src/components/sidebar/worktree-keyboard-cycle.ts (resolveCycledWorktreeId).
// Pure module — zero React, zero hooks — so the shell handler stays a thin adapter.
import type { SidebarRow } from "./types";

/**
 * Keyboard-focusable identity of a rendered row. `rowIndex` is the row's position in the
 * flatRows projection so the caller can scroll the virtual viewport to the cycled target.
 * Status headers are separators (the groupBy=workspace-status vocabulary), and empty /
 * hidden-pill rows are feedback — none of them are focus targets.
 */
export type FocusableRowKey =
  | { type: "project"; id: string; rowIndex: number }
  | { type: "worktree"; id: string; rowIndex: number }
  | { type: "session"; id: string; rowIndex: number };

/**
 * Focusable rows in display order, taken from the rows the sidebar actually rendered, so
 * collapsed projects, active filters and the current groupBy drop out on their own.
 * Project rows key off `proj.id`, worktree rows off `wt.path`, session rows off `session.id`.
 */
export function getFocusableRowKeys(rows: readonly SidebarRow[]): FocusableRowKey[] {
  const result: FocusableRowKey[] = [];
  const seen = new Set<string>();
  rows.forEach((row, rowIndex) => {
    const entry: FocusableRowKey | null =
      row.type === "project-header"
        ? { type: "project", id: row.proj.id, rowIndex }
        : row.type === "worktree"
          ? { type: "worktree", id: row.wt.path, rowIndex }
          : row.type === "session"
            ? { type: "session", id: row.session.id, rowIndex }
            : null;
    if (!entry) return;
    // Why dedupe: a session under a nested project path prefix can surface in two projects'
    // sections; the cycle visits each identity once (Orca's `seen` set semantics).
    const key = `${entry.type}:${entry.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(entry);
  });
  return result;
}

/**
 * Pick the row ArrowUp/ArrowDown moves focus to, cycling with wrap-around within the rows
 * the sidebar is showing (Orca resolveCycledWorktreeId semantics).
 */
export function resolveCycledFocusKey(args: {
  keys: readonly FocusableRowKey[];
  focused: { type: FocusableRowKey["type"]; id: string } | null;
  direction: "up" | "down";
}): FocusableRowKey | null {
  const { keys, focused, direction } = args;
  if (keys.length === 0) return null;
  const currentIndex = focused ? keys.findIndex((k) => k.type === focused.type && k.id === focused.id) : -1;
  if (currentIndex === -1) {
    // Orca parity: the focused row can sit outside the projection (collapsed group, filter
    // change, groupBy switch) — enter from the end the keypress points away from.
    return (direction === "down" ? keys[0] : keys[keys.length - 1]) ?? null;
  }
  const step = direction === "down" ? 1 : -1;
  return keys[(currentIndex + step + keys.length) % keys.length] ?? null;
}
