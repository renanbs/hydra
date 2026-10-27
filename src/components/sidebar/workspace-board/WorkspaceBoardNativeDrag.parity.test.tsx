// The board as a native HTML5 drop DESTINATION (D08-041, D03a-015): Orca's
// `useWorkspaceKanbanNativeDrag` contract, where a native workspace drag is received by
// payload (`hasWorkspaceDragData`) instead of by pointer position, and a lane drop lands at
// the end of the lane with no insertion slot. The SOURCE is the sidebar list — Orca passes
// `nativeDragEnabled={false}` down the board's lane grid, so a board card never publishes a
// payload (asserted below); the sidebar row publishes the shared
// `workspace-status-drag-data.ts` payload this file feeds in exactly as that row does.
//
// jsdom has no layout, so every rect is synthetic. The geometry under test is the real one;
// only the two write transports are spies. The pointer drag keeps its own tests: what this
// file pins is the native receive path.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useCallback, useState } from 'react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { GitWorktreeInfo, HydraProject } from '../../types'
import {
  hasWorkspaceDragData,
  readWorkspaceDragDataIds,
  writeWorkspaceDragData
} from '../workspace-status-drag-data'
import type { WorkspaceDisplayOptions } from '../../WorkspaceOptionsMenu'
import WorkspaceBoardDrawer, { type WorkspaceBoardDrawerProps } from './WorkspaceBoardDrawer'
import { useWorkspaceBoardPanel } from './use-workspace-board-panel'

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
  worktree('wt-progress', 'in-progress'),
  worktree('wt-review', 'in-review'),
  worktree('wt-done', 'completed')
]

/** The workspace id the native payload carries: the row's own id (Orca's `Worktree.id`). */
const PROGRESS_ID = 'wt-progress'
const PROGRESS_PATH = '/repo/hydra/wt-progress'

/** Lane boxes in viewport coordinates, as if the board were scrolled to the origin. */
const LANE_BOUNDS: Record<string, { left: number; right: number }> = {
  todo: { left: 0, right: 200 },
  'in-progress': { left: 212, right: 412 },
  'in-review': { left: 424, right: 624 },
  completed: { left: 636, right: 836 }
}

const LANE_TOP = 0
const LANE_BOTTOM = 600

/** Cards hang below the lane header; `CARD_Y` sits above their midpoint. */
const CARD_TOP = 40
const CARD_BOTTOM = 100
const CARD_Y = 60

/** The strip sits above the lane row, inside the board's padded surface. */
const PIN_STRIP_RECT = { left: 0, top: -48, right: 836, bottom: -16 }
const PIN_Y = -32

const PROGRESS_X = 300
const COMPLETED_X = 700

const HOVER_BACKGROUND = 'bg-worktree-sidebar-accent'

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

function boardCard(worktreePath: string): HTMLElement | null {
  return laneGrid().querySelector<HTMLElement>(
    `[data-workspace-board-worktree-path="${worktreePath}"]`
  )
}

function dropIndicator(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-workspace-board-card-drop-indicator]')
}

function pinStrip(): HTMLElement {
  const strip = document.querySelector<HTMLElement>('[data-workspace-pin-drop-target]')
  if (!strip) {
    throw new Error('the pin drop target is not painted')
  }
  return strip
}

function laneOfCard(worktreePath: string): Element | null | undefined {
  return boardCard(worktreePath)?.closest('[data-workspace-status]')
}

function stubBoardRects(): void {
  for (const [statusId, bounds] of Object.entries(LANE_BOUNDS)) {
    const element = lane(statusId)
    if (!element) {
      throw new Error(`lane ${statusId} is not painted`)
    }
    stubRect(element, { ...bounds, top: LANE_TOP, bottom: LANE_BOTTOM })
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

function drawerProps(overrides: Partial<WorkspaceBoardDrawerProps> = {}): WorkspaceBoardDrawerProps {
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
    onPinWorktree: vi.fn(),
    onCreateWorktree: vi.fn(),
    onOpenChange: vi.fn(),
    onSelectWorktree: vi.fn(),
    ...overrides
  }
}

/**
 * The sidebar's real wiring: the panel hook owns open/Escape, and the board's status write is
 * the app's own — the spy plus the local worktree maps the board projects from.
 */
function BoardHarness({
  onAssignWorktreeStatus,
  onPinWorktree
}: {
  onAssignWorktreeStatus: (worktreePath: string, status: string) => void
  onPinWorktree: (worktreePath: string) => void
}): React.JSX.Element {
  const { workspaceBoardOpen, workspaceBoardRenderedOpen, handleWorkspaceBoardOpenChange } =
    useWorkspaceBoardPanel()
  const [worktrees, setWorktrees] = useState(WORKTREES)
  const handleAssign = useCallback(
    (worktreePath: string, status: string) => {
      onAssignWorktreeStatus(worktreePath, status)
      setWorktrees((previous) =>
        previous.map((entry) => (entry.path === worktreePath ? { ...entry, status } : entry))
      )
    },
    [onAssignWorktreeStatus]
  )

  return (
    <>
      <button type="button" onClick={() => handleWorkspaceBoardOpenChange(true)}>
        Toggle board
      </button>
      <WorkspaceBoardDrawer
        {...drawerProps({
          open: workspaceBoardOpen,
          renderedOpen: workspaceBoardRenderedOpen,
          getProjectWorktrees: () => worktrees,
          onAssignWorktreeStatus: handleAssign,
          onPinWorktree,
          onOpenChange: handleWorkspaceBoardOpenChange
        })}
      />
    </>
  )
}

async function renderBoard(): Promise<{ onAssign: Mock; onPin: Mock }> {
  const onAssign = vi.fn()
  const onPin = vi.fn()
  render(
    <TooltipProvider>
      <BoardHarness onAssignWorktreeStatus={onAssign} onPinWorktree={onPin} />
    </TooltipProvider>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Toggle board' }))
  await settleLaneHydration()
  stubBoardRects()
  return { onAssign, onPin }
}

/** Drains the frames the drag schedules, so preview/highlight updates land inside `act`. */
async function settleDragFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/**
 * The board hydrates one lane's cards per animation frame (D08-020), so the cards a drag needs
 * only exist after those frames ran. Four user statuses plus the frame that starts the chain.
 */
async function settleLaneHydration(): Promise<void> {
  for (let frame = 0; frame < 6; frame++) {
    await settleDragFrame()
  }
}

/**
 * A native workspace drag as the SIDEBAR list publishes it: the row's `onDragStart` writes the
 * shared payload with the workspace id, and the board receives it through
 * `hasWorkspaceDragData` alone. Nothing on the board is touched to start it.
 */
function startSidebarNativeDrag(): DataTransfer {
  const dataTransfer = new FakeDataTransfer()
  writeWorkspaceDragData(dataTransfer, PROGRESS_ID)
  return dataTransfer
}

afterEach(() => {
  cleanup()
})

describe('workspace board native drag', () => {
  it('receives the sidebar payload while no board card is a native drag source', async () => {
    await renderBoard()

    // Orca passes `nativeDragEnabled={false}` down the board's lane grid, so a board card is
    // never `draggable` and a `dragstart` fired on it publishes nothing: the sidebar list's
    // rows are the source (D08-041).
    const card = boardCard(PROGRESS_PATH)
    if (!card) {
      throw new Error('the board card is not painted')
    }
    expect(card).not.toHaveAttribute('draggable')

    const boardTransfer = new FakeDataTransfer()
    fireEvent(card, dragEvent('dragstart', boardTransfer, PROGRESS_X, CARD_Y))

    expect(hasWorkspaceDragData(boardTransfer)).toBe(false)
    expect(readWorkspaceDragDataIds(boardTransfer)).toEqual([])
  })

  it('receives a native drop on a lane: the lane status, at the end of the lane', async () => {
    const { onAssign, onPin } = await renderBoard()
    const dataTransfer = startSidebarNativeDrag()

    const destination = lane('completed')
    if (!destination) {
      throw new Error('the destination lane is not painted')
    }
    fireEvent(destination, dragEvent('dragover', dataTransfer, COMPLETED_X, CARD_Y))

    expect(destination).toHaveAttribute('data-workspace-board-lane-drop-target')
    // A lane drop has no insertion slot: nothing paints an insertion line (Orca's
    // `dropWorktreesAtEndOfStatus` writes the status and the lane's own end index).
    expect(dropIndicator()).toBeNull()

    fireEvent(destination, dragEvent('drop', dataTransfer, COMPLETED_X, CARD_Y))

    expect(onAssign).toHaveBeenCalledTimes(1)
    expect(onAssign).toHaveBeenCalledWith(PROGRESS_PATH, 'completed')
    expect(onPin).not.toHaveBeenCalled()
    expect(laneOfCard(PROGRESS_PATH)).toBe(lane('completed'))
    expect(lane('completed')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(dropIndicator()).toBeNull()
  })

  it('receives a native drop on the pin strip: a pin, never a status', async () => {
    const { onAssign, onPin } = await renderBoard()
    const dataTransfer = startSidebarNativeDrag()

    fireEvent(pinStrip(), dragEvent('dragover', dataTransfer, PROGRESS_X, PIN_Y))

    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(true)
    // The strip is not a lane: the lanes stay dark while the pointer is on it.
    expect(lane('in-progress')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(dropIndicator()).toBeNull()

    fireEvent(pinStrip(), dragEvent('drop', dataTransfer, PROGRESS_X, PIN_Y))

    expect(onPin).toHaveBeenCalledTimes(1)
    expect(onPin).toHaveBeenCalledWith(PROGRESS_PATH)
    expect(onAssign).not.toHaveBeenCalled()
    expect(laneOfCard(PROGRESS_PATH)).toBe(lane('in-progress'))
    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(false)
  })

  it('clears the destination on dragleave and on dragend', async () => {
    const { onAssign, onPin } = await renderBoard()
    const dataTransfer = startSidebarNativeDrag()

    const destination = lane('in-review')
    if (!destination) {
      throw new Error('the destination lane is not painted')
    }
    fireEvent(destination, dragEvent('dragover', dataTransfer, 500, CARD_Y))
    expect(destination).toHaveAttribute('data-workspace-board-lane-drop-target')

    // A leave whose related target is outside the lane: the lane stops claiming the drop.
    fireEvent(destination, dragEvent('dragleave', dataTransfer, 1200, CARD_Y, document.body))
    expect(destination).not.toHaveAttribute('data-workspace-board-lane-drop-target')

    // ...and the same lane claims it again, then the browser's own `dragend` tears it down.
    fireEvent(destination, dragEvent('dragover', dataTransfer, 500, CARD_Y))
    expect(destination).toHaveAttribute('data-workspace-board-lane-drop-target')

    fireEvent(document, dragEvent('dragend', dataTransfer, 500, CARD_Y))

    expect(lane('in-review')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(false)
    expect(onAssign).not.toHaveBeenCalled()
    expect(onPin).not.toHaveBeenCalled()
  })

  it('commits nothing when the native drag is dropped outside the board', async () => {
    const { onAssign, onPin } = await renderBoard()
    const dataTransfer = startSidebarNativeDrag()

    const destination = lane('completed')
    fireEvent(destination as HTMLElement, dragEvent('dragover', dataTransfer, COMPLETED_X, CARD_Y))
    expect(destination).toHaveAttribute('data-workspace-board-lane-drop-target')

    fireEvent(document.body, dragEvent('drop', dataTransfer, 1200, CARD_Y))

    expect(lane('completed')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(onAssign).not.toHaveBeenCalled()
    expect(onPin).not.toHaveBeenCalled()
  })
})
