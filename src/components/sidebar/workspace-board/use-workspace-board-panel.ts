import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkspaceBoardDrawerLingering } from './use-workspace-board-drawer-lingering'

/**
 * Why: the board's Escape listener is capture-phase on document, so it runs before
 * React's handlers and a field inside the board cannot stop it. Any in-progress
 * edit (the board's search field, the sidebar search, an inline rename) therefore
 * keeps Escape for itself — the search field covers clear-then-close on its own.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  // xterm's hidden input textarea is not a real text field; treating it as one
  // would block Escape while a terminal has focus.
  if (target.classList.contains('xterm-helper-textarea')) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  return target.closest('input, textarea, select, [contenteditable=""]') !== null
}

/**
 * Why: Escape must dismiss interactive nested overlays before this companion
 * panel, but non-interactive tooltips should not trap it. The board's own sheet
 * is excluded by `data-workspace-board-sheet` — otherwise Escape could never
 * reach it.
 */
const WORKSPACE_BOARD_ESCAPE_BLOCKING_OVERLAY_SELECTOR = [
  '[data-slot="dropdown-menu-content"][data-state="open"]',
  '[data-slot="context-menu-content"][data-state="open"]',
  '[data-slot="popover-content"][data-state="open"]',
  '[data-slot="dialog-content"][data-state="open"]',
  '[role="dialog"][data-state="open"]:not([data-workspace-board-sheet])',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
].join(', ')

/** Hydra custom-event convention (`hydra:open-command-palette`, `hydra:refresh-ports`). */
export const TOGGLE_WORKSPACE_BOARD_EVENT = 'hydra:toggle-workspace-board'

export type WorkspaceBoardPanelState = {
  /** Whether the user has the board open — drives the sheet's `open` prop. */
  workspaceBoardOpen: boolean
  /**
   * Whether the drawer may stay mounted. Outlives `workspaceBoardOpen` by the
   * close animation, so the sheet does not flicker on its way out.
   */
  workspaceBoardRenderedOpen: boolean
  toggleWorkspaceBoard: () => void
  handleWorkspaceBoardOpenChange: (open: boolean) => void
}

/**
 * Ported from Orca `useWorkspaceBoardPanel` (the board menu is not part of this
 * increment, so its state is absent rather than inert).
 */
export function useWorkspaceBoardPanel(): WorkspaceBoardPanelState {
  const [workspaceBoardOpen, setWorkspaceBoardOpen] = useState(false)
  const workspaceBoardOpenRef = useRef(workspaceBoardOpen)
  workspaceBoardOpenRef.current = workspaceBoardOpen
  const renderedOpen = useWorkspaceBoardDrawerLingering(workspaceBoardOpen)

  const openWorkspaceBoard = useCallback(() => {
    if (workspaceBoardOpenRef.current) {
      return
    }
    workspaceBoardOpenRef.current = true
    setWorkspaceBoardOpen(true)
  }, [])

  const closeWorkspaceBoard = useCallback(() => {
    workspaceBoardOpenRef.current = false
    setWorkspaceBoardOpen(false)
  }, [])

  const handleWorkspaceBoardOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        openWorkspaceBoard()
        return
      }
      closeWorkspaceBoard()
    },
    [closeWorkspaceBoard, openWorkspaceBoard]
  )

  const toggleWorkspaceBoard = useCallback(() => {
    if (workspaceBoardOpenRef.current) {
      closeWorkspaceBoard()
      return
    }
    openWorkspaceBoard()
  }, [closeWorkspaceBoard, openWorkspaceBoard])

  useEffect(() => {
    if (!workspaceBoardOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return
      }
      if (isEditableTarget(event.target)) {
        return
      }
      if (document.querySelector(WORKSPACE_BOARD_ESCAPE_BLOCKING_OVERLAY_SELECTOR)) {
        return
      }
      event.preventDefault()
      closeWorkspaceBoard()
    }

    // Why: the workspace board is a non-modal companion panel, so focus may be
    // outside the sheet when Escape should still dismiss it.
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [closeWorkspaceBoard, workspaceBoardOpen])

  useEffect(() => {
    window.addEventListener(TOGGLE_WORKSPACE_BOARD_EVENT, toggleWorkspaceBoard)
    return () => window.removeEventListener(TOGGLE_WORKSPACE_BOARD_EVENT, toggleWorkspaceBoard)
  }, [toggleWorkspaceBoard])

  return {
    workspaceBoardOpen,
    workspaceBoardRenderedOpen: renderedOpen,
    toggleWorkspaceBoard,
    handleWorkspaceBoardOpenChange,
  }
}
