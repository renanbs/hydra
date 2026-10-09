import { describe, expect, it } from 'vitest'
import { shouldStartWorkspaceBoardCardPointerDrag } from './workspace-board-card-drag-start'

type PointerGesture = Pick<
  PointerEvent,
  'button' | 'pointerType' | 'shiftKey' | 'metaKey' | 'ctrlKey'
>

function pointerEvent(overrides: Partial<PointerGesture> = {}): PointerGesture {
  return {
    button: 0,
    ctrlKey: false,
    metaKey: false,
    pointerType: 'mouse',
    shiftKey: false,
    ...overrides
  }
}

describe('workspace board card pointer drag start', () => {
  it('starts for plain primary mouse presses', () => {
    expect(shouldStartWorkspaceBoardCardPointerDrag(pointerEvent())).toBe(true)
  })

  it('leaves modifier presses to the selection gestures the board does not own yet', () => {
    expect(shouldStartWorkspaceBoardCardPointerDrag(pointerEvent({ metaKey: true }))).toBe(false)
    expect(shouldStartWorkspaceBoardCardPointerDrag(pointerEvent({ ctrlKey: true }))).toBe(false)
    expect(shouldStartWorkspaceBoardCardPointerDrag(pointerEvent({ shiftKey: true }))).toBe(false)
  })

  it('ignores touch presses (the lane scrolls) and non-primary buttons', () => {
    expect(shouldStartWorkspaceBoardCardPointerDrag(pointerEvent({ pointerType: 'touch' }))).toBe(
      false
    )
    expect(shouldStartWorkspaceBoardCardPointerDrag(pointerEvent({ button: 1 }))).toBe(false)
    expect(shouldStartWorkspaceBoardCardPointerDrag(pointerEvent({ button: 2 }))).toBe(false)
  })
})
