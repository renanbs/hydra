import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isWorkspaceBoardKeepOpenTarget, useWorkspaceBoardOutsideDismiss } from './use-workspace-board-outside-dismiss'

function stubRect(element: HTMLElement, rect: { left: number; top: number; right: number; bottom: number }): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        ...rect,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        x: rect.left,
        y: rect.top,
        toJSON: () => ({}),
      }) as DOMRect,
  })
}

function buildSheet(): { content: HTMLElement; board: HTMLElement } {
  const content = document.createElement('div')
  content.setAttribute('data-slot', 'sheet-content')
  stubRect(content, { left: 300, top: 36, right: 900, bottom: 700 })
  const board = document.createElement('div')
  content.appendChild(board)
  document.body.appendChild(content)
  return { content, board }
}

function pointerDown(target: EventTarget, clientX: number, clientY: number): void {
  const event = new Event('pointerdown', { bubbles: true }) as PointerEvent
  Object.defineProperty(event, 'clientX', { value: clientX })
  Object.defineProperty(event, 'clientY', { value: clientY })
  target.dispatchEvent(event)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useWorkspaceBoardOutsideDismiss (D08-004)', () => {
  it('dismisses on a canvas press to the right of the sheet', () => {
    const { content } = buildSheet()
    const onOpenChange = vi.fn()
    renderHook(() =>
      useWorkspaceBoardOutsideDismiss({
        open: true,
        boardRef: { current: content },
        preserveOpenForMenu: false,
        onOpenChange,
      })
    )

    act(() => pointerDown(document.body, 1000, 400))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('ignores presses inside the sheet and left of its live edge', () => {
    const { content, board } = buildSheet()
    const onOpenChange = vi.fn()
    renderHook(() =>
      useWorkspaceBoardOutsideDismiss({
        open: true,
        boardRef: { current: board },
        preserveOpenForMenu: false,
        onOpenChange,
      })
    )

    act(() => pointerDown(content, 500, 400))
    act(() => pointerDown(document.body, 100, 400))
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('ignores presses above or below the sheet band', () => {
    const { content } = buildSheet()
    const onOpenChange = vi.fn()
    renderHook(() =>
      useWorkspaceBoardOutsideDismiss({
        open: true,
        boardRef: { current: content },
        preserveOpenForMenu: false,
        onOpenChange,
      })
    )

    act(() => pointerDown(document.body, 1000, 10))
    act(() => pointerDown(document.body, 1000, 900))
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('preserves the board for a menu that owns the interaction', () => {
    const { content } = buildSheet()
    const onOpenChange = vi.fn()
    renderHook(() =>
      useWorkspaceBoardOutsideDismiss({
        open: true,
        boardRef: { current: content },
        preserveOpenForMenu: true,
        onOpenChange,
      })
    )

    act(() => pointerDown(document.body, 1000, 400))
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('preserves the board for a keep-open surface even outside the sheet', () => {
    const { content } = buildSheet()
    const menu = document.createElement('div')
    menu.setAttribute('data-slot', 'dropdown-menu-content')
    const item = document.createElement('button')
    menu.appendChild(item)
    document.body.appendChild(menu)
    const onOpenChange = vi.fn()
    renderHook(() =>
      useWorkspaceBoardOutsideDismiss({
        open: true,
        boardRef: { current: content },
        preserveOpenForMenu: false,
        onOpenChange,
      })
    )

    act(() => pointerDown(item, 1000, 400))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(isWorkspaceBoardKeepOpenTarget(item)).toBe(true)
  })

  it('never dismisses while the board is closed', () => {
    const { content } = buildSheet()
    const onOpenChange = vi.fn()
    renderHook(() =>
      useWorkspaceBoardOutsideDismiss({
        open: false,
        boardRef: { current: content },
        preserveOpenForMenu: false,
        onOpenChange,
      })
    )

    act(() => pointerDown(document.body, 1000, 400))
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('recognizes every board-owned portal family', () => {
    const families: Array<[string, string]> = [
      ['data-workspace-board-trigger', ''],
      ['data-workspace-board-preserve-open', ''],
      ['data-workspace-status-appearance-popover', ''],
      ['data-radix-popper-content-wrapper', ''],
      ['data-sonner-toast', ''],
      ['data-slot', 'dropdown-menu-content'],
      ['data-slot', 'context-menu-content'],
      ['data-slot', 'popover-content'],
      ['data-slot', 'dialog-content'],
      ['role', 'menu'],
      ['role', 'alertdialog'],
    ]
    for (const [attribute, value] of families) {
      const element = document.createElement('div')
      element.setAttribute(attribute, value)
      if (attribute === 'role') {
        element.setAttribute('data-state', 'open')
      }
      expect(isWorkspaceBoardKeepOpenTarget(element)).toBe(true)
    }
  })
})
