// The board's keyboard scoping: `Mod+A` is select-all, and a real text field — but not xterm's
// hidden textarea — keeps its own keys. The selection model these feed is shared with the
// sidebar list and tested in `../worktree-selection.parity.test.ts`.
import { describe, expect, it } from 'vitest'
import {
  isWorkspaceBoardSelectAllShortcut,
  isWorkspaceBoardTextEntryTarget
} from './workspace-board-keyboard'

describe('isWorkspaceBoardSelectAllShortcut', () => {
  it('reads Mod+A as select-all, without Alt or Shift', () => {
    expect(
      isWorkspaceBoardSelectAllShortcut({
        key: 'a',
        metaKey: false,
        ctrlKey: true,
        altKey: false,
        shiftKey: false
      })
    ).toBe(true)
    expect(
      isWorkspaceBoardSelectAllShortcut({
        key: 'A',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false
      })
    ).toBe(true)
    expect(
      isWorkspaceBoardSelectAllShortcut({
        key: 'a',
        metaKey: false,
        ctrlKey: true,
        altKey: false,
        shiftKey: true
      })
    ).toBe(false)
    expect(
      isWorkspaceBoardSelectAllShortcut({
        key: 'a',
        metaKey: false,
        ctrlKey: true,
        altKey: true,
        shiftKey: false
      })
    ).toBe(false)
    expect(
      isWorkspaceBoardSelectAllShortcut({
        key: 'b',
        metaKey: false,
        ctrlKey: true,
        altKey: false,
        shiftKey: false
      })
    ).toBe(false)
    expect(
      isWorkspaceBoardSelectAllShortcut({
        key: 'a',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false
      })
    ).toBe(false)
  })
})

describe('isWorkspaceBoardTextEntryTarget', () => {
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
