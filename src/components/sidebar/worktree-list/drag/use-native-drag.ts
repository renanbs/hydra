// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/use-native-drag.ts
//
// The card's own HTML5 drag is the second way a row starts a session. It publishes
// through the same context and session as the pointer gesture, so a preview decided
// by one path is a commit the other path could make too.
import { useCallback } from 'react'
import type React from 'react'
import { getExecutionHostIdFromWorktreeHostIdentity } from '../../../../shared/worktree/host-qualified-identity'
import { getWorktreeSidebarDragRectsForGroup } from '../../worktree-sidebar-drag-autoscroll'
import { getWorktreeSidebarDragGrab } from '../../worktree-sidebar-drag-geometry'
import type { ExecutionHostId } from '../../../../shared/execution-host'
import type { WorktreeDropCommitContext } from './drop-commit-context'
import {
  clearWorktreeLineageDropTargetVisual,
  findWorktreeNestingTarget,
  updateWorktreeLineageDropTargetVisual
} from './nesting'
import { findSidebarSectionDropTarget, updateSidebarSectionDropVisual } from './section-drop'
import {
  applyWorktreeDropPreview,
  applyWorktreeLineageDropPreview,
  clearWorktreeDropPreview,
  clearWorktreeLineageDropPreview,
  EMPTY_WORKTREE_DRAG_PREVIEW_OFFSETS
} from './row-state'
import type { WorktreeDragRuntime } from './use-runtime'
import type { WorktreeDragSession } from './use-session'

/** The payload the native row drag publishes; it names the row drag, not a file. */
export const WORKTREE_NATIVE_DRAG_TYPE = 'application/x-hydra-worktree-row'

export type WorktreeRowNativeDragHandlers = {
  handleRowDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    rowKey: string,
    worktreeId: string
  ) => void
  handleRowDragOver: (event: React.DragEvent<HTMLDivElement>) => void
  handleRowDragEnd: () => void
}

function getHostExecutionHostId(element: Element): ExecutionHostId | undefined {
  const identity = element
    .closest<HTMLElement>('[data-worktree-host-identity]')
    ?.getAttribute('data-worktree-host-identity')
  return identity ? getExecutionHostIdFromWorktreeHostIdentity(identity) : undefined
}

/**
 * Starts the shared session from a native `dragstart` and drives the preview from
 * `dragover`. The commit itself is never done here: the release reaches
 * `useWorktreeDocumentDrop`, which commits through `commitWorktreeDropAtPoint`.
 */
export function useWorktreeNativeDrag(args: {
  ctx: WorktreeDropCommitContext
  session: WorktreeDragSession
  runtime: WorktreeDragRuntime
}): WorktreeRowNativeDragHandlers {
  const { ctx, session, runtime } = args
  const {
    nativeDragActiveRef,
    dragExecutionHostIdRef,
    worktreePointerDragRef,
    setWorktreeDragState
  } = runtime

  const handleRowDragStart = useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      rowKey: string,
      worktreeId: string
    ): void => {
      // Why: while a press owns the gesture its native drag is already cancelled; a
      // second session would only fight the pointer preview.
      if (worktreePointerDragRef.current) {
        return
      }
      const sourceGroupKey = session.groupKeyByRowKey.get(rowKey)
      // Why the payload guard: a synthetic dragstart (tests, some embedding shells)
      // has no data transfer, and a gesture that cannot publish a payload cannot be
      // delivered to any drop target either.
      if (!sourceGroupKey || !event.dataTransfer) {
        return
      }
      const draggedIds = ctx.resolveDraggedWorktreeIds(rowKey, worktreeId)
      const reorderDraggedIds = session.getReorderDraggedIds(draggedIds)
      const reorderUnitDraggedIds = session.getReorderUnitDraggedIds(
        sourceGroupKey,
        reorderDraggedIds
      )
      const container = ctx.scrollRef.current
      const rects = container
        ? getWorktreeSidebarDragRectsForGroup(container, sourceGroupKey)
        : []
      const sourceRect = event.currentTarget.getBoundingClientRect()
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(WORKTREE_NATIVE_DRAG_TYPE, worktreeId)
      session.worktreeDragSessionRef.current = {
        draggingWorktreeId: worktreeId,
        sourceGroupKey,
        draggedIds,
        reorderDraggedIds,
        reorderUnitDraggedIds,
        rects,
        grab: getWorktreeSidebarDragGrab({
          offsetY: event.clientY - sourceRect.top,
          height: sourceRect.height
        }),
        anchor: null
      }
      nativeDragActiveRef.current = true
      dragExecutionHostIdRef.current = getHostExecutionHostId(event.currentTarget)
      setWorktreeDragState({
        draggingWorktreeId: worktreeId,
        dropIndex: null,
        dropIndicatorY: null,
        lineageDropTargetId: null,
        previewOffsetsByWorktreeId: EMPTY_WORKTREE_DRAG_PREVIEW_OFFSETS
      })
    },
    [
      ctx,
      dragExecutionHostIdRef,
      nativeDragActiveRef,
      session,
      setWorktreeDragState,
      worktreePointerDragRef
    ]
  )

  const handleRowDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      if (!nativeDragActiveRef.current) {
        return
      }
      if (!session.refreshWorktreeDragSession()) {
        runtime.clearWorktreeDrag()
        return
      }
      const dragSession = session.worktreeDragSessionRef.current
      const sectionTarget = findSidebarSectionDropTarget(event.clientX, event.clientY)
      updateSidebarSectionDropVisual(sectionTarget)
      if (sectionTarget) {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        clearWorktreeLineageDropTargetVisual()
        setWorktreeDragState((previous) =>
          clearWorktreeDropPreview(clearWorktreeLineageDropPreview(previous), {
            preserveOffsets: true
          })
        )
        return
      }
      const nestingTarget = dragSession
        ? findWorktreeNestingTarget({
            pointerX: event.clientX,
            pointerY: event.clientY,
            draggedIds: dragSession.draggedIds,
            parentIdByChildId: ctx.lineageParentIdByChildId
          })
        : null
      updateWorktreeLineageDropTargetVisual(nestingTarget)
      if (nestingTarget) {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setWorktreeDragState((previous) =>
          applyWorktreeLineageDropPreview(previous, nestingTarget)
        )
        return
      }
      const drop = ctx.computeWorktreeDrop(event.clientY)
      if (!drop) {
        setWorktreeDragState((previous) =>
          clearWorktreeDropPreview(clearWorktreeLineageDropPreview(previous))
        )
        return
      }
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setWorktreeDragState((previous) => applyWorktreeDropPreview(previous, drop))
    },
    [ctx, nativeDragActiveRef, runtime, session, setWorktreeDragState]
  )

  const handleRowDragEnd = useCallback((): void => {
    if (!nativeDragActiveRef.current) {
      return
    }
    // Why: a release over the document is committed by the capture listener before
    // `dragend` runs; either way the session must not survive the gesture.
    runtime.clearWorktreeDrag()
  }, [nativeDragActiveRef, runtime])

  return { handleRowDragStart, handleRowDragOver, handleRowDragEnd }
}
