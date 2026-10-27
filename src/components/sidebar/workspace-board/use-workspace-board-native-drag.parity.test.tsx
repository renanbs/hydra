// The board's native drag, frame by frame (D03a-016, Orca `useWorktreeNativeDragAutoscroll`).
//
// What this pins: while a native workspace drag hovers a lane body's edge the browser stops
// delivering drag events, so one animation frame re-derives the destination and scrolls the
// lane body from the last known point; a point away from the edge still re-derives but never
// scrolls; a point that leaves the board ends the loop; and `dragend` cancels it. jsdom has no
// layout, so every rect is synthetic and the frames are driven by hand.
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import type React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { writeWorkspaceDragData } from '../workspace-status-drag-data'
import WorkspaceBoardPinDropTarget from './WorkspaceBoardPinDropTarget'
import { useWorkspaceBoardNativeDrag } from './use-workspace-board-native-drag'

const LANE_LEFT = 0
const LANE_RIGHT = 200
const LANE_TOP = 0
const LANE_BOTTOM = 600

/** Inside the edge zone (`EDGE_ZONE_PX` = 56) of the lane body's bottom edge. */
const EDGE_Y = 580
/** Mid-body: no edge intensity, so no scrolling. */
const MIDDLE_Y = 300

const POINT_X = 100

const SCROLL_HEIGHT = 1200
const CLIENT_HEIGHT = 600

class FakeDataTransfer {
  dropEffect = 'none'
  effectAllowed = 'none'
  private readonly data = new Map<string, string>()

  get types(): string[] {
    return [...this.data.keys()]
  }

  getData(type: string): string {
    return this.data.get(type) ?? ''
  }

  setData(type: string, value: string): void {
    this.data.set(type, value)
  }
}

/** jsdom has no DragEvent; the hook reads `dataTransfer`, the pointer position and relatedTarget. */
function dragEvent(
  type: string,
  dataTransfer: DataTransfer,
  x: number,
  y: number,
  relatedTarget: EventTarget | null = null
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    dataTransfer: { value: dataTransfer },
    clientX: { value: x },
    clientY: { value: y },
    relatedTarget: { value: relatedTarget }
  })
  return event
}

function stubRect(
  element: HTMLElement,
  rect: { left: number; top: number; right: number; bottom: number }
): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        ...rect,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        x: rect.left,
        y: rect.top,
        toJSON: () => ({})
      }) as DOMRect
  })
}

let frames: Map<number, FrameRequestCallback>
let nextFrameId: number

function runFrame(frameTime: number): void {
  const next = frames.entries().next()
  if (next.done) {
    return
  }
  const [frameId, callback] = next.value
  frames.delete(frameId)
  act(() => callback(frameTime))
}

function pendingFrames(): number {
  return frames.size
}

function lane(statusId: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-workspace-status="${statusId}"]`)
  if (!element) {
    throw new Error(`lane ${statusId} is not painted`)
  }
  return element
}

function laneBody(): HTMLElement {
  const body = document.querySelector<HTMLElement>('[data-workspace-board-card-scroller]')
  if (!body) {
    throw new Error('the lane body is not painted')
  }
  return body
}

function pinStrip(): HTMLElement {
  const strip = document.querySelector<HTMLElement>('[data-workspace-pin-drop-target]')
  if (!strip) {
    throw new Error('the pin strip is not painted')
  }
  return strip
}

/**
 * The board's real wiring: the hook owns the highlight state, and the lanes/strip render it
 * exactly as the board does (`data-workspace-board-lane-drop-target` and the strip's hover).
 */
function NativeDragHarness(): React.JSX.Element {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const drag = useWorkspaceBoardNativeDrag({
    open: true,
    boardRef,
    onDropWorktreesAtEndOfStatus: () => undefined,
    onPinWorktrees: () => undefined
  })
  const laneDropTarget = (statusId: string): '' | undefined =>
    drag.dragOverStatus === statusId ? '' : undefined
  return (
    <div ref={boardRef} data-workspace-board-lane-grid="">
      <section
        data-workspace-status="in-progress"
        data-workspace-board-lane-drop-target={laneDropTarget('in-progress')}
        onDragOver={(event) => drag.handleDragOver(event, 'in-progress')}
        onDragLeave={drag.handleDragLeave}
        onDrop={(event) => drag.handleDrop(event, 'in-progress')}
      >
        <div data-workspace-board-card-scroller="" />
      </section>
      <section
        data-workspace-status="completed"
        data-workspace-board-lane-drop-target={laneDropTarget('completed')}
        onDragOver={(event) => drag.handleDragOver(event, 'completed')}
        onDragLeave={drag.handleDragLeave}
        onDrop={(event) => drag.handleDrop(event, 'completed')}
      >
        <div data-workspace-board-card-scroller="" />
      </section>
      <WorkspaceBoardPinDropTarget
        open
        isDragOver={drag.pinDragOver}
        onDragOver={drag.handlePinDragOver}
        onDragLeave={drag.handlePinDragLeave}
        onDrop={drag.handlePinDrop}
      />
    </div>
  )
}

/** One lane box in viewport coordinates, as the geometry hit test reads it. */
function stubLaneRects(
  bounds: Record<string, { left: number; right: number; top?: number; bottom?: number }>
): void {
  for (const [statusId, box] of Object.entries(bounds)) {
    stubRect(lane(statusId), {
      left: box.left,
      right: box.right,
      top: box.top ?? LANE_TOP,
      bottom: box.bottom ?? LANE_BOTTOM
    })
  }
}

function renderHarness(): void {
  render(<NativeDragHarness />)
  stubLaneRects({
    'in-progress': { left: LANE_LEFT, right: LANE_RIGHT },
    completed: { left: 400, right: 600 }
  })
  const body = laneBody()
  stubRect(body, { left: LANE_LEFT, top: LANE_TOP, right: LANE_RIGHT, bottom: LANE_BOTTOM })
  Object.defineProperty(body, 'scrollHeight', { configurable: true, value: SCROLL_HEIGHT })
  Object.defineProperty(body, 'clientHeight', { configurable: true, value: CLIENT_HEIGHT })
  body.scrollTop = 0
}

function startNativeDragOverLane(y: number): DataTransfer {
  // The payload the sidebar list's row publishes on `dragstart`; the dragover only reaches
  // the board because `hasWorkspaceDragData` recognizes it.
  const dataTransfer = new FakeDataTransfer()
  writeWorkspaceDragData(dataTransfer, 'repo_1::/repo/hydra/wt-progress')
  fireEvent(lane('in-progress'), dragEvent('dragover', dataTransfer, POINT_X, y))
  return dataTransfer
}

beforeEach(() => {
  frames = new Map<number, FrameRequestCallback>()
  nextFrameId = 0
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    nextFrameId += 1
    frames.set(nextFrameId, callback)
    return nextFrameId
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId) => {
    frames.delete(frameId)
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useWorkspaceBoardNativeDrag autoscroll (Orca useWorktreeNativeDragAutoscroll parity)', () => {
  it('scrolls the lane body from the last known point and keeps one frame in flight', () => {
    renderHarness()
    startNativeDragOverLane(EDGE_Y)

    // The first frame only establishes the clock: no elapsed time, no scroll.
    runFrame(1000)
    expect(laneBody().scrollTop).toBe(0)

    runFrame(1016)
    expect(laneBody().scrollTop).toBeGreaterThan(0)
    expect(pendingFrames()).toBe(1)
  })

  it('re-derives the destination every frame, with no new drag event', () => {
    renderHarness()
    startNativeDragOverLane(EDGE_Y)
    expect(lane('in-progress')).toHaveAttribute('data-workspace-board-lane-drop-target')

    // The content under a still pointer moves (the body scrolled): the point now sits over
    // the neighbouring lane, and only the frame's own re-derivation can notice.
    stubLaneRects({
      'in-progress': { left: 400, right: 600 },
      completed: { left: LANE_LEFT, right: LANE_RIGHT }
    })
    runFrame(1000)
    runFrame(1016)

    expect(lane('completed')).toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(lane('in-progress')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
  })

  it('leaves the body alone away from the edge while still re-deriving', () => {
    renderHarness()
    startNativeDragOverLane(MIDDLE_Y)

    runFrame(1000)
    runFrame(1016)
    runFrame(1032)

    expect(laneBody().scrollTop).toBe(0)
    expect(lane('in-progress')).toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(pendingFrames()).toBe(1)
  })

  it('ends the loop when the point leaves the board and clears the highlight', () => {
    renderHarness()
    startNativeDragOverLane(EDGE_Y)
    runFrame(1000)
    expect(lane('in-progress')).toHaveAttribute('data-workspace-board-lane-drop-target')

    // The drag left the board: no lane and no strip sits under the point any more.
    stubLaneRects({
      'in-progress': { left: 400, right: 600 },
      completed: { left: 700, right: 900 }
    })
    runFrame(1016)

    expect(lane('in-progress')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(pendingFrames()).toBe(0)
  })

  it('cancels the loop on dragend', () => {
    renderHarness()
    const dataTransfer = startNativeDragOverLane(EDGE_Y)
    runFrame(1000)
    expect(pendingFrames()).toBe(1)

    fireEvent(document, dragEvent('dragend', dataTransfer, POINT_X, EDGE_Y))

    expect(pendingFrames()).toBe(0)
    expect(lane('in-progress')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
  })

  it('tracks the pin strip as a destination, not a lane', () => {
    renderHarness()
    stubRect(pinStrip(), { left: LANE_LEFT, top: -48, right: LANE_RIGHT, bottom: -16 })
    const dataTransfer = new FakeDataTransfer()
    writeWorkspaceDragData(dataTransfer, 'repo_1::/repo/hydra/wt-progress')
    fireEvent(pinStrip(), dragEvent('dragover', dataTransfer, POINT_X, -32))

    runFrame(1000)
    runFrame(1016)

    expect(pinStrip().classList.contains('bg-worktree-sidebar-accent')).toBe(true)
    expect(lane('in-progress')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    // The strip is not a lane body: the frame loop has nothing to scroll there.
    expect(laneBody().scrollTop).toBe(0)
  })
})
