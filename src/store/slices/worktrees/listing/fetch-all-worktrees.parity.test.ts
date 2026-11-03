import { describe, expect, it, vi } from 'vitest'

import {
  createFetchAllWorktrees,
  isFetchAllWorktreesBlockedByStartup,
  shouldFetchWorktreesForRepoCountChange,
} from './fetch-all-worktrees'

function createGate(startupWorktreeRefreshCompleted: boolean, scan: () => Promise<unknown>) {
  const state = { startupWorktreeRefreshCompleted }
  return createFetchAllWorktrees(null, () => state, scan)
}

describe('createFetchAllWorktrees startup gate (D01-006)', () => {
  it('blocks the full scan until startup marks the first authoritative scan settled', async () => {
    let completed = false
    const scan = vi.fn(() => Promise.resolve())
    const fetchAllWorktrees = createFetchAllWorktrees(null, () => ({
      startupWorktreeRefreshCompleted: completed,
    }), scan)

    await fetchAllWorktrees()
    expect(scan).not.toHaveBeenCalled()

    completed = true
    await fetchAllWorktrees()
    expect(scan).toHaveBeenCalledTimes(1)
  })

  it('coalesces triggers that land while a scan is running', async () => {
    const deferred = Promise.withResolvers<void>()
    const scan = vi.fn(() => deferred.promise)
    const fetchAllWorktrees = createGate(true, scan)

    const first = fetchAllWorktrees()
    const second = fetchAllWorktrees()
    expect(scan).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)

    deferred.resolve()
    await Promise.all([first, second])

    await fetchAllWorktrees()
    expect(scan).toHaveBeenCalledTimes(2)
  })

  it('reports the blocked state the same way the sidebar hook checks it', () => {
    expect(isFetchAllWorktreesBlockedByStartup({ startupWorktreeRefreshCompleted: false })).toBe(
      true
    )
    expect(isFetchAllWorktreesBlockedByStartup({ startupWorktreeRefreshCompleted: true })).toBe(
      false
    )
  })
})

describe('shouldFetchWorktreesForRepoCountChange (D01-006)', () => {
  it('only scans after startup when the repo count actually changed', () => {
    expect(
      shouldFetchWorktreesForRepoCountChange({
        startupWorktreeRefreshCompleted: false,
        previousRepoCount: 1,
        repoCount: 2,
      })
    ).toBe(false)
    expect(
      shouldFetchWorktreesForRepoCountChange({
        startupWorktreeRefreshCompleted: true,
        previousRepoCount: 2,
        repoCount: 2,
      })
    ).toBe(false)
    expect(
      shouldFetchWorktreesForRepoCountChange({
        startupWorktreeRefreshCompleted: true,
        previousRepoCount: 1,
        repoCount: 2,
      })
    ).toBe(true)
  })

  it('does not scan an empty catalog', () => {
    expect(
      shouldFetchWorktreesForRepoCountChange({
        startupWorktreeRefreshCompleted: true,
        previousRepoCount: 0,
        repoCount: 0,
      })
    ).toBe(false)
  })
})
