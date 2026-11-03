import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WORKSPACE_STATUS_ID,
  cloneDefaultWorkspaceStatuses,
} from '../../../shared/workspace-statuses'
import type { GitWorktreeInfo, HydraProject, WorktreeSession } from '../types'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import {
  buildWorkspaceBoardDragGroups,
  buildWorkspaceBoardLaneFullWorktreeIds,
  buildWorkspaceBoardLanes,
  buildWorkspaceBoardUnambiguousWorktreeIdIndex,
  type WorkspaceBoardCard,
  type WorkspaceBoardLane,
} from './workspace-board-worktrees'

const PROJECT: HydraProject = {
  id: 'repo_1',
  name: 'hydra',
  path: '/repo/hydra',
  is_git: true,
  current_branch: 'main',
}

const WORKSPACE_STATUSES = cloneDefaultWorkspaceStatuses()

const DISPLAY_OPTIONS: WorkspaceDisplayOptions = {
  groupBy: 'repo',
  sortBy: 'recent',
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
}

function worktree(
  id: string,
  overrides: Partial<GitWorktreeInfo> = {}
): GitWorktreeInfo {
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

function build(args: {
  worktrees: GitWorktreeInfo[]
  displayOptions?: Partial<WorkspaceDisplayOptions>
  sessions?: readonly WorktreeSession[]
  liveWorkspacePaths?: ReadonlySet<string>
  pinnedWorktreePaths?: ReadonlySet<string>
  activeWorktreePath?: string | null
  hostIdByRepoId?: ReadonlyMap<string, never>
  sortBy?: string
  visibleIdentitySet?: ReadonlySet<string> | null
}) {
  return buildWorkspaceBoardLanes({
    projects: [PROJECT],
    getProjectWorktrees: () => args.worktrees,
    sessions: args.sessions ?? [],
    liveWorkspacePaths: args.liveWorkspacePaths ?? new Set<string>(),
    pinnedWorktreePaths: args.pinnedWorktreePaths ?? new Set<string>(),
    unreadWorktreePaths: new Set<string>(),
    displayOptions: { ...DISPLAY_OPTIONS, ...args.displayOptions },
    workspaceStatuses: WORKSPACE_STATUSES,
    activeWorktreePath: args.activeWorktreePath ?? null,
    hostIdByRepoId: args.hostIdByRepoId ?? new Map(),
    sortBy: args.sortBy,
    visibleIdentitySet: args.visibleIdentitySet,
  })
}

function cardIds(lanes: readonly WorkspaceBoardLane[], statusId: string): string[] {
  const lane = lanes.find((candidate) => candidate.status.id === statusId)
  return (lane?.cards ?? []).map((card) => card.worktree.id ?? card.worktree.path)
}

describe('workspace board lanes (Orca groupWorkspaceKanbanWorktrees parity)', () => {
  it('keeps one lane per user status, in the user status order', () => {
    const lanes = build({ worktrees: [worktree('wt-a')] })

    expect(lanes.map((lane) => lane.status.id)).toEqual(
      WORKSPACE_STATUSES.map((status) => status.id)
    )
    expect(lanes.map((lane) => lane.status.label)).toEqual(['Todo', 'In progress', 'In review', 'Done'])
  })

  it('groups each workspace into its persisted status lane', () => {
    const lanes = build({
      worktrees: [
        worktree('wt-progress', { status: 'in-progress' }),
        worktree('wt-review', { status: 'in-review' }),
        worktree('wt-done', { status: 'completed' }),
        worktree('wt-todo', { status: 'todo' }),
      ],
    })

    expect(cardIds(lanes, 'todo')).toEqual(['wt-todo'])
    expect(cardIds(lanes, 'in-progress')).toEqual(['wt-progress'])
    expect(cardIds(lanes, 'in-review')).toEqual(['wt-review'])
    expect(cardIds(lanes, 'completed')).toEqual(['wt-done'])
  })

  it('counts only the lane\'s own cards', () => {
    const lanes = build({
      worktrees: [
        worktree('wt-a', { status: 'in-progress' }),
        worktree('wt-b', { status: 'in-progress' }),
        worktree('wt-c', { status: 'completed' }),
      ],
    })

    expect(lanes.map((lane) => [lane.status.id, lane.cards.length])).toEqual([
      ['todo', 0],
      ['in-progress', 2],
      ['in-review', 0],
      ['completed', 1],
    ])
  })

  it('falls back to the default lane for a workspace with no status', () => {
    const lanes = build({ worktrees: [worktree('wt-a')] })

    expect(cardIds(lanes, DEFAULT_WORKSPACE_STATUS_ID)).toEqual(['wt-a'])
    expect(cardIds(lanes, 'todo')).toEqual([])
  })

  it('does not invent a lane for a status the user no longer defines', () => {
    const lanes = build({ worktrees: [worktree('wt-a', { status: 'working' })] })

    expect(lanes).toHaveLength(WORKSPACE_STATUSES.length)
    expect(cardIds(lanes, DEFAULT_WORKSPACE_STATUS_ID)).toEqual(['wt-a'])
  })

  it('leads each lane with pinned cards and keeps the sidebar order inside each class', () => {
    const lanes = build({
      worktrees: [
        worktree('wt-a', { status: 'in-progress' }),
        worktree('wt-b', { status: 'in-progress' }),
        worktree('wt-c', { status: 'in-progress' }),
      ],
      pinnedWorktreePaths: new Set(['/repo/hydra/wt-b', '/repo/hydra/wt-c']),
    })

    expect(cardIds(lanes, 'in-progress')).toEqual(['wt-b', 'wt-c', 'wt-a'])
    expect(
      lanes
        .find((lane) => lane.status.id === 'in-progress')
        ?.cards.map((card) => card.laneIndex)
    ).toEqual([0, 1, 2])
    expect(
      lanes.find((lane) => lane.status.id === 'in-progress')?.cards.map((card) => card.isPinned)
    ).toEqual([true, true, false])
  })

  it('marks only the active workspace, by path', () => {
    const lanes = build({
      worktrees: [worktree('wt-a'), worktree('wt-b')],
      activeWorktreePath: '/repo/hydra/wt-b',
    })

    expect(
      lanes
        .find((lane) => lane.status.id === DEFAULT_WORKSPACE_STATUS_ID)
        ?.cards.map((card) => [card.worktree.id, card.isActive])
    ).toEqual([
      ['wt-a', false],
      ['wt-b', true],
    ])
  })

  it('keys a card by host-qualified identity', () => {
    const lanes = build({
      worktrees: [worktree('wt-a')],
      hostIdByRepoId: new Map([['repo_1', 'ssh:box']]) as ReadonlyMap<string, never>,
    })

    expect(
      lanes.find((lane) => lane.status.id === DEFAULT_WORKSPACE_STATUS_ID)?.cards[0].identity
    ).toBe('ssh:box|wt-a')
  })
})

describe('workspace board visibility parity with the sidebar', () => {
  it('shows exactly what the sidebar\'s own project filter hands it', () => {
    // The sidebar hides `wt-hidden` before the board ever sees the project's list.
    const lanes = build({ worktrees: [worktree('wt-visible')] })

    expect(cardIds(lanes, DEFAULT_WORKSPACE_STATUS_ID)).toEqual(['wt-visible'])
  })

  it('hides an automation-created workspace when the sidebar menu hides them', () => {
    const lanes = build({
      worktrees: [
        worktree('wt-auto', { automationProvenanceKind: 'created-by-automation' }),
        worktree('wt-manual'),
      ],
      displayOptions: { hideAutomationCreated: true },
    })

    expect(cardIds(lanes, DEFAULT_WORKSPACE_STATUS_ID)).toEqual(['wt-manual'])
  })

  it('hides a CLI-created workspace when the sidebar menu hides them', () => {
    const lanes = build({
      worktrees: [worktree('wt-cli', { cliProvenanceKind: 'created-by-cli' }), worktree('wt-manual')],
      displayOptions: { hideCliCreated: true },
    })

    expect(cardIds(lanes, DEFAULT_WORKSPACE_STATUS_ID)).toEqual(['wt-manual'])
  })

  it('hides a sleeping workspace but keeps the exempt primary checkout', () => {
    const lanes = build({
      worktrees: [
        worktree('wt-sleeping'),
        worktree('wt-primary', { is_main: true, isMainWorktree: true }),
      ],
      displayOptions: { hideSleeping: true },
    })

    expect(cardIds(lanes, DEFAULT_WORKSPACE_STATUS_ID)).toEqual(['wt-primary'])
  })
})

describe('workspace board manual sort and drag groups (D08-029)', () => {
  it('keeps the sidebar order in manual mode instead of floating pinned cards', () => {
    const worktrees = [
      worktree('wt-first'),
      worktree('wt-pinned', { is_pinned: true }),
      worktree('wt-last'),
    ]

    const manual = build({
      worktrees,
      sortBy: 'manual',
      pinnedWorktreePaths: new Set(['/repo/hydra/wt-pinned']),
    })
    expect(cardIds(manual, DEFAULT_WORKSPACE_STATUS_ID)).toEqual([
      'wt-first',
      'wt-pinned',
      'wt-last',
    ])

    const recent = build({
      worktrees,
      sortBy: 'recent',
      pinnedWorktreePaths: new Set(['/repo/hydra/wt-pinned']),
    })
    expect(cardIds(recent, DEFAULT_WORKSPACE_STATUS_ID)).toEqual([
      'wt-pinned',
      'wt-first',
      'wt-last',
    ])
  })

  it('builds one drag group and one full-id list per lane, in lane order', () => {
    const lanes = build({
      worktrees: [
        worktree('wt-a', { status: 'todo' }),
        worktree('wt-b', { status: 'completed' }),
        worktree('wt-c', { status: 'todo' }),
      ],
    })

    const groups = buildWorkspaceBoardDragGroups(lanes)
    expect(groups.map((group) => group.key)).toEqual(WORKSPACE_STATUSES.map((status) => status.id))
    expect(groups.find((group) => group.key === 'todo')?.worktreeIds).toEqual(['wt-a', 'wt-c'])

    const fullIds = buildWorkspaceBoardLaneFullWorktreeIds(lanes)
    expect(fullIds.get('completed')).toEqual(['wt-b'])
  })

  it('drops a workspace id that names two hosts from the id index', () => {
    const card = build({ worktrees: [worktree('wt-a')] })
      .flatMap((lane) => lane.cards)
      .find((candidate) => candidate.worktreeId === 'wt-a')!
    const sameIdOtherHost: WorkspaceBoardCard = {
      ...card,
      identity: 'ssh:other|wt-a',
      worktree: { ...card.worktree, id: 'wt-a' },
    }
    const unique: WorkspaceBoardCard = {
      ...card,
      worktreeId: 'wt-unique',
      identity: '|wt-unique',
    }

    const index = buildWorkspaceBoardUnambiguousWorktreeIdIndex([card, sameIdOtherHost, unique])
    expect(index.has('wt-a')).toBe(false)
    expect(index.get('wt-unique')?.identity).toBe('|wt-unique')
  })
})

// D15a-012: the board reads the sidebar's visible host-qualified identities, so a
// host scoped out of the sidebar must not reappear as a board card.
describe('workspace board host scope (D15a-012)', () => {
  it('drops every card when the visible identity set is empty', () => {
    const lanes = build({
      worktrees: [worktree('wt-a', { status: 'todo' })],
      visibleIdentitySet: new Set<string>(),
    })

    expect(cardIds(lanes, 'todo')).toEqual([])
  })

  it('keeps the cards whose host-qualified identity is visible', () => {
    const visible = worktree('wt-a', { status: 'todo' })
    const lanes = build({
      worktrees: [visible, worktree('wt-b', { status: 'todo' })],
      visibleIdentitySet: new Set(['|' + (visible.id ?? visible.path)]),
    })

    expect(cardIds(lanes, 'todo')).toEqual(['wt-a'])
  })

  it('keeps the pre-existing membership when there is no host narrowing', () => {
    const lanes = build({
      worktrees: [worktree('wt-a', { status: 'todo' })],
      visibleIdentitySet: null,
    })

    expect(cardIds(lanes, 'todo')).toEqual(['wt-a'])
  })
})
