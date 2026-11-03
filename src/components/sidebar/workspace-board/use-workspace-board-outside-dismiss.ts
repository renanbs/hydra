import { useEffect } from 'react'
import type React from 'react'

/**
 * Surfaces a click on which must NOT count as "outside the board".
 *
 * Why a selector and not DOM containment: board-owned menus, popovers, context
 * menus, confirmation dialogs and toasts portal to `document.body`, so a click in
 * them is not a child of the sheet and would otherwise dismiss the board the user
 * is still editing. `[data-workspace-board-preserve-open]` is the explicit escape
 * hatch for surfaces that are neither Radix nor sonner.
 */
const WORKSPACE_BOARD_KEEP_OPEN_SELECTOR = [
  '[data-workspace-board-trigger]',
  '[data-workspace-board-preserve-open]',
  '[data-workspace-status-appearance-popover]',
  '[data-contextual-tour-overlay]',
  '[data-contextual-tour-panel]',
  '[data-radix-popper-content-wrapper]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="context-menu-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="dialog-content"]',
  '[data-slot="dialog-overlay"]',
  '[data-sonner-toast]',
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
].join(', ')

/** Whether the event target belongs to a surface the board must stay open for. */
export function isWorkspaceBoardKeepOpenTarget(target: EventTarget | null): boolean {
  const element =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null
  return Boolean(element?.closest(WORKSPACE_BOARD_KEEP_OPEN_SELECTOR))
}

/**
 * Ported from Orca `useWorkspaceKanbanOutsideDismiss`: the board is a non-modal
 * companion panel, so a press that lands in the canvas to its right dismisses it.
 *
 * Why the right edge only: the sheet starts at the sidebar's edge and the
 * sidebar owns its own clicks. Left of the live sheet edge the user is still
 * working in the sidebar, which must not close the board.
 */
export function useWorkspaceBoardOutsideDismiss(params: {
  open: boolean
  boardRef: React.RefObject<HTMLElement | null>
  /** A board-owned menu/popover is open; the board keeps its state for it. */
  preserveOpenForMenu: boolean
  onOpenChange: (open: boolean) => void
}): void {
  const { open, boardRef, preserveOpenForMenu, onOpenChange } = params

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent): void => {
      const content = boardRef.current?.closest<HTMLElement>('[data-slot="sheet-content"]')
      if (!content || preserveOpenForMenu) {
        return
      }
      if (event.target instanceof Node && content.contains(event.target)) {
        return
      }
      if (isWorkspaceBoardKeepOpenTarget(event.target)) {
        return
      }
      const rect = content.getBoundingClientRect()
      if (event.clientX > rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
        onOpenChange(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [boardRef, onOpenChange, open, preserveOpenForMenu])
}
