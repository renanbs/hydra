import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GitWorktreeInfo, HydraProject } from '../types'
import type { WorkspaceBoardCard as WorkspaceBoardCardModel } from './workspace-board-worktrees'
import WorkspaceBoardStatusLane from './WorkspaceBoardStatusLane'

const PROJECT: HydraProject = {
  id: 'repo_1',
  name: 'hydra',
  path: '/repo/hydra',
  is_git: true,
  current_branch: 'main',
}

function worktree(id: string): GitWorktreeInfo {
  return {
    id,
    path: `/repo/hydra/${id}`,
    head_commit: 'abc1234',
    branch: id,
    is_bare: false,
    is_locked: false,
  }
}

function card(
  id: string,
  laneIndex: number,
  overrides: Partial<WorkspaceBoardCardModel> = {}
): WorkspaceBoardCardModel {
  return {
    identity: `|${id}`,
    worktree: worktree(id),
    project: PROJECT,
    sessions: [],
    activityStatus: 'inactive',
    prDisplay: null,
    ports: [],
    isPinned: false,
    isUnread: false,
    isActive: false,
    laneIndex,
    ...overrides,
  }
}

function renderLane(cards: WorkspaceBoardCardModel[]): HTMLElement {
  const { container } = render(
    <WorkspaceBoardStatusLane
      status={{ id: 'in-progress', label: 'In progress', color: 'neutral', icon: 'circle' }}
      cards={cards}
      columnWidth={308}
      compactCards={false}
      onActivate={vi.fn()}
    />
  )
  return container
}

describe('WorkspaceBoardStatusLane (Orca WorkspaceKanbanStatusLane parity)', () => {
  it('heads the lane with its label and card counter', () => {
    const container = renderLane([card('wt-a', 0), card('wt-b', 1)])

    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(container.querySelector('[data-workspace-board-lane-count]')?.textContent).toBe('2')
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('[data-workspace-status="in-progress"]')).not.toBeNull()
  })

  it('renders the empty placeholder only when the lane has no cards', () => {
    const empty = renderLane([])
    expect(empty.querySelector('[data-workspace-board-lane-count]')?.textContent).toBe('0')
    expect(screen.getByText('Empty')).toBeInTheDocument()

    const filled = renderLane([card('wt-a', 0)])
    expect(filled.textContent).not.toContain('Empty')
  })

  it('frames every card with the board card attributes and its lane index', () => {
    const container = renderLane([card('wt-a', 0), card('wt-b', 1, { isPinned: true })])

    const cards = [...container.querySelectorAll<HTMLElement>('[data-workspace-board-card-id]')]
    expect(cards.map((element) => element.dataset.workspaceBoardCardId)).toEqual(['|wt-a', '|wt-b'])
    expect(cards.map((element) => element.dataset.workspaceBoardCardIndex)).toEqual(['0', '1'])
    expect(cards.map((element) => element.dataset.workspaceBoardCardMode)).toEqual([
      'detailed',
      'detailed',
    ])
    expect(cards.map((element) => element.dataset.workspaceBoardWorktreeId)).toEqual([
      'wt-a',
      'wt-b',
    ])
  })

  it('badges a pinned card and leaves the others unbadged', () => {
    const container = renderLane([card('wt-a', 0), card('wt-b', 1, { isPinned: true })])

    const badges = screen.getAllByLabelText('Pinned')
    expect(badges).toHaveLength(1)
    expect(
      container.querySelector('[data-workspace-board-card-id="|wt-b"]')?.contains(badges[0])
    ).toBe(true)
  })

  it('renders no rename or delete affordance on a board card', () => {
    const container = renderLane([card('wt-a', 0)])

    // `affiliateListMode` removes the card's own destructive/editing controls; a
    // board card must not paint a control the board does not implement.
    expect(container.querySelector('[aria-label="Delete workspace"]')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
    expect(container.querySelector('[draggable="true"]')).toBeNull()
  })
})
