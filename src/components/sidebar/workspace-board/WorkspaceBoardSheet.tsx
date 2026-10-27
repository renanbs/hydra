import React from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import type { WorkspaceBoardGeometry } from './use-workspace-board-geometry'

type WorkspaceBoardSheetProps = {
  children: React.ReactNode
  geometry: WorkspaceBoardGeometry
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Ported from Orca `WorkspaceKanbanSheet`: a non-modal sheet that starts at the
 * sidebar's right edge and stops above the status bar.
 *
 * Why the geometry is measured instead of recomputed: Hydra's sidebar is a flex
 * child of the shell, so its right edge already encodes the titlebar height, the
 * status bar reserve and the live resize draft — none of which the board should
 * re-derive from constants.
 *
 * Why close requests are ignored: the board's open state is owned by the panel
 * hook (footer trigger, Escape, its own close button, activating a card), and the
 * worktree menu portals outside this sheet — Radix must not read that as an exit.
 */
export default function WorkspaceBoardSheet({
  children,
  geometry,
  open,
  onOpenChange,
}: WorkspaceBoardSheetProps): React.JSX.Element {
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
        data-workspace-board-sheet=""
        onOpenAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}
