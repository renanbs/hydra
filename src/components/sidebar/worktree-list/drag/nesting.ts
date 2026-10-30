// Ported from Orca — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/drag/pointer-flush.ts
// (nesting hit test + eligibility) and `use-lineage-drop-commit.ts`.
//
// Nesting is decided against the painted cards, not the drop geometry: the pointer
// hovers a card to become its parent, and the card paints a ring while that is the
// pending drop. The insertion line is suppressed in that frame so the two targets
// never promise different outcomes.

export const WORKTREE_NESTING_ATTRIBUTE = "data-worktree-nesting-id";
/** Top/bottom of a card stay reorder zones; the middle nests (Orca hit-zone geometry). */
const LINEAGE_DROP_ZONE_RATIO = 0.2;
const LINEAGE_DROP_ZONE_MAX_PX = 8;
export const WORKTREE_NESTING_HOVER_ATTRIBUTE = "data-worktree-lineage-drop-target-hover";

export function buildLineageParentIdByChildId(
  lineageById: Readonly<Record<string, { parentWorktreeId: string }>>
): Map<string, string> {
  const parentIdByChildId = new Map<string, string>();
  for (const [childId, lineage] of Object.entries(lineageById)) {
    parentIdByChildId.set(childId, lineage.parentWorktreeId);
  }
  return parentIdByChildId;
}

/**
 * A card can parent the drag when it is not part of it and is not inside the dragged
 * subtree — walking the candidate's ancestors catches both a direct child and any
 * deeper descendant, which is the cycle the tree must never allow.
 */
export function isEligibleWorktreeNestingParent(args: {
  candidateId: string;
  draggedIds: readonly string[];
  parentIdByChildId: ReadonlyMap<string, string>;
}): boolean {
  const dragged = new Set(args.draggedIds);
  if (!args.candidateId || dragged.has(args.candidateId)) {
    return false;
  }
  const seen = new Set<string>();
  let current = args.parentIdByChildId.get(args.candidateId);
  while (current && !seen.has(current)) {
    if (dragged.has(current)) {
      return false;
    }
    seen.add(current);
    current = args.parentIdByChildId.get(current);
  }
  return true;
}

/** Reads the card under the pointer; the floating preview is pointer-events: none. */
export function findWorktreeNestingTarget(args: {
  pointerX: number;
  pointerY: number;
  draggedIds: readonly string[];
  parentIdByChildId: ReadonlyMap<string, string>;
}): string | null {
  if (typeof document === "undefined" || typeof document.elementFromPoint !== "function") {
    return null;
  }
  const element = document.elementFromPoint(args.pointerX, args.pointerY);
  const card = element?.closest(`[${WORKTREE_NESTING_ATTRIBUTE}]`);
  const candidateId = card?.getAttribute(WORKTREE_NESTING_ATTRIBUTE) ?? null;
  if (card) {
    const rect = card.getBoundingClientRect();
    if (rect.height <= 0) {
      return null;
    }
    const edge = Math.min(rect.height * LINEAGE_DROP_ZONE_RATIO, LINEAGE_DROP_ZONE_MAX_PX);
    const offset = args.pointerY - rect.top;
    if (offset < edge || offset > rect.height - edge) {
      return null;
    }
  }
  if (
    !candidateId ||
    !isEligibleWorktreeNestingParent({
      candidateId,
      draggedIds: args.draggedIds,
      parentIdByChildId: args.parentIdByChildId,
    })
  ) {
    return null;
  }
  return candidateId;
}

let activeHoverCard: Element | null = null;

/**
 * A nest is committed only against a card that is still painted. Between the frame
 * that promised the ring and the release, a collapse, a filter or a removal can take
 * the card away; the write must not outlive the target.
 */
export function isWorktreeNestingCardPainted(targetId: string): boolean {
  if (!targetId || typeof document === "undefined") {
    return false;
  }
  const cards = document.querySelectorAll(`[${WORKTREE_NESTING_ATTRIBUTE}]`);
  for (const card of cards) {
    if (card.getAttribute(WORKTREE_NESTING_ATTRIBUTE) === targetId) {
      return true;
    }
  }
  return false;
}

export function updateWorktreeLineageDropTargetVisual(targetId: string | null): void {
  if (typeof document === "undefined") {
    return;
  }
  if (activeHoverCard && activeHoverCard.getAttribute(WORKTREE_NESTING_ATTRIBUTE) !== targetId) {
    activeHoverCard.removeAttribute(WORKTREE_NESTING_HOVER_ATTRIBUTE);
    activeHoverCard = null;
  }
  if (!targetId) {
    return;
  }
  if (activeHoverCard?.getAttribute(WORKTREE_NESTING_ATTRIBUTE) === targetId) {
    return;
  }
  const cards = document.querySelectorAll(`[${WORKTREE_NESTING_ATTRIBUTE}]`);
  for (const card of cards) {
    if (card.getAttribute(WORKTREE_NESTING_ATTRIBUTE) === targetId) {
      card.setAttribute(WORKTREE_NESTING_HOVER_ATTRIBUTE, "true");
      activeHoverCard = card;
      return;
    }
  }
}

export function clearWorktreeLineageDropTargetVisual(): void {
  activeHoverCard?.removeAttribute(WORKTREE_NESTING_HOVER_ATTRIBUTE);
  activeHoverCard = null;
}
