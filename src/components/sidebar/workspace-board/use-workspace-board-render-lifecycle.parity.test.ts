import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { useWorkspaceBoardRenderLifecycle } from './use-workspace-board-render-lifecycle'

function renderLifecycle(initial: {
  open: boolean
  selectedCount: number
}): {
  result: { current: boolean }
  rerender: (next: { open: boolean; selectedCount: number }) => void
  clearSelection: Mock
  content: HTMLElement
  board: HTMLElement
} {
  const content = document.createElement('div')
  content.setAttribute('data-slot', 'sheet-content')
  const board = document.createElement('div')
  content.appendChild(board)
  document.body.appendChild(content)
  const clearSelection = vi.fn()
  const { result, rerender } = renderHook(
    (args: { open: boolean; selectedCount: number }) =>
      useWorkspaceBoardRenderLifecycle({
        boardRef: { current: board },
        clearSelection,
        open: args.open,
        selectedCount: args.selectedCount,
      }),
    { initialProps: initial }
  )
  return { result, rerender, clearSelection, content, board }
}

async function settleFrame(): Promise<void> {
  await act(async () => {
    const { promise, resolve } = Promise.withResolvers<void>()
    requestAnimationFrame(() => resolve())
    await promise
  })
}

function pointerDown(target: EventTarget): void {
  const event = new Event('pointerdown', { bubbles: true })
  target.dispatchEvent(event)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useWorkspaceBoardRenderLifecycle (D08-006)', () => {
  it('defers the cards one frame and starts painting after it', async () => {
    const { result } = renderLifecycle({ open: true, selectedCount: 0 })

    expect(result.current).toBe(false)
    await settleFrame()
    expect(result.current).toBe(true)
  })

  it('cancels the frame when the board closes before it fires', async () => {
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const { result, rerender } = renderLifecycle({ open: true, selectedCount: 0 })

    rerender({ open: false, selectedCount: 0 })
    expect(cancel).toHaveBeenCalled()
    await settleFrame()
    expect(result.current).toBe(false)
    cancel.mockRestore()
  })

  it('gates every reopen behind a fresh frame', async () => {
    const { result, rerender } = renderLifecycle({ open: true, selectedCount: 0 })
    await settleFrame()
    expect(result.current).toBe(true)

    rerender({ open: false, selectedCount: 0 })
    expect(result.current).toBe(false)

    rerender({ open: true, selectedCount: 0 })
    expect(result.current).toBe(false)
    await settleFrame()
    expect(result.current).toBe(true)
  })

  it('clears the selection on a press outside the sheet, but never for keep-open surfaces', () => {
    const { clearSelection, content } = renderLifecycle({ open: true, selectedCount: 2 })

    act(() => pointerDown(content))
    expect(clearSelection).not.toHaveBeenCalled()

    const menu = document.createElement('div')
    menu.setAttribute('data-sonner-toast', '')
    const toast = document.createElement('div')
    menu.appendChild(toast)
    document.body.appendChild(menu)
    act(() => pointerDown(toast))
    expect(clearSelection).not.toHaveBeenCalled()

    act(() => pointerDown(document.body))
    expect(clearSelection).toHaveBeenCalledTimes(1)
  })

  it('does not listen outside while nothing is selected', () => {
    const { clearSelection } = renderLifecycle({ open: true, selectedCount: 0 })

    act(() => pointerDown(document.body))
    expect(clearSelection).not.toHaveBeenCalled()
  })
})
