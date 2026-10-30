// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/rows/item-row.tsx
// (`renderWorktreeLineageDescendants`)
//
// D03a-080: a folded lineage group renders its descendants inside the parent card. The
// recursion mirrors Orca's: only rows one depth step below the parent become direct
// children, and every deeper run belongs to the child above it, so grandchildren nest in
// their own parent's card instead of flattening into the group.
import React from 'react'

import type { WorktreeRow } from '../grouping/row-types'

export type LineageToggleHandler = (event: React.MouseEvent<HTMLButtonElement>) => void

/** The descendant nodes of one parent row, or undefined when this branch is a leaf. */
export function renderWorktreeLineageDescendants(
  descendants: readonly WorktreeRow[],
  parentDepth: number,
  renderChild: (row: WorktreeRow, lineageChildren: React.ReactNode | undefined) => React.ReactNode
): React.ReactNode | undefined {
  const childNodes: React.ReactNode[] = []
  let cursor = 0
  while (cursor < descendants.length) {
    const child = descendants[cursor]
    if (!child || child.depth !== parentDepth + 1) {
      cursor++
      continue
    }

    let nextSiblingIndex = cursor + 1
    while (
      nextSiblingIndex < descendants.length &&
      (descendants[nextSiblingIndex]?.depth ?? 0) > child.depth
    ) {
      nextSiblingIndex++
    }

    const childLineageChildren = renderWorktreeLineageDescendants(
      descendants.slice(cursor + 1, nextSiblingIndex),
      child.depth,
      renderChild
    )
    childNodes.push(
      // Why: a nested child card lives inside the parent card's clickable body; bubbling
      // would select/edit/activate the parent too. Stopping at this wrapper (the inner row's
      // own handlers run first) keeps the child gesture on the child.
      <div
        key={child.rowKey}
        data-worktree-lineage-child=""
        data-worktree-lineage-depth={child.depth}
        data-worktree-lineage-last-child={child.isLastLineageChild ? '' : undefined}
        onClick={stopNestedWorktreeCardBubble}
        onDoubleClick={stopNestedWorktreeCardBubble}
        onDragStart={stopNestedWorktreeCardBubble}
        onPointerDown={stopNestedWorktreeCardBubble}
      >
        {renderChild(child, childLineageChildren)}
      </div>
    )
    cursor = nextSiblingIndex
  }
  return childNodes.length > 0 ? childNodes : undefined
}

/**
 * A nested card must not re-enter its parent's gesture pipeline. The child row's own
 * pointer-down/drag handlers already ran during the bubble, so stopping here only drops
 * the ancestor copy.
 */
export function stopNestedWorktreeCardBubble(event: React.SyntheticEvent): void {
  event.stopPropagation()
}

/**
 * One stable toggle handler per lineage group.
 *
 * Why: `WorktreeCard` is memoised; an inline arrow per row would hand `onLineageToggle`
 * a fresh identity every list render and defeat the bail-out for every lineage parent.
 * The cache is bounded by the number of lineage groups, and the handler records the
 * viewport's scroll anchor before collapsing so the rows below do not jump.
 */
export function createLineageToggleHandlerCache(
  toggleGroup: (groupKey: string) => void
): (groupKey: string) => LineageToggleHandler {
  const handlersByGroupKey = new Map<string, LineageToggleHandler>()
  return (groupKey: string) => {
    const cached = handlersByGroupKey.get(groupKey)
    if (cached) {
      return cached
    }
    const handler: LineageToggleHandler = (event) => {
      event.preventDefault()
      event.stopPropagation()
      toggleGroup(groupKey)
    }
    handlersByGroupKey.set(groupKey, handler)
    return handler
  }
}
