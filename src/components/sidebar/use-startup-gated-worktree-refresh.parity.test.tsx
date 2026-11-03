import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useStartupGatedWorktreeRefresh } from './use-startup-gated-worktree-refresh'

type HookProps = {
  repoCount: number
  startupWorktreeRefreshCompleted: boolean
  fetchAllWorktrees: () => Promise<void>
}

function renderRefresh(initialProps: HookProps) {
  return renderHook(
    ({ repoCount, startupWorktreeRefreshCompleted, fetchAllWorktrees }: HookProps) =>
      useStartupGatedWorktreeRefresh({
        repoCount,
        startupWorktreeRefreshCompleted,
        fetchAllWorktrees,
      }),
    { initialProps }
  )
}

describe('useStartupGatedWorktreeRefresh (D01-006)', () => {
  it('does not scan while the startup pass is still running', () => {
    const fetchAllWorktrees = vi.fn(() => Promise.resolve())
    const { rerender } = renderRefresh({
      repoCount: 1,
      startupWorktreeRefreshCompleted: false,
      fetchAllWorktrees,
    })

    rerender({ repoCount: 2, startupWorktreeRefreshCompleted: false, fetchAllWorktrees })
    expect(fetchAllWorktrees).not.toHaveBeenCalled()
  })

  it('scans once when the repo count changes after startup settles', () => {
    const fetchAllWorktrees = vi.fn(() => Promise.resolve())
    const { rerender } = renderRefresh({
      repoCount: 2,
      startupWorktreeRefreshCompleted: false,
      fetchAllWorktrees,
    })

    rerender({ repoCount: 2, startupWorktreeRefreshCompleted: true, fetchAllWorktrees })
    expect(fetchAllWorktrees).not.toHaveBeenCalled()

    rerender({ repoCount: 3, startupWorktreeRefreshCompleted: true, fetchAllWorktrees })
    expect(fetchAllWorktrees).toHaveBeenCalledTimes(1)
  })

  it('ignores same-count re-renders from runtime status oscillation', () => {
    const fetchAllWorktrees = vi.fn(() => Promise.resolve())
    const { rerender } = renderRefresh({
      repoCount: 3,
      startupWorktreeRefreshCompleted: true,
      fetchAllWorktrees,
    })

    for (let index = 0; index < 5; index += 1) {
      rerender({ repoCount: 3, startupWorktreeRefreshCompleted: true, fetchAllWorktrees })
    }

    expect(fetchAllWorktrees).not.toHaveBeenCalled()
  })

  it('joins the in-flight scan instead of queueing repeat triggers', async () => {
    const firstScan = Promise.withResolvers<void>()
    const fetchAllWorktrees = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(() => firstScan.promise)
      .mockImplementation(() => Promise.resolve())
    const { rerender } = renderRefresh({
      repoCount: 3,
      startupWorktreeRefreshCompleted: true,
      fetchAllWorktrees,
    })

    rerender({ repoCount: 4, startupWorktreeRefreshCompleted: true, fetchAllWorktrees })
    expect(fetchAllWorktrees).toHaveBeenCalledTimes(1)

    rerender({ repoCount: 5, startupWorktreeRefreshCompleted: true, fetchAllWorktrees })
    expect(fetchAllWorktrees).toHaveBeenCalledTimes(1)

    await act(async () => {
      firstScan.resolve()
      await firstScan.promise
    })

    rerender({ repoCount: 6, startupWorktreeRefreshCompleted: true, fetchAllWorktrees })
    expect(fetchAllWorktrees).toHaveBeenCalledTimes(2)
  })
})
