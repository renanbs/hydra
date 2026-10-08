// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/rows/item-row.tsx (drag wiring)
import React, { useContext } from 'react'
import { cn } from '../../../../lib/utils'
import { WorktreeSidebarDropIndicator } from '../../WorktreeSidebarDropIndicator'
import { WorktreeDragRowHandlersContext, WorktreeRowDragStateContext } from './worktree-drag-context'

/**
 * The row element a pointer drag measures, clones and animates.
 *
 * Why two nested divs: the drag attributes and the pointer handlers must sit on an
 * element whose client rect is the row's *static* slot, while the gap-opening offset
 * animates a wrapper inside it. Measuring the transformed element would feed every
 * frame's own animation back into the hit test.
 */
export function WorktreeDragRow({
  rowKey,
  worktreeId,
  worktreePath,
  style,
  children
}: {
  rowKey: string
  worktreeId: string
  worktreePath: string
  style?: React.CSSProperties
  children: React.ReactNode
}): React.JSX.Element {
  const handlers = useContext(WorktreeDragRowHandlersContext)
  const dragState = useContext(WorktreeRowDragStateContext)
  const groupKey = handlers?.groupKeyByRowKey.get(rowKey)
  const offset = dragState.previewOffsetsByWorktreeId.get(worktreeId) ?? 0
  const isDraggedRow = dragState.draggingWorktreeId === worktreeId

  return (
    <div
      data-worktree-path={worktreePath}
      data-worktree-drag-id={groupKey ? worktreeId : undefined}
      data-worktree-drag-group-key={groupKey}
      data-worktree-drag-group-index={groupKey ? handlers?.groupIndexByRowKey.get(rowKey) : undefined}
      className={cn('relative', isDraggedRow && 'pointer-events-none opacity-0')}
      style={style}
      onDragStartCapture={
        handlers && groupKey ? handlers.handleRowDragStartCapture : undefined
      }
      onPointerDown={
        handlers && groupKey
          ? (event) => handlers.handleRowPointerDown(event, rowKey, worktreeId)
          : undefined
      }
      onClickCapture={handlers && groupKey ? handlers.handleRowClickCapture : undefined}
    >
      <div
        className={cn(
          dragState.draggingWorktreeId !== null &&
            'transition-transform duration-150 ease-out will-change-transform'
        )}
        style={offset !== 0 ? { transform: `translateY(${offset}px)` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

/** The insertion line, drawn as a sibling of the rows so nothing reflows around it. */
export function WorktreeDragDropIndicator(): React.JSX.Element | null {
  const dragState = useContext(WorktreeRowDragStateContext)
  if (dragState.draggingWorktreeId === null || dragState.dropIndicatorY === null) {
    return null
  }
  return <WorktreeSidebarDropIndicator y={dragState.dropIndicatorY} />
}
