// The board's lane row: only the lanes inside the window paint, the lane a card drag is over
// stays mounted even when it is outside that window, the window follows the column width the
// store persisted, and each lane's cards arrive one lane per animation frame.
//
// jsdom has no layout, so the scroller reports a synthetic viewport width and the lanes report
// nothing: the window is what the virtualizer measured, not what the DOM could have measured.
import { act, fireEvent, render } from '@testing-library/react'
import React, { useCallback, useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { WorkspaceStatusDefinition } from '../../../shared/worktree/types'
import type { GitWorktreeInfo, HydraProject } from '../types'
import WorkspaceBoardLaneGrid from './WorkspaceBoardLaneGrid'
import type { WorkspaceBoardCard as WorkspaceBoardCardModel } from './workspace-board-worktrees'
import type { WorkspaceBoardLane } from './workspace-board-worktrees'

const PROJECT: HydraProject = {
  id: 'repo_1',
  name: 'hydra',
  path: '/repo/hydra',
  is_git: true,
  current_branch: 'main'
}

const COLUMN_WIDTH = 200
const LANE_GAP = 12
const VIEWPORT_WIDTH = 250
const LANE_IDS = ['lane-0', 'lane-1', 'lane-2', 'lane-3', 'lane-4', 'lane-5']

function worktree(id: string): GitWorktreeInfo {
  return {
    id,
    path: `/repo/hydra/${id}`,
    head_commit: 'abc1234',
    branch: id,
    is_bare: false,
    is_locked: false
  }
}

function lane(statusId: string): WorkspaceBoardLane {
  const status: WorkspaceStatusDefinition = {
    id: statusId,
    label: statusId,
    color: 'neutral',
    icon: 'circle'
  }
  const card: WorkspaceBoardCardModel = {
    identity: `|${statusId}-card`,
    worktree: worktree(`${statusId}-card`),
    project: PROJECT,
    sessions: [],
    activityStatus: 'inactive',
    prDisplay: null,
    ports: [],
    isPinned: false,
    isUnread: false,
    isActive: false,
    laneIndex: 0
  }
  return { status, cards: [card], totalCount: 1 }
}

const LANES: WorkspaceBoardLane[] = LANE_IDS.map(lane)

function LaneRowHarness({
  columnWidth,
  dropTargetStatus
}: {
  columnWidth: number
  dropTargetStatus: string | null
}): React.JSX.Element {
  const [scrollerElement, setScrollerElement] = useState<HTMLDivElement | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const attachScroller = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      Object.defineProperty(node, 'offsetWidth', {
        configurable: true,
        value: VIEWPORT_WIDTH
      })
    }
    setScrollerElement(node)
  }, [])
  return (
    <div ref={attachScroller} data-workspace-board-lanes-scroller="">
      <WorkspaceBoardLaneGrid
        open
        lanes={LANES}
        hasQuery={false}
        columnWidth={columnWidth}
        compactCards={false}
        boardRef={boardRef}
        laneScrollerElement={scrollerElement}
        dropTargetStatus={dropTargetStatus}
        onCardPointerDownCapture={vi.fn()}
        onActivate={vi.fn()}
      />
    </div>
  )
}

function paintedLaneIds(): string[] {
  return [...document.querySelectorAll<HTMLElement>('[data-workspace-status]')].map(
    (element) => element.dataset.workspaceStatus ?? ''
  )
}

function laneSlot(statusId: string): HTMLElement | null {
  return (
    document
      .querySelector<HTMLElement>(`[data-workspace-status="${statusId}"]`)
      ?.closest<HTMLElement>('[style*="translateX"]') ?? null
  )
}

function laneGrid(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-workspace-board-lane-grid]')
  if (!element) {
    throw new Error('the board lane grid is not painted')
  }
  return element
}

function paintedCards(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-workspace-board-card-id]')]
}

async function settleFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

describe('WorkspaceBoardLaneGrid', () => {
  it('paints the lanes of the measured window with overscan, not every lane', () => {
    render(<LaneRowHarness columnWidth={COLUMN_WIDTH} dropTargetStatus={null} />)

    expect(paintedLaneIds()).toEqual(['lane-0', 'lane-1', 'lane-2'])
  })

  it('keeps the lane a card drag is over mounted when it is outside the window', () => {
    const { rerender } = render(
      <LaneRowHarness columnWidth={COLUMN_WIDTH} dropTargetStatus={null} />
    )
    expect(paintedLaneIds()).not.toContain('lane-5')

    rerender(<LaneRowHarness columnWidth={COLUMN_WIDTH} dropTargetStatus={'lane-5'} />)

    expect(paintedLaneIds()).toEqual(['lane-0', 'lane-1', 'lane-2', 'lane-5'])
    expect(document.querySelector('[data-workspace-board-lane-drop-target]')).not.toBeNull()
  })

  it('re-measures the window against the column width the board is given', () => {
    const { rerender } = render(
      <LaneRowHarness columnWidth={COLUMN_WIDTH} dropTargetStatus={null} />
    )

    expect(laneGrid().style.width).toBe(
      `${LANE_IDS.length * COLUMN_WIDTH + (LANE_IDS.length - 1) * LANE_GAP}px`
    )
    expect(laneSlot('lane-2')?.style.transform).toBe(
      `translateX(${2 * (COLUMN_WIDTH + LANE_GAP)}px)`
    )

    const widerColumnWidth = 260
    rerender(<LaneRowHarness columnWidth={widerColumnWidth} dropTargetStatus={null} />)

    expect(laneGrid().style.width).toBe(
      `${LANE_IDS.length * widerColumnWidth + (LANE_IDS.length - 1) * LANE_GAP}px`
    )
    expect(laneSlot('lane-1')?.style.transform).toBe(
      `translateX(${widerColumnWidth + LANE_GAP}px)`
    )
  })

  it('keeps the lane that holds focus mounted as the row scrolls past it', async () => {
    render(<LaneRowHarness columnWidth={COLUMN_WIDTH} dropTargetStatus={null} />)
    const laneElement = document.querySelector<HTMLElement>('[data-workspace-status="lane-2"]')
    expect(laneElement).not.toBeNull()
    const control = document.createElement('button')
    laneElement?.appendChild(control)

    await act(async () => {
      fireEvent.focusIn(control)
    })
    expect(paintedLaneIds()).toContain('lane-2')

    const scroller = document.querySelector<HTMLElement>('[data-workspace-board-lanes-scroller]')
    if (!scroller) {
      throw new Error('the lane row scroller is not painted')
    }
    Object.defineProperty(scroller, 'scrollLeft', { configurable: true, writable: true, value: 0 })
    await act(async () => {
      scroller.scrollLeft = 1200
      fireEvent.scroll(scroller)
    })

    expect(paintedLaneIds()).toEqual(['lane-2', 'lane-4', 'lane-5'])

    await act(async () => {
      fireEvent.focusOut(control)
    })
    expect(paintedLaneIds()).toEqual(['lane-4', 'lane-5'])
  })

  it('hydrates one lane per frame and every lane of the window by the end', async () => {
    render(<LaneRowHarness columnWidth={COLUMN_WIDTH} dropTargetStatus={null} />)

    expect(paintedCards()).toHaveLength(0)

    await settleFrame()
    expect(paintedCards()).toHaveLength(1)
    expect(paintedCards()[0]?.dataset.workspaceBoardCardId).toBe('|lane-0-card')

    await settleFrame()
    expect(paintedCards()).toHaveLength(2)

    await settleFrame()
    expect(paintedCards()).toHaveLength(3)
    expect(paintedLaneIds()).toEqual(['lane-0', 'lane-1', 'lane-2'])
  })
})
