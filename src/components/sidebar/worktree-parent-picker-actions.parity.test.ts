import { describe, expect, it, vi } from 'vitest'
import {
  DISARMED_WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE,
  WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE_SUPPRESS_MS,
  armWorktreeParentPickerOutsideClose,
  getWorktreeParentPickerFocusRestoreTarget,
  handleWorktreeParentPickerKeyDown,
  selectWorktreeParent,
  shouldSuppressWorktreeParentPickerOutsideClose
} from './worktree-parent-picker-actions'

type KeyDownEvent = Parameters<typeof handleWorktreeParentPickerKeyDown>[0]['event']

function keyDown(key: string, overrides: Partial<KeyDownEvent> = {}): KeyDownEvent {
  return {
    key,
    isComposing: false,
    keyCode: 0,
    nativeEvent: { isComposing: false, keyCode: 0 },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides
  } as unknown as KeyDownEvent
}

const CANDIDATES = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

describe('handleWorktreeParentPickerKeyDown (D06-027)', () => {
  it('moves the highlight down and up one row', () => {
    const moveHighlight = vi.fn()
    const down = keyDown('ArrowDown')
    handleWorktreeParentPickerKeyDown({
      event: down,
      candidates: CANDIDATES,
      activeIndex: 0,
      moveHighlight,
      selectParent: vi.fn()
    })
    expect(moveHighlight).toHaveBeenLastCalledWith(1)
    expect(down.preventDefault).toHaveBeenCalled()

    handleWorktreeParentPickerKeyDown({
      event: keyDown('ArrowUp'),
      candidates: CANDIDATES,
      activeIndex: 2,
      moveHighlight,
      selectParent: vi.fn()
    })
    expect(moveHighlight).toHaveBeenLastCalledWith(1)
  })

  it('jumps to the first and last candidate with Home and End', () => {
    const moveHighlight = vi.fn()
    for (const [key, expected] of [
      ['Home', 0],
      ['End', 2]
    ] as const) {
      handleWorktreeParentPickerKeyDown({
        event: keyDown(key),
        candidates: CANDIDATES,
        activeIndex: 1,
        moveHighlight,
        selectParent: vi.fn()
      })
      expect(moveHighlight).toHaveBeenLastCalledWith(expected)
    }
  })

  it('selects the highlighted candidate on Enter', () => {
    const selectParent = vi.fn()
    const event = keyDown('Enter')
    handleWorktreeParentPickerKeyDown({
      event,
      candidates: CANDIDATES,
      activeIndex: 1,
      moveHighlight: vi.fn(),
      selectParent
    })

    expect(selectParent).toHaveBeenCalledWith('b')
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('ignores the Enter that confirms an IME composition', () => {
    const selectParent = vi.fn()
    const moveHighlight = vi.fn()
    handleWorktreeParentPickerKeyDown({
      event: keyDown('Enter', { isComposing: true }),
      candidates: CANDIDATES,
      activeIndex: 0,
      moveHighlight,
      selectParent
    })
    handleWorktreeParentPickerKeyDown({
      event: keyDown('ArrowDown', { keyCode: 229 }),
      candidates: CANDIDATES,
      activeIndex: 0,
      moveHighlight,
      selectParent
    })

    expect(selectParent).not.toHaveBeenCalled()
    expect(moveHighlight).not.toHaveBeenCalled()
  })

  it('does nothing on an empty candidate list', () => {
    const moveHighlight = vi.fn()
    const selectParent = vi.fn()
    handleWorktreeParentPickerKeyDown({
      event: keyDown('Enter'),
      candidates: [],
      activeIndex: 0,
      moveHighlight,
      selectParent
    })

    expect(moveHighlight).not.toHaveBeenCalled()
    expect(selectParent).not.toHaveBeenCalled()
  })
})

describe('getWorktreeParentPickerFocusRestoreTarget (D06-027)', () => {
  it('returns the nearest focusable container of the anchor row', () => {
    const listbox = document.createElement('div')
    listbox.setAttribute('tabindex', '0')
    const row = document.createElement('div')
    listbox.appendChild(row)
    document.body.appendChild(listbox)

    expect(getWorktreeParentPickerFocusRestoreTarget(row)).toBe(listbox)
    listbox.remove()
  })

  it('returns null for a detached anchor', () => {
    expect(getWorktreeParentPickerFocusRestoreTarget(document.createElement('div'))).toBeNull()
    expect(getWorktreeParentPickerFocusRestoreTarget(null)).toBeNull()
  })
})

describe('selectWorktreeParent (D06-028)', () => {
  it('closes before the write and reports a translated failure toast once', async () => {
    const close = vi.fn()
    const showError = vi.fn()
    const assign = vi.fn(() => Promise.reject(new Error('backend down')))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    selectWorktreeParent({
      childPath: '/repo/child',
      parentPath: '/repo/parent',
      assignWorktreeParent: assign,
      close,
      showError
    })

    expect(close).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith('/repo/child', '/repo/parent')
    await Promise.resolve()
    await Promise.resolve()
    expect(showError).toHaveBeenCalledTimes(1)
    expect(showError).toHaveBeenCalledWith('Failed to set parent worktree')
    consoleError.mockRestore()
  })

  it('does not write without a resolved child', () => {
    const assign = vi.fn(() => Promise.resolve())
    selectWorktreeParent({
      childPath: null,
      parentPath: '/repo/parent',
      assignWorktreeParent: assign,
      close: vi.fn()
    })

    expect(assign).not.toHaveBeenCalled()
  })
})

describe('outside-close suppression (D06-028)', () => {
  it('suppresses interactions only inside the settle window', () => {
    const guard = armWorktreeParentPickerOutsideClose(1_000)

    expect(
      shouldSuppressWorktreeParentPickerOutsideClose(guard, 1_000 + WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE_SUPPRESS_MS - 1)
    ).toBe(true)
    expect(
      shouldSuppressWorktreeParentPickerOutsideClose(guard, 1_000 + WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE_SUPPRESS_MS)
    ).toBe(false)
    expect(
      shouldSuppressWorktreeParentPickerOutsideClose(
        DISARMED_WORKTREE_PARENT_PICKER_OUTSIDE_CLOSE,
        1_001
      )
    ).toBe(false)
  })
})
