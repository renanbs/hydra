/**
 * The rule a multi-drag follows: what a press on an already-selected worktree moves.
 *
 * Ported from Orca `workspace-kanban-pointer-drag-selection` (D03a-002): when the pressed
 * worktree belongs to a selection of more than one, the drag moves the whole set; otherwise it
 * moves only the pressed worktree.
 *
 * Why host-qualified: two hosts can publish the same workspace id, so a drag must move the row
 * that was grabbed, not every row sharing its id. The decision and the returned batch are keyed
 * on the host-qualified identity, and `draggedWorktreeId` is only ever used to locate the
 * grabbed row itself — never to widen the batch.
 */
export type WorktreeMultiDragCandidate = {
  worktreeId: string
  identity: string
}

export function resolveWorktreeMultiDragSelection(args: {
  /** The workspace id of the row the pointer grabbed. */
  draggedWorktreeId: string
  /** Its host-qualified identity — what the selection is keyed on. */
  draggedWorktreeIdentity: string
  /** The surface's selection, by host-qualified identity. */
  selectedWorktreeIdentities: ReadonlySet<string>
  /**
   * Every row the surface holds. The batch is resolved against these, so an id that only
   * exists on another host is never swept in and a row the surface no longer paints is not
   * reported as moved.
   */
  surfaceWorktrees: readonly WorktreeMultiDragCandidate[]
}): readonly WorktreeMultiDragCandidate[] {
  const { draggedWorktreeId, draggedWorktreeIdentity, selectedWorktreeIdentities } = args
  // Why by identity, not by id: the surface may hold another host's row with the same workspace
  // id, and that row is a different worktree — the grabbed one is the one whose identity matches.
  const draggedCandidate = args.surfaceWorktrees.find(
    (candidate) => candidate.identity === draggedWorktreeIdentity
  ) ?? { worktreeId: draggedWorktreeId, identity: draggedWorktreeIdentity }

  if (
    selectedWorktreeIdentities.size <= 1 ||
    !selectedWorktreeIdentities.has(draggedWorktreeIdentity)
  ) {
    return [draggedCandidate]
  }

  const batch = args.surfaceWorktrees.filter((candidate) =>
    selectedWorktreeIdentities.has(candidate.identity)
  )
  return batch.length > 0 ? batch : [draggedCandidate]
}
