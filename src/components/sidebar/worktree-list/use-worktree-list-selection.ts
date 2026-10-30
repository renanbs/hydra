import React, { useCallback, useEffect, useRef, useState } from 'react'
import { getShortcutPlatform } from '@/lib/shortcut-platform'
import {
  areWorktreeSelectionsEqual,
  getWorktreeSelectionIntent,
  pruneWorktreeSelection,
  resolveWorktreeRenderedAnchorId,
  updateWorktreeSelection
} from '../worktree-selection'

/**
 * The sidebar list's multi-selection: which rows are selected and where the range anchor sits,
 * moved by the same click/toggle/range gestures the workspace board already answers with.
 *
 * Why it reuses `../worktree-selection` instead of its own copy: Orca's selection serves both
 * surfaces, and the rows already address their workspace by the host-qualified identity the
 * board's cards use (`getWorktreeHostIdentity`), so one pure model answers both.
 *
 * Why the pruning runs during render (not an effect): a closed/emptied list must not paint ids
 * it no longer holds, and a selection the user cannot see would keep a drag batch alive.
 */
export function useWorktreeListSelection(args: {
  /** Host-qualified identities of the rows the list currently paints, in painted order. */
  visibleIdentities: readonly string[]
  /** The scroll root: a press outside it clears the multi-selection (Orca `use-selection`). */
  containerRef?: React.RefObject<HTMLElement | null>
}): {
  selectedWorktreeIdentities: ReadonlySet<string>
  /** Right-click on a row: keep a selection that already owns it, else make it the selection. */
  selectForContextMenu: (identity: string) => void
  /**
   * The list's own click gesture. Returns `true` when the click was a selection gesture and the
   * row must not activate — Orca's `onSelectionGesture` contract, shared with the board's cards.
   */
  handleSelectionGesture: (event: React.MouseEvent<HTMLElement>, identity: string) => boolean
} {
  const { visibleIdentities } = args
  const [selectedWorktreeIdentities, setSelectedWorktreeIdentities] = useState<
    ReadonlySet<string>
  >(() => new Set<string>())
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)

  const pruned = pruneWorktreeSelection(
    selectedWorktreeIdentities,
    selectionAnchorId,
    visibleIdentities
  )
  if (!areWorktreeSelectionsEqual(selectedWorktreeIdentities, pruned.selectedIds)) {
    setSelectedWorktreeIdentities(pruned.selectedIds)
  }
  if (selectionAnchorId !== pruned.anchorId) {
    setSelectionAnchorId(pruned.anchorId)
  }

  const selectedRef = useRef(selectedWorktreeIdentities)
  selectedRef.current = selectedWorktreeIdentities

  const selectForContextMenu = useCallback((identity: string) => {
    if (selectedRef.current.has(identity)) return
    setSelectedWorktreeIdentities(new Set([identity]))
    setSelectionAnchorId(identity)
  }, [])

  // A press outside the list's scroll root ends the multi-selection; inside it the
  // rows own the gesture (replace/toggle/range).
  useEffect(() => {
    const container = args.containerRef?.current
    const handlePointerDown = (event: PointerEvent) => {
      if (selectedRef.current.size === 0) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (container?.contains(target)) return
      setSelectedWorktreeIdentities(new Set<string>())
      setSelectionAnchorId(null)
    }
    document.addEventListener('pointerdown', handlePointerDown, { capture: true })
    return () =>
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true })
  }, [args.containerRef])

  const handleSelectionGesture = useCallback(
    (event: React.MouseEvent<HTMLElement>, identity: string): boolean => {
      const intent = getWorktreeSelectionIntent(event, getShortcutPlatform() === 'darwin')
      // Why: a filter can hide the anchor while leaving the rest of the selection painted.
      // `updateWorktreeSelection` reads an anchor missing from `visibleIds` as "no anchor" and
      // collapses the range to the clicked row, so re-anchor onto the first painted selected row.
      const anchorId =
        intent === 'range' && selectionAnchorId !== null
          ? (resolveWorktreeRenderedAnchorId(
              visibleIdentities,
              selectedWorktreeIdentities,
              selectionAnchorId
            ) ?? selectionAnchorId)
          : selectionAnchorId
      const result = updateWorktreeSelection({
        visibleIds: visibleIdentities,
        previousSelectedIds: selectedWorktreeIdentities,
        previousAnchorId: anchorId,
        targetId: identity,
        intent
      })
      setSelectedWorktreeIdentities(result.selectedIds)
      setSelectionAnchorId(result.anchorId)
      // A modified click is a selection gesture and nothing else; a plain click still opens the
      // row (Orca's contract: `true` means "this click was consumed").
      return intent !== 'replace'
    },
    [selectionAnchorId, selectedWorktreeIdentities, visibleIdentities]
  )

  return { selectedWorktreeIdentities, selectForContextMenu, handleSelectionGesture }
}
