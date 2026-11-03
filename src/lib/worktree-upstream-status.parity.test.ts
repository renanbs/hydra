import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { getWorktreeUpstreamStatus } from './worktree-upstream-status'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

describe('worktree upstream status client', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset()
  })

  it('addresses the host command with the repository and worktree paths', async () => {
    vi.mocked(invoke).mockResolvedValue({ ahead: 2, behind: 1, upstream: 'origin/main' })

    await expect(getWorktreeUpstreamStatus('/repo', '/repo/wt')).resolves.toEqual({
      ahead: 2,
      behind: 1,
      upstream: 'origin/main',
    })
    expect(invoke).toHaveBeenCalledWith('get_worktree_upstream_status', {
      repoPath: '/repo',
      worktreePath: '/repo/wt',
    })
  })

  it('propagates a host failure instead of inventing a clean status', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('not a git checkout'))
    await expect(getWorktreeUpstreamStatus('/repo', '/repo/wt')).rejects.toThrow(
      'not a git checkout'
    )
  })
})
