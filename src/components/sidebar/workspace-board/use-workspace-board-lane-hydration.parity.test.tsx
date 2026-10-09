// Opening the board must not pay for every lane's rich cards at once: the shells paint, then one
// lane hydrates per animation frame inside a transition. These are the frames and the set the
// grid gates its cards on.
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWorkspaceBoardLaneHydration } from './use-workspace-board-lane-hydration'

/** One animation frame of the faked clock. */
const FRAME_MS = 16

function advanceFrames(count: number): void {
  act(() => {
    vi.advanceTimersByTime(FRAME_MS * count)
  })
}

describe('useWorkspaceBoardLaneHydration', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('hydrates one lane per frame and every lane of the window by the end', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    const { result } = renderHook(() =>
      useWorkspaceBoardLaneHydration({ open: true, laneIds: ['todo', 'in-progress', 'completed'] })
    )

    expect([...result.current]).toEqual([])

    advanceFrames(1)
    expect([...result.current]).toEqual(['todo'])

    advanceFrames(1)
    expect([...result.current]).toEqual(['todo', 'in-progress'])

    advanceFrames(1)
    expect([...result.current]).toEqual(['todo', 'in-progress', 'completed'])

    // Nothing left to schedule: another frame must not add anything.
    advanceFrames(2)
    expect([...result.current]).toEqual(['todo', 'in-progress', 'completed'])
  })

  it('hydrates nothing while the board is closed and restarts when it opens', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) =>
        useWorkspaceBoardLaneHydration({ open, laneIds: ['todo', 'in-progress'] }),
      { initialProps: { open: false } }
    )

    advanceFrames(4)
    expect([...result.current]).toEqual([])

    rerender({ open: true })
    advanceFrames(2)
    expect([...result.current]).toEqual(['todo', 'in-progress'])

    rerender({ open: false })
    expect([...result.current]).toEqual([])
  })

  it('hydrates the lanes of a new window and drops the ones that scrolled out', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    const { result, rerender } = renderHook(
      ({ laneIds }: { laneIds: string[] }) =>
        useWorkspaceBoardLaneHydration({ open: true, laneIds }),
      { initialProps: { laneIds: ['todo', 'in-progress'] } }
    )

    advanceFrames(2)
    expect([...result.current]).toEqual(['todo', 'in-progress'])

    rerender({ laneIds: ['completed', 'archived'] })
    advanceFrames(2)
    expect([...result.current]).toEqual(['completed', 'archived'])
  })
})
