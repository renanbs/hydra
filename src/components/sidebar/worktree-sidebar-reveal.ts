// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-sidebar-reveal.ts
//
// Reveal math for the worktree list. `scrollIntoView({ block: "nearest" })` scrolls the
// card just far enough to touch the viewport, which leaves it flush under the sticky
// group header; Orca reserves that header height as a top inset so a card revealed from
// above lands below it instead of underneath.
import { GROUP_HEADER_ROW_HEIGHT } from "./worktree-list/viewport/virtual-rows";

const WORKTREE_REVEAL_TOP_CLEARANCE = 6;

/** Sticky group-header height plus a breathing gap, reserved when a reveal scrolls up. */
export const WORKTREE_SIDEBAR_REVEAL_TOP_INSET =
  GROUP_HEADER_ROW_HEIGHT + WORKTREE_REVEAL_TOP_CLEARANCE;

export type SidebarRevealBounds = {
  start: number;
  end: number;
};

function getElementScrollBounds(
  container: HTMLElement,
  element: Element
): SidebarRevealBounds {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return {
    start: elementRect.top - containerRect.top + container.scrollTop,
    end: elementRect.bottom - containerRect.top + container.scrollTop,
  };
}

/**
 * Scroll offset that brings `bounds` into view, or `null` when it already is.
 *
 * A card above the viewport aligns to the top minus `topInset` (so it clears the sticky
 * header); a card below aligns its bottom to the viewport bottom.
 */
export function getScrollTopToRevealBounds(
  container: HTMLElement,
  bounds: SidebarRevealBounds,
  topInset = 0
): number | null {
  const viewportTopInset = Math.max(0, Math.min(container.clientHeight, topInset));
  const viewportTop = container.scrollTop + viewportTopInset;
  const viewportBottom = container.scrollTop + container.clientHeight;
  if (bounds.start < viewportTop) {
    return bounds.start - viewportTopInset;
  }
  if (bounds.end > viewportBottom) {
    return bounds.end - container.clientHeight;
  }
  return null;
}

/**
 * Reveal `element` inside `container`.
 *
 * Returns false when the element is not inside the container (a virtualized row can be
 * unmounted), true otherwise — including when no scroll was needed.
 *
 * `onScrollIssued` reports the exact target so callers can stand their scroll-anchor
 * guards down until the smooth animation lands.
 */
export function revealElementInScrollContainer(
  container: HTMLElement,
  element: Element,
  behavior: ScrollBehavior,
  onScrollIssued?: (targetTop: number) => void
): boolean {
  if (!container.contains(element)) {
    return false;
  }
  const nextScrollTop = getScrollTopToRevealBounds(
    container,
    getElementScrollBounds(container, element),
    WORKTREE_SIDEBAR_REVEAL_TOP_INSET
  );
  if (nextScrollTop === null) {
    return true;
  }
  // Why: honor reduced-motion by jumping instantly; it also makes the reveal
  // deterministic where the smooth-scroll animation never ticks.
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const resolvedBehavior: ScrollBehavior =
    behavior === "smooth" && prefersReducedMotion ? "auto" : behavior;
  const targetTop = Math.max(0, nextScrollTop);
  onScrollIssued?.(targetTop);
  container.scrollTo({ top: targetTop, behavior: resolvedBehavior });
  return true;
}
