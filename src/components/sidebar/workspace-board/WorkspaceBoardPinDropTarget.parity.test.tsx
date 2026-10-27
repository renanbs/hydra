// The board's pin drop target (D08-028): Orca's strip, wired to the drags this board has.
// A release over it pins the dragged workspace and writes no status; the destination lane
// and the insertion line stay dark while the pointer is on it, and leaving it restores the
// lane drop the board always had.
//
// jsdom has no layout, so every rect is synthetic. The geometry under test is the real one;
// only the two write transports are spies.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useCallback, useState } from 'react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { GitWorktreeInfo, HydraProject } from '../../types'
import type { WorkspaceDisplayOptions } from '../../WorkspaceOptionsMenu'
import WorkspaceBoardDrawer, { type WorkspaceBoardDrawerProps } from './WorkspaceBoardDrawer'
import WorkspaceBoardPinDropTarget from './WorkspaceBoardPinDropTarget'
import { resolveWorkspaceBoardPinDropTarget } from './workspace-board-pin-drop-target'
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

/** The strip sits above the lane row, inside the board's padded surface. */
const PIN_STRIP_RECT = { left: 0, top: -48, right: 836, bottom: -16 }
const PIN_Y = -32

const PROGRESS_X = 300
const COMPLETED_X = 700

const HOVER_BACKGROUND = 'bg-worktree-sidebar-accent'
const RESTING_BACKGROUND = 'bg-background/45'

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

function dragPreview(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-workspace-board-card-drag-preview]')
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
    onPinWorktree: vi.fn(),
    onCreateWorktree: vi.fn(),
    onOpenChange: vi.fn(),
    onSelectWorktree: vi.fn(),
    ...overrides
  }
}

/**
 * The sidebar's real wiring: the panel hook owns open/Escape, the drawer's status write is
 * the app's own (the spy plus the local worktree maps the board projects from), and the pin
 * write is the app's own single writer.
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

/** Drains the RAF the drag scheduled, so preview/line updates land inside `act`. */
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

function movePointer(clientX: number, clientY = CARD_Y): void {
  fireEvent.pointerMove(document, { pointerId: 1, pointerType: 'mouse', clientX, clientY })
}

function releasePointer(clientX: number, clientY = CARD_Y): void {
  fireEvent.pointerUp(document, { pointerId: 1, pointerType: 'mouse', clientX, clientY })
}

/** Press the source card and cross the threshold: a live drag session. */
async function startDrag(): Promise<void> {
  const card = boardCard('/repo/hydra/wt-progress')
  if (!card) {
    throw new Error('the source card is not painted')
  }
  fireEvent.pointerDown(card, {
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    clientX: PROGRESS_X,
    clientY: CARD_Y
  })
  movePointer(PROGRESS_X + 10)
  await settleDragFrame()
}

afterEach(() => {
  cleanup()
})

describe('workspace board pin drop target', () => {
  it('paints Orca strip: the pin hook, the label and the hint', () => {
    render(<WorkspaceBoardPinDropTarget open isDragOver={false} />)

    const strip = pinStrip()
    expect(strip).toHaveAttribute('data-workspace-pin-drop-target', '')
    expect(strip).toHaveTextContent('Pinned')
    expect(strip).toHaveTextContent('Drop here to pin without changing status.')
    // The external mark is the sidebar list's own drag; the board's drag never sets it.
    expect(strip).not.toHaveAttribute('data-workspace-board-external-drag-target')
    expect(strip.classList.contains(RESTING_BACKGROUND)).toBe(true)
  })

  it('is a drop destination only while the board is open', () => {
    const view = render(<WorkspaceBoardPinDropTarget open={false} isDragOver={false} />)
    stubRect(pinStrip(), PIN_STRIP_RECT)

    expect(resolveWorkspaceBoardPinDropTarget(PROGRESS_X, PIN_Y)).toBeNull()

    view.rerender(<WorkspaceBoardPinDropTarget open isDragOver={false} />)
    expect(resolveWorkspaceBoardPinDropTarget(PROGRESS_X, PIN_Y)).not.toBeNull()

    view.unmount()
    expect(resolveWorkspaceBoardPinDropTarget(PROGRESS_X, PIN_Y)).toBeNull()
  })

  it('highlights the strip while the dragged card hovers it, keeping the lanes dark', async () => {
    await renderBoard()

    await startDrag()
    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(false)

    movePointer(PROGRESS_X, PIN_Y)
    await settleDragFrame()

    const strip = pinStrip()
    expect(strip.classList.contains(HOVER_BACKGROUND)).toBe(true)
    expect(strip.classList.contains(RESTING_BACKGROUND)).toBe(false)
    // The pin is not a lane: nothing else may light up while the pointer is on it.
    expect(lane('in-progress')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(lane('todo')).not.toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(dropIndicator()).toBeNull()
  })

  it('pins the released card once and leaves its status alone', async () => {
    const { onAssign, onPin } = await renderBoard()

    await startDrag()
    movePointer(PROGRESS_X, PIN_Y)
    await settleDragFrame()
    releasePointer(PROGRESS_X, PIN_Y)

    expect(onPin).toHaveBeenCalledTimes(1)
    expect(onPin).toHaveBeenCalledWith('/repo/hydra/wt-progress')
    expect(onAssign).not.toHaveBeenCalled()
    expect(boardCard('/repo/hydra/wt-progress')?.closest('[data-workspace-status]')).toBe(
      lane('in-progress')
    )
    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(false)
    expect(dragPreview()).toBeNull()
  })

  it('clears the highlight without pinning when the pointer leaves for a lane', async () => {
    const { onAssign, onPin } = await renderBoard()

    await startDrag()
    movePointer(PROGRESS_X, PIN_Y)
    await settleDragFrame()
    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(true)

    movePointer(COMPLETED_X)
    await settleDragFrame()

    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(false)
    expect(lane('completed')).toHaveAttribute('data-workspace-board-lane-drop-target')
    expect(dropIndicator()).toHaveAttribute('data-workspace-board-card-drop-status', 'completed')

    releasePointer(COMPLETED_X)
    expect(onAssign).toHaveBeenCalledTimes(1)
    expect(onAssign).toHaveBeenCalledWith('/repo/hydra/wt-progress', 'completed')
    expect(onPin).not.toHaveBeenCalled()
  })

  it('aborts on Escape over the strip without pinning', async () => {
    const { onAssign, onPin } = await renderBoard()

    await startDrag()
    movePointer(PROGRESS_X, PIN_Y)
    await settleDragFrame()
    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(true)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(false)
    expect(dragPreview()).toBeNull()

    releasePointer(PROGRESS_X, PIN_Y)
    expect(onPin).not.toHaveBeenCalled()
    expect(onAssign).not.toHaveBeenCalled()
  })

  it('aborts on pointercancel over the strip without pinning', async () => {
    const { onAssign, onPin } = await renderBoard()

    await startDrag()
    movePointer(PROGRESS_X, PIN_Y)
    await settleDragFrame()

    fireEvent.pointerCancel(document, { pointerId: 1, pointerType: 'mouse' })

    expect(pinStrip().classList.contains(HOVER_BACKGROUND)).toBe(false)

    releasePointer(PROGRESS_X, PIN_Y)
    expect(onPin).not.toHaveBeenCalled()
    expect(onAssign).not.toHaveBeenCalled()
  })
})
