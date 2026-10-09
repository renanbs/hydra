import React, { useLayoutEffect, useRef } from 'react'
import { Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import {
  registerWorkspaceBoardPinDropTarget,
  useWorkspaceBoardPinDropTargetDragOver
} from './workspace-board-pin-drop-target'

type WorkspaceBoardPinDropTargetProps = {
  /** Whether the board is open; the strip is a drop destination only while it is. */
  open: boolean
  /** The board's own card drag is over the strip (Orca's `pinDragOver`). */
  isDragOver: boolean
}

/**
 * Ported from Orca `WorkspaceKanbanPinDropTarget` (D08-028): the same dashed strip, copy,
 * `data-workspace-pin-drop-target` hook and classes. Orca drives it with native HTML5 drag
 * events; this board drags by pointer (the native path was never built here), so the strip
 * owns no `onDragOver`/`onDragLeave` — the board's own drag arrives as `isDragOver`, and the
 * sidebar list's drag publishes through the module store, which also sets the
 * `data-workspace-board-external-drag-target` attribute Orca's classes key on.
 */
export default function WorkspaceBoardPinDropTarget({
  open,
  isDragOver
}: WorkspaceBoardPinDropTargetProps): React.JSX.Element {
  const stripRef = useRef<HTMLDivElement | null>(null)
  const sidebarDragOver = useWorkspaceBoardPinDropTargetDragOver()
  useLayoutEffect(() => {
    const element = stripRef.current
    if (!element || !open) {
      return
    }
    return registerWorkspaceBoardPinDropTarget({ element })
  }, [open])
  return (
    <div
      ref={stripRef}
      data-workspace-pin-drop-target=""
      data-workspace-board-external-drag-target={sidebarDragOver ? 'true' : undefined}
      className={cn(
        'mb-3 flex h-8 shrink-0 items-center gap-2 rounded-md border border-dashed border-worktree-sidebar-border bg-background/45 px-3 text-[12px] text-muted-foreground transition-colors',
        (isDragOver || sidebarDragOver) &&
          'border-worktree-sidebar-ring bg-worktree-sidebar-accent text-foreground',
        'data-[workspace-board-external-drag-target=true]:border-worktree-sidebar-ring data-[workspace-board-external-drag-target=true]:bg-worktree-sidebar-accent data-[workspace-board-external-drag-target=true]:text-foreground'
      )}
    >
      <Pin className="size-3.5" />
      <span className="font-medium">
        {translate('auto.components.sidebar.WorkspaceKanbanPinDropTarget.8fae2d0862', 'Pinned')}
      </span>
      <span className="truncate">
        {translate(
          'auto.components.sidebar.WorkspaceKanbanPinDropTarget.c30151c5ee',
          'Drop here to pin without changing status.'
        )}
      </span>
    </div>
  )
}
