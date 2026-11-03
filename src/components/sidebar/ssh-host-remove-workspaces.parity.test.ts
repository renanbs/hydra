// D02b-018: host removal cascades. A connected host deletes its remote worktrees
// through `ssh_remote_delete_worktree` (force, because the user opted in) and then
// drops the local records; a failed workspace keeps the host. Offline hosts only
// forget. The same absolute path on another host must survive the catalog write.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SshHostRemoveResolution } from './ssh-host-remove-resolution'

const { invokeMock, deleteSshWorktreeMock, removeCatalogRepoMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  deleteSshWorktreeMock: vi.fn(),
  removeCatalogRepoMock: vi.fn()
}))

vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))
vi.mock('@/store/ssh-remote-bridge', () => ({ deleteSshWorktree: deleteSshWorktreeMock }))
vi.mock('@/lib/catalog-client', () => ({ removeCatalogRepo: removeCatalogRepoMock }))

import { clearSshHostWorkspaces } from './ssh-host-remove-workspaces'

const RESOLUTION: SshHostRemoveResolution = {
  targetId: 'srv',
  workspaceWorktreeIds: ['wt-1'],
  hostRepoIds: ['repo-1'],
  workspaceCount: 1,
  isConnected: true
}

const WORKTREES = [{ id: 'wt-1', path: '/srv/wt/login', repoPath: '/srv/repo' }]
const REPOS = [{ id: 'repo-1', path: '/srv/repo' }]

beforeEach(() => {
  invokeMock.mockReset()
  deleteSshWorktreeMock.mockReset()
  removeCatalogRepoMock.mockReset()
  invokeMock.mockResolvedValue(undefined)
  removeCatalogRepoMock.mockResolvedValue({})
})

describe('clearSshHostWorkspaces (D02b-018)', () => {
  it('deletes remote worktrees, forgets local records and scopes catalog removal to the host', async () => {
    deleteSshWorktreeMock.mockResolvedValue({
      worktreePath: '/srv/wt/login',
      removed: true,
      preservedBranches: [{ branchName: 'feat/login', head: 'abc' }]
    })

    const result = await clearSshHostWorkspaces({
      resolution: RESOLUTION,
      worktrees: WORKTREES,
      repos: REPOS,
      mode: 'delete-remote'
    })

    expect(deleteSshWorktreeMock).toHaveBeenCalledWith({
      connectionId: 'srv',
      repoPath: '/srv/repo',
      worktreePath: '/srv/wt/login',
      force: true
    })
    expect(invokeMock).toHaveBeenCalledWith('ssh_forget_workspace', {
      connectionId: 'srv',
      worktreePath: '/srv/wt/login'
    })
    expect(removeCatalogRepoMock).toHaveBeenCalledWith('/srv/repo', 'srv')
    expect(result).toEqual({
      failedIds: [],
      error: null,
      preservedBranches: ['feat/login']
    })
  })

  it('keeps the host when a remote deletion fails and does not touch the catalog rows', async () => {
    deleteSshWorktreeMock.mockRejectedValue(new Error('fatal: worktree is dirty'))

    const result = await clearSshHostWorkspaces({
      resolution: RESOLUTION,
      worktrees: WORKTREES,
      repos: REPOS,
      mode: 'delete-remote'
    })

    expect(result.failedIds).toEqual(['wt-1'])
    expect(result.error).toBe('fatal: worktree is dirty')
    // Why: the repo row is only dropped when every workspace settled.
    expect(removeCatalogRepoMock).not.toHaveBeenCalled()
  })

  it('does not call the remote delete and a missing repo path fails loudly', async () => {
    const missingRepo = [{ id: 'wt-1', path: '/srv/wt/login', repoPath: '' }]
    const result = await clearSshHostWorkspaces({
      resolution: { ...RESOLUTION, hostRepoIds: [] },
      worktrees: missingRepo,
      repos: REPOS,
      mode: 'delete-remote'
    })

    expect(deleteSshWorktreeMock).not.toHaveBeenCalled()
    expect(result.failedIds).toEqual(['wt-1'])
    expect(result.error).toContain('no owning repository')
  })

  it('forgets offline workspaces locally without touching the host', async () => {
    const result = await clearSshHostWorkspaces({
      resolution: { ...RESOLUTION, isConnected: false },
      worktrees: WORKTREES,
      repos: REPOS,
      mode: 'forget-local'
    })

    expect(deleteSshWorktreeMock).not.toHaveBeenCalled()
    expect(invokeMock).toHaveBeenCalledWith('ssh_forget_workspace', {
      connectionId: 'srv',
      worktreePath: '/srv/wt/login'
    })
    expect(result.failedIds).toEqual([])
  })
})
