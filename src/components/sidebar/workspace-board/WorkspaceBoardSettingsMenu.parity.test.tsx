// The board's status settings menu: Orca's `WorkspaceKanbanSettingsMenu` minus the
// Linear sync switch (no sync engine in Hydra — the control would be inert), and wired
// so every edit lands on the board's own lanes.
import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cloneDefaultWorkspaceStatuses } from '../../../shared/workspace-statuses'
import type { GitWorktreeInfo, HydraProject } from '../types'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import WorkspaceBoardDrawer, { type WorkspaceBoardDrawerProps } from './WorkspaceBoardDrawer'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

// The same surface Orca's own spec for this menu stands in: the menu's structure and
// wiring are what is under test, and the portal/popper shells only add async layout
// noise the board never measures in jsdom.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

import { useAppStore } from '@/store'

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
    id: 'wt-todo',
    path: '/repo/hydra/wt-todo',
    head_commit: 'aaa1111',
    branch: 'feat/todo',
    is_bare: false,
    is_locked: false,
    status: 'todo',
  },
  {
    id: 'wt-done',
    path: '/repo/hydra/wt-done',
    head_commit: 'bbb2222',
    branch: 'feat/done',
    is_bare: false,
    is_locked: false,
    status: 'completed',
  },
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
    onOpenChange: vi.fn(),
    onSelectWorktree: vi.fn(),
    ...overrides,
  }
}

/** Lane ids in painted order — the board's own lane, not the menu's list. */
function laneOrder(): string[] {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>(
      '[data-workspace-board-lane-grid] [data-workspace-status]'
    )
  ).map((lane) => lane.dataset.workspaceStatus ?? '')
}

function renderBoard(overrides: Partial<WorkspaceBoardDrawerProps> = {}) {
  return render(<WorkspaceBoardDrawer {...drawerProps(overrides)} />)
}

describe('WorkspaceBoardSettingsMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    invokeMock.mockReset()
    invokeMock.mockResolvedValue(undefined)
    useAppStore.setState({ workspaceStatuses: cloneDefaultWorkspaceStatuses() })
  })

  afterEach(() => {
    // Unmount first: the board subscribes to `workspaceStatuses`, so resetting the store
    // over a mounted board would be a state update outside act.
    cleanup()
    useAppStore.setState({ workspaceStatuses: cloneDefaultWorkspaceStatuses() })
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('renders no control this increment does not ship', () => {
    renderBoard()

    expect(screen.getByRole('button', { name: 'Workspace board settings' })).toBeInTheDocument()
    expect(screen.getByText('Statuses')).toBeInTheDocument()
    // The Linear task-sync switch has no engine behind it in Hydra: it is not rendered.
    expect(document.body.querySelector('[role="switch"]')).toBeNull()
    expect(screen.queryByText('Sync board and issue status')).toBeNull()
  })

  it('adds a lane, renames it and reorders it on the board', () => {
    renderBoard()
    expect(laneOrder()).toEqual(['todo', 'in-progress', 'in-review', 'completed'])

    fireEvent.click(screen.getByRole('button', { name: 'Add status' }))

    expect(laneOrder()).toEqual(['todo', 'in-progress', 'in-review', 'completed', 'status-5'])

    const rename = screen.getByRole('textbox', { name: 'Rename Status 5' })
    fireEvent.change(rename, { target: { value: 'Shipped' } })
    fireEvent.blur(rename)

    expect(
      document.body.querySelector('[data-workspace-status="status-5"]')?.textContent
    ).toContain('Shipped')

    fireEvent.click(screen.getByRole('button', { name: 'Move Shipped left' }))

    expect(laneOrder()).toEqual(['todo', 'in-progress', 'in-review', 'status-5', 'completed'])
  })

  it('removes a lane and migrates the workspaces that were on it', () => {
    const onAssignWorktreeStatus = vi.fn()
    renderBoard({ onAssignWorktreeStatus })

    fireEvent.click(screen.getByRole('button', { name: 'Remove Todo' }))

    expect(laneOrder()).toEqual(['in-progress', 'in-review', 'completed'])
    expect(onAssignWorktreeStatus).toHaveBeenCalledTimes(1)
    expect(onAssignWorktreeStatus).toHaveBeenCalledWith('/repo/hydra/wt-todo', 'in-progress')
  })

  it('changes a lane color and icon through the appearance popover', () => {
    renderBoard()

    fireEvent.click(screen.getByRole('button', { name: 'Customize Todo appearance' }))
    fireEvent.click(screen.getByRole('button', { name: 'Set Todo color to Rose' }))

    expect(useAppStore.getState().workspaceStatuses[0].color).toBe('rose')

    fireEvent.click(screen.getByRole('button', { name: 'Set Todo icon to Flag' }))

    expect(useAppStore.getState().workspaceStatuses[0].icon).toBe('flag')
  })
})
