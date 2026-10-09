// The board's selection model, exercised without a DOM: every gesture the pointer, the marquee
// and the keyboard can produce has to be answerable from ids alone, because the hit testing and
// the rendering both read these results.
import { describe, expect, it } from 'vitest'
import {
  areWorkspaceBoardSelectionsEqual,
  getWorkspaceBoardSelectionIntent,
  isWorkspaceBoardSelectAllShortcut,
  isWorkspaceBoardTextEntryTarget,
  pruneWorkspaceBoardSelection,
  resolveWorkspaceBoardRenderedAnchorId,
  selectAllWorkspaceBoardVisible,
  updateWorkspaceBoardAreaSelection,
  updateWorkspaceBoardSelection
} from './workspace-board-selection'

const VISIBLE = ['|a', '|b', '|c', '|d'] as const

function clickEvent(overrides: Partial<Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey'>>): {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
} {
  return { metaKey: false, ctrlKey: false, shiftKey: false, ...overrides }
}

describe('getWorkspaceBoardSelectionIntent', () => {
  it('reads a plain click as a replace and a modifier click as a toggle per platform', () => {
    expect(getWorkspaceBoardSelectionIntent(clickEvent({}), false)).toBe('replace')
    expect(getWorkspaceBoardSelectionIntent(clickEvent({ ctrlKey: true }), false)).toBe('toggle')
    expect(getWorkspaceBoardSelectionIntent(clickEvent({ metaKey: true }), true)).toBe('toggle')
  })

  it('keeps the toggle modifier off the other platform key', () => {
    // Ctrl on macOS is not the toggle modifier, and Meta on Windows/Linux is not either.
    expect(getWorkspaceBoardSelectionIntent(clickEvent({ metaKey: true }), false)).toBe('replace')
    expect(getWorkspaceBoardSelectionIntent(clickEvent({ ctrlKey: true }), true)).toBe('replace')
  })

  it('lets shift win over the toggle modifier', () => {
    expect(getWorkspaceBoardSelectionIntent(clickEvent({ shiftKey: true }), true)).toBe('range')
    expect(
      getWorkspaceBoardSelectionIntent(clickEvent({ shiftKey: true, metaKey: true }), true)
    ).toBe('range')
  })
})

describe('updateWorkspaceBoardSelection', () => {
  it('replaces the selection and re-anchors on a plain click', () => {
    const result = updateWorkspaceBoardSelection({
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
    const removed = updateWorkspaceBoardSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|a', '|b']),
      previousAnchorId: '|a',
      targetId: '|b',
      intent: 'toggle'
    })
    expect([...removed.selectedIds]).toEqual(['|a'])
    expect(removed.anchorId).toBe('|b')

    const added = updateWorkspaceBoardSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|a']),
      previousAnchorId: '|a',
      targetId: '|d',
      intent: 'toggle'
    })
    expect([...added.selectedIds]).toEqual(['|a', '|d'])
  })

  it('extends a range from the anchor in the board order, both ways', () => {
    const forward = updateWorkspaceBoardSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|b']),
      previousAnchorId: '|b',
      targetId: '|d',
      intent: 'range'
    })
    expect([...forward.selectedIds]).toEqual(['|b', '|c', '|d'])
    expect(forward.anchorId).toBe('|b')

    const backward = updateWorkspaceBoardSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|c']),
      previousAnchorId: '|c',
      targetId: '|a',
      intent: 'range'
    })
    expect([...backward.selectedIds]).toEqual(['|a', '|b', '|c'])
    expect(backward.anchorId).toBe('|c')
  })

  it('never ranges through a card the board does not render', () => {
    // `|b` was hidden by a query, so the range from `|a` to `|c` covers the two visible ones.
    const result = updateWorkspaceBoardSelection({
      visibleIds: ['|a', '|c'],
      previousSelectedIds: new Set(['|a']),
      previousAnchorId: '|a',
      targetId: '|c',
      intent: 'range'
    })

    expect([...result.selectedIds]).toEqual(['|a', '|c'])
  })

  it('collapses the range to the clicked card when the anchor is not rendered', () => {
    const result = updateWorkspaceBoardSelection({
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
    const result = updateWorkspaceBoardSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(),
      previousAnchorId: null,
      targetId: '|c',
      intent: 'range'
    })

    expect([...result.selectedIds]).toEqual(['|c'])
  })
})

describe('pruneWorkspaceBoardSelection', () => {
  it('drops ids the board no longer holds and re-anchors on a survivor', () => {
    const pruned = pruneWorkspaceBoardSelection(
      new Set(['|gone', '|a', '|c']),
      '|gone',
      VISIBLE
    )

    expect([...pruned.selectedIds]).toEqual(['|a', '|c'])
    expect(pruned.anchorId).toBe('|a')
  })

  it('keeps the anchor when it is still on the board', () => {
    const pruned = pruneWorkspaceBoardSelection(new Set(['|a', '|c']), '|c', VISIBLE)

    expect([...pruned.selectedIds]).toEqual(['|a', '|c'])
    expect(pruned.anchorId).toBe('|c')
  })

  it('empties an anchor-less selection that lost every card', () => {
    const pruned = pruneWorkspaceBoardSelection(new Set(['|gone']), null, VISIBLE)

    expect(pruned.selectedIds.size).toBe(0)
    expect(pruned.anchorId).toBeNull()
  })
})

describe('resolveWorkspaceBoardRenderedAnchorId', () => {
  it('keeps a rendered anchor and re-anchors to the first rendered selected card otherwise', () => {
    expect(resolveWorkspaceBoardRenderedAnchorId(['|a', '|b'], new Set(['|a']), '|a')).toBeNull()
    expect(resolveWorkspaceBoardRenderedAnchorId(['|b', '|c'], new Set(['|b', '|c']), '|a')).toBe(
      '|b'
    )
    expect(resolveWorkspaceBoardRenderedAnchorId(['|b'], new Set(['|b']), '|a')).toBe('|b')
    expect(resolveWorkspaceBoardRenderedAnchorId(['|b'], new Set(['|z']), '|a')).toBeNull()
  })
})

describe('updateWorkspaceBoardAreaSelection', () => {
  it('replaces the selection with the marquee area in board order', () => {
    const result = updateWorkspaceBoardAreaSelection({
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
    const result = updateWorkspaceBoardAreaSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|a']),
      previousAnchorId: '|a',
      areaIds: ['|c'],
      additive: true
    })

    expect([...result.selectedIds]).toEqual(['|a', '|c'])
    expect(result.anchorId).toBe('|c')
  })

  it('ignores area ids the board does not render', () => {
    const result = updateWorkspaceBoardAreaSelection({
      visibleIds: ['|a', '|b'],
      previousSelectedIds: new Set(),
      previousAnchorId: null,
      areaIds: ['|hidden', '|b'],
      additive: false
    })

    expect([...result.selectedIds]).toEqual(['|b'])
  })

  it('keeps the previous anchor when the marquee covered nothing, and clears it otherwise', () => {
    const empty = updateWorkspaceBoardAreaSelection({
      visibleIds: VISIBLE,
      previousSelectedIds: new Set(['|a']),
      previousAnchorId: '|a',
      areaIds: [],
      additive: true
    })
    expect(empty.selectedIds.size).toBe(1)
    expect(empty.anchorId).toBe('|a')

    const cleared = updateWorkspaceBoardAreaSelection({
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

describe('selectAllWorkspaceBoardVisible', () => {
  it('selects the cards the board renders and anchors on the last one', () => {
    const result = selectAllWorkspaceBoardVisible(['|a', '|c'])

    expect([...result.selectedIds]).toEqual(['|a', '|c'])
    expect(result.anchorId).toBe('|c')
  })

  it('selects nothing on a board the search emptied', () => {
    const result = selectAllWorkspaceBoardVisible([])

    expect(result.selectedIds.size).toBe(0)
    expect(result.anchorId).toBeNull()
  })
})

describe('areWorkspaceBoardSelectionsEqual', () => {
  it('compares membership, not identity or order', () => {
    expect(areWorkspaceBoardSelectionsEqual(new Set(['|a', '|b']), new Set(['|b', '|a']))).toBe(true)
    expect(areWorkspaceBoardSelectionsEqual(new Set(['|a']), new Set(['|a', '|b']))).toBe(false)
    expect(areWorkspaceBoardSelectionsEqual(new Set(['|a']), new Set(['|b']))).toBe(false)
  })
})

describe('keyboard selection', () => {
  it('reads Mod+A as select-all, without Alt or Shift', () => {
    expect(
      isWorkspaceBoardSelectAllShortcut({ key: 'a', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false })
    ).toBe(true)
    expect(
      isWorkspaceBoardSelectAllShortcut({ key: 'A', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false })
    ).toBe(true)
    expect(
      isWorkspaceBoardSelectAllShortcut({ key: 'a', metaKey: false, ctrlKey: true, altKey: false, shiftKey: true })
    ).toBe(false)
    expect(
      isWorkspaceBoardSelectAllShortcut({ key: 'a', metaKey: false, ctrlKey: true, altKey: true, shiftKey: false })
    ).toBe(false)
    expect(
      isWorkspaceBoardSelectAllShortcut({ key: 'b', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false })
    ).toBe(false)
    expect(
      isWorkspaceBoardSelectAllShortcut({ key: 'a', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false })
    ).toBe(false)
  })

  it('keeps a text field own keys, including a contenteditable and a select', () => {
    const input = document.createElement('input')
    expect(isWorkspaceBoardTextEntryTarget(input)).toBe(true)

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', '')
    expect(isWorkspaceBoardTextEntryTarget(editable)).toBe(true)

    const select = document.createElement('select')
    expect(isWorkspaceBoardTextEntryTarget(select)).toBe(true)

    const button = document.createElement('button')
    expect(isWorkspaceBoardTextEntryTarget(button)).toBe(false)

    // xterm's hidden input is not a real text field: it must not swallow board shortcuts.
    const terminalInput = document.createElement('textarea')
    terminalInput.classList.add('xterm-helper-textarea')
    expect(isWorkspaceBoardTextEntryTarget(terminalInput)).toBe(false)
  })
})
