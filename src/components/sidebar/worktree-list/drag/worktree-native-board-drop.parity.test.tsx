// One native gesture across two surfaces (D08-041): a row dragged from the sidebar list by the
// browser's HTML5 drag must reach the workspace board by PAYLOAD — the shared
// `workspace-status-drag-data.ts` payload the row's `onDragStart` publishes — and write that
// lane's status once, through the app's own writer. The pin strip is the same gesture's second
// destination (D08-028): it pins and writes no status. This is the direction Orca ships: the
// board's cards are not native sources (`nativeDragEnabled={false}`), the list is.
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
import {
  hasWorkspaceDragData,
  readWorkspaceDragDataIds
} from '../../workspace-status-drag-data'

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
const TODO_X = BOARD_LEFT + 100
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

/** jsdom has no DataTransfer; the payload helpers only need the four members they read. */
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

/** jsdom has no DragEvent; React reads `dataTransfer`, the point and `relatedTarget` off it. */
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

function lane(statusId: string): HTMLElement {
  const element = laneGrid().querySelector<HTMLElement>(`[data-workspace-status="${statusId}"]`)
  if (!element) {
    throw new Error(`lane ${statusId} is not painted`)
  }
  return element
}

function pinStrip(): HTMLElement {
  const strip = document.querySelector<HTMLElement>('[data-workspace-pin-drop-target]')
  if (!strip) {
    throw new Error('the pin drop target is not painted')
  }
  return strip
}

function boardCard(worktreePath: string): HTMLElement | null {
  return laneGrid().querySelector<HTMLElement>(
    `[data-workspace-board-worktree-path="${worktreePath}"]`
  )
}

function laneOfCard(worktreePath: string): Element | null | undefined {
  return boardCard(worktreePath)?.closest('[data-workspace-status]')
}

function boardDropIndicator(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-workspace-board-card-drop-indicator]')
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

  function NativeDropHarness(): React.JSX.Element {
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
      <NativeDropHarness />
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

/** Drains the frames the board schedules, so preview/highlight updates land inside `act`. */
async function settleFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/** The board hydrates one lane's cards per animation frame (D08-020). */
async function stubBoardRects(): Promise<void> {
  for (let frame = 0; frame < 6; frame++) {
    await settleFrame()
  }
  stubRect(laneGrid(), { left: BOARD_LEFT, top: 0, right: BOARD_RIGHT, bottom: BOARD_BOTTOM })
  for (const [statusId, bounds] of Object.entries(LANE_BOUNDS)) {
    stubRect(lane(statusId), { ...bounds, top: 0, bottom: BOARD_BOTTOM })
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

/** The browser's own `dragstart` on a sidebar row: the row publishes the shared payload. */
function startRowNativeDrag(rows: HTMLElement[]): DataTransfer {
  const surface = rows[0]!.querySelector<HTMLElement>('[data-worktree-card-surface]')
  if (!surface) {
    throw new Error('the row surface is not painted')
  }
  const dataTransfer = new FakeDataTransfer()
  fireEvent(surface, dragEvent('dragstart', dataTransfer, SIDEBAR_X, ROW_HEIGHT / 2))
  return dataTransfer
}

beforeEach(() => resetStore())
afterEach(() => {
  cleanup()
  resetStore()
})

describe('sidebar list native drag onto the workspace board', () => {
  it('publishes the shared payload from the row and highlights the destination lane', async () => {
    const { rows } = renderHarness()
    await stubBoardRects()

    const dataTransfer = startRowNativeDrag(rows)

    // The payload the board's gates read (`hasWorkspaceDragData`), carrying the workspace id —
    // the same id this list's pointer drag speaks, not the row path.
    expect(hasWorkspaceDragData(dataTransfer)).toBe(true)
    expect(readWorkspaceDragDataIds(dataTransfer)).toEqual(['wt-todo'])

    fireEvent(lane('completed'), dragEvent('dragover', dataTransfer, COMPLETED_X, ROW_HEIGHT / 2))

    expect(lane('completed')).toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(lane('todo')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    // A lane drop has no insertion slot: nothing paints an insertion line, and the list's own
    // pointer preview never started (one gesture, one mechanism).
    expect(boardDropIndicator()).toBeNull()
    expect(document.querySelector('[data-worktree-sidebar-drag-preview]')).toBeNull()

    fireEvent(lane('todo'), dragEvent('dragover', dataTransfer, TODO_X, ROW_HEIGHT / 2))

    expect(lane('todo')).toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(lane('completed')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
  })

  it('writes the lane status through exactly one write and leaves the order alone', async () => {
    const { rows, onAssign, onReorder } = renderHarness()
    await stubBoardRects()

    const dataTransfer = startRowNativeDrag(rows)
    fireEvent(lane('completed'), dragEvent('dragover', dataTransfer, COMPLETED_X, ROW_HEIGHT / 2))
    fireEvent(lane('completed'), dragEvent('drop', dataTransfer, COMPLETED_X, ROW_HEIGHT / 2))

    expect(onAssign).toHaveBeenCalledTimes(1)
    expect(onAssign).toHaveBeenCalledWith('/repo/hydra/wt-todo', 'completed')
    expect(onReorder).not.toHaveBeenCalled()
    // The change solidifies: the board shows the card in its new lane, no reload.
    await act(async () => {})
    expect(laneOfCard('/repo/hydra/wt-todo')).toBe(lane('completed'))
    expect(lane('completed')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
  })

  it('pins on the strip without touching the status', async () => {
    const { rows, onAssign, onPin } = renderHarness()
    await stubBoardRects()

    const dataTransfer = startRowNativeDrag(rows)
    fireEvent(pinStrip(), dragEvent('dragover', dataTransfer, TODO_X, PIN_Y))

    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(true)
    // The strip is not a lane: the lanes stay dark while the pointer is on it.
    expect(lane('todo')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(boardDropIndicator()).toBeNull()

    fireEvent(pinStrip(), dragEvent('drop', dataTransfer, TODO_X, PIN_Y))

    expect(onPin).toHaveBeenCalledTimes(1)
    expect(onPin).toHaveBeenCalledWith('/repo/hydra/wt-todo')
    expect(onAssign).not.toHaveBeenCalled()
    expect(laneOfCard('/repo/hydra/wt-todo')).toBe(lane('todo'))
    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(false)
  })

  it('clears the destination on dragleave and on dragend', async () => {
    const { rows, onAssign, onPin } = renderHarness()
    await stubBoardRects()

    const dataTransfer = startRowNativeDrag(rows)
    fireEvent(lane('in-review'), dragEvent('dragover', dataTransfer, 500, ROW_HEIGHT / 2))
    expect(lane('in-review')).toHaveAttribute('data-workspace-board-lane-drop-target')

    // A leave whose related target is outside the lane: the lane stops claiming the drop.
    fireEvent(
      lane('in-review'),
      dragEvent('dragleave', dataTransfer, 1200, ROW_HEIGHT / 2, document.body)
    )
    expect(lane('in-review')).not.toHaveAttribute('data-workspace-board-lane-drop-target')

    // ...and the same lane claims it again, then the browser's own `dragend` tears it down.
    fireEvent(lane('in-review'), dragEvent('dragover', dataTransfer, 500, ROW_HEIGHT / 2))
    expect(lane('in-review')).toHaveAttribute('data-workspace-board-lane-drop-target')

    fireEvent(document, dragEvent('dragend', dataTransfer, 500, ROW_HEIGHT / 2))

    expect(lane('in-review')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(false)
    expect(onAssign).not.toHaveBeenCalled()
    expect(onPin).not.toHaveBeenCalled()
  })
})
