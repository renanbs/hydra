// D08-023 — Shift+wheel scrolls the lane row horizontally *while a drag is in flight* (Orca
// `useWorkspaceKanbanShiftWheelScroll` parity).
//
// What this pins: the gesture only takes the wheel mid-drag and only inside the board; the
// plain wheel and every other Shift+wheel fall through untouched; and the line/page delta
// modes convert the way Orca converts them.
import { fireEvent, renderHook } from '@testing-library/react'
import type React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useWorkspaceBoardShiftWheelScroll } from './use-workspace-board-shift-wheel-scroll'

const BOARD_RECT = { left: 100, top: 100, right: 900, bottom: 700 }

type Refs = {
  boardRef: React.RefObject<HTMLElement | null>
  scrollerRef: React.RefObject<HTMLElement | null>
  isPointerDragActiveRef: React.RefObject<boolean>
}

function mountRefs(enabled = true): Refs {
  const board = document.createElement('div')
  Object.defineProperty(board, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ ...BOARD_RECT, width: 800, height: 600, x: 100, y: 100, toJSON: () => ({}) })
  })
  const scroller = document.createElement('div')
  board.appendChild(scroller)
  document.body.appendChild(board)
  Object.defineProperty(scroller, 'scrollLeft', { configurable: true, writable: true, value: 0 })

  const refs: Refs = {
    boardRef: { current: board },
    scrollerRef: { current: scroller },
    isPointerDragActiveRef: { current: false }
  }
  renderHook(() =>
    useWorkspaceBoardShiftWheelScroll(
      refs.boardRef,
      refs.scrollerRef,
      enabled,
      refs.isPointerDragActiveRef
    )
  )
  return refs
}

function scrollLeft(refs: Refs): number {
  return (refs.scrollerRef.current as HTMLElement).scrollLeft
}

function wheel(target: EventTarget, init: Record<string, unknown>): WheelEvent {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init })
  fireEvent(target, event)
  return event
}

/** jsdom has no DragEvent; the hook only reads `dataTransfer` and the pointer position. */
function dragEvent(type: string, dataTransfer: DataTransfer, x: number, y: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    dataTransfer: { value: dataTransfer },
    clientX: { value: x },
    clientY: { value: y }
  })
  return event
}

describe('useWorkspaceBoardShiftWheelScroll (Orca useWorkspaceKanbanShiftWheelScroll parity)', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('scrolls the lane row horizontally while a pointer drag is in flight', () => {
    const refs = mountRefs()
    refs.isPointerDragActiveRef.current = true

    const event = wheel(refs.scrollerRef.current as HTMLElement, {
      shiftKey: true,
      deltaY: 120,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL
    })

    expect(scrollLeft(refs)).toBe(120)
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves the plain wheel to the board and the card scroll bodies', () => {
    const refs = mountRefs()
    refs.isPointerDragActiveRef.current = true

    const event = wheel(refs.scrollerRef.current as HTMLElement, {
      deltaY: 120,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL
    })

    expect(scrollLeft(refs)).toBe(0)
    expect(event.defaultPrevented).toBe(false)
  })

  it('is inert while no drag is in flight, Shift or not', () => {
    const refs = mountRefs()

    const event = wheel(refs.scrollerRef.current as HTMLElement, {
      shiftKey: true,
      deltaY: 120,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL
    })

    expect(scrollLeft(refs)).toBe(0)
    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores a Shift+wheel outside the board', () => {
    const refs = mountRefs()
    refs.isPointerDragActiveRef.current = true

    const event = wheel(document.body, {
      shiftKey: true,
      deltaY: 120,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      clientX: 5,
      clientY: 5
    })

    expect(scrollLeft(refs)).toBe(0)
    expect(event.defaultPrevented).toBe(false)
  })

  it('follows a native workspace drag, even when the wheel lands outside the board', () => {
    const refs = mountRefs()
    const dataTransfer = {
      types: ['text/plain'],
      getData: () => 'wt-1'
    } as unknown as DataTransfer

    fireEvent(document.body, dragEvent('dragstart', dataTransfer, 300, 300))

    const event = wheel(document.body, {
      shiftKey: true,
      deltaY: 80,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      clientX: 5,
      clientY: 5
    })
    expect(scrollLeft(refs)).toBe(80)
    expect(event.defaultPrevented).toBe(true)

    // The drag ended: the same wheel no longer belongs to the board.
    fireEvent(document.body, dragEvent('dragend', dataTransfer, 300, 300))
    const after = wheel(document.body, {
      shiftKey: true,
      deltaY: 80,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      clientX: 5,
      clientY: 5
    })
    expect(scrollLeft(refs)).toBe(80)
    expect(after.defaultPrevented).toBe(false)
  })

  it('converts line and page deltas the way Orca converts them', () => {
    const refs = mountRefs()
    refs.isPointerDragActiveRef.current = true

    wheel(refs.scrollerRef.current as HTMLElement, {
      shiftKey: true,
      deltaY: 3,
      deltaMode: WheelEvent.DOM_DELTA_LINE
    })
    expect(scrollLeft(refs)).toBe(48)

    wheel(refs.scrollerRef.current as HTMLElement, {
      shiftKey: true,
      deltaY: 1,
      deltaMode: WheelEvent.DOM_DELTA_PAGE
    })
    expect(scrollLeft(refs)).toBe(48 + window.innerHeight)
  })

  it('installs no listener while the board is closed', () => {
    const refs = mountRefs(false)
    refs.isPointerDragActiveRef.current = true

    const event = wheel(refs.scrollerRef.current as HTMLElement, {
      shiftKey: true,
      deltaY: 120,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL
    })

    expect(scrollLeft(refs)).toBe(0)
    expect(event.defaultPrevented).toBe(false)
  })
})
