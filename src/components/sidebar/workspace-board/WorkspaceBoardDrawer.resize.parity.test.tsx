// D08-022 — the lane resize reaching the real board: the handle drags the column width, the
// store takes exactly one write per gesture, the virtualizer's lane row re-measures, the
// keyboard steps commit too, and the gesture never leaks into the card drag or the marquee.
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/store'
import {
  WORKSPACE_BOARD_COLUMN_WIDTH_DEFAULT,
  WORKSPACE_BOARD_COLUMN_WIDTH_MAX,
  WORKSPACE_BOARD_COLUMN_WIDTH_STEP
} from '../../../shared/workspace-statuses'
import type { GitWorktreeInfo, HydraProject } from '../types'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import WorkspaceBoardDrawer, { type WorkspaceBoardDrawerProps } from './WorkspaceBoardDrawer'
import { WORKSPACE_BOARD_LANE_GAP } from './workspace-board-virtual-lanes'

const LANE_COUNT = 4

const PROJECT: HydraProject = {
  id: 'repo_1',
  name: 'hydra',
  path: '/repo/hydra',
  is_git: true,
  current_branch: 'main'
}

const DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: 'repo',
  sortBy: 'recent',
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false
}

const WORKTREES: GitWorktreeInfo[] = [
  {
    id: 'wt-progress',
    path: '/repo/hydra/wt-progress',
    head_commit: 'aaa1111',
    branch: 'feat/progress',
    is_bare: false,
    is_locked: false,
    status: 'in-progress'
  }
]

function drawerProps(
  overrides: Partial<WorkspaceBoardDrawerProps> = {}
): WorkspaceBoardDrawerProps {
  return {
    open: true,
    renderedOpen: true,
    sidebarRef: { current: null },
    displayProjects: [PROJECT],
    getProjectWorktrees: () => WORKTREES,
    sessions: [],
    displayOptions: DISPLAY_OPTIONS,
    compactCards: false,
    allWorktrees: WORKTREES,
    onAssignWorktreeStatus: vi.fn(),
    onCreateWorktree: vi.fn(),
    onOpenChange: vi.fn(),
    onSelectWorktree: vi.fn(),
    ...overrides
  }
}

function Board(props: WorkspaceBoardDrawerProps): React.JSX.Element {
  return (
    <TooltipProvider>
      <WorkspaceBoardDrawer {...props} />
    </TooltipProvider>
  )
}

function lane(statusId: string): HTMLElement | null {
  return document.body.querySelector<HTMLElement>(`[data-workspace-status="${statusId}"]`)
}

function resizeHandle(statusId = 'in-progress'): HTMLElement {
  const element = lane(statusId)?.querySelector<HTMLElement>(
    '[data-workspace-board-column-resize-handle]'
  )
  if (!element) {
    throw new Error(`the ${statusId} lane paints no resize handle`)
  }
  return element
}

function laneGrid(): HTMLElement {
  const element = document.body.querySelector<HTMLElement>('[data-workspace-board-lane-grid]')
  if (!element) {
    throw new Error('the board lane grid is not painted')
  }
  return element
}

function selectionSurface(): HTMLElement {
  const element = document.body.querySelector<HTMLElement>(
    '[data-workspace-board-selection-surface]'
  )
  if (!element) {
    throw new Error('the board selection surface is not painted')
  }
  return element
}

function selectionOverlay(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-workspace-board-selection-rect]')
}

/** The lane row is `count * width + (count - 1) * gap` wide; the virtualizer owns the total. */
function expectedGridWidth(width: number): string {
  return `${LANE_COUNT * width + (LANE_COUNT - 1) * WORKSPACE_BOARD_LANE_GAP}px`
}

const PINNED_BOARD_RECT = { left: 0, top: 0, right: 1_000, bottom: 600 }

function stubBoardRect(): void {
  Object.defineProperty(laneGrid(), 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        ...PINNED_BOARD_RECT,
        width: 1_000,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({})
      }) as DOMRect
  })
}

function pressSurface(clientX: number, clientY: number): void {
  fireEvent.pointerDown(selectionSurface(), {
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    clientX,
    clientY
  })
}

function movePointer(clientX: number, clientY: number): void {
  fireEvent.pointerMove(document, { pointerId: 1, pointerType: 'mouse', clientX, clientY })
}

function releasePointer(clientX: number, clientY: number): void {
  fireEvent.pointerUp(document, { pointerId: 1, pointerType: 'mouse', clientX, clientY })
}

async function settleFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

describe('workspace board lane resize', () => {
  let widthWrites: number[]
  let unsubscribe: () => void

  beforeEach(() => {
    widthWrites = []
    useAppStore.setState({ workspaceBoardColumnWidth: WORKSPACE_BOARD_COLUMN_WIDTH_DEFAULT })
    unsubscribe = useAppStore.subscribe((state, previous) => {
      if (state.workspaceBoardColumnWidth !== previous.workspaceBoardColumnWidth) {
        widthWrites.push(state.workspaceBoardColumnWidth)
      }
    })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    unsubscribe()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('drags the lane width, persisting once per gesture and re-measuring the lane row', () => {
    render(<Board {...drawerProps()} />)
    expect(laneGrid().style.width).toBe(expectedGridWidth(WORKSPACE_BOARD_COLUMN_WIDTH_DEFAULT))

    fireEvent.pointerDown(resizeHandle(), {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 500
    })
    fireEvent.pointerMove(document, { pointerId: 1, pointerType: 'mouse', clientX: 530 })
    fireEvent.pointerMove(document, { pointerId: 1, pointerType: 'mouse', clientX: 550 })

    // Frames of movement, still nothing persisted — the store is written once, on release.
    expect(widthWrites).toEqual([])

    fireEvent.pointerUp(document, { pointerId: 1, pointerType: 'mouse', clientX: 550 })

    const resized = WORKSPACE_BOARD_COLUMN_WIDTH_DEFAULT + 50
    expect(widthWrites).toEqual([resized])
    expect(useAppStore.getState().workspaceBoardColumnWidth).toBe(resized)
    expect(lane('in-progress')?.style.width).toBe(`${resized}px`)
    expect(laneGrid().style.width).toBe(expectedGridWidth(resized))
  })

  it('clamps the drag to the Orca bounds', () => {
    render(<Board {...drawerProps()} />)

    fireEvent.pointerDown(resizeHandle(), {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 500
    })
    fireEvent.pointerMove(document, { pointerId: 1, pointerType: 'mouse', clientX: 5_000 })
    fireEvent.pointerUp(document, { pointerId: 1, pointerType: 'mouse', clientX: 5_000 })

    expect(useAppStore.getState().workspaceBoardColumnWidth).toBe(WORKSPACE_BOARD_COLUMN_WIDTH_MAX)
    expect(laneGrid().style.width).toBe(expectedGridWidth(WORKSPACE_BOARD_COLUMN_WIDTH_MAX))
  })

  it('resizes from the handle keyboard step, coarse with Shift', () => {
    render(<Board {...drawerProps()} />)

    fireEvent.keyDown(resizeHandle(), { key: 'ArrowRight' })
    expect(useAppStore.getState().workspaceBoardColumnWidth).toBe(
      WORKSPACE_BOARD_COLUMN_WIDTH_DEFAULT + WORKSPACE_BOARD_COLUMN_WIDTH_STEP
    )

    fireEvent.keyDown(resizeHandle(), { key: 'ArrowRight', shiftKey: true })
    const coarse = WORKSPACE_BOARD_COLUMN_WIDTH_DEFAULT + WORKSPACE_BOARD_COLUMN_WIDTH_STEP * 3
    expect(useAppStore.getState().workspaceBoardColumnWidth).toBe(coarse)
    expect(lane('in-progress')?.style.width).toBe(`${coarse}px`)
    expect(laneGrid().style.width).toBe(expectedGridWidth(coarse))
  })

  it('never leaks the handle gesture into the card drag or the marquee', async () => {
    render(<Board {...drawerProps()} />)
    stubBoardRect()

    // Control: the same press on the board's empty surface *does* paint the marquee, so the
    // negative below is about the handle, not about a harness that cannot start one.
    pressSurface(10, 10)
    movePointer(400, 400)
    await settleFrame()
    expect(selectionOverlay()?.classList.contains('hidden')).toBe(false)
    releasePointer(400, 400)
    await settleFrame()
    expect(selectionOverlay()?.classList.contains('hidden')).toBe(true)

    fireEvent.pointerDown(resizeHandle(), {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 400
    })
    movePointer(360, 300)
    await settleFrame()
    fireEvent.pointerUp(document, { pointerId: 1, pointerType: 'mouse', clientX: 360 })

    expect(document.body.querySelector('[data-workspace-board-card-drag-preview]')).toBeNull()
    expect(selectionOverlay()?.classList.contains('hidden')).toBe(true)
    expect(document.body.querySelector('[data-workspace-board-card-area-selected]')).toBeNull()
    expect(useAppStore.getState().workspaceBoardColumnWidth).toBe(
      WORKSPACE_BOARD_COLUMN_WIDTH_DEFAULT - 40
    )
  })
})
