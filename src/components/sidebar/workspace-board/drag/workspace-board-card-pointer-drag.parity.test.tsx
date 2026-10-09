// One gesture on the painted board must go from a press, through the 5px threshold, to
// exactly one status write — with the card landing in the destination lane, a release back
// in its own lane doing nothing, and Escape/pointercancel/outside releases leaving both the
// status and the board alone.
//
// jsdom has no layout, so every rect is synthetic. The geometry under test is the real one;
// only the status transport is a spy.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useCallback, useState } from 'react'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { GitWorktreeInfo, HydraProject } from '../../types'
import type { WorkspaceDisplayOptions } from '../../WorkspaceOptionsMenu'
import WorkspaceBoardDrawer, { type WorkspaceBoardDrawerProps } from '../WorkspaceBoardDrawer'
import { useWorkspaceBoardPanel } from '../use-workspace-board-panel'

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
  worktree('wt-done', 'completed')
]

/** Lane boxes in viewport coordinates, as if the board were scrolled to the origin. */
const LANE_BOUNDS: Record<string, { left: number; right: number }> = {
  todo: { left: 0, right: 200 },
  'in-progress': { left: 212, right: 412 },
  'in-review': { left: 424, right: 624 },
  completed: { left: 636, right: 836 }
}

const LANE_TOP = 0
const LANE_BOTTOM = 600

/** Cards hang below the lane header; `CARD_Y` sits above their midpoint (slot 0). */
const CARD_TOP = 40
const CARD_BOTTOM = 100
const CARD_Y = 60

const PROGRESS_X = 300
const PROGRESS_DRAG_X = 380
const COMPLETED_X = 700
const TODO_X = 100
const OUTSIDE_X = 1200

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

function laneCount(statusId: string): string | null {
  return lane(statusId)?.querySelector('[data-workspace-board-lane-count]')?.textContent ?? null
}

function boardCard(worktreePath: string): HTMLElement | null {
  return laneGrid().querySelector<HTMLElement>(
    `[data-workspace-board-worktree-path="${worktreePath}"]`
  )
}

function dragPreview(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-workspace-board-card-drag-preview]')
}

function dropIndicator(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-workspace-board-card-drop-indicator]')
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
    onOpenChange: vi.fn(),
    onSelectWorktree: vi.fn(),
    ...overrides
  }
}

/**
 * The sidebar's real wiring: the panel hook owns open/Escape, and the drawer's status write
 * is the app's own (the spy plus the local worktree maps the board projects from).
 */
function BoardHarness({
  onAssignWorktreeStatus,
  onSelectWorktree
}: {
  onAssignWorktreeStatus: (worktreePath: string, status: string) => void
  onSelectWorktree: (worktree: GitWorktreeInfo) => void
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
          onOpenChange: handleWorkspaceBoardOpenChange,
          onSelectWorktree
        })}
      />
    </>
  )
}

function renderBoard(): { onAssign: Mock; onSelect: Mock } {
  const onAssign = vi.fn()
  const onSelect = vi.fn()
  render(
    <TooltipProvider>
      <BoardHarness onAssignWorktreeStatus={onAssign} onSelectWorktree={onSelect} />
    </TooltipProvider>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Toggle board' }))
  stubBoardRects()
  return { onAssign, onSelect }
}

/** Drains the RAF the drag scheduled, so preview/line updates land inside `act`. */
async function settleDragFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

function pressCard(clientX: number): void {
  const card = boardCard('/repo/hydra/wt-progress')
  if (!card) {
    throw new Error('the source card is not painted')
  }
  fireEvent.pointerDown(card, {
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    clientX,
    clientY: CARD_Y
  })
}

function movePointer(clientX: number, clientY = CARD_Y): void {
  fireEvent.pointerMove(document, { pointerId: 1, pointerType: 'mouse', clientX, clientY })
}

function releasePointer(clientX: number, clientY = CARD_Y): void {
  fireEvent.pointerUp(document, { pointerId: 1, pointerType: 'mouse', clientX, clientY })
}

/** Press the source card and cross the threshold: a live drag session. */
async function startDrag(): Promise<void> {
  pressCard(PROGRESS_X)
  movePointer(PROGRESS_X + 10)
  await settleDragFrame()
}

describe('workspace board card pointer drag', () => {
  it('lifts the card only past the threshold, then paints the preview and the cursor', async () => {
    renderBoard()

    pressCard(PROGRESS_X)
    movePointer(PROGRESS_X + 2)
    await settleDragFrame()
    expect(dragPreview()).toBeNull()
    expect(document.documentElement).not.toHaveAttribute('data-workspace-board-pointer-dragging')

    movePointer(PROGRESS_X + 10)
    await settleDragFrame()

    expect(dragPreview()).not.toBeNull()
    expect(document.documentElement).toHaveAttribute('data-workspace-board-pointer-dragging')
    expect(document.body.style.cursor).toBe('grabbing')
    expect(document.body.style.userSelect).toBe('none')
    expect(boardCard('/repo/hydra/wt-progress')).toHaveAttribute(
      'data-workspace-board-card-pointer-dragging'
    )
    // The clone must not masquerade as a second card of the board.
    const preview = dragPreview()
    expect(preview?.querySelector('[data-workspace-board-card-id]')).toBeNull()
    expect(preview?.querySelector('[data-workspace-board-worktree-path]')).toBeNull()
    expect(preview?.querySelector('[data-workspace-board-card-pointer-dragging]')).toBeNull()
  })

  it('highlights the destination lane and hangs the insertion line, empty lanes included', async () => {
    renderBoard()

    await startDrag()
    movePointer(TODO_X)
    await settleDragFrame()

    expect(lane('todo')).toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(lane('in-progress')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(dropIndicator()).toHaveAttribute('data-workspace-board-card-drop-status', 'todo')
    expect(dropIndicator()?.style.width).toBe('184px')
    expect(dropIndicator()?.style.transform).toBe('translate3d(8px, 14px, 0)')

    movePointer(COMPLETED_X)
    await settleDragFrame()

    expect(lane('completed')).toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(lane('todo')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(dropIndicator()).toHaveAttribute('data-workspace-board-card-drop-status', 'completed')
    expect(dropIndicator()?.style.transform).toBe('translate3d(644px, 35px, 0)')
  })

  it('moves the card to the destination lane through exactly one status write', async () => {
    const { onAssign } = renderBoard()

    await startDrag()
    movePointer(COMPLETED_X)
    await settleDragFrame()
    releasePointer(COMPLETED_X)

    expect(onAssign).toHaveBeenCalledTimes(1)
    expect(onAssign).toHaveBeenCalledWith('/repo/hydra/wt-progress', 'completed')
    expect(boardCard('/repo/hydra/wt-progress')?.closest('[data-workspace-status]')).toBe(
      lane('completed')
    )
    expect(laneCount('in-progress')).toBe('0')
    expect(laneCount('completed')).toBe('2')
    expect(dragPreview()).toBeNull()
    expect(dropIndicator()).toBeNull()
    expect(document.documentElement).not.toHaveAttribute('data-workspace-board-pointer-dragging')
  })

  it('treats a release back in the card own lane as a no-op', async () => {
    const { onAssign } = renderBoard()

    await startDrag()
    movePointer(PROGRESS_DRAG_X)
    await settleDragFrame()
    releasePointer(PROGRESS_DRAG_X)

    expect(onAssign).not.toHaveBeenCalled()
    expect(laneCount('in-progress')).toBe('1')
    expect(boardCard('/repo/hydra/wt-progress')?.closest('[data-workspace-status]')).toBe(
      lane('in-progress')
    )
  })

  it('aborts on Escape without committing and keeps the board open', async () => {
    const { onAssign } = renderBoard()

    await startDrag()
    movePointer(COMPLETED_X)
    await settleDragFrame()

    expect(fireEvent.keyDown(document, { key: 'Escape' })).toBe(false)

    expect(dragPreview()).toBeNull()
    expect(dropIndicator()).toBeNull()
    expect(document.documentElement).not.toHaveAttribute('data-workspace-board-pointer-dragging')
    expect(document.body.style.userSelect).toBe('')
    expect(document.body.querySelector('[data-workspace-board-sheet]')).not.toBeNull()

    releasePointer(COMPLETED_X)
    expect(onAssign).not.toHaveBeenCalled()
  })

  it('aborts on pointercancel without committing, and the release after it is inert', async () => {
    const { onAssign } = renderBoard()

    await startDrag()
    movePointer(COMPLETED_X)
    await settleDragFrame()

    fireEvent.pointerCancel(document, { pointerId: 1, pointerType: 'mouse' })

    expect(dragPreview()).toBeNull()
    expect(dropIndicator()).toBeNull()

    releasePointer(COMPLETED_X)
    expect(onAssign).not.toHaveBeenCalled()
  })

  it('commits nothing when the release lands outside every lane', async () => {
    const { onAssign } = renderBoard()

    await startDrag()
    movePointer(COMPLETED_X)
    await settleDragFrame()
    releasePointer(OUTSIDE_X)

    expect(onAssign).not.toHaveBeenCalled()
    expect(dragPreview()).toBeNull()
  })

  it('never lifts the card from a control inside it', async () => {
    renderBoard()
    const card = boardCard('/repo/hydra/wt-progress')
    const control = document.createElement('button')
    card?.appendChild(control)

    fireEvent.pointerDown(control, {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: PROGRESS_X,
      clientY: CARD_Y
    })
    movePointer(PROGRESS_X + 40)
    await settleDragFrame()

    expect(dragPreview()).toBeNull()
    expect(document.documentElement).not.toHaveAttribute('data-workspace-board-pointer-dragging')
  })

  it('swallows the click that follows a drop', async () => {
    const { onAssign, onSelect } = renderBoard()

    await startDrag()
    movePointer(COMPLETED_X)
    await settleDragFrame()
    releasePointer(COMPLETED_X)
    expect(onAssign).toHaveBeenCalledTimes(1)

    const surface = boardCard('/repo/hydra/wt-progress')?.querySelector<HTMLElement>(
      '[data-worktree-card-surface]'
    )
    expect(surface).not.toBeNull()

    expect(fireEvent.click(surface!)).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('still lets a press that never crossed the threshold activate the card', () => {
    const { onAssign, onSelect } = renderBoard()

    pressCard(PROGRESS_X)
    movePointer(PROGRESS_X + 2)
    releasePointer(PROGRESS_X + 2)

    const surface = boardCard('/repo/hydra/wt-progress')?.querySelector<HTMLElement>(
      '[data-worktree-card-surface]'
    )
    expect(surface).not.toBeNull()

    expect(fireEvent.click(surface!)).toBe(true)
    expect(onAssign).not.toHaveBeenCalled()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({ path: '/repo/hydra/wt-progress' })
  })
})
