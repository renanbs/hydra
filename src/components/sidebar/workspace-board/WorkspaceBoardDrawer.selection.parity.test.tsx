// The board's selection end to end, on the painted drawer: a click, a modified click, a marquee,
// a select-all, and the card menu that assigns a status to the whole set.
//
// jsdom has no layout, so every rect is synthetic — but the geometry under test is the real one:
// the same lane/card boxes the pointer drag's tests use, and the marquee's own surface.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { GitWorktreeInfo, HydraProject } from '../types'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import WorkspaceBoardDrawer, { type WorkspaceBoardDrawerProps } from './WorkspaceBoardDrawer'
import { WORKSPACE_BOARD_AREA_SELECTED_ATTR } from './workspace-board-area-selection-dom'
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

/** Two cards a query keeps plus one it hides, for the re-anchoring case. */
const REANCHOR_WORKTREES: GitWorktreeInfo[] = [
  worktree('wt-anchor', 'in-progress'),
  worktree('wt-keep-one', 'completed'),
  worktree('wt-keep-two', 'todo')
]

/** Lane boxes in viewport coordinates, as if the board were at the origin. */
const LANE_BOUNDS: Record<string, { left: number; right: number }> = {
  todo: { left: 0, right: 200 },
  'in-progress': { left: 212, right: 412 },
  'in-review': { left: 424, right: 624 },
  completed: { left: 636, right: 836 }
}

const BOARD_BOUNDS = { left: 0, top: 0, right: 900, bottom: 600 }
const LANE_TOP = 0
const LANE_BOTTOM = 600
const CARD_TOP = 40
const CARD_BOTTOM = 100
/** A point above the cards, inside the swatch of empty lane space a marquee starts from. */
const EMPTY_Y = 20
const PROGRESS_LEFT = 212
const DONE_LEFT = 636

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

function selectionSurface(): HTMLElement {
  const surface = document.querySelector<HTMLElement>('[data-workspace-board-selection-surface]')
  if (!surface) {
    throw new Error('the board selection surface is not painted')
  }
  return surface
}

function lane(statusId: string): HTMLElement | null {
  return laneGrid().querySelector<HTMLElement>(`[data-workspace-status="${statusId}"]`)
}

function boardCard(worktreePath: string): HTMLElement {
  const card = laneGrid().querySelector<HTMLElement>(
    `[data-workspace-board-worktree-path="${worktreePath}"]`
  )
  if (!card) {
    throw new Error(`the card for ${worktreePath} is not painted`)
  }
  return card
}

function cardSurface(worktreePath: string): HTMLElement {
  const surface = boardCard(worktreePath).querySelector<HTMLElement>('[data-worktree-card-surface]')
  if (!surface) {
    throw new Error(`the card surface for ${worktreePath} is not painted`)
  }
  return surface
}

function selectionCountBadge(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-workspace-board-selection-count]')
}

function selectionOverlay(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-workspace-board-selection-rect]')
}

function isSelected(worktreePath: string): string | null {
  return boardCard(worktreePath).getAttribute('data-workspace-board-card-selected')
}

/** The marquee's own ring, written imperatively while the sweep is still in flight. */
function isPreviewed(worktreePath: string): string | null {
  return boardCard(worktreePath).getAttribute(WORKSPACE_BOARD_AREA_SELECTED_ATTR)
}

function stubBoardRects(): void {
  stubRect(laneGrid(), BOARD_BOUNDS)
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

/** The sidebar's real wiring: the panel hook owns open/Escape, and the menu is a spy. */
function BoardHarness({
  onWorktreeContextMenu
}: {
  onWorktreeContextMenu?: WorkspaceBoardDrawerProps['onWorktreeContextMenu']
}): React.JSX.Element {
  const { workspaceBoardOpen, workspaceBoardRenderedOpen, handleWorkspaceBoardOpenChange } =
    useWorkspaceBoardPanel()
  return (
    <>
      <button type="button" onClick={() => handleWorkspaceBoardOpenChange(true)}>
        Toggle board
      </button>
      <WorkspaceBoardDrawer
        {...drawerProps({
          open: workspaceBoardOpen,
          renderedOpen: workspaceBoardRenderedOpen,
          onOpenChange: handleWorkspaceBoardOpenChange,
          onWorktreeContextMenu
        })}
      />
    </>
  )
}

async function settleFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/** The board hydrates one lane's cards per animation frame (D08-020), plus the same frames the
 * marquee's drag flush needs. */
async function settleBoard(): Promise<void> {
  for (let frame = 0; frame < 8; frame++) {
    await settleFrame()
  }
}

async function renderBoard(
  overrides: Partial<WorkspaceBoardDrawerProps> = {}
): Promise<{ onWorktreeContextMenu: Mock }> {
  const onWorktreeContextMenu = vi.fn()
  const { rerender } = render(
    <TooltipProvider>
      <WorkspaceBoardDrawer {...drawerProps({ ...overrides, onWorktreeContextMenu })} />
    </TooltipProvider>
  )
  expect(rerender).toBeDefined()
  await settleBoard()
  stubBoardRects()
  return { onWorktreeContextMenu }
}

function clickCard(worktreePath: string, init: MouseEventInit = {}): void {
  fireEvent.click(cardSurface(worktreePath), init)
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

/** Sweep the marquee from empty space over both cards and let the frame land. */
async function marqueeOverBothCards(
  startX: number,
  startY: number,
  options: { shiftKey?: boolean } = {}
): Promise<void> {
  fireEvent.pointerDown(selectionSurface(), {
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    clientX: startX,
    clientY: startY,
    ...options
  })
  movePointer(startX + 10, startY + 10)
  await settleFrame()
  movePointer(LANE_BOUNDS.completed.right, CARD_BOTTOM + 20)
  await settleFrame()
}

describe('workspace board selection', () => {
  it('keeps a plain click a one-card selection with no count badge', async () => {
    await renderBoard()

    clickCard('/repo/hydra/wt-progress', { ctrlKey: true })

    expect(isSelected('/repo/hydra/wt-progress')).toBe('true')
    expect(isSelected('/repo/hydra/wt-done')).toBe('false')
    expect(selectionCountBadge()).toBeNull()
  })

  it('toggles cards with the modifier and shows the count badge past one', async () => {
    await renderBoard()

    clickCard('/repo/hydra/wt-progress', { ctrlKey: true })
    clickCard('/repo/hydra/wt-done', { ctrlKey: true })

    expect(isSelected('/repo/hydra/wt-progress')).toBe('true')
    expect(isSelected('/repo/hydra/wt-done')).toBe('true')
    expect(selectionCountBadge()?.textContent).toBe('2 selected')

    // The same modifier toggles a card back out of the batch.
    clickCard('/repo/hydra/wt-done', { ctrlKey: true })
    expect(isSelected('/repo/hydra/wt-done')).toBe('false')
    expect(selectionCountBadge()).toBeNull()
  })

  it('extends the range from the anchor with shift', async () => {
    await renderBoard()

    clickCard('/repo/hydra/wt-progress', { ctrlKey: true })
    clickCard('/repo/hydra/wt-done', { shiftKey: true })

    expect(isSelected('/repo/hydra/wt-progress')).toBe('true')
    expect(isSelected('/repo/hydra/wt-done')).toBe('true')
    expect(selectionCountBadge()?.textContent).toBe('2 selected')
  })

  it('selects every visible card with Mod+A', async () => {
    await renderBoard()

    fireEvent.keyDown(document, { key: 'a', ctrlKey: true })

    expect(isSelected('/repo/hydra/wt-progress')).toBe('true')
    expect(isSelected('/repo/hydra/wt-done')).toBe('true')
    expect(selectionCountBadge()?.textContent).toBe('2 selected')
  })

  it('leaves Mod+A to the board search field while it holds focus', async () => {
    await renderBoard()

    const field = screen.getByRole('textbox', { name: 'Search workspaces' })
    field.focus()
    expect(document.activeElement).toBe(field)

    fireEvent.keyDown(field, { key: 'a', ctrlKey: true })

    expect(selectionCountBadge()).toBeNull()
  })

  it('re-anchors the range on a still-rendered card when the search hides the anchor', async () => {
    await renderBoard({ getProjectWorktrees: () => REANCHOR_WORKTREES })
    clickCard('/repo/hydra/wt-anchor', { ctrlKey: true })
    clickCard('/repo/hydra/wt-keep-one', { ctrlKey: true })
    expect(selectionCountBadge()?.textContent).toBe('2 selected')

    // Filter the anchor away; the selection keeps its hidden card (D08-031).
    fireEvent.change(screen.getByRole('textbox', { name: 'Search workspaces' }), {
      target: { value: 'keep' }
    })
    await settleBoard()
    stubBoardRects()
    expect(laneGrid().querySelector('[data-workspace-board-worktree-path$="wt-anchor"]')).toBeNull()
    // Only one of the two selected cards is still on screen, so there is no count to show.
    expect(selectionCountBadge()).toBeNull()

    // A shift range extends from the still-rendered selected card, not from the hidden anchor —
    // which would have collapsed the range to the clicked card alone.
    clickCard('/repo/hydra/wt-keep-two', { shiftKey: true })

    expect(isSelected('/repo/hydra/wt-keep-one')).toBe('true')
    expect(isSelected('/repo/hydra/wt-keep-two')).toBe('true')
    expect(selectionCountBadge()?.textContent).toBe('2 selected')

    // Clearing the search shows the range replaced the selection: the hidden card was not carried
    // through it (a selection the user cannot see, count or narrow is the failure case).
    fireEvent.change(screen.getByRole('textbox', { name: 'Search workspaces' }), {
      target: { value: '' }
    })
    await settleBoard()
    stubBoardRects()

    expect(isSelected('/repo/hydra/wt-anchor')).toBe('false')
    expect(isSelected('/repo/hydra/wt-keep-one')).toBe('true')
    expect(isSelected('/repo/hydra/wt-keep-two')).toBe('true')
  })
})

describe('workspace board marquee', () => {
  it('selects the cards a sweep covers and reports the count', async () => {
    await renderBoard()

    await marqueeOverBothCards(PROGRESS_LEFT, EMPTY_Y)

    // In flight the sweep only rings the covered cards; the selection is committed on release.
    expect(selectionOverlay()?.classList.contains('hidden')).toBe(false)
    expect(isPreviewed('/repo/hydra/wt-progress')).toBe('true')
    expect(isPreviewed('/repo/hydra/wt-done')).toBe('true')
    expect(isSelected('/repo/hydra/wt-progress')).toBe('false')

    releasePointer(LANE_BOUNDS.completed.right, CARD_BOTTOM + 20)

    expect(isSelected('/repo/hydra/wt-progress')).toBe('true')
    expect(isSelected('/repo/hydra/wt-done')).toBe('true')
    expect(isPreviewed('/repo/hydra/wt-progress')).toBeNull()
    expect(selectionCountBadge()?.textContent).toBe('2 selected')
    expect(selectionOverlay()?.classList.contains('hidden')).toBe(true)
  })

  it('treats a sweep under the 4px threshold as a click, never painting a box', async () => {
    await renderBoard()
    clickCard('/repo/hydra/wt-progress', { ctrlKey: true })
    clickCard('/repo/hydra/wt-done', { ctrlKey: true })
    expect(selectionCountBadge()?.textContent).toBe('2 selected')

    stubBoardRects()
    pressSurface(PROGRESS_LEFT, EMPTY_Y)
    // 2.8px: under the threshold, so no rectangle is painted and no preview is applied.
    movePointer(PROGRESS_LEFT + 2, EMPTY_Y + 2)
    await settleFrame()
    expect(selectionOverlay()?.classList.contains('hidden')).toBe(true)

    releasePointer(PROGRESS_LEFT + 2, EMPTY_Y + 2)

    // The release is a click on empty space, so it clears the selection it never marqueed.
    expect(selectionCountBadge()).toBeNull()
    expect(isSelected('/repo/hydra/wt-progress')).toBe('false')
  })

  it('clears the selection on a plain click on empty space', async () => {
    await renderBoard()
    clickCard('/repo/hydra/wt-progress', { ctrlKey: true })
    clickCard('/repo/hydra/wt-done', { ctrlKey: true })

    pressSurface(PROGRESS_LEFT, EMPTY_Y)
    releasePointer(PROGRESS_LEFT, EMPTY_Y)

    expect(selectionCountBadge()).toBeNull()
    expect(isSelected('/repo/hydra/wt-progress')).toBe('false')
    expect(isSelected('/repo/hydra/wt-done')).toBe('false')
  })

  it('keeps the previous batch on a modifier-click on empty space', async () => {
    await renderBoard()
    clickCard('/repo/hydra/wt-progress', { ctrlKey: true })
    clickCard('/repo/hydra/wt-done', { ctrlKey: true })

    fireEvent.pointerDown(selectionSurface(), {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: PROGRESS_LEFT,
      clientY: EMPTY_Y,
      shiftKey: true
    })
    releasePointer(PROGRESS_LEFT, EMPTY_Y)

    expect(selectionCountBadge()?.textContent).toBe('2 selected')
  })

  it('unions an additive sweep with the batch it started from', async () => {
    await renderBoard()
    clickCard('/repo/hydra/wt-progress', { ctrlKey: true })

    await marqueeOverBothCards(PROGRESS_LEFT, EMPTY_Y, { shiftKey: true })
    releasePointer(LANE_BOUNDS.completed.right, CARD_BOTTOM + 20)

    expect(isSelected('/repo/hydra/wt-progress')).toBe('true')
    expect(isSelected('/repo/hydra/wt-done')).toBe('true')
    expect(selectionCountBadge()?.textContent).toBe('2 selected')
  })

  it('cancels the marquee on Escape without committing and keeps the board open', async () => {
    await renderBoard()

    await marqueeOverBothCards(PROGRESS_LEFT, EMPTY_Y)
    expect(selectionOverlay()?.classList.contains('hidden')).toBe(false)

    expect(fireEvent.keyDown(document, { key: 'Escape' })).toBe(false)

    expect(selectionOverlay()?.classList.contains('hidden')).toBe(true)
    expect(document.body.querySelector('[data-workspace-board-sheet]')).not.toBeNull()

    releasePointer(LANE_BOUNDS.completed.right, CARD_BOTTOM + 20)
    expect(selectionCountBadge()).toBeNull()
  })

  it('does not start a marquee from a card press', async () => {
    await renderBoard()

    fireEvent.pointerDown(cardSurface('/repo/hydra/wt-progress'), {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: LANE_BOUNDS['in-progress'].left + 20,
      clientY: CARD_TOP + 10
    })
    movePointer(LANE_BOUNDS.completed.right, CARD_BOTTOM + 20)
    await settleFrame()

    expect(selectionOverlay()?.classList.contains('hidden')).toBe(true)
  })

  it('auto-scrolls the lane the pointer is parked over near its bottom edge', async () => {
    await renderBoard()
    const scroller = lane('in-progress')?.querySelector<HTMLElement>(
      '[data-workspace-board-card-scroller]'
    )
    if (!scroller) {
      throw new Error('the lane card scroller is not painted')
    }
    // jsdom measures no overflow: the lane reports a scrollable body instead.
    const scrollTop = { value: 0 }
    Object.defineProperty(scroller, 'scrollTop', {
      configurable: true,
      get: () => scrollTop.value,
      set: (next: number) => {
        scrollTop.value = next
      }
    })
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 1200 })
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 480 })
    stubRect(scroller, {
      left: LANE_BOUNDS['in-progress'].left,
      top: 100,
      right: LANE_BOUNDS['in-progress'].right,
      bottom: 600
    })

    pressSurface(PROGRESS_LEFT, EMPTY_Y)
    movePointer(LANE_BOUNDS['in-progress'].left + 20, 585)
    await settleFrame()

    expect(scrollTop.value).toBeGreaterThan(0)
    expect(selectionOverlay()?.classList.contains('hidden')).toBe(false)

    releasePointer(LANE_BOUNDS['in-progress'].left + 20, 585)
  })
})

describe('workspace board selection actions', () => {
  it('assigns a status to the whole selection from the card menu', async () => {
    const { onWorktreeContextMenu } = await renderBoard()
    clickCard('/repo/hydra/wt-progress', { ctrlKey: true })
    clickCard('/repo/hydra/wt-done', { ctrlKey: true })

    fireEvent.contextMenu(boardCard('/repo/hydra/wt-done'))

    expect(onWorktreeContextMenu).toHaveBeenCalledTimes(1)
    expect(onWorktreeContextMenu.mock.calls[0]?.[1]).toMatchObject({
      path: '/repo/hydra/wt-done'
    })
    expect(onWorktreeContextMenu.mock.calls[0]?.[3]).toEqual([
      '/repo/hydra/wt-progress',
      '/repo/hydra/wt-done'
    ])
  })

  it('covers only the clicked card when it is not part of the selection', async () => {
    const { onWorktreeContextMenu } = await renderBoard()
    clickCard('/repo/hydra/wt-progress', { ctrlKey: true })
    clickCard('/repo/hydra/wt-done', { ctrlKey: true })

    // Right-clicking the same batch keeps it; the assertions above pin that. The other branch is
    // reached by narrowing first: the search leaves one card, and only it is assigned.
    fireEvent.change(screen.getByRole('textbox', { name: 'Search workspaces' }), {
      target: { value: 'done' }
    })
    await settleBoard()
    stubBoardRects()

    fireEvent.contextMenu(boardCard('/repo/hydra/wt-done'))

    expect(onWorktreeContextMenu.mock.calls[0]?.[3]).toEqual(['/repo/hydra/wt-done'])
  })

  it('leaves the board without a menu spy alone', async () => {
    render(
      <TooltipProvider>
        <WorkspaceBoardDrawer {...drawerProps({ onWorktreeContextMenu: undefined })} />
      </TooltipProvider>
    )
    await settleBoard()
    stubBoardRects()

    clickCard('/repo/hydra/wt-progress', { ctrlKey: true })
    expect(() => fireEvent.contextMenu(boardCard('/repo/hydra/wt-progress'))).not.toThrow()
    expect(isSelected('/repo/hydra/wt-progress')).toBe('true')
  })
})
