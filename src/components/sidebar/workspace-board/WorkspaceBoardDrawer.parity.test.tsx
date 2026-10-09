import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { GitWorktreeInfo, HydraProject } from '../types'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import WorkspaceBoardDrawer, { type WorkspaceBoardDrawerProps } from './WorkspaceBoardDrawer'
import { useWorkspaceBoardPanel } from './use-workspace-board-panel'

const PROJECT: HydraProject = {
  id: 'repo_1',
  name: 'hydra',
  path: '/repo/hydra',
  is_git: true,
  current_branch: 'main',
}

const DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: 'repo',
  sortBy: 'recent',
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
}

const WORKTREES: GitWorktreeInfo[] = [
  {
    id: 'wt-progress',
    path: '/repo/hydra/wt-progress',
    head_commit: 'aaa1111',
    branch: 'feat/progress',
    is_bare: false,
    is_locked: false,
    status: 'in-progress',
  },
  {
    id: 'wt-done',
    path: '/repo/hydra/wt-done',
    head_commit: 'bbb2222',
    branch: 'feat/done',
    is_bare: false,
    is_locked: false,
    status: 'completed',
    is_pinned: true,
  },
]

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
 * App wraps the whole shell in one `TooltipProvider`; the board's settings menu is a
 * tooltip trigger, so the drawer renders under the same provider here.
 */
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

function laneCount(statusId: string): string | null {
  return lane(statusId)?.querySelector('[data-workspace-board-lane-count]')?.textContent ?? null
}

/**
 * The board hydrates one lane's cards per animation frame (D08-020), so a test that reads the
 * cards has to let those frames run. Four user statuses plus the frame that starts the chain.
 */
async function settleLaneHydration(): Promise<void> {
  for (let frame = 0; frame < 6; frame++) {
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })
    })
  }
}

/** The sidebar's real wiring: one panel hook drives both the trigger and the drawer. */
function BoardHarness(): React.JSX.Element {
  const { workspaceBoardOpen, workspaceBoardRenderedOpen, toggleWorkspaceBoard, handleWorkspaceBoardOpenChange } =
    useWorkspaceBoardPanel()
  return (
    <>
      <button type="button" onClick={toggleWorkspaceBoard}>
        Toggle board
      </button>
      <WorkspaceBoardDrawer
        {...drawerProps({
          open: workspaceBoardOpen,
          renderedOpen: workspaceBoardRenderedOpen,
          onOpenChange: handleWorkspaceBoardOpenChange,
        })}
      />
    </>
  )
}

describe('WorkspaceBoardDrawer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    // RTL's own cleanup owns the portal containers; clearing the body here would
    // pull a node React still owns out from under it.
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('opens from its trigger and closes on Escape', () => {
    render(
      <TooltipProvider>
        <BoardHarness />
      </TooltipProvider>
    )

    expect(document.body.querySelector('[data-workspace-board-sheet]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle board' }))
    expect(document.body.querySelector('[data-workspace-board-sheet]')).not.toBeNull()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(document.body.querySelector('[data-workspace-board-sheet]')).toBeNull()
  })

  it('renders no sheet while the drawer is not rendered open', () => {
    render(<Board {...drawerProps({ open: false, renderedOpen: false })} />)

    expect(document.body.querySelector('[data-workspace-board-sheet]')).toBeNull()
    expect(screen.queryByText('Workspace board')).toBeNull()
  })

  it('renders one lane per user status with the visible workspace counts', () => {
    render(<Board {...drawerProps()} />)

    expect(document.body.querySelector('[data-workspace-board-sheet]')).not.toBeNull()
    expect(screen.getByText('Workspace board')).toBeInTheDocument()
    expect(laneCount('todo')).toBe('0')
    expect(laneCount('in-progress')).toBe('1')
    expect(laneCount('in-review')).toBe('0')
    expect(laneCount('completed')).toBe('1')
  })

  it('renders a card per visible workspace, keyed by the board card attributes', async () => {
    render(<Board {...drawerProps()} />)
    await settleLaneHydration()

    const cards = document.body.querySelectorAll('[data-workspace-board-card-id]')
    expect(cards).toHaveLength(2)
    expect(
      document.body.querySelector('[data-workspace-board-card-id="|wt-progress"]')
    ).not.toBeNull()
    expect(
      document.body.querySelector('[data-workspace-board-worktree-id="wt-done"]')
    ).not.toBeNull()
  })

  it('shows the empty placeholder on a lane with no workspace', () => {
    render(<Board {...drawerProps()} />)

    expect(lane('todo')?.textContent).toContain('Empty')
    expect(lane('in-progress')?.textContent).not.toContain('Empty')
  })

  it('shows only the workspaces the sidebar hands over', async () => {
    render(<Board {...drawerProps({ getProjectWorktrees: () => [WORKTREES[0]] })} />)
    await settleLaneHydration()

    expect(document.body.querySelectorAll('[data-workspace-board-card-id]')).toHaveLength(1)
    expect(laneCount('completed')).toBe('0')
  })

  it('filters the cards as the search text changes and restores them when cleared', async () => {
    render(<Board {...drawerProps()} />)
    await settleLaneHydration()
    const input = screen.getByRole('textbox', { name: 'Search workspaces' })

    fireEvent.change(input, { target: { value: 'progress' } })

    expect(document.body.querySelectorAll('[data-workspace-board-card-id]')).toHaveLength(1)
    expect(
      document.body.querySelector('[data-workspace-board-card-id="|wt-progress"]')
    ).not.toBeNull()
    expect(laneCount('in-progress')).toBe('1 / 1')
    expect(laneCount('completed')).toBe('0 / 1')
    expect(lane('completed')?.textContent).toContain('No matches')

    fireEvent.change(input, { target: { value: '' } })

    expect(document.body.querySelectorAll('[data-workspace-board-card-id]')).toHaveLength(2)
    expect(laneCount('in-progress')).toBe('1')
    expect(laneCount('completed')).toBe('1')
  })

  it('renders the search field and the settings menu but no control this increment does not ship', () => {
    render(<Board {...drawerProps()} />)

    expect(screen.getByRole('textbox', { name: 'Search workspaces' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Workspace board settings' })).toBeInTheDocument()
    // The sidebar filter menu, the column resize handle and the lane's
    // create-workspace buttons belong to later increments.
    expect(document.body.querySelector('[data-workspace-board-column-resize-handle]')).toBeNull()
    expect(document.body.querySelector('[role="separator"]')).toBeNull()
    expect(document.body.querySelector('[aria-label^="New workspace in"]')).toBeNull()
  })

  it('opens the status settings menu from the header trigger', () => {
    render(<Board {...drawerProps()} />)

    expect(screen.queryByText('Statuses')).toBeNull()

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Workspace board settings' }),
      { button: 0, ctrlKey: false }
    )

    expect(screen.getByText('Statuses')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add status' })).toBeInTheDocument()
  })

  it('closes itself and opens the workspace when a card is activated', async () => {
    const onOpenChange = vi.fn()
    const onSelectWorktree = vi.fn()
    render(<Board {...drawerProps({ onOpenChange, onSelectWorktree })} />)
    await settleLaneHydration()

    const card = document.body.querySelector<HTMLElement>(
      '[data-workspace-board-worktree-id="wt-done"] [data-worktree-card-surface]'
    )
    expect(card).not.toBeNull()
    act(() => {
      card?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onSelectWorktree).toHaveBeenCalledTimes(1)
    expect(onSelectWorktree.mock.calls[0][0]).toMatchObject({ path: '/repo/hydra/wt-done' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('stops painting the sheet as soon as the board closes, and unmounts with the linger', () => {
    // The linger itself (drawer mounted 300ms past close, so Radix can finish the
    // exit animation) is pinned by `use-workspace-board-panel.parity.test.tsx`;
    // jsdom runs no animations, so the painted DOM only proves the gate.
    const { rerender } = render(<Board {...drawerProps()} />)
    expect(document.body.querySelector('[data-workspace-board-sheet]')).not.toBeNull()

    rerender(<Board {...drawerProps({ open: false })} />)
    expect(document.body.querySelector('[data-workspace-board-sheet]')).toBeNull()

    act(() => vi.advanceTimersByTime(300))
    rerender(<Board {...drawerProps({ open: false, renderedOpen: false })} />)
    expect(document.body.querySelector('[data-workspace-board-sheet]')).toBeNull()
  })
})
