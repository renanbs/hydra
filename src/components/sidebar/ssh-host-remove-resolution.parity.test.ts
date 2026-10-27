// Parity guard for the host-removal workspace count. The dialog tells the user how many
// workspaces stay behind, and that number has to agree with the sidebar's own host
// attribution (`getWorktreeExecutionHostId` prefers a worktree's own host over its
// repo's) instead of a second, drifting rule. What it locks out: counting another host's
// workspaces, losing the repo root (a workspace too), or double-counting a duplicated row.
import { describe, expect, it } from 'vitest'
import { resolveSshHostRemoval } from './ssh-host-remove-resolution'

const REPO_LOCAL = { id: 'repo_local', connectionId: null, executionHostId: 'local' }
const REPO_SSH = { id: 'repo_ssh', connectionId: 'srv', executionHostId: 'ssh:srv' }
const REPO_RUNTIME = { id: 'repo_vm', connectionId: null, executionHostId: 'runtime:vm-1' }

describe('resolveSshHostRemoval', () => {
  it('counts a host repo root plus its non-main worktrees', () => {
    const resolution = resolveSshHostRemoval({
      targetId: 'srv',
      repos: [REPO_LOCAL, REPO_SSH],
      worktrees: [
        { id: 'wt-main', repoId: 'repo_ssh', isMainWorktree: true, hostId: 'ssh:srv' },
        { id: 'wt-a', repoId: 'repo_ssh', isMainWorktree: false, hostId: 'ssh:srv' },
        { id: 'wt-b', repoId: 'repo_ssh', isMainWorktree: false, hostId: 'ssh:srv' },
        { id: 'wt-local', repoId: 'repo_local', isMainWorktree: false, hostId: 'local' }
      ]
    })

    expect(resolution).toEqual({ targetId: 'srv', workspaceCount: 3 })
  })

  it('counts a worktree that only its repo claims, and skips other hosts', () => {
    const resolution = resolveSshHostRemoval({
      targetId: 'srv',
      repos: [REPO_LOCAL, REPO_SSH, REPO_RUNTIME],
      worktrees: [
        // No own hostId: the repo's host is the only evidence.
        { id: 'wt-inherited', repoId: 'repo_ssh', isMainWorktree: false },
        { id: 'wt-vm', repoId: 'repo_vm', isMainWorktree: false, hostId: 'runtime:vm-1' }
      ]
    })

    expect(resolution.workspaceCount).toBe(2)
  })

  it('reports zero for a host with no repos and no worktrees', () => {
    const resolution = resolveSshHostRemoval({
      targetId: 'ghost',
      repos: [REPO_LOCAL, REPO_SSH],
      worktrees: [{ id: 'wt-a', repoId: 'repo_ssh', isMainWorktree: false, hostId: 'ssh:srv' }]
    })

    expect(resolution.workspaceCount).toBe(0)
  })

  it('does not inflate the count when the store holds a duplicated row', () => {
    const resolution = resolveSshHostRemoval({
      targetId: 'srv',
      repos: [REPO_SSH],
      worktrees: [
        { id: 'wt-a', repoId: 'repo_ssh', isMainWorktree: false, hostId: 'ssh:srv' },
        { id: 'wt-a', repoId: 'repo_ssh', isMainWorktree: false, hostId: 'ssh:srv' }
      ]
    })

    expect(resolution.workspaceCount).toBe(2)
  })
})
