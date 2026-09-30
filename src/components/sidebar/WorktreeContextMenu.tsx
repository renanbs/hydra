// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from 'react'
import type { GitWorktreeInfo } from './types'

export interface WorktreeContextMenuProps {
  worktree: GitWorktreeInfo
  selectedWorktrees?: readonly GitWorktreeInfo[]
  onContextMenuSelect?: (event: React.MouseEvent<HTMLElement>, worktree: GitWorktreeInfo) => void
  onAssignWorkspaceStatus?: (worktreeIds: readonly string[], status: string) => void
  children: React.ReactNode
}

export function WorktreeContextMenu({
  worktree,
  onContextMenuSelect,
  children
}: WorktreeContextMenuProps): React.JSX.Element {
  return (
    <div
      className="contents"
      onContextMenu={(e) => {
        if (onContextMenuSelect) {
          e.preventDefault()
          e.stopPropagation()
          onContextMenuSelect(e, worktree)
        }
      }}
    >
      {children}
    </div>
  )
}

export default WorktreeContextMenu
