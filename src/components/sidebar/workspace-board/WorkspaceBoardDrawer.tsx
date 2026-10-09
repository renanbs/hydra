import React, { useCallback, useRef } from 'react'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import type { PrDisplay } from '../pr-display'
import type { GitWorktreeInfo, HydraProject, WorkspacePort, WorktreeSession } from '../types'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import WorkspaceBoardDrawerView from './WorkspaceBoardDrawerView'
import { useWorkspaceBoardCardPointerDrag } from './drag/use-workspace-board-card-pointer-drag'
import { useWorkspaceBoardGeometry, type WorkspaceBoardGeometry } from './use-workspace-board-geometry'
import { useWorkspaceBoardProjection } from './use-workspace-board-projection'

export type WorkspaceBoardDrawerProps = {
  /** Whether the user has the board open (the sheet's own `open` state). */
  open: boolean
  /** Whether the drawer may stay mounted; outlives `open` by the close animation. */
  renderedOpen: boolean
  /** The sidebar's own element, measured for the sheet's viewport box. */
  sidebarRef: React.RefObject<HTMLElement | null>
  displayProjects: readonly HydraProject[]
  getProjectWorktrees: (project: HydraProject) => GitWorktreeInfo[]
  sessions: readonly WorktreeSession[]
  displayOptions: WorkspaceDisplayOptions
  activeWorktreePath?: string | null
  liveWorkspacePaths?: ReadonlySet<string>
  pinnedWorktreePaths?: ReadonlySet<string>
  unreadWorktreePaths?: ReadonlySet<string>
  portsByWorktree?: ReadonlyMap<string, WorkspacePort[]>
  prByPath?: Readonly<Record<string, PrDisplay>>
  compactCards: boolean
  /**
   * The app's own status write (`set_worktree_status` + the local worktree maps the
   * sidebar projects from). The board's card drop commits through it — the board never
   * grows a second writer for the same column.
   */
  onAssignWorktreeStatus: (worktreePath: string, status: WorkspaceStatus) => void | Promise<void>
  onOpenChange: (open: boolean) => void
  onSelectWorktree: (worktree: GitWorktreeInfo) => void
  onSelectSession?: (sessionId: string) => void
  onWorktreeContextMenu?: (
    event: React.MouseEvent,
    worktree: GitWorktreeInfo,
    project: HydraProject
  ) => void
}

/**
 * Ported from Orca `WorkspaceKanbanDrawer`: the linger gate keeps the sheet
 * mounted through its exit animation, and everything below it — the projection
 * and the cards — only exists while the board is rendered, so a closed board
 * costs nothing.
 */
export default function WorkspaceBoardDrawer(
  props: WorkspaceBoardDrawerProps
): React.JSX.Element | null {
  const geometry = useWorkspaceBoardGeometry(props.sidebarRef, props.renderedOpen)
  if (!props.renderedOpen) {
    return null
  }
  return <WorkspaceBoardDrawerContent {...props} geometry={geometry} />
}

function WorkspaceBoardDrawerContent({
  open,
  displayProjects,
  getProjectWorktrees,
  sessions,
  displayOptions,
  activeWorktreePath,
  liveWorkspacePaths,
  pinnedWorktreePaths,
  unreadWorktreePaths,
  portsByWorktree,
  prByPath,
  compactCards,
  onAssignWorktreeStatus,
  onOpenChange,
  onSelectWorktree,
  onSelectSession,
  onWorktreeContextMenu,
  geometry,
}: WorkspaceBoardDrawerProps & {
  geometry: WorkspaceBoardGeometry
}): React.JSX.Element {
  const { lanes, columnWidth } = useWorkspaceBoardProjection({
    displayProjects,
    getProjectWorktrees,
    sessions,
    displayOptions,
    activeWorktreePath,
    liveWorkspacePaths,
    pinnedWorktreePaths,
    unreadWorktreePaths,
    portsByWorktree,
    prByPath,
  })
  const boardRef = useRef<HTMLDivElement | null>(null)
  const { onCardPointerDownCapture, dropTargetStatus } = useWorkspaceBoardCardPointerDrag({
    open,
    boardRef,
    onAssignWorktreeStatus,
  })

  // Orca `handleWorktreeActivate`: opening a workspace from the board closes it.
  const handleActivate = useCallback(
    (worktree: GitWorktreeInfo) => {
      onSelectWorktree(worktree)
      onOpenChange(false)
    },
    [onOpenChange, onSelectWorktree]
  )

  return (
    <WorkspaceBoardDrawerView
      open={open}
      geometry={geometry}
      lanes={lanes}
      columnWidth={columnWidth}
      compactCards={compactCards}
      boardRef={boardRef}
      dropTargetStatus={dropTargetStatus}
      onCardPointerDownCapture={onCardPointerDownCapture}
      onOpenChange={onOpenChange}
      onActivate={handleActivate}
      onSelectSession={onSelectSession}
      onContextMenu={onWorktreeContextMenu}
    />
  )
}
