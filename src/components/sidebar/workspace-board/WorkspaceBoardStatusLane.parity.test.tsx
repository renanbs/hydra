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

function renderLane(
  cards: WorkspaceBoardCardModel[],
  overrides: { totalCount?: number; hasQuery?: boolean; renderCards?: boolean } = {}
): HTMLElement {
  const { container } = render(
    <WorkspaceBoardStatusLane
      status={{ id: 'in-progress', label: 'In progress', color: 'neutral', icon: 'circle' }}
      cards={cards}
      totalCount={overrides.totalCount ?? cards.length}
      hasQuery={overrides.hasQuery ?? false}
      renderCards={overrides.renderCards ?? true}
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

  it('holds the cards back until this lane is hydrated, without calling itself empty', () => {
    const pending = renderLane([card('wt-a', 0)], { renderCards: false })

    expect(pending.querySelectorAll('[data-workspace-board-card-id]')).toHaveLength(0)
    expect(pending.querySelector('[data-workspace-board-lane-count]')?.textContent).toBe('1')
    expect(pending.textContent).not.toContain('Empty')

    // A lane that really has no cards says so on the first paint, hydrated or not.
    const emptyPending = renderLane([], { renderCards: false })
    expect(emptyPending.textContent).toContain('Empty')
  })

  it('prints "matches / total" and a "No matches" placeholder under a query', () => {
    const filtered = renderLane([card('wt-a', 0)], { totalCount: 3, hasQuery: true })
    expect(filtered.querySelector('[data-workspace-board-lane-count]')?.textContent).toBe('1 / 3')

    const filteredOut = renderLane([], { totalCount: 2, hasQuery: true })
    expect(filteredOut.querySelector('[data-workspace-board-lane-count]')?.textContent).toBe('0 / 2')
    expect(screen.getByText('No matches')).toBeInTheDocument()
    expect(screen.queryByText('Empty')).toBeNull()
  })

  it('keeps the plain count and the "Empty" placeholder without a query', () => {
    const filled = renderLane([card('wt-a', 0)], { totalCount: 1 })
    expect(filled.querySelector('[data-workspace-board-lane-count]')?.textContent).toBe('1')

    const empty = renderLane([], { totalCount: 0 })
    expect(screen.getByText('Empty')).toBeInTheDocument()
    expect(screen.queryByText('No matches')).toBeNull()
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
