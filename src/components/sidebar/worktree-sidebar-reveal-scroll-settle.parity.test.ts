import { describe, expect, it } from 'vitest'
import {
  REVEAL_SCROLL_SETTLE_TIMEOUT_MS,
  clearPendingRevealScroll,
  createPendingRevealScroll,
  isRevealScrollSettling,
  isRevealScrollSettlingForContainer,
  markRevealScrollIssued
} from './worktree-sidebar-reveal-scroll-settle'

describe('createPendingRevealScroll / isRevealScrollSettling (D06-034)', () => {
  it('is settling while the scroll is still short of its target', () => {
    const pending = createPendingRevealScroll(400, 1_000)

    expect(isRevealScrollSettling({ now: 1_100, pending, scrollTop: 120 })).toBe(true)
  })

  it('is settled once the scroll lands within a pixel of the target', () => {
    const pending = createPendingRevealScroll(400, 1_000)

    expect(isRevealScrollSettling({ now: 1_100, pending, scrollTop: 399.5 })).toBe(false)
    expect(isRevealScrollSettling({ now: 1_100, pending, scrollTop: 400 })).toBe(false)
  })

  it('expires so an unreachable target cannot wedge the guard', () => {
    const pending = createPendingRevealScroll(400, 1_000)

    expect(
      isRevealScrollSettling({
        now: 1_000 + REVEAL_SCROLL_SETTLE_TIMEOUT_MS,
        pending,
        scrollTop: 120
      })
    ).toBe(false)
  })

  it('treats no pending reveal as settled', () => {
    expect(isRevealScrollSettling({ now: 5, pending: null, scrollTop: 0 })).toBe(false)
  })
})

describe('per-container reveal settle registry (D06-034)', () => {
  it('tracks the reveal issued for one container only', () => {
    const container = document.createElement('div')
    const other = document.createElement('div')
    markRevealScrollIssued(container, 500, 10)

    expect(isRevealScrollSettlingForContainer(container, 10, 100)).toBe(true)
    expect(isRevealScrollSettlingForContainer(other, 10, 100)).toBe(false)
  })

  it('clears the pending reveal once it lands or is released', () => {
    const container = document.createElement('div')
    markRevealScrollIssued(container, 500, 10)
    expect(isRevealScrollSettlingForContainer(container, 500, 100)).toBe(false)

    markRevealScrollIssued(container, 900, 10)
    clearPendingRevealScroll(container)
    expect(isRevealScrollSettlingForContainer(container, 10, 100)).toBe(false)
  })

  it('ignores a missing container', () => {
    expect(isRevealScrollSettlingForContainer(null, 10, 100)).toBe(false)
  })
})
