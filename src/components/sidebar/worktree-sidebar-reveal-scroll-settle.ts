// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-sidebar-reveal-scroll-settle.ts
//
// A smooth reveal scroll animates across many frames, and any other scrollTop write during
// that window silently cancels it. The sidebar's scroll-anchor restore writes exactly that, so
// without this guard a reveal stops a couple of pixels in and the user has to click it again.
export type PendingRevealScroll = {
  targetTop: number
  expiresAt: number
}

/** Ceiling for a browser smooth-scroll animation; also the escape hatch when the target turns out to be unreachable. */
export const REVEAL_SCROLL_SETTLE_TIMEOUT_MS = 1000

const SETTLED_TOLERANCE_PX = 1

export function createPendingRevealScroll(targetTop: number, now: number): PendingRevealScroll {
  return { targetTop, expiresAt: now + REVEAL_SCROLL_SETTLE_TIMEOUT_MS }
}

export function isRevealScrollSettling({
  now,
  pending,
  scrollTop
}: {
  now: number
  pending: PendingRevealScroll | null
  scrollTop: number
}): boolean {
  if (!pending || now >= pending.expiresAt) {
    return false
  }
  return Math.abs(scrollTop - pending.targetTop) > SETTLED_TOLERANCE_PX
}

/**
 * The pending reveal per scroll container.
 *
 * Why module-level and keyed on the element: the reveal is issued deep in the reveal hook and
 * the anchor restore it must stand down lives in the viewport's suppression hook. Threading a
 * ref through both would make every consumer of the viewport aware of the reveal.
 */
const pendingRevealByContainer = new WeakMap<Element, PendingRevealScroll>()

export function markRevealScrollIssued(
  container: Element,
  targetTop: number,
  now: number = window.performance.now()
): void {
  pendingRevealByContainer.set(container, createPendingRevealScroll(targetTop, now))
}

export function clearPendingRevealScroll(container: Element): void {
  pendingRevealByContainer.delete(container)
}

/**
 * True while a reveal this sidebar issued is still animating. Expiry (or landing within the
 * tolerance) disarms it, so an unreachable target cannot freeze the anchor restore forever.
 */
export function isRevealScrollSettlingForContainer(
  container: Element | null,
  scrollTop: number,
  now: number = window.performance.now()
): boolean {
  if (!container) {
    return false
  }
  const pending = pendingRevealByContainer.get(container) ?? null
  const settling = isRevealScrollSettling({ now, pending, scrollTop })
  if (!settling) {
    pendingRevealByContainer.delete(container)
  }
  return settling
}
