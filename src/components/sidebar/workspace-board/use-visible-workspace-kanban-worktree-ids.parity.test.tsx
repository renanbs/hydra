// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useAppStore } from '@/store'
import type { Repo } from '@/shared/repo-types'
import type { Worktree } from '@/shared/worktree/types'
import { getWorktreeHostIdentity } from '@/shared/worktree/host-qualified-identity'
import { resetAgentStatusEpochClockForTests } from '@/lib/agent-status-epoch-clock'
import { useVisibleWorkspaceKanbanWorktreeIds } from './use-visible-workspace-kanban-worktree-ids'

const REPO: Repo = {
  id: 'repo_1',
  name: 'hydra',
  path: '/repo/hydra',
  connectionId: null,
  executionHostId: 'local',
} as Repo

function worktree(id: string, overrides: Partial<Worktree> = {}): Worktree {
  return {
    id,
    repoId: REPO.id,
    displayName: id,
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    path: `/repo/hydra/${id}`,
    head: 'abc1234',
    branch: id,
    isBare: false,
    isMainWorktree: false,
    ...overrides,
  }
}

function resetStore(): void {
  resetAgentStatusEpochClockForTests()
  useAppStore.setState({
    worktreesByRepo: {},
    repos: [],
    showSleepingWorkspaces: false,
    hideDefaultBranchWorkspace: false,
    hideAutomationGeneratedWorkspaces: false,
    hideCliCreatedWorkspaces: false,
    hideDetachedHeadWorkspaces: false,
    hideWorkspacesFromOtherDevices: false,
    alwaysShowDefaultBranchWorkspace: true,
    workspaceHostScope: 'all',
    visibleWorkspaceHostIds: null,
    settings: null,
    filterRepoIds: [],
    tabsByWorktree: {},
    ptyIdsByTabId: {},
    browserTabsByWorktree: {},
    agentStatusEpoch: 0,
    agentStatusByPaneKey: {},
    runtimeEnvironments: [],
    runtimeStatusByEnvironmentId: new Map(),
  })
}

describe('useVisibleWorkspaceKanbanWorktreeIds (Orca parity)', () => {
  beforeEach(resetStore)
  afterEach(() => {
    cleanup()
    resetStore()
  })

  it('keeps a single-host filter host-qualified when workspace ids collide', () => {
    const local = worktree('shared', { hostId: 'local' })
    const ssh = worktree('shared', { hostId: 'ssh:box' })
    useAppStore.setState({
      repos: [REPO],
      worktreesByRepo: { [REPO.id]: [local, ssh] },
      // Sleeping sweep off: this test isolates host scoping, not activity.
      showSleepingWorkspaces: true,
      visibleWorkspaceHostIds: ['local'],
    })

    const { result } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({ repoMap: new Map([[REPO.id, REPO]]) })
    )

    expect([...result.current ?? []]).toEqual([getWorktreeHostIdentity(local)])
  })

  it('hides sleeping workspaces when "Hide sleeping" is on, with the epoch sample', () => {
    const sleeping = worktree('sleeping')
    const live = worktree('live')
    useAppStore.setState({
      repos: [REPO],
      worktreesByRepo: { [REPO.id]: [sleeping, live] },
      showSleepingWorkspaces: false,
      tabsByWorktree: { [live.path]: [{ id: 'tab-live' }] },
      ptyIdsByTabId: { 'tab-live': ['pty'] },
      agentStatusByPaneKey: {
        'tab-live::leaf': {
          state: 'working',
          prompt: 'p',
          updatedAt: Date.now(),
          stateStartedAt: Date.now(),
          paneKey: 'tab-live::leaf',
          stateHistory: [],
          worktreeId: live.id,
        },
      },
    })

    const { result } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({ repoMap: new Map([[REPO.id, REPO]]) })
    )

    const ids = new Set(result.current ?? [])
    expect(ids.has(getWorktreeHostIdentity(live))).toBe(true)
    expect(ids.has(getWorktreeHostIdentity(sleeping))).toBe(false)
  })

  it('does not sample agents while showSleepingWorkspaces keeps every row', () => {
    const sleeping = worktree('sleeping')
    useAppStore.setState({
      repos: [REPO],
      worktreesByRepo: { [REPO.id]: [sleeping] },
      showSleepingWorkspaces: true,
    })

    const { result } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({ repoMap: new Map([[REPO.id, REPO]]) })
    )

    expect([...result.current ?? []]).toEqual([getWorktreeHostIdentity(sleeping)])
  })

  it('returns null until the store has a worktree projection to filter against', () => {
    const { result } = renderHook(() => useVisibleWorkspaceKanbanWorktreeIds())
    expect(result.current).toBeNull()
  })
})
