import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TOGGLE_WORKSPACE_BOARD_EVENT,
  useWorkspaceBoardPanel,
} from './use-workspace-board-panel'

function pressEscape(target: EventTarget = document): void {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
}

function toggleFromGlobalEvent(): void {
  act(() => {
    window.dispatchEvent(new Event(TOGGLE_WORKSPACE_BOARD_EVENT))
  })
}

describe('useWorkspaceBoardPanel (Orca useWorkspaceBoardPanel parity)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    document.body.replaceChildren()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('starts closed and renders nothing until it is opened', () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel())

    expect(result.current.workspaceBoardOpen).toBe(false)
    expect(result.current.workspaceBoardRenderedOpen).toBe(false)
  })

  it('toggles open and closed', () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel())

    act(() => result.current.toggleWorkspaceBoard())
    expect(result.current.workspaceBoardOpen).toBe(true)
    expect(result.current.workspaceBoardRenderedOpen).toBe(true)

    act(() => result.current.toggleWorkspaceBoard())
    expect(result.current.workspaceBoardOpen).toBe(false)
  })

  it('keeps the drawer mounted through the close animation, then unmounts it', () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel())

    act(() => result.current.toggleWorkspaceBoard())
    act(() => result.current.toggleWorkspaceBoard())
    expect(result.current.workspaceBoardRenderedOpen).toBe(true)

    act(() => vi.advanceTimersByTime(299))
    expect(result.current.workspaceBoardRenderedOpen).toBe(true)

    act(() => vi.advanceTimersByTime(1))
    expect(result.current.workspaceBoardRenderedOpen).toBe(false)
  })

  it('cancels the pending unmount when reopened inside the linger window', () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel())

    act(() => result.current.toggleWorkspaceBoard())
    act(() => result.current.toggleWorkspaceBoard())
    act(() => vi.advanceTimersByTime(299))
    act(() => result.current.toggleWorkspaceBoard())
    act(() => vi.advanceTimersByTime(1_000))

    expect(result.current.workspaceBoardOpen).toBe(true)
    expect(result.current.workspaceBoardRenderedOpen).toBe(true)
  })

  it('closes on Escape while it is open', () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel())

    act(() => result.current.toggleWorkspaceBoard())
    pressEscape()

    expect(result.current.workspaceBoardOpen).toBe(false)
  })

  it('leaves Escape to an open overlay and to an in-progress edit', () => {
    const overlay = document.createElement('div')
    overlay.setAttribute('data-slot', 'dialog-content')
    overlay.setAttribute('data-state', 'open')
    document.body.appendChild(overlay)
    const input = document.createElement('input')
    document.body.appendChild(input)

    const { result } = renderHook(() => useWorkspaceBoardPanel())
    act(() => result.current.toggleWorkspaceBoard())

    pressEscape()
    expect(result.current.workspaceBoardOpen).toBe(true)

    overlay.remove()
    pressEscape(input)
    expect(result.current.workspaceBoardOpen).toBe(true)

    input.remove()
    pressEscape()
    expect(result.current.workspaceBoardOpen).toBe(false)
  })

  it('toggles from the global custom event', () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel())

    toggleFromGlobalEvent()
    expect(result.current.workspaceBoardOpen).toBe(true)

    toggleFromGlobalEvent()
    expect(result.current.workspaceBoardOpen).toBe(false)
  })

  it('follows an explicit open-change request', () => {
    const { result } = renderHook(() => useWorkspaceBoardPanel())

    act(() => result.current.handleWorkspaceBoardOpenChange(true))
    expect(result.current.workspaceBoardOpen).toBe(true)

    act(() => result.current.handleWorkspaceBoardOpenChange(false))
    expect(result.current.workspaceBoardOpen).toBe(false)
  })
})
