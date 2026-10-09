import { describe, expect, it } from 'vitest'
import type { GitWorktreeInfo, HydraProject } from '../types'
import type {
  WorkspaceBoardCard as WorkspaceBoardCardModel,
  WorkspaceBoardLane,
} from './workspace-board-worktrees'
import {
  WORKSPACE_BOARD_QUERY_MAX_BYTES,
  buildWorkspaceBoardSearchFields,
  buildWorkspaceBoardSearchIndex,
  filterWorkspaceBoardLanes,
  matchWorkspaceBoardSearchIndex,
  tokenizeWorkspaceBoardQuery,
} from './workspace-board-search'

const PROJECT: HydraProject = {
  id: 'repo_1',
  name: 'hydra',
  path: '/repo/hydra',
  is_git: true,
  current_branch: 'main',
}

function worktree(id: string, overrides: Partial<GitWorktreeInfo> = {}): GitWorktreeInfo {
  return {
    id,
    path: `/repo/hydra/${id}`,
    head_commit: 'abc1234',
    branch: id,
    is_bare: false,
    is_locked: false,
    ...overrides,
  }
}

function card(
  identity: string,
  overrides: Partial<WorkspaceBoardCardModel> = {}
): WorkspaceBoardCardModel {
  return {
    identity,
    worktree: worktree(identity),
    project: PROJECT,
    sessions: [],
    activityStatus: 'inactive',
    prDisplay: null,
    ports: [],
    isPinned: false,
    isUnread: false,
    isActive: false,
    laneIndex: 0,
    ...overrides,
  }
}

function match(
  cards: readonly WorkspaceBoardCardModel[],
  query: string
): ReadonlySet<string> | null {
  return matchWorkspaceBoardSearchIndex(buildWorkspaceBoardSearchIndex(cards), query)
}

const IN_PROGRESS = { id: 'in-progress', label: 'In progress', color: 'neutral', icon: 'circle' }
const COMPLETED = { id: 'completed', label: 'Done', color: 'neutral', icon: 'circle' }

describe('workspace board search matching (Orca matchWorkspaceBoardWorktrees parity)', () => {
  it('matches a display name, a branch, a project and a host term', () => {
    const subject = card('ssh:box|wt-a', {
      worktree: worktree('wt-a', { branch: 'feat/importar', displayName: 'Importador' }),
      project: { ...PROJECT, name: 'orquestrador' },
    })

    expect(match([subject], 'importador')?.has('ssh:box|wt-a')).toBe(true)
    expect(match([subject], 'importar')?.has('ssh:box|wt-a')).toBe(true)
    expect(match([subject], 'orquestrador')?.has('ssh:box|wt-a')).toBe(true)
    expect(match([subject], 'box')?.has('ssh:box|wt-a')).toBe(true)
    expect(match([subject], 'nope')?.size).toBe(0)
  })

  it('falls back to the branch when no display name is set', () => {
    const fields = buildWorkspaceBoardSearchFields(card('|wt-a', { worktree: worktree('wt-a') }))

    expect(fields).toContain('wt-a')
  })

  it('requires every query token to land somewhere on the card', () => {
    const subject = card('|wt-a', {
      worktree: worktree('wt-a', { branch: 'feat/importar' }),
    })

    expect(match([subject], 'feat importar')?.has('|wt-a')).toBe(true)
    expect(match([subject], 'feat ausente')?.size).toBe(0)
  })

  it('keys the match on the host-qualified identity, so a host term cannot collide', () => {
    const onBox = card('ssh:box|wt-a')
    const onLocal = card('|wt-a')

    // The same bare id lives on two hosts: only the host term tells them apart.
    expect(match([onBox, onLocal], 'box')).toEqual(new Set(['ssh:box|wt-a']))
    expect(match([onBox, onLocal], 'wt-a')).toEqual(
      new Set(['ssh:box|wt-a', '|wt-a'])
    )
  })

  it('does not filter on whitespace-only text', () => {
    expect(match([card('|wt-a')], '   ')).toBeNull()
    expect(tokenizeWorkspaceBoardQuery('   ')).toEqual([])
  })

  it('discards an over-bound query instead of blanking the board', () => {
    const subject = card('|wt-a')
    const huge = 'a'.repeat(WORKSPACE_BOARD_QUERY_MAX_BYTES + 1)

    expect(match([subject], huge)).toBeNull()
  })

  it('is case- and Unicode-folding insensitive without dropping accents', () => {
    const subject = card('|wt-a', { worktree: worktree('wt-a', { branch: 'Café' }) })

    expect(match([subject], 'café')?.has('|wt-a')).toBe(true)
    expect(match([subject], 'CAFÉ')?.has('|wt-a')).toBe(true)
    expect(match([subject], 'cafe')?.has('|wt-a')).toBe(false)
  })
})

describe('workspace board projection under filter', () => {
  function lanes(): WorkspaceBoardLane[] {
    return [
      {
        status: IN_PROGRESS,
        totalCount: 3,
        cards: [
          card('|wt-a', { laneIndex: 0 }),
          card('|wt-b', { laneIndex: 1 }),
          card('|wt-c', { laneIndex: 2 }),
        ],
      },
      {
        status: COMPLETED,
        totalCount: 1,
        cards: [card('|wt-d', { laneIndex: 0 })],
      },
    ]
  }

  it('preserves the lane and card order, and keeps filtered and total counts', () => {
    const result = filterWorkspaceBoardLanes(lanes(), new Set(['|wt-b', '|wt-d']))

    expect(result.lanes[0].cards.map((entry) => entry.identity)).toEqual(['|wt-b'])
    expect(result.lanes[1].cards.map((entry) => entry.identity)).toEqual(['|wt-d'])
    expect(result.matchCount).toBe(2)
    expect(result.totalCount).toBe(4)
  })

  it('leaves a lane whose cards were all filtered away empty, with its total intact', () => {
    const result = filterWorkspaceBoardLanes(lanes(), new Set(['|wt-d']))

    expect(result.lanes[0].cards).toEqual([])
    expect(result.lanes[0].totalCount).toBe(3)
    expect(result.lanes[1].cards.map((entry) => entry.identity)).toEqual(['|wt-d'])
  })

  it('returns the lanes untouched when nothing filters the board', () => {
    const input = lanes()
    const result = filterWorkspaceBoardLanes(input, null)

    expect(result.lanes[0]).toBe(input[0])
    expect(result.matchCount).toBe(4)
    expect(result.totalCount).toBe(4)
  })
})
