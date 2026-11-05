// Rosetta: card action handlers on the controller (D04b-010/D04b-016).
// handleToggleUnreadQuick flips isUnread via the store; handleUnlinkReview
// clears the linked review (+ GitHub tombstone); browser handlers open URLs
// externally. The legacy bell stays unmounted (D04a-023 n/a) — the handler is
// what this locks.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, renderHook } from '@testing-library/react'
import { useWorktreeCardController } from './use-worktree-card-controller'
import { useAppStore } from '../../store'
import * as contracts from '../../lib/sidebar-desktop-contracts'

const BASE_PROPS = {
  worktree: { id: 'wt-1', path: '/repo/wt-1', branch: 'feature', head_commit: 'abc1234' },
  repo: { id: 'repo-1', path: '/repo', displayName: 'repo', connectionId: null, executionHostId: null }
} as never

beforeEach(() => {
  useAppStore.setState({
    updateWorktreeMeta: vi.fn(async () => ({ ok: true as const })),
    fetchHostedReviewForBranch: undefined,
    fetchIssue: undefined,
    prefetchLinearIssues: undefined
  } as never)
})

describe('useWorktreeCardController actions (D04b-010/D04b-016)', () => {
  it('toggles unread via the store with the worktree host', async () => {
    const updateWorktreeMeta = vi.fn(async () => ({ ok: true as const }))
    useAppStore.setState({ updateWorktreeMeta } as never)
    const { result } = renderHook(() =>
      useWorktreeCardController({ ...BASE_PROPS, isUnread: true })
    )
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as never
    await act(async () => {
      result.current.handleToggleUnreadQuick(event)
    })
    expect(updateWorktreeMeta).toHaveBeenCalledWith(
      'wt-1',
      { isUnread: false },
      expect.objectContaining({ executionHostId: 'local' })
    )
  })

  it('unlinks a GitHub review with the tombstone', async () => {
    const updateWorktreeMeta = vi.fn(async () => ({ ok: true as const }))
    useAppStore.setState({ updateWorktreeMeta } as never)
    const { result } = renderHook(() =>
      useWorktreeCardController({
        ...BASE_PROPS,
        prDisplay: { provider: 'github', number: 7, title: 'Fix', state: 'open' } as never
      })
    )
    await act(async () => {
      await result.current.handleUnlinkReview()
    })
    expect(updateWorktreeMeta).toHaveBeenCalledWith(
      'wt-1',
      { linkedPR: null, suppressedGitHubPR: 7 },
      expect.anything()
    )
  })

  it('unlinks a GitLab MR without a tombstone', async () => {
    const updateWorktreeMeta = vi.fn(async () => ({ ok: true as const }))
    useAppStore.setState({ updateWorktreeMeta } as never)
    const { result } = renderHook(() =>
      useWorktreeCardController({
        ...BASE_PROPS,
        prDisplay: { provider: 'gitlab', number: 3, title: 'MR', state: 'open' } as never
      })
    )
    await act(async () => {
      await result.current.handleUnlinkReview()
    })
    expect(updateWorktreeMeta).toHaveBeenCalledWith(
      'wt-1',
      { linkedGitLabMR: null },
      expect.anything()
    )
  })

  it('opens issue/review URLs through the external opener', async () => {
    const openExternalUrl = vi.spyOn(contracts, 'openExternalUrl').mockResolvedValue(undefined)
    try {
      const { result } = renderHook(() => useWorktreeCardController({ ...BASE_PROPS }))
      await act(async () => {
        result.current.handleOpenIssueInBrowser('https://github.com/o/r/issues/1')
      })
      expect(openExternalUrl).toHaveBeenCalledWith('https://github.com/o/r/issues/1')
    } finally {
      openExternalUrl.mockRestore()
    }
  })
})
