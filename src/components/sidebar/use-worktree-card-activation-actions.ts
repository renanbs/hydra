// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-worktree-card-activation-actions.ts
import React, { useCallback, useLayoutEffect, useRef } from 'react'
import { isEventTargetInsideCurrentTarget } from './worktree-card-dom-events'
import type { WorktreeCardProps } from './worktree-card-model'

type ActivationProps = Pick<
  WorktreeCardProps,
  | 'worktree'
  | 'repo'
  | 'affiliateListMode'
  | 'onSelectionGesture'
  | 'isActive'
  | 'activationRowKey'
  | 'onActivate'
  | 'onSelect'
  | 'onImmediateActivate'
  | 'onRename'
  | 'onEditMetadata'
>

export type WorktreeCardActivationActions = {
  handleClick: (event: React.MouseEvent<HTMLDivElement>) => void
  handleRenameTitle: (newTitle: string) => Promise<void>
  handleDoubleClick: (event: React.MouseEvent<HTMLDivElement>) => void
}

export function useWorktreeCardActivationActions({
  worktree,
  affiliateListMode,
  onSelectionGesture,
  onActivate,
  onSelect,
  onImmediateActivate,
  activationRowKey,
  onRename,
  onEditMetadata,
  isDeleting
}: ActivationProps & { isDeleting: boolean }): WorktreeCardActivationActions {
  const worktreeRef = useRef(worktree)
  useLayoutEffect(() => {
    worktreeRef.current = worktree
  }, [worktree])

  // Stable click handler — ignore clicks that are really text selections.
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isEventTargetInsideCurrentTarget(event.currentTarget, event.target)) {
        return
      }
      const selection = window.getSelection()
      // Why: only suppress the click for a selection inside this card; a foreign
      // selection must not block worktree switching.
      if (selection && selection.toString().length > 0) {
        const card = event.currentTarget
        const anchor = selection.anchorNode
        const focus = selection.focusNode
        const selectionInsideCard =
          (anchor instanceof Node && card.contains(anchor)) ||
          (focus instanceof Node && card.contains(focus))
        if (selectionInsideCard) {
          return
        }
      }
      const selectionOnly = affiliateListMode
        ? false
        : (onSelectionGesture?.(event, worktreeRef.current) ?? false)
      if (selectionOnly) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (isDeleting) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (onSelect) {
        onSelect(worktreeRef.current)
      } else if (onActivate) {
        onActivate()
      } else if (onImmediateActivate) {
        onImmediateActivate(worktreeRef.current.path, activationRowKey)
      }
    },
    [affiliateListMode, activationRowKey, isDeleting, onActivate, onImmediateActivate, onSelect, onSelectionGesture]
  )

  const handleRenameTitle = useCallback(
    async (displayName: string): Promise<void> => {
      await onRename?.(displayName)
    },
    [onRename]
  )

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (affiliateListMode) {
        return
      }
      if (!isEventTargetInsideCurrentTarget(event.currentTarget, event.target)) {
        return
      }
      onEditMetadata?.()
    },
    [affiliateListMode, onEditMetadata]
  )

  return { handleClick, handleRenameTitle, handleDoubleClick }
}
