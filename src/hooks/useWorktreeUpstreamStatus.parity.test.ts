import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { invoke } from '@tauri-apps/api/core'
import { useWorktreeUpstreamStatus } from './useWorktreeUpstreamStatus'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

describe('useWorktreeUpstreamStatus', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset()
  })

  it('fetches divergence for an enabled local checkout', async () => {
    vi.mocked(invoke).mockResolvedValue({ ahead: 3, behind: 0, upstream: 'origin/feat/x' })

    const { result } = renderHook(() =>
      useWorktreeUpstreamStatus({
        repoPath: '/repo/one',
        worktreePath: '/repo/one/wt',
        head: 'abc123',
      })
    )

    await waitFor(() =>
      expect(result.current).toEqual({ ahead: 3, behind: 0, upstream: 'origin/feat/x' })
    )
    expect(invoke).toHaveBeenCalledWith('get_worktree_upstream_status', {
      repoPath: '/repo/one',
      worktreePath: '/repo/one/wt',
    })
  })

  it('stays quiet for folder rows and other-host workspaces', () => {
    const { result } = renderHook(() =>
      useWorktreeUpstreamStatus({
        repoPath: '/repo/two',
        worktreePath: '/repo/two/wt',
        enabled: false,
      })
    )
    expect(result.current).toBeNull()
    expect(invoke).not.toHaveBeenCalled()
  })

  it('renders no chips when the host cannot read the checkout', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('missing'))

    const { result } = renderHook(() =>
      useWorktreeUpstreamStatus({
        repoPath: '/repo/three',
        worktreePath: '/repo/three/wt',
        head: 'def456',
      })
    )

    await waitFor(() => expect(invoke).toHaveBeenCalled())
    expect(result.current).toBeNull()
  })
})
