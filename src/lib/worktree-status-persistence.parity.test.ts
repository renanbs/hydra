// The workspace-status writer the worktree menu and the board's card drop share: exactly one
// `set_worktree_status` per assignment, with the destination status and the worktree path, and
// the local projections the sidebar reads patched to match.
//
// Only the host transport is mocked — the mapping under test is the real one.
import { describe, expect, it, vi } from 'vitest'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

import {
  applyWorktreeStatus,
  applyWorktreeStatusByProject,
  persistWorktreeStatus
} from './worktree-status-persistence'

type TestWorktree = { path: string; status?: string | null; branch: string }

function worktree(path: string, status: string | null): TestWorktree {
  return { path, status, branch: path.split('/').pop() as string }
}

describe('persistWorktreeStatus', () => {
  it('writes the destination status once, for the worktree path', async () => {
    invokeMock.mockResolvedValueOnce(undefined)

    await persistWorktreeStatus('/repo/hydra/wt-progress', 'completed')

    expect(invokeMock).toHaveBeenCalledTimes(1)
    expect(invokeMock).toHaveBeenCalledWith('set_worktree_status', {
      worktreePath: '/repo/hydra/wt-progress',
      status: 'completed'
    })
  })

  it('propagates a host failure to the caller', async () => {
    invokeMock.mockRejectedValueOnce(new Error('sqlite is busy'))

    await expect(persistWorktreeStatus('/repo/hydra/wt-progress', 'completed')).rejects.toThrow(
      'sqlite is busy'
    )
  })
})

describe('applyWorktreeStatus', () => {
  const WORKTREES: TestWorktree[] = [
    worktree('/repo/hydra/wt-progress', 'in-progress'),
    worktree('/repo/hydra/wt-done', 'completed')
  ]

  it('replaces only the moved worktree status', () => {
    const next = applyWorktreeStatus(WORKTREES, '/repo/hydra/wt-progress', 'completed')

    expect(next.map((entry) => entry.status)).toEqual(['completed', 'completed'])
    expect(next[0]).not.toBe(WORKTREES[0])
    expect(next[1]).toBe(WORKTREES[1])
    expect(WORKTREES[0]?.status).toBe('in-progress')
  })

  it('leaves a list that holds no such worktree untouched', () => {
    const next = applyWorktreeStatus(WORKTREES, '/repo/other/wt', 'todo')

    expect(next).toEqual(WORKTREES)
  })
})

describe('applyWorktreeStatusByProject', () => {
  it('patches the worktree in whichever project holds it', () => {
    const byProject = {
      '/repo/hydra': [worktree('/repo/hydra/wt-progress', 'in-progress')],
      '/repo/other': [worktree('/repo/other/wt', 'todo')]
    }

    const next = applyWorktreeStatusByProject(byProject, '/repo/hydra/wt-progress', 'in-review')

    expect(next['/repo/hydra']?.map((entry) => entry.status)).toEqual(['in-review'])
    expect(next['/repo/other']).toEqual(byProject['/repo/other'])
  })
})
