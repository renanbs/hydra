// The worktree surfaces' shared selection model, exercised without a DOM: every gesture the
// pointer, the marquee and the keyboard can produce has to be answerable from ids alone, because
// the hit testing and the rendering of both the board and the sidebar list read these results.
import { describe, expect, it } from 'vitest'
import {
  areWorktreeSelectionsEqual,
  getWorktreeSelectionIntent,
  pruneWorktreeSelection,
  resolveWorktreeRenderedAnchorId,
  selectAllWorktreeVisible,
  updateWorktreeAreaSelection,
  updateWorktreeSelection
} from './worktree-selection'

const VISIBLE = ['|a', '|b', '|c', '|d'] as const

function clickEvent(overrides: Partial<Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey'>>): {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
} {
  return { metaKey: false, ctrlKey: false, shiftKey: false, ...overrides }
}

describe('getWorktreeSelectionIntent', () => {
  it('reads a plain click as a replace and a modifier click as a toggle per platform', () => {
    expect(getWorktreeSelectionIntent(clickEvent({}), false)).toBe('replace')
    expect(getWorktreeSelectionIntent(clickEvent({ ctrlKey: true }), false)).toBe('toggle')
    expect(getWorktreeSelectionIntent(clickEvent({ metaKey: true }), true)).toBe('toggle')
  })

  it('keeps the toggle modifier off the other platform key', () => {
    // Ctrl on macOS is not the toggle modifier, and Meta on Windows/Linux is not either.
    expect(getWorktreeSelectionIntent(clickEvent({ metaKey: true }), false)).toBe('replace')
    expect(getWorktreeSelectionIntent(clickEvent({ ctrlKey: true }), true)).toBe('replace')
  })

  it('lets shift win over the toggle modifier', () => {
    expect(getWorktreeSelectionIntent(clickEvent({ shiftKey: true }), true)).toBe('range')
    expect(
      getWorktreeSelectionIntent(clickEvent({ shiftKey: true, metaKey: true }), true)
    ).toBe('range')
  })
})

describe('updateWorktreeSelection', () => {
  it('replaces the selection and re-anchors on a plain click', () => {
    const result = updateWorktreeSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|a', '|b']),
      previousAnchorId: '|a',
      targetId: '|c',
      intent: 'replace'
    })

    expect([...result.selectedIds]).toEqual(['|c'])
    expect(result.anchorId).toBe('|c')
  })

  it('toggles one card off and on without touching the rest', () => {
    const removed = updateWorktreeSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|a', '|b']),
      previousAnchorId: '|a',
      targetId: '|b',
      intent: 'toggle'
    })
    expect([...removed.selectedIds]).toEqual(['|a'])
    expect(removed.anchorId).toBe('|b')

    const added = updateWorktreeSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|a']),
      previousAnchorId: '|a',
      targetId: '|d',
      intent: 'toggle'
    })
    expect([...added.selectedIds]).toEqual(['|a', '|d'])
  })

  it('extends a range from the anchor in the surface order, both ways', () => {
    const forward = updateWorktreeSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|b']),
      previousAnchorId: '|b',
      targetId: '|d',
      intent: 'range'
    })
    expect([...forward.selectedIds]).toEqual(['|b', '|c', '|d'])
    expect(forward.anchorId).toBe('|b')

    const backward = updateWorktreeSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|c']),
      previousAnchorId: '|c',
      targetId: '|a',
      intent: 'range'
    })
    expect([...backward.selectedIds]).toEqual(['|a', '|b', '|c'])
    expect(backward.anchorId).toBe('|c')
  })

  it('never ranges through an entry the surface does not render', () => {
    // `|b` was hidden by a query, so the range from `|a` to `|c` covers the two visible ones.
    const result = updateWorktreeSelection({
      visibleIds: ['|a', '|c'],
      previousSelectedIds: new Set(['|a']),
      previousAnchorId: '|a',
      targetId: '|c',
      intent: 'range'
    })

    expect([...result.selectedIds]).toEqual(['|a', '|c'])
  })

  it('collapses the range to the clicked entry when the anchor is not rendered', () => {
    const result = updateWorktreeSelection({
      visibleIds: ['|c', '|d'],
      previousSelectedIds: new Set(['|a']),
      previousAnchorId: '|a',
      targetId: '|d',
      intent: 'range'
    })

    expect([...result.selectedIds]).toEqual(['|d'])
    expect(result.anchorId).toBe('|d')
  })

  it('treats a range with no anchor at all as a plain click', () => {
    const result = updateWorktreeSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(),
      previousAnchorId: null,
      targetId: '|c',
      intent: 'range'
    })

    expect([...result.selectedIds]).toEqual(['|c'])
  })
})

describe('pruneWorktreeSelection', () => {
  it('drops ids the surface no longer holds and re-anchors on a survivor', () => {
    const pruned = pruneWorktreeSelection(new Set(['|gone', '|a', '|c']), '|gone', VISIBLE)

    expect([...pruned.selectedIds]).toEqual(['|a', '|c'])
    expect(pruned.anchorId).toBe('|a')
  })

  it('keeps the anchor when it is still painted', () => {
    const pruned = pruneWorktreeSelection(new Set(['|a', '|c']), '|c', VISIBLE)

    expect([...pruned.selectedIds]).toEqual(['|a', '|c'])
    expect(pruned.anchorId).toBe('|c')
  })

  it('empties an anchor-less selection that lost every entry', () => {
    const pruned = pruneWorktreeSelection(new Set(['|gone']), null, VISIBLE)

    expect(pruned.selectedIds.size).toBe(0)
    expect(pruned.anchorId).toBeNull()
  })
})

describe('resolveWorktreeRenderedAnchorId', () => {
  it('keeps a rendered anchor and re-anchors to the first rendered selected entry otherwise', () => {
    expect(resolveWorktreeRenderedAnchorId(['|a', '|b'], new Set(['|a']), '|a')).toBeNull()
    expect(resolveWorktreeRenderedAnchorId(['|b', '|c'], new Set(['|b', '|c']), '|a')).toBe('|b')
    expect(resolveWorktreeRenderedAnchorId(['|b'], new Set(['|b']), '|a')).toBe('|b')
    expect(resolveWorktreeRenderedAnchorId(['|b'], new Set(['|z']), '|a')).toBeNull()
  })
})

describe('updateWorktreeAreaSelection', () => {
  it('replaces the selection with the marquee area in surface order', () => {
    const result = updateWorktreeAreaSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|a']),
      previousAnchorId: '|a',
      areaIds: ['|d', '|b'],
      additive: false
    })

    expect([...result.selectedIds]).toEqual(['|b', '|d'])
    expect(result.anchorId).toBe('|d')
  })

  it('unions an additive marquee with the selection it started from', () => {
    const result = updateWorktreeAreaSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|a']),
      previousAnchorId: '|a',
      areaIds: ['|c'],
      additive: true
    })

    expect([...result.selectedIds]).toEqual(['|a', '|c'])
    expect(result.anchorId).toBe('|c')
  })

  it('ignores area ids the surface does not render', () => {
    const result = updateWorktreeAreaSelection({
      visibleIds: ['|a', '|b'],
      previousSelectedIds: new Set(),
      previousAnchorId: null,
      areaIds: ['|hidden', '|b'],
      additive: false
    })

    expect([...result.selectedIds]).toEqual(['|b'])
  })

  it('keeps the previous anchor when the marquee covered nothing, and clears it otherwise', () => {
    const empty = updateWorktreeAreaSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|a']),
      previousAnchorId: '|a',
      areaIds: [],
      additive: true
    })
    expect(empty.selectedIds.size).toBe(1)
    expect(empty.anchorId).toBe('|a')

    const cleared = updateWorktreeAreaSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|a']),
      previousAnchorId: '|a',
      areaIds: [],
      additive: false
    })
    expect(cleared.selectedIds.size).toBe(0)
    expect(cleared.anchorId).toBeNull()
  })
})

describe('selectAllWorktreeVisible', () => {
  it('selects the entries the surface renders and anchors on the last one', () => {
    const result = selectAllWorktreeVisible(['|a', '|c'])

    expect([...result.selectedIds]).toEqual(['|a', '|c'])
    expect(result.anchorId).toBe('|c')
  })

  it('selects nothing on a surface the search emptied', () => {
    const result = selectAllWorktreeVisible([])

    expect(result.selectedIds.size).toBe(0)
    expect(result.anchorId).toBeNull()
  })
})

describe('areWorktreeSelectionsEqual', () => {
  it('compares membership, not identity or order', () => {
    expect(areWorktreeSelectionsEqual(new Set(['|a', '|b']), new Set(['|b', '|a']))).toBe(true)
    expect(areWorktreeSelectionsEqual(new Set(['|a']), new Set(['|a', '|b']))).toBe(false)
    expect(areWorktreeSelectionsEqual(new Set(['|a']), new Set(['|b']))).toBe(false)
  })
})
