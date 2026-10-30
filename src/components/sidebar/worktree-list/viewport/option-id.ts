// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/rows/option-dom.ts
//
// The listbox option contract (D03a-089): every focusable row publishes a stable option id
// and the scroll container points `aria-activedescendant` at the mounted one.
//
// D03a-080: a folded lineage group owns the parent's option id; its inline children still
// publish their own ids, so an active child stays a valid `aria-activedescendant` target.
import type { RenderRow } from '../listing/render-row'

export function getWorktreeOptionId(rowKey: string): string {
  return `worktree-list-option-${encodeURIComponent(rowKey)}`
}

/** Option id of a painted row, or undefined when the row is not a focus target. */
export function getRowOptionId(row: RenderRow): string | undefined {
  if (row.type === 'lineage-group') {
    const parent = row.rows[0]
    return getWorktreeOptionId(parent ? parent.rowKey : row.key)
  }
  if (row.type === 'item') {
    return getWorktreeOptionId(row.rowKey)
  }
  if (row.type === 'folder-workspace') {
    return getWorktreeOptionId(row.key)
  }
  return undefined
}

/**
 * `aria-activedescendant` is only valid while the option it names is mounted — the
 * virtualizer unmounts everything outside its window, so an off-screen active row gets no
 * pointer instead of a dangling id. A lineage group mounts its whole subtree in one slot,
 * so an active descendant inside it is mounted whenever the group is.
 */
export function getActiveDescendantOptionId(args: {
  rows: readonly RenderRow[]
  virtualItems: readonly { index: number }[]
  activeOptionId: string | undefined
}): string | undefined {
  if (args.activeOptionId === undefined) {
    return undefined
  }
  for (const item of args.virtualItems) {
    const row = args.rows[item.index]
    if (!row) continue
    if (getRowOptionId(row) === args.activeOptionId) {
      return args.activeOptionId
    }
    if (
      row.type === 'lineage-group' &&
      row.rows.some((child) => getWorktreeOptionId(child.rowKey) === args.activeOptionId)
    ) {
      return args.activeOptionId
    }
  }
  return undefined
}
