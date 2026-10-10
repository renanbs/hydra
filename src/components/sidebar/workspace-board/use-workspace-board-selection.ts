import React, { useCallback, useMemo, useState } from 'react'
import { getShortcutPlatform } from '@/lib/shortcut-platform'
import {
  areWorktreeSelectionsEqual,
  pruneWorktreeSelection,
  resolveWorktreeRenderedAnchorId,
  selectAllWorktreeVisible,
  updateWorktreeAreaSelection,
  updateWorktreeSelection,
  getWorktreeSelectionIntent
} from '../worktree-selection'
import type { WorkspaceBoardCard } from './workspace-board-worktrees'

/**
 * The board's selection state: which cards are selected, where the range anchor sits, and the
 * four gestures that move them (click, modified click, marquee commit, select-all).
 *
 * Ported from Orca `useWorkspaceKanbanSelection`, scoped to identity strings — Hydra's board
 * cards carry a host-qualified identity, and the sidebar list's rows now use the same
 * `../worktree-selection` model, so one selection vocabulary serves both surfaces.
 *
 * Why two card lists: board search hides cards without dropping them from the board (D08-014).
 * Range and marquee gestures index the *rendered* subset, so a range never swallows a card the
 * user cannot see; pruning, highlighting and the actions themselves span the whole board, so a
 * card hidden by a query keeps its selection until a gesture replaces it.
 */
export function useWorkspaceBoardSelection(args: {
  open: boolean
  /** Every card the board holds, including the ones the search hides. */
  boardCards: readonly WorkspaceBoardCard[]
  /** The cards the board currently renders; defaults to the whole board. */
  visibleCards?: readonly WorkspaceBoardCard[]
}): {
  selectedWorktreeIds: ReadonlySet<string>
  selectionAnchorId: string | null
  updateSelectionForGesture: (event: React.MouseEvent<HTMLElement>, worktreeId: string) => boolean
  updateSelectionForArea: (
    areaIds: readonly string[],
    additive: boolean,
    baseSelectedIds?: ReadonlySet<string>,
    baseAnchorId?: string | null
  ) => void
  selectForContextMenu: (worktreeIdentity: string) => readonly WorkspaceBoardCard[]
  selectAllVisible: () => void
  clearSelection: () => void
} {
  const { open, boardCards, visibleCards = boardCards } = args
  const boardCardIds = useMemo(() => boardCards.map((card) => card.identity), [boardCards])
  const visibleCardIds = useMemo(() => visibleCards.map((card) => card.identity), [visibleCards])
  const [selectedWorktreeIds, setSelectedWorktreeIds] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  )
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
  const selectedWorktrees = useMemo(
    () => boardCards.filter((card) => selectedWorktreeIds.has(card.identity)),
    [boardCards, selectedWorktreeIds]
  )

  // Why setState-during-render: this is derived-state reset, not an effect — a closed board must
  // not paint a selection it is about to drop, and the open board must not paint ids that no
  // longer exist.
  if (!open) {
    if (selectedWorktreeIds.size > 0) {
      setSelectedWorktreeIds(new Set<string>())
    }
    if (selectionAnchorId !== null) {
      setSelectionAnchorId(null)
    }
  } else {
    const pruned = pruneWorktreeSelection(
      selectedWorktreeIds,
      selectionAnchorId,
      boardCardIds
    )
    if (!areWorktreeSelectionsEqual(selectedWorktreeIds, pruned.selectedIds)) {
      setSelectedWorktreeIds(pruned.selectedIds)
    }
    if (selectionAnchorId !== pruned.anchorId) {
      setSelectionAnchorId(pruned.anchorId)
    }
  }

  const updateSelectionForGesture = useCallback(
    (event: React.MouseEvent<HTMLElement>, worktreeId: string): boolean => {
      const intent = getWorktreeSelectionIntent(
        event,
        getShortcutPlatform() === 'darwin'
      )
      // Why: a search can hide the anchor while leaving the rest of the selection on screen.
      // `updateWorktreeSelection` reads an anchor missing from `visibleIds` as "no
      // anchor" and collapses the range to the click, so re-anchor onto the first still-rendered
      // selected card instead.
      const anchorId =
        intent === 'range' && selectionAnchorId !== null
          ? (resolveWorktreeRenderedAnchorId(
              visibleCardIds,
              selectedWorktreeIds,
              selectionAnchorId
            ) ?? selectionAnchorId)
          : selectionAnchorId
      const result = updateWorktreeSelection({
        visibleIds: visibleCardIds,
        previousSelectedIds: selectedWorktreeIds,
        previousAnchorId: anchorId,
        targetId: worktreeId,
        intent
      })
      // Why: a range replaces the selection, exactly like a plain click and a non-additive
      // marquee. Carrying hidden cards through it would leave the user with a selection they
      // cannot see, count, or narrow.
      setSelectedWorktreeIds(result.selectedIds)
      setSelectionAnchorId(result.anchorId)
      // A modified click is a selection gesture and nothing else; a plain click still opens the
      // card (Orca's contract: `onSelectionGesture` true means "this click was consumed").
      return intent !== 'replace'
    },
    [selectionAnchorId, selectedWorktreeIds, visibleCardIds]
  )

  const updateSelectionForArea = useCallback(
    (
      areaIds: readonly string[],
      additive: boolean,
      baseSelectedIds: ReadonlySet<string> = selectedWorktreeIds,
      baseAnchorId: string | null = selectionAnchorId
    ): void => {
      const result = updateWorktreeAreaSelection({
        visibleIds: visibleCardIds,
        previousSelectedIds: baseSelectedIds,
        previousAnchorId: baseAnchorId,
        areaIds,
        additive
      })
      setSelectedWorktreeIds((previous) =>
        areWorktreeSelectionsEqual(previous, result.selectedIds)
          ? previous
          : result.selectedIds
      )
      setSelectionAnchorId((previous) => (previous === result.anchorId ? previous : result.anchorId))
    },
    [selectionAnchorId, selectedWorktreeIds, visibleCardIds]
  )

  const selectForContextMenu = useCallback(
    (worktreeIdentity: string): readonly WorkspaceBoardCard[] => {
      // Why: right-clicking a card that is part of a selection must act on the batch the user
      // built; right-clicking any other card re-anchors the selection to it.
      if (selectedWorktreeIds.has(worktreeIdentity) && selectedWorktreeIds.size > 1) {
        return selectedWorktrees
      }
      setSelectedWorktreeIds(new Set([worktreeIdentity]))
      setSelectionAnchorId(worktreeIdentity)
      return boardCards.filter((card) => card.identity === worktreeIdentity)
    },
    [boardCards, selectedWorktreeIds, selectedWorktrees]
  )

  const selectAllVisible = useCallback((): void => {
    const result = selectAllWorktreeVisible(visibleCardIds)
    setSelectedWorktreeIds(result.selectedIds)
    setSelectionAnchorId(result.anchorId)
  }, [visibleCardIds])

  const clearSelection = useCallback((): void => {
    setSelectedWorktreeIds((previous) => (previous.size === 0 ? previous : new Set<string>()))
    setSelectionAnchorId((previous) => (previous === null ? previous : null))
  }, [])

  return {
    selectedWorktreeIds,
    selectionAnchorId,
    updateSelectionForGesture,
    updateSelectionForArea,
    selectForContextMenu,
    selectAllVisible,
    clearSelection
  }
}
