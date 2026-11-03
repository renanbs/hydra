// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: worktree-list/navigation/mounted-row-reveal.ts
import { revealElementInScrollContainer } from '../../worktree-sidebar-reveal'

export const WORKTREE_VIRTUAL_ROW_SELECTOR = '[data-worktree-virtual-row]'
const ROW_KEY_ATTRIBUTE = 'data-worktree-virtual-row-key'

/**
 * The painted virtual row for `rowKey`, or null while the row is still outside the window.
 *
 * Why attribute scanning instead of a CSS selector: row keys are host-qualified identity strings
 * that can contain characters a selector would have to escape; there are only ever a window's
 * worth of rows to compare.
 */
export function findMountedSidebarRowElement(
  container: ParentNode,
  rowKey: string
): HTMLElement | null {
  for (const element of container.querySelectorAll<HTMLElement>(WORKTREE_VIRTUAL_ROW_SELECTOR)) {
    if (element.getAttribute(ROW_KEY_ATTRIBUTE) === rowKey) {
      return element
    }
  }
  return null
}

/**
 * Reveal a mounted row with the sidebar's sticky-header inset and report the scroll target so
 * the anchor restore can stand down while the animation lands.
 */
export function revealMountedSidebarRowElement(
  container: HTMLElement,
  rowKey: string,
  behavior: ScrollBehavior,
  onScrollIssued?: (targetTop: number) => void
): boolean {
  const element = findMountedSidebarRowElement(container, rowKey)
  if (!element || !container.contains(element)) {
    return false
  }
  return revealElementInScrollContainer(container, element, behavior, onScrollIssued)
}
