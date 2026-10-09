// One gesture across two surfaces: a card pressed in the sidebar list and released over the
// workspace board's lane must write that lane's status — once, through the app's own writer —
// while a release inside the list keeps the reorder it always had.
//
// jsdom has no layout, so every rect is synthetic. The geometry under test is the real one;
// only the two write transports are spies.
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
import { hasWorkspaceBoardSidebarDropBoard } from '../../workspace-board/workspace-board-sidebar-drop'
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
const COMPLETED_X = BOARD_LEFT + 700
const SIDEBAR_X = 40

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

function fakeRect(
  rect: { left: number; top: number; right: number; bottom: number }
): DOMRect {
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
  unmount: () => void
}

function renderHarness(): Harness {
  const onAssign = vi.fn()
  const onReorder = vi.fn()

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
          onCreateWorktree={vi.fn()}
          onOpenChange={handleWorkspaceBoardOpenChange}
          onSelectWorktree={vi.fn()}
        />
      </>
    )
  }

  const view = render(
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

  return { rows, onAssign, onReorder, unmount: view.unmount }
}

/** Drives the board the way a user opens it: the panel hook, then the lane boxes it paints. */
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

describe('sidebar list drop onto the workspace board', () => {
  it('highlights the destination lane and hangs the board insertion line under the drag', async () => {
    const { rows } = renderHarness()
    await stubBoardRects()

    await startDragOnFirstRow(rows)
    expect(dragPreview()).not.toBeNull()

    movePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)
    await settleFrame()

    expect(lane('completed')).toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(lane('todo')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(boardDropIndicator()).toHaveAttribute(
      'data-workspace-board-card-drop-status',
      'completed'
    )
    // The list promises no reorder while the board is the destination.
    expect(sidebarDropIndicator()).toBeNull()

    movePointer(BOARD_LEFT + 100, ROW_HEIGHT / 2 + 40)
    await settleFrame()

    expect(lane('todo')).toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(lane('completed')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(boardDropIndicator()).toHaveAttribute('data-workspace-board-card-drop-status', 'todo')
  })

  it('writes the lane status through exactly one write and leaves the order alone', async () => {
    const { rows, onAssign, onReorder } = renderHarness()
    await stubBoardRects()

    await startDragOnFirstRow(rows)
    movePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)
    await settleFrame()
    releasePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)

    expect(onAssign).toHaveBeenCalledTimes(1)
    expect(onAssign).toHaveBeenCalledWith('/repo/hydra/wt-todo', 'completed')
    expect(onReorder).not.toHaveBeenCalled()
    // The change solidifies: the board shows the card in its new lane, no reload.
    await act(async () => {})
    expect(boardCard('/repo/hydra/wt-todo')?.closest('[data-workspace-status]')).toBe(
      lane('completed')
    )
    expect(dragPreview()).toBeNull()
    expect(boardDropIndicator()).toBeNull()
    expect(lane('completed')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
  })

  it('keeps the list reorder intact when the release stays in the sidebar', async () => {
    const { rows, onAssign, onReorder } = renderHarness()
    await stubBoardRects()

    await startDragOnFirstRow(rows)
    movePointer(SIDEBAR_X, ROW_PITCH + ROW_HEIGHT / 2)
    await settleFrame()
    releasePointer(SIDEBAR_X, ROW_PITCH + ROW_HEIGHT / 2)

    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(onAssign).not.toHaveBeenCalled()
    expect(boardDropIndicator()).toBeNull()
  })

  it('aborts on Escape with both surfaces cleared and nothing written', async () => {
    const { rows, onAssign } = renderHarness()
    await stubBoardRects()

    await startDragOnFirstRow(rows)
    movePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)
    await settleFrame()
    expect(boardDropIndicator()).not.toBeNull()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(dragPreview()).toBeNull()
    expect(boardDropIndicator()).toBeNull()
    expect(lane('completed')).not.toHaveAttribute('data-workspace-board-lane-drop-target')

    releasePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)
    expect(onAssign).not.toHaveBeenCalled()
  })

  it('aborts on pointercancel without writing', async () => {
    const { rows, onAssign } = renderHarness()
    await stubBoardRects()

    await startDragOnFirstRow(rows)
    movePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)
    await settleFrame()

    fireEvent.pointerCancel(document, { pointerId: 1, pointerType: 'mouse' })

    expect(boardDropIndicator()).toBeNull()
    expect(lane('completed')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(onAssign).not.toHaveBeenCalled()
  })

  it('registers the open board, and a closed board is no longer a destination', async () => {
    const { rows, onAssign, onReorder } = renderHarness()
    await stubBoardRects()
    expect(hasWorkspaceBoardSidebarDropBoard()).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Close board' }))
    expect(hasWorkspaceBoardSidebarDropBoard()).toBe(false)

    await startDragOnFirstRow(rows)
    movePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)
    await settleFrame()
    releasePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)

    // The board is dismissed, so the release over where it stood is a throw-away: no
    // status write, and no reorder either (the pointer never was over the list).
    expect(document.querySelector('[data-workspace-board-lane-drop-target]')).toBeNull()
    expect(boardDropIndicator()).toBeNull()
    expect(onAssign).not.toHaveBeenCalled()
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('takes the registration and the target visual down when the board unmounts mid-drag', async () => {
    const { rows, unmount } = renderHarness()
    await stubBoardRects()

    await startDragOnFirstRow(rows)
    movePointer(COMPLETED_X, ROW_HEIGHT / 2 + 40)
    await settleFrame()
    expect(boardDropIndicator()).not.toBeNull()

    unmount()

    expect(hasWorkspaceBoardSidebarDropBoard()).toBe(false)
    expect(boardDropIndicator()).toBeNull()
  })
})
