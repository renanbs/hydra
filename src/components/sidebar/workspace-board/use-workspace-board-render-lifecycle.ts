import { startTransition, useEffect, useState } from 'react'
import type React from 'react'
import { isWorkspaceBoardKeepOpenTarget } from './use-workspace-board-outside-dismiss'

/**
 * Ported from Orca `useWorkspaceKanbanRenderLifecycle`: the board's header, sheet
 * and lane shells paint immediately, but the cards wait one animation frame and
 * mount inside a transition. Opening a board with hundreds of rich cards then
 * never blocks the sheet's first frame.
 *
 * Why the cancel: the pointerup may close the board before the frame fires, and
 * a card mount for a board nobody can see is pure cost. The effect's cleanup
 * clears both the frame and the flag, so a reopen starts from "wait one frame".
 *
 * The second effect is Orca's outside selection clear: a press outside the
 * sheet that is not a keep-open surface discards the card selection. Menus,
 * popovers and dialogs are excluded because they are board-owned interactions,
 * not an exit.
 */
export function useWorkspaceBoardRenderLifecycle(args: {
  boardRef: React.RefObject<HTMLElement | null>
  clearSelection: () => void
  open: boolean
  selectedCount: number
}): boolean {
  const { boardRef, clearSelection, open, selectedCount } = args
  const [renderCards, setRenderCards] = useState(false)

  useEffect(() => {
    if (!open) {
      setRenderCards(false)
      return
    }
    let cancelled = false
    const frameId = window.requestAnimationFrame(() => {
      startTransition(() => {
        if (!cancelled) {
          setRenderCards(true)
        }
      })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
    }
  }, [open])

  useEffect(() => {
    if (!open || selectedCount === 0) {
      return
    }
    const clearSelectionOutsideBoard = (event: PointerEvent): void => {
      const content = boardRef.current?.closest<HTMLElement>('[data-slot="sheet-content"]')
      const target = event.target
      if (target instanceof Node && content?.contains(target)) {
        return
      }
      if (isWorkspaceBoardKeepOpenTarget(target)) {
        return
      }
      clearSelection()
    }
    document.addEventListener('pointerdown', clearSelectionOutsideBoard, true)
    return () => document.removeEventListener('pointerdown', clearSelectionOutsideBoard, true)
  }, [boardRef, clearSelection, open, selectedCount])

  return renderCards
}
