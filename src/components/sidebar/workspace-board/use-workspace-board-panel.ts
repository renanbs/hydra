import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store'
import { useWorkspaceBoardDrawerLingering } from './use-workspace-board-drawer-lingering'
import { isWorkspaceBoardTextEntryTarget } from './workspace-board-keyboard'

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

/** Hydra custom-event convention (`hydra:open-jump-palette`, `hydra:refresh-ports`). */
export const TOGGLE_WORKSPACE_BOARD_EVENT = 'hydra:toggle-workspace-board'

export type WorkspaceBoardPanelState = {
  /** Whether the user has the board open — drives the sheet's `open` prop. */
  workspaceBoardOpen: boolean
  /**
   * Whether the drawer may stay mounted: a drag preview or the close animation.
   * Orca opens the board as a *preview* while a card is dragged, without
   * counting it as a user open.
   */
  workspaceBoardRenderedOpen: boolean
  /** A card drag opened the board; it is not a user open until the drag commits. */
  workspaceBoardDragPreviewOpen: boolean
  /**
   * A board-owned menu/popover is open. The outside dismiss and Escape must leave
   * the board alone while a menu owns the interaction.
   */
  workspaceBoardMenuOpen: boolean
  openWorkspaceBoard: () => void
  closeWorkspaceBoard: () => void
  toggleWorkspaceBoard: () => void
  handleWorkspaceBoardOpenChange: (open: boolean) => void
  setWorkspaceBoardMenuOpen: (open: boolean) => void
  previewWorkspaceBoardFromDrag: () => void
  solidifyWorkspaceBoardFromDrag: () => void
  cancelWorkspaceBoardDragPreview: () => void
}

/**
 * Ported from Orca `useWorkspaceBoardPanel`.
 *
 * Why the preview is not `workspaceBoardOpen`: the board is rendered during a
 * sidebar drag so its lanes are a visible destination, but a cancelled drag must
 * close it without ever having counted as a user open — and only the solidify
 * records the feature interaction.
 */
export function useWorkspaceBoardPanel(): WorkspaceBoardPanelState {
  const [workspaceBoardOpen, setWorkspaceBoardOpen] = useState(false)
  const [workspaceBoardDragPreviewOpen, setWorkspaceBoardDragPreviewOpen] = useState(false)
  const [workspaceBoardMenuOpen, setWorkspaceBoardMenuOpenState] = useState(false)
  const workspaceBoardOpenRef = useRef(workspaceBoardOpen)
  const workspaceBoardDragPreviewOpenRef = useRef(workspaceBoardDragPreviewOpen)
  workspaceBoardOpenRef.current = workspaceBoardOpen
  workspaceBoardDragPreviewOpenRef.current = workspaceBoardDragPreviewOpen
  const renderedOpen = useWorkspaceBoardDrawerLingering(
    workspaceBoardOpen || workspaceBoardDragPreviewOpen
  )

  const openWorkspaceBoard = useCallback(() => {
    if (workspaceBoardOpenRef.current) {
      // A user open replaces a preview: the board stays, the preview flag clears.
      if (workspaceBoardDragPreviewOpenRef.current) {
        workspaceBoardDragPreviewOpenRef.current = false
        setWorkspaceBoardDragPreviewOpen(false)
      }
      return
    }
    workspaceBoardOpenRef.current = true
    workspaceBoardDragPreviewOpenRef.current = false
    // Why here, not in a drawer effect: opening is the user action, and recording
    // it here is the only place that knows a preview was not one.
    useAppStore.getState().recordFeatureInteraction('workspace-board')
    setWorkspaceBoardOpen(true)
    setWorkspaceBoardDragPreviewOpen(false)
  }, [])

  const closeWorkspaceBoard = useCallback(() => {
    workspaceBoardOpenRef.current = false
    workspaceBoardDragPreviewOpenRef.current = false
    setWorkspaceBoardOpen(false)
    setWorkspaceBoardDragPreviewOpen(false)
    // Why: a menu that portals to body would otherwise outlive the board it edits.
    setWorkspaceBoardMenuOpenState(false)
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

  // Orca `previewWorkspaceBoardFromDrag`: a card drag opens the board so its lanes are a
  // visible destination from the first frame; the preview is not a user-open.
  const previewWorkspaceBoardFromDrag = useCallback(() => {
    if (workspaceBoardOpenRef.current || workspaceBoardDragPreviewOpenRef.current) {
      return
    }
    workspaceBoardDragPreviewOpenRef.current = true
    setWorkspaceBoardDragPreviewOpen(true)
  }, [])

  const solidifyWorkspaceBoardFromDrag = useCallback(() => {
    if (workspaceBoardOpenRef.current) {
      if (workspaceBoardDragPreviewOpenRef.current) {
        workspaceBoardDragPreviewOpenRef.current = false
        setWorkspaceBoardDragPreviewOpen(false)
      }
      return
    }
    workspaceBoardOpenRef.current = true
    workspaceBoardDragPreviewOpenRef.current = false
    // Why telemetry here: a drag that reaches the board IS a user open, including
    // the one the preview already rendered.
    useAppStore.getState().recordFeatureInteraction('workspace-board')
    setWorkspaceBoardOpen(true)
    setWorkspaceBoardDragPreviewOpen(false)
  }, [])

  const cancelWorkspaceBoardDragPreview = useCallback(() => {
    if (!workspaceBoardDragPreviewOpenRef.current) {
      return
    }
    workspaceBoardDragPreviewOpenRef.current = false
    setWorkspaceBoardDragPreviewOpen(false)
  }, [])

  const setWorkspaceBoardMenuOpen = useCallback((open: boolean) => {
    setWorkspaceBoardMenuOpenState(open)
  }, [])

  useEffect(() => {
    if (!workspaceBoardOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return
      }
      if (workspaceBoardMenuOpen) {
        return
      }
      // Why: this listener is capture-phase on document, so it runs before React's handlers
      // and a field inside the board cannot stop it. Any in-progress edit (the board's search
      // field, the sidebar search, an inline rename) therefore keeps Escape for itself — the
      // search field covers clear-then-close on its own.
      if (isWorkspaceBoardTextEntryTarget(event.target)) {
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
  }, [closeWorkspaceBoard, workspaceBoardMenuOpen, workspaceBoardOpen])

  useEffect(() => {
    window.addEventListener(TOGGLE_WORKSPACE_BOARD_EVENT, toggleWorkspaceBoard)
    return () => window.removeEventListener(TOGGLE_WORKSPACE_BOARD_EVENT, toggleWorkspaceBoard)
  }, [toggleWorkspaceBoard])

  return {
    workspaceBoardOpen,
    workspaceBoardRenderedOpen: renderedOpen,
    // Why: a preview the user then opened is the user's open, not a preview.
    workspaceBoardDragPreviewOpen: workspaceBoardDragPreviewOpen && !workspaceBoardOpen,
    workspaceBoardMenuOpen,
    openWorkspaceBoard,
    closeWorkspaceBoard,
    toggleWorkspaceBoard,
    handleWorkspaceBoardOpenChange,
    setWorkspaceBoardMenuOpen,
    previewWorkspaceBoardFromDrag,
    solidifyWorkspaceBoardFromDrag,
    cancelWorkspaceBoardDragPreview
  }
}
