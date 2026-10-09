// D08-022 — the lane-width gesture (Orca `useWorkspaceKanbanColumnResize` parity).
//
// What this pins: the pointer draft renders but never writes, so the store takes one write
// per gesture instead of one per frame; the committed width respects the Orca min/max; and
// the keyboard path (arrow, Shift for the coarse step) commits immediately.
import { act, fireEvent, render, screen } from '@testing-library/react'
import React, { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  WORKSPACE_BOARD_COLUMN_WIDTH_MAX,
  WORKSPACE_BOARD_COLUMN_WIDTH_MIN,
  WORKSPACE_BOARD_COLUMN_WIDTH_STEP
} from '../../../shared/workspace-statuses'
import { useWorkspaceBoardColumnResize } from './use-workspace-board-column-resize'

const COMMITTED = 308

function ResizeHarness({
  width,
  onCommit
}: {
  width: number
  onCommit: (width: number) => void
}): React.JSX.Element {
  const { columnWidth, isResizingColumn, onColumnResizeStart, onColumnResizeKeyDown } =
    useWorkspaceBoardColumnResize(width, onCommit)
  return (
    <div
      data-testid="handle"
      data-workspace-board-column-resize-handle=""
      role="separator"
      tabIndex={0}
      data-column-width={columnWidth}
      data-resizing={isResizingColumn ? 'true' : 'false'}
      onPointerDown={onColumnResizeStart}
      onKeyDown={onColumnResizeKeyDown}
    />
  )
}

/**
 * The real wiring: the committed width the hook reads is the one it last wrote, so the gesture
 * is modelled the way the store feeds it back (a static prop would fight the hook's own draft).
 */
function FeedbackHarness({
  initialWidth,
  onCommit
}: {
  initialWidth: number
  onCommit: (width: number) => void
}): React.JSX.Element {
  const [width, setWidth] = useState(initialWidth)
  return (
    <ResizeHarness
      width={width}
      onCommit={(next) => {
        setWidth(next)
        onCommit(next)
      }}
    />
  )
}

function handle(): HTMLElement {
  return screen.getByTestId('handle')
}

function publishedWidth(): string | undefined {
  return handle().dataset.columnWidth
}

async function flushFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

describe('useWorkspaceBoardColumnResize (Orca useWorkspaceKanbanColumnResize parity)', () => {
  it('drafts on pointermove and writes the store once per gesture, not per frame', async () => {
    const onCommit = vi.fn()
    render(<FeedbackHarness initialWidth={COMMITTED} onCommit={onCommit} />)

    fireEvent.pointerDown(handle(), { button: 0, clientX: 100 })
    expect(handle().dataset.resizing).toBe('true')
    expect(document.body.style.userSelect).toBe('none')
    expect(document.body.style.cursor).toBe('col-resize')

    fireEvent.pointerMove(document, { clientX: 130 })
    await flushFrame()
    expect(publishedWidth()).toBe(String(COMMITTED + 30))

    fireEvent.pointerMove(document, { clientX: 190 })
    await flushFrame()
    expect(publishedWidth()).toBe(String(COMMITTED + 90))

    // Frames of movement, still nothing persisted: the draft is local.
    expect(onCommit).not.toHaveBeenCalled()

    fireEvent.pointerUp(document)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(COMMITTED + 90)
    expect(handle().dataset.resizing).toBe('false')
    expect(document.body.style.userSelect).toBe('')
  })

  it('clamps the committed width to the Orca min and max', () => {
    const onCommit = vi.fn()
    render(<FeedbackHarness initialWidth={COMMITTED} onCommit={onCommit} />)

    fireEvent.pointerDown(handle(), { button: 0, clientX: 400 })
    fireEvent.pointerMove(document, { clientX: -4_000 })
    fireEvent.pointerUp(document)
    expect(onCommit).toHaveBeenLastCalledWith(WORKSPACE_BOARD_COLUMN_WIDTH_MIN)

    fireEvent.pointerDown(handle(), { button: 0, clientX: 400 })
    fireEvent.pointerMove(document, { clientX: 9_000 })
    fireEvent.pointerUp(document)
    expect(onCommit).toHaveBeenLastCalledWith(WORKSPACE_BOARD_COLUMN_WIDTH_MAX)
  })

  it('resizes from the keyboard: arrow steps, Shift doubles the step', () => {
    const onCommit = vi.fn()
    render(<FeedbackHarness initialWidth={COMMITTED} onCommit={onCommit} />)

    fireEvent.keyDown(handle(), { key: 'ArrowRight' })
    expect(onCommit).toHaveBeenLastCalledWith(COMMITTED + WORKSPACE_BOARD_COLUMN_WIDTH_STEP)

    fireEvent.keyDown(handle(), { key: 'ArrowRight', shiftKey: true })
    expect(onCommit).toHaveBeenLastCalledWith(
      COMMITTED + WORKSPACE_BOARD_COLUMN_WIDTH_STEP * 3
    )

    fireEvent.keyDown(handle(), { key: 'ArrowLeft' })
    expect(onCommit).toHaveBeenLastCalledWith(
      COMMITTED + WORKSPACE_BOARD_COLUMN_WIDTH_STEP * 2
    )

    // A key that owns no gesture must not touch the width.
    const callsBefore = onCommit.mock.calls.length
    fireEvent.keyDown(handle(), { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledTimes(callsBefore)
  })

  it('lands on the max without writing the same value twice', () => {
    const onCommit = vi.fn()
    render(
      <FeedbackHarness
        initialWidth={WORKSPACE_BOARD_COLUMN_WIDTH_MAX - 5}
        onCommit={onCommit}
      />
    )

    fireEvent.keyDown(handle(), { key: 'ArrowRight' })
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenLastCalledWith(WORKSPACE_BOARD_COLUMN_WIDTH_MAX)

    fireEvent.keyDown(handle(), { key: 'ArrowRight' })
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('keeps the local draft while an external committed width changes mid-drag', async () => {
    const onCommit = vi.fn()
    const { rerender } = render(<ResizeHarness width={COMMITTED} onCommit={onCommit} />)

    fireEvent.pointerDown(handle(), { button: 0, clientX: 100 })
    fireEvent.pointerMove(document, { clientX: 160 })
    await flushFrame()
    expect(publishedWidth()).toBe(String(COMMITTED + 60))

    rerender(<ResizeHarness width={500} onCommit={onCommit} />)
    expect(publishedWidth()).toBe(String(COMMITTED + 60))

    fireEvent.pointerUp(document)
    expect(onCommit).toHaveBeenCalledWith(COMMITTED + 60)
  })
})
