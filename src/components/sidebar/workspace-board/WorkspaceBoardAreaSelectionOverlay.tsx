import React from 'react'

type WorkspaceBoardAreaSelectionOverlayProps = React.HTMLAttributes<HTMLDivElement>

/**
 * Ported from Orca `WorkspaceKanbanAreaSelectionOverlay`: the marquee's visual rectangle.
 *
 * Why it is hidden by default and driven imperatively: the box is written with a `translate3d`
 * + width/height on every pointermove frame (`setWorkspaceBoardAreaSelectionOverlayRect`), so
 * the drag never re-renders the board. The class carries the surface/paint and this element
 * stays mounted — the overlay is the one node the marquee is allowed to touch per frame.
 */
const WorkspaceBoardAreaSelectionOverlay = React.forwardRef<
  HTMLDivElement,
  WorkspaceBoardAreaSelectionOverlayProps
>(function WorkspaceBoardAreaSelectionOverlay(props, ref): React.JSX.Element {
  return (
    <div
      {...props}
      ref={ref}
      data-workspace-board-selection-rect=""
      className="pointer-events-none absolute left-0 top-0 z-30 hidden rounded-md border border-worktree-sidebar-ring bg-worktree-sidebar-ring/15 will-change-transform"
    />
  )
})

export default WorkspaceBoardAreaSelectionOverlay
