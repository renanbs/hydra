// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-worktree-card-workspace-actions.ts
import React, { useCallback } from 'react'
import { translate } from '../../i18n/i18n'
import { writeWorkspaceDragData } from './workspace-status-drag-data'
import { isEventTargetInsideCurrentTarget } from './worktree-card-dom-events'
import type { ResolvedWorktreeCardProps } from './worktree-card-model'
import { canShowWorkspaceDeleteQuickAction } from './workspace-delete-quick-action'

type WorkspaceActionsProps = Pick<
  ResolvedWorktreeCardProps,
  | 'worktree'
  | 'repo'
  | 'project'
  | 'lineageChildCount'
  | 'lineageCollapsed'
  | 'onLineageToggle'
  | 'isMultiSelected'
  | 'selectedWorktrees'
  | 'onCardDragStart'
  | 'onCardDragEnd'
  | 'onContextMenuSelect'
  | 'onDelete'
> & {
  isDeleting: boolean
  deleteModifierPressed: boolean
}

export type WorktreeCardWorkspaceActions = {
  showDeleteQuickAction: boolean
  handleWorkspaceQuickAction: (event: React.MouseEvent<HTMLButtonElement>) => void
  unreadTooltip: string
  lineageChildAriaLabel: string
  childWorkspaceShortLabel: string
  showLineageChildChip: boolean
  handleDragStart: (event: React.DragEvent<HTMLDivElement>) => void
  handleDragEnd: (event: React.DragEvent<HTMLDivElement>) => void
  handleContextMenuSelect: (event: React.MouseEvent<HTMLElement>) => readonly unknown[]
  stopQuickActionPointerPropagation: (event: React.PointerEvent<HTMLButtonElement>) => void
}

export function useWorktreeCardWorkspaceActions({
  worktree,
  repo,
  project,
  lineageChildCount,
  lineageCollapsed,
  onLineageToggle,
  isMultiSelected,
  selectedWorktrees,
  onCardDragStart,
  onCardDragEnd,
  onContextMenuSelect,
  onDelete,
  isDeleting,
  deleteModifierPressed
}: WorkspaceActionsProps): WorktreeCardWorkspaceActions {
  const effectiveRepo = repo ?? project
  const isMainWorktree = Boolean(
    worktree.is_main ??
      worktree.isMainWorktree ??
      (effectiveRepo ? worktree.path === effectiveRepo.path : false)
  )
  const showDeleteQuickAction = canShowWorkspaceDeleteQuickAction({
    deleteModifierPressed,
    isDeleting,
    isMainWorktree
  })

  const handleWorkspaceQuickAction = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      if (!showDeleteQuickAction || !effectiveRepo) {
        return
      }
      onDelete?.(worktree, effectiveRepo)
    },
    [effectiveRepo, onDelete, showDeleteQuickAction, worktree]
  )

  const unreadTooltip = worktree.isUnread
    ? translate('components.sidebar.worktree-card.mark-read', 'Mark read')
    : translate('components.sidebar.worktree-card.mark-unread', 'Mark unread')

  const childNoun =
    lineageChildCount === 1
      ? translate('components.sidebar.worktree-card.child', 'child')
      : translate('components.sidebar.worktree-card.children', 'children')
  const childWorkspaceShortLabel = `${lineageChildCount} ${childNoun}`
  const lineageChildAriaLabel = lineageCollapsed
    ? lineageChildCount === 1
      ? translate(
          'components.sidebar.worktree-card.show-child-workspace',
          'Show {{count}} child workspace',
          { count: lineageChildCount }
        )
      : translate(
          'components.sidebar.worktree-card.show-child-workspaces',
          'Show {{count}} child workspaces',
          { count: lineageChildCount }
        )
    : lineageChildCount === 1
      ? translate(
          'components.sidebar.worktree-card.hide-child-workspace',
          'Hide {{count}} child workspace',
          { count: lineageChildCount }
        )
      : translate(
          'components.sidebar.worktree-card.hide-child-workspaces',
          'Hide {{count}} child workspaces',
          { count: lineageChildCount }
        )
  const showLineageChildChip = lineageChildCount > 0 && onLineageToggle !== undefined

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!isEventTargetInsideCurrentTarget(event.currentTarget, event.target)) {
        event.preventDefault()
        return
      }
      if (isDeleting) {
        event.preventDefault()
        return
      }
      const worktreeId = worktree.id ?? worktree.path
      const dragIds =
        isMultiSelected && selectedWorktrees && selectedWorktrees.length > 1
          ? selectedWorktrees.map((item) => item.id ?? item.path)
          : worktreeId
      writeWorkspaceDragData(event.dataTransfer, dragIds)
      onCardDragStart?.(event, worktreeId, Array.isArray(dragIds) ? dragIds : [dragIds])
    },
    [isDeleting, isMultiSelected, onCardDragStart, selectedWorktrees, worktree]
  )

  const handleDragEnd = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!isEventTargetInsideCurrentTarget(event.currentTarget, event.target)) {
        return
      }
      onCardDragEnd?.(event)
    },
    [onCardDragEnd]
  )

  const handleContextMenuSelect = useCallback(
    (event: React.MouseEvent<HTMLElement>) => onContextMenuSelect?.(event, worktree) ?? [worktree],
    [onContextMenuSelect, worktree]
  )

  const stopQuickActionPointerPropagation = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      // Why: document-level pointer handling dismisses the Kanban board; quick
      // actions must not count as card activation.
      event.stopPropagation()
    },
    []
  )

  return {
    showDeleteQuickAction,
    handleWorkspaceQuickAction,
    unreadTooltip,
    lineageChildAriaLabel,
    childWorkspaceShortLabel,
    showLineageChildChip,
    handleDragStart,
    handleDragEnd,
    handleContextMenuSelect,
    stopQuickActionPointerPropagation
  }
}
