// The board's pin strip is the sidebar list's second destination (D08-028): a card pressed
// in the list and released over the strip pins that workspace — once, through the app's own
// pin writer — and writes no status, while the strip paints its hover and the external drag
// mark Orca's CSS reacts to. Leaving the strip restores the lane drop the board always had.
//
// jsdom has no layout, so every rect is synthetic. The geometry under test is the real one;
// only the three write transports are spies.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useCallback, useRef, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/store'
import { cloneDefaultWorkspaceStatuses } from '../../../../shared/workspace-statuses'
import { WorktreeList } from '../../WorktreeList'
import type { GitWorktreeInfo, HydraProject } from '../../types'
import type { WorkspaceDisplayOptions } from '../../WorkspaceOptionsMenu'
import WorkspaceBoardDrawer from '../../workspace-board/WorkspaceBoardDrawer'
import { useWorkspaceBoardPanel } from '../../workspace-board/use-workspace-board-panel'

const PROJECT: HydraProject = {
  id: 'repo_a',
  name: 'hydra',
  path: '/repo/hydra',
  is_git: true,
  current_branch: 'main'
}

const DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: 'repo',
  sortBy: 'name',
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false
}

const ROW_HEIGHT = 40
const ROW_PITCH = 44
const CONTAINER_HEIGHT = 400
const CONTAINER_WIDTH = 300

/** The board sits to the right of the sidebar, as the sheet's geometry places it. */
const BOARD_LEFT = 320
const BOARD_BOTTOM = 600
const BOARD_RIGHT = 1168

const LANE_BOUNDS: Record<string, { left: number; right: number }> = {
  todo: { left: BOARD_LEFT, right: BOARD_LEFT + 200 },
  'in-progress': { left: BOARD_LEFT + 212, right: BOARD_LEFT + 412 },
  'in-review': { left: BOARD_LEFT + 424, right: BOARD_LEFT + 624 },
  completed: { left: BOARD_LEFT + 636, right: BOARD_LEFT + 836 }
}

const CARD_TOP = 40
const CARD_BOTTOM = 160

/** The strip sits above the lane row, inside the board's padded surface. */
const PIN_STRIP_RECT = { left: BOARD_LEFT, top: -48, right: BOARD_RIGHT, bottom: -16 }
const PIN_Y = -32

const COMPLETED_X = BOARD_LEFT + 700
const SIDEBAR_X = 40

const HOVER_BACKGROUND = 'bg-worktree-sidebar-accent'

function worktree(id: string, status: string): GitWorktreeInfo {
  return {
    id,
    path: `/repo/hydra/${id}`,
    head_commit: 'abc1234',
    branch: id,
    is_bare: false,
    is_locked: false,
    status
  }
}

const WORKTREES: GitWorktreeInfo[] = [
  worktree('wt-todo', 'todo'),
  worktree('wt-progress', 'in-progress'),
  worktree('wt-review', 'in-review'),
  worktree('wt-done', 'completed')
]

function resetStore(): void {
  useAppStore.setState({
    repos: [],
    workspaceStatuses: cloneDefaultWorkspaceStatuses(),
    sshTargetLabels: new Map(),
    sshConnectionStates: new Map(),
    runtimeEnvironments: [],
    settings: null,
    visibleWorkspaceHostIds: [],
    workspaceHostScope: null,
    worktreeLineageById: {}
  })
}

function fakeRect(rect: { left: number; top: number; right: number; bottom: number }): DOMRect {
  return {
    ...rect,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({})
  } as DOMRect
}

function stubRect(
  element: HTMLElement,
  rect: { left: number; top: number; right: number; bottom: number }
): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => fakeRect(rect)
  })
}

function laneGrid(): HTMLElement {
  const grid = document.querySelector<HTMLElement>('[data-workspace-board-lane-grid]')
  if (!grid) {
    throw new Error('the board lane grid is not painted')
  }
  return grid
}

function lane(statusId: string): HTMLElement | null {
  return laneGrid().querySelector<HTMLElement>(`[data-workspace-status="${statusId}"]`)
}

function dragPreview(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-worktree-sidebar-drag-preview]')
}

function sidebarDropIndicator(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-worktree-sidebar-drop-indicator]')
}

function boardDropIndicator(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-workspace-board-card-drop-indicator]')
}

function boardCard(worktreePath: string): HTMLElement | null {
  return laneGrid().querySelector<HTMLElement>(
    `[data-workspace-board-worktree-path="${worktreePath}"]`
  )
}

function pinStrip(): HTMLElement {
  const strip = document.querySelector<HTMLElement>('[data-workspace-pin-drop-target]')
  if (!strip) {
    throw new Error('the pin drop target is not painted')
  }
  return strip
}

/** Drains the RAF the drag scheduled, so preview/line updates land inside `act`. */
async function settleFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

function pressRow(row: HTMLElement, clientY: number): void {
  fireEvent.pointerDown(row, {
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    clientX: SIDEBAR_X,
    clientY
  })
}

function movePointer(clientX: number, clientY: number): void {
  fireEvent.pointerMove(document, { pointerId: 1, pointerType: 'mouse', clientX, clientY })
}

function releasePointer(clientX: number, clientY: number): void {
  fireEvent.pointerUp(document, { pointerId: 1, pointerType: 'mouse', clientX, clientY })
}

type Harness = {
  rows: HTMLElement[]
  onAssign: Mock
  onReorder: Mock
  onPin: Mock
}

function renderHarness(): Harness {
  const onAssign = vi.fn()
  const onReorder = vi.fn()
  const onPin = vi.fn()

  function BoardDropHarness(): React.JSX.Element {
    const { workspaceBoardOpen, workspaceBoardRenderedOpen, handleWorkspaceBoardOpenChange } =
      useWorkspaceBoardPanel()
    const [worktrees, setWorktrees] = useState(WORKTREES)
    const scrollRef = useRef<HTMLDivElement | null>(null)
    const handleAssign = useCallback(
      (worktreePath: string, status: string) => {
        onAssign(worktreePath, status)
        setWorktrees((previous) =>
          previous.map((entry) => (entry.path === worktreePath ? { ...entry, status } : entry))
        )
      },
      [onAssign]
    )
    // The panel's own bridge, as the sidebar wires it: the list speaks paths, the app's pin
    // writer takes one path at a time.
    const handlePinWorktreePaths = useCallback(
      (worktreePaths: readonly string[]) => {
        for (const worktreePath of worktreePaths) onPin(worktreePath)
      },
      [onPin]
    )

    return (
      <>
        <button type="button" onClick={() => handleWorkspaceBoardOpenChange(true)}>
          Toggle board
        </button>
        <button type="button" onClick={() => handleWorkspaceBoardOpenChange(false)}>
          Close board
        </button>
        <div ref={scrollRef} data-testid="sidebar-scroll" style={{ width: CONTAINER_WIDTH }}>
          <WorktreeList
            projects={[PROJECT]}
            displayProjects={[PROJECT]}
            activeProject={PROJECT}
            sessions={[]}
            collapsedProjects={new Set()}
            collapsedGroups={new Set()}
            displayOptions={DISPLAY_OPTIONS}
            getFilteredAndSortedWorktrees={() => worktrees}
            onSelectProject={vi.fn()}
            onSelectGitWorktree={vi.fn()}
            onDeleteGitWorktree={vi.fn()}
            onSelectSession={vi.fn()}
            onOpenNewWorkspaceModal={vi.fn()}
            onOpenAddRepoDialog={vi.fn()}
            onToggleProjectCollapse={vi.fn()}
            onToggleGroupCollapse={vi.fn()}
            scrollRef={scrollRef}
            onReorderWorktreesInGroup={onReorder}
            onAssignWorktreeStatus={handleAssign}
            onPinWorktreePaths={handlePinWorktreePaths}
          />
        </div>
        <WorkspaceBoardDrawer
          open={workspaceBoardOpen}
          renderedOpen={workspaceBoardRenderedOpen}
          sidebarRef={{ current: null }}
          displayProjects={[PROJECT]}
          getProjectWorktrees={() => worktrees}
          sessions={[]}
          displayOptions={DISPLAY_OPTIONS}
          compactCards={false}
          allWorktrees={worktrees}
          onAssignWorktreeStatus={handleAssign}
          onPinWorktree={(worktreePath) => onPin(worktreePath)}
          onCreateWorktree={vi.fn()}
          onOpenChange={handleWorkspaceBoardOpenChange}
          onSelectWorktree={vi.fn()}
        />
      </>
    )
  }

  render(
    <TooltipProvider>
      <BoardDropHarness />
    </TooltipProvider>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Toggle board' }))

  const container = screen.getByTestId('sidebar-scroll')
  stubRect(container, { left: 0, top: 0, right: CONTAINER_WIDTH, bottom: CONTAINER_HEIGHT })
  Array.from(container.querySelectorAll<HTMLElement>('[data-worktree-virtual-row]')).forEach(
    (virtualRow, index) => {
      stubRect(virtualRow, {
        left: 0,
        top: index * ROW_PITCH,
        right: CONTAINER_WIDTH,
        bottom: index * ROW_PITCH + ROW_HEIGHT
      })
    }
  )
  const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-worktree-drag-id]'))
  rows.forEach((row, index) => {
    stubRect(row, {
      left: 0,
      top: index * ROW_PITCH,
      right: CONTAINER_WIDTH,
      bottom: index * ROW_PITCH + ROW_HEIGHT
    })
  })

  return { rows, onAssign, onReorder, onPin }
}

/** Drives the board the way a user opens it: the panel hook, then the boxes it paints. */
async function stubBoardRects(): Promise<void> {
  for (let frame = 0; frame < 6; frame++) {
    await settleFrame()
  }
  stubRect(laneGrid(), { left: BOARD_LEFT, top: 0, right: BOARD_RIGHT, bottom: BOARD_BOTTOM })
  for (const [statusId, bounds] of Object.entries(LANE_BOUNDS)) {
    const element = lane(statusId)
    if (!element) {
      throw new Error(`lane ${statusId} is not painted`)
    }
    stubRect(element, { ...bounds, top: 0, bottom: BOARD_BOTTOM })
  }
  for (const card of laneGrid().querySelectorAll<HTMLElement>('[data-workspace-board-card-id]')) {
    const statusId = card.closest<HTMLElement>('[data-workspace-status]')?.dataset.workspaceStatus
    const bounds = statusId ? LANE_BOUNDS[statusId] : undefined
    if (!bounds) {
      throw new Error('card is not inside a measured lane')
    }
    stubRect(card, { ...bounds, top: CARD_TOP, bottom: CARD_BOTTOM })
  }
  stubRect(pinStrip(), PIN_STRIP_RECT)
}

/** Press the first row, cross the threshold, and settle: a live drag session. */
async function startDragOnFirstRow(rows: HTMLElement[]): Promise<void> {
  await settleFrame()
  pressRow(rows[0]!, ROW_HEIGHT / 2)
  movePointer(SIDEBAR_X, ROW_HEIGHT / 2 + 10)
  await settleFrame()
}

beforeEach(() => resetStore())
afterEach(() => {
  cleanup()
  resetStore()
})

describe('sidebar list drop onto the workspace board pin strip', () => {
  it('marks the strip as the external drag target and highlights it under the drag', async () => {
    const { rows } = renderHarness()
    await stubBoardRects()

    await startDragOnFirstRow(rows)
    expect(dragPreview()).not.toBeNull()
    expect(pinStrip()).not.toHaveAttribute('data-workspace-board-external-drag-target')

    movePointer(BOARD_LEFT + 100, PIN_Y)
    await settleFrame()

    const strip = pinStrip()
    expect(strip).toHaveAttribute('data-workspace-board-external-drag-target', 'true')
    expect(strip.classList.contains(HOVER_BACKGROUND)).toBe(true)
    // The strip is not a lane: the lanes and the insertion line stay dark for it.
    expect(document.querySelector('[data-workspace-board-lane-drop-target]')).toBeNull()
    expect(boardDropIndicator()).toBeNull()
    expect(sidebarDropIndicator()).toBeNull()

    movePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)
    await settleFrame()

    expect(pinStrip()).not.toHaveAttribute('data-workspace-board-external-drag-target')
    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(false)
  })

  it('pins the dragged workspace through exactly one write and leaves the status alone', async () => {
    const { rows, onAssign, onReorder, onPin } = renderHarness()
    await stubBoardRects()

    await startDragOnFirstRow(rows)
    movePointer(BOARD_LEFT + 100, PIN_Y)
    await settleFrame()
    releasePointer(BOARD_LEFT + 100, PIN_Y)

    expect(onPin).toHaveBeenCalledTimes(1)
    expect(onPin).toHaveBeenCalledWith('/repo/hydra/wt-todo')
    expect(onAssign).not.toHaveBeenCalled()
    expect(onReorder).not.toHaveBeenCalled()
    // The card keeps its lane: a pin never recolours the column.
    expect(boardCard('/repo/hydra/wt-todo')?.closest('[data-workspace-status]')).toBe(lane('todo'))
    expect(dragPreview()).toBeNull()
    expect(boardDropIndicator()).toBeNull()
    expect(pinStrip()).not.toHaveAttribute('data-workspace-board-external-drag-target')
    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(false)
  })

  it('still writes the lane status when the release leaves the strip for a lane', async () => {
    const { rows, onAssign, onPin } = renderHarness()
    await stubBoardRects()

    await startDragOnFirstRow(rows)
    movePointer(BOARD_LEFT + 100, PIN_Y)
    await settleFrame()
    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(true)

    movePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)
    await settleFrame()
    expect(lane('completed')).toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(boardDropIndicator()).toHaveAttribute(
      'data-workspace-board-card-drop-status',
      'completed'
    )

    releasePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)

    expect(onAssign).toHaveBeenCalledTimes(1)
    expect(onAssign).toHaveBeenCalledWith('/repo/hydra/wt-todo', 'completed')
    expect(onPin).not.toHaveBeenCalled()
    expect(pinStrip()).not.toHaveAttribute('data-workspace-board-external-drag-target')
  })
})
