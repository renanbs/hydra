import React from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { isWorkspaceBoardKeepOpenTarget } from './use-workspace-board-outside-dismiss'
import type { WorkspaceBoardGeometry } from './use-workspace-board-geometry'

type WorkspaceBoardSheetProps = {
  children: React.ReactNode
  geometry: WorkspaceBoardGeometry
  open: boolean
  /** A card drag opened the board as a preview; the sheet marks that state for tests/tour. */
  dragPreview?: boolean
  /** A board-owned menu is open; a portal that Radix calls "outside" belongs to the board. */
  preserveOpenForMenu?: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Ported from Orca `WorkspaceKanbanSheet`: a non-modal sheet that starts at the
 * sidebar's right edge and stops above the status bar.
 *
 * Why the geometry is measured instead of recomputed: Hydra's sidebar is a flex
 * child of the shell, so its right edge already encodes the titlebar height, the
 * status bar reserve and the live resize draft — none of which the board should
 * re-derive from constants. The constants are only the pre-measurement values.
 *
 * Why Radix may not close the board: its open state belongs to the panel hook
 * (footer trigger, Escape, the header X, selecting a card, an outside press).
 * Radix's `onInteractOutside` also fires for every board-owned portal (menus,
 * popovers, dialogs), so nothing it reports can be trusted as an exit.
 */
export default function WorkspaceBoardSheet({
  children,
  geometry,
  open,
  dragPreview = false,
  preserveOpenForMenu = false,
  onOpenChange,
}: WorkspaceBoardSheetProps): React.JSX.Element {
  const keepOpenForOutsideEvent = (event: {
    preventDefault: () => void
    detail: { originalEvent: Event }
  }): void => {
    const originalEvent = event.detail.originalEvent
    const target = originalEvent.target
    if (preserveOpenForMenu || isWorkspaceBoardKeepOpenTarget(target)) {
      event.preventDefault()
      return
    }
    const liveLeft =
      target instanceof Element
        ? (target.closest<HTMLElement>('[data-slot="sheet-content"]')?.getBoundingClientRect()
            .left ?? geometry.left)
        : geometry.left
    const pointerX =
      'clientX' in originalEvent && typeof originalEvent.clientX === 'number'
        ? originalEvent.clientX
        : null
    // Why only left of the live edge: the sidebar's own surfaces sit there; they
    // must not read as an exit, while a real canvas click is handled by the
    // outside-dismiss hook and needs no help from Radix.
    if (pointerX !== null && pointerX < liveLeft) {
      event.preventDefault()
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true)
        }
      }}
      modal={false}
    >
      <SheetContent
        side="left"
        className="bg-worktree-sidebar p-0 sm:max-w-none"
        overlayStyle={{
          top: `${geometry.top}px`,
          bottom: `${geometry.bottom}px`,
          left: `${geometry.left}px`,
          pointerEvents: 'none',
        }}
        style={{
          left: `${geometry.left}px`,
          top: `${geometry.top}px`,
          bottom: `${geometry.bottom}px`,
          height: 'auto',
          width: `min(calc(100vw - ${geometry.left}px), 1294px)`,
        }}
        data-contextual-tour-target="workspace-board-surface"
        data-workspace-board-sheet=""
        data-workspace-board-drag-preview={dragPreview ? 'true' : undefined}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={keepOpenForOutsideEvent}
        onInteractOutside={keepOpenForOutsideEvent}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}
