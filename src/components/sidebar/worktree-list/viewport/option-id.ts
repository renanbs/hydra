// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/rows/option-dom.ts
//
// The listbox option contract (D03a-089): every focusable row publishes a stable option id
// and the scroll container points `aria-activedescendant` at the mounted one.
import type { HostSectionRow } from '../../host-section-rows'

export function getWorktreeOptionId(rowKey: string): string {
  return `worktree-list-option-${encodeURIComponent(rowKey)}`
}

/** Option id of a painted row, or undefined when the row is not a focus target. */
export function getRowOptionId(row: HostSectionRow): string | undefined {
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
 * pointer instead of a dangling id.
 */
export function getActiveDescendantOptionId(args: {
  rows: readonly HostSectionRow[]
  virtualItems: readonly { index: number }[]
  activeOptionId: string | undefined
}): string | undefined {
  if (args.activeOptionId === undefined) {
    return undefined
  }
  for (const item of args.virtualItems) {
    const row = args.rows[item.index]
    if (row && getRowOptionId(row) === args.activeOptionId) {
      return args.activeOptionId
    }
  }
  return undefined
}
