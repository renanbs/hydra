import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from './index'
import type { Repo } from '../shared/repo-types'
import type { GitWorktreeInfo } from '../components/sidebar/types'
import { computeVisibleWorktreeIds } from '../components/sidebar/visible-worktrees'
import { toWorktreeRow } from '../shared/worktree/worktree-row'
import { ALL_EXECUTION_HOSTS_SCOPE } from '../shared/execution-host'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

const REPO: Repo = {
  id: 'repo-1',
  path: '/repo/one',
  displayName: 'one',
  badgeColor: '#000000',
  addedAt: 0,
}

const WORKTREE_PATH = '/repo/one/.worktrees/auto-run-1'
const WORKTREE_ID = `${REPO.id}::${WORKTREE_PATH}`

function gitRow(overrides: Partial<GitWorktreeInfo> = {}): GitWorktreeInfo {
  return {
    path: WORKTREE_PATH,
    head_commit: 'abc123',
    branch: 'auto-run-1',
    is_bare: false,
    is_locked: false,
    ...overrides,
  }
}

/** Mirrors the automation caller's 26-slot positional call. */
function automationArgs(options: Record<string, unknown> | undefined): unknown[] {
  const args = new Array<unknown>(26).fill(undefined)
  args[0] = REPO.id
  args[1] = 'auto-run-1'
  args[2] = undefined
  args[3] = 'skip'
  args[4] = undefined
  args[5] = 'unknown'
  args[6] = 'Run 1'
  args[10] = 'claude'
  args[25] = options
  return args
}

function visibleIds(hideAutomationGeneratedWorkspaces: boolean): string[] {
  return computeVisibleWorktreeIds(
    useAppStore.getState().worktreesByRepo,
    [WORKTREE_ID],
    {
      filterRepoIds: [],
      showSleepingWorkspaces: true,
      tabsByWorktree: null,
      ptyIdsByTabId: null,
      worktreeIdsWithLiveAgent: new Set(),
      hideDefaultBranchWorkspace: false,
      hideAutomationGeneratedWorkspaces,
      hideCliCreatedWorkspaces: false,
      hideDetachedHeadWorkspaces: false,
      hideWorkspacesFromOtherDevices: false,
      pairedDeviceIdsByEnvironment: new Map(),
      repoMap: new Map([[REPO.id, REPO]]),
      workspaceHostScope: ALL_EXECUTION_HOSTS_SCOPE,
      defaultHostId: 'local',
      worktreeLineageById: {},
    }
  )
}

beforeEach(() => {
  invokeMock.mockReset()
  useAppStore.setState({ repos: [REPO], worktreesByRepo: {} })
})

describe('createWorktree (local path)', () => {
  it('invokes create_worktree with the repo path, branch and createdWithAgent', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'create_worktree') return Promise.resolve(WORKTREE_PATH)
      if (cmd === 'scan_worktrees') return Promise.resolve({ visible: [gitRow()], hidden: [] })
      return Promise.reject(new Error(`unexpected command ${cmd}`))
    })

    await useAppStore.getState().createWorktree(...automationArgs(undefined))

    expect(invokeMock).toHaveBeenCalledWith('create_worktree', {
      repoPath: REPO.path,
      branchName: 'auto-run-1',
      newBranch: true,
      createdWithAgent: 'claude',
      provenanceKind: undefined,
    })
  })

  it('sends provenanceKind only when automationProvenanceRequest is present', async () => {
    invokeMock.mockImplementation((cmd: string) =>
      cmd === 'create_worktree'
        ? Promise.resolve(WORKTREE_PATH)
        : Promise.resolve({ visible: [gitRow({ automationProvenanceKind: 'created-by-automation' })], hidden: [] })
    )

    await useAppStore.getState().createWorktree(
      ...automationArgs({
        automationProvenanceRequest: {
          automationId: 'auto-1',
          automationRunId: 'run-1',
          dispatchToken: 'token',
          createRequestId: 'req-1',
        },
      })
    )

    expect(invokeMock).toHaveBeenCalledWith(
      'create_worktree',
      expect.objectContaining({ provenanceKind: 'created-by-automation' })
    )
  })

  it('replaces worktreesByRepo[repoId] from the scan and returns the created row', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'create_worktree') return Promise.resolve(WORKTREE_PATH)
      if (cmd === 'scan_worktrees') {
        return Promise.resolve({
          visible: [gitRow({ automationProvenanceKind: 'created-by-automation', is_unread: true })],
          hidden: [],
        })
      }
      return Promise.reject(new Error(`unexpected command ${cmd}`))
    })

    const result = await useAppStore.getState().createWorktree(
      ...automationArgs({
        automationProvenanceRequest: {
          automationId: 'auto-1',
          automationRunId: 'run-1',
          dispatchToken: 'token',
          createRequestId: 'req-1',
        },
      })
    )

    const rows = useAppStore.getState().worktreesByRepo[REPO.id]
    expect(rows).toHaveLength(1)
    expect(rows[0].path).toBe(WORKTREE_PATH)
    expect(rows[0].automationProvenance?.kind).toBe('created-by-automation')
    expect(result.worktree.path).toBe(WORKTREE_PATH)
    expect(result.worktree.id).toBe(`${REPO.id}::${WORKTREE_PATH}`)
  })

  it('hides the created workspace only while hideAutomationCreated is on', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'create_worktree') return Promise.resolve(WORKTREE_PATH)
      if (cmd === 'scan_worktrees') {
        return Promise.resolve({
          visible: [gitRow({ automationProvenanceKind: 'created-by-automation' })],
          hidden: [],
        })
      }
      return Promise.reject(new Error(`unexpected command ${cmd}`))
    })

    await useAppStore.getState().createWorktree(
      ...automationArgs({
        automationProvenanceRequest: {
          automationId: 'auto-1',
          automationRunId: 'run-1',
          dispatchToken: 'token',
          createRequestId: 'req-1',
        },
      })
    )

    expect(visibleIds(false)).toEqual([WORKTREE_ID])
    expect(visibleIds(true)).toEqual([])
  })

  it('propagates an invoke failure without touching worktreesByRepo', async () => {
    const seeded = [toWorktreeRow(gitRow({ path: '/repo/one' }), { repoId: REPO.id })]
    useAppStore.setState({ worktreesByRepo: { [REPO.id]: seeded } })
    invokeMock.mockImplementation((cmd: string) =>
      cmd === 'create_worktree' ? Promise.reject(new Error('git failed')) : Promise.resolve({ visible: [], hidden: [] })
    )

    await expect(
      useAppStore.getState().createWorktree(...automationArgs(undefined))
    ).rejects.toThrow('git failed')

    expect(useAppStore.getState().worktreesByRepo[REPO.id]).toBe(seeded)
  })
})
