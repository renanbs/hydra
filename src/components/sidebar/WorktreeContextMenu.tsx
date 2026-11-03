// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeContextMenu.tsx
// The row wrapper owns the right-click entry point. It marks the menu scope so a
// parent card ignores a nested lineage child's scope, opts a surface out to the
// native menu, and carries the effective selection into the callback.
import React from 'react'
import type { GitWorktreeInfo } from './types'
import {
  shouldIgnoreNestedWorktreeContextMenuScope,
  shouldUseNativeContextMenu,
  WORKTREE_CONTEXT_MENU_SCOPE_ATTR,
  WORKTREE_NATIVE_CONTEXT_MENU_ATTR,
} from './worktree-context-menu-policy'

export interface WorktreeContextMenuProps {
  worktree: GitWorktreeInfo
  /** Explicit multi-selection; defaults to the clicked row. */
  selectedWorktrees?: readonly GitWorktreeInfo[]
  /** Opt out to the browser/native menu (terminal, editor, text inputs). */
  useNativeContextMenu?: boolean
  onContextMenuSelect?: (
    event: React.MouseEvent<HTMLElement>,
    worktree: GitWorktreeInfo,
    selected: readonly GitWorktreeInfo[]
  ) => void
  /** Kept for the card surface contract; the App owns status writes. */
  onAssignWorkspaceStatus?: (worktreeIds: readonly string[], status: string) => void
  children: React.ReactNode
}

export function WorktreeContextMenu({
  worktree,
  selectedWorktrees,
  useNativeContextMenu = false,
  onContextMenuSelect,
  children
}: WorktreeContextMenuProps): React.JSX.Element {
  const effectiveSelection =
    selectedWorktrees && selectedWorktrees.length > 0 ? selectedWorktrees : [worktree]
  return (
    <div
      className="contents"
      {...{ [WORKTREE_CONTEXT_MENU_SCOPE_ATTR]: '' }}
      {...(useNativeContextMenu ? { [WORKTREE_NATIVE_CONTEXT_MENU_ATTR]: '' } : {})}
      onContextMenu={(event) => {
        if (!onContextMenuSelect) return
        if (shouldUseNativeContextMenu(event.target) && useNativeContextMenu) return
        // A child card inside this scope owns its own menu target.
        if (shouldIgnoreNestedWorktreeContextMenuScope(event.currentTarget, event.target)) return
        event.preventDefault()
        event.stopPropagation()
        onContextMenuSelect(event, worktree, effectiveSelection)
      }}
    >
      {children}
    </div>
  )
}

// Orca re-exports the scope/close-all/parent/delete policy from the wrapper so a
// card surface imports one module for both the entry point and its gates.
export {
  CLOSE_ALL_CONTEXT_MENUS_EVENT,
  WORKTREE_CONTEXT_MENU_SCOPE_ATTR,
  WORKTREE_NATIVE_CONTEXT_MENU_ATTR,
  getWorktreeParentPickerLabel,
  isContextWorktreeDeletable,
  isWorktreeParentPickerDisabled,
  shouldIgnoreNestedWorktreeContextMenuScope,
  shouldRevealWorktreeDeveloperMenu,
  shouldUseNativeContextMenu,
} from './worktree-context-menu-policy'

export default WorktreeContextMenu
