// Rosetta: card lifecycle data (D04b-013) — initial fetch + visibility-gated
// polls + hover refetch, without real timers (visibility interval mocked).
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { useWorktreeCardLifecycleEffects } from './use-worktree-card-lifecycle-effects'
import { useAppStore } from '../../store'

vi.mock('../../lib/window-visibility-interval', () => ({
  isWindowVisible: () => true,
  installWindowVisibilityInterval: (args: { run: () => void }) => {
    args.run()
    return () => {}
  }
}))

function Probe(props: Parameters<typeof useWorktreeCardLifecycleEffects>[0]) {
  useWorktreeCardLifecycleEffects(props)
  return null
}

beforeEach(() => {
  useAppStore.setState({
    fetchHostedReviewForBranch: vi.fn(),
    fetchIssue: vi.fn(),
    prefetchLinearIssues: vi.fn()
  } as never)
})

describe('useWorktreeCardLifecycleEffects (D04b-013)', () => {
  it('fetches hosted review on mount when the card wants it', () => {
    const fetchHostedReviewForBranch = vi.fn()
    useAppStore.setState({ fetchHostedReviewForBranch } as never)
    render(
      <Probe
        worktreeId="wt-1"
        repoPath="/repo"
        branch="feature"
        shouldRefreshHostedReview
      />
    )
    expect(fetchHostedReviewForBranch).toHaveBeenCalledWith(
      expect.objectContaining({ repoPath: '/repo', branch: 'feature' })
    )
  })

  it('skips the hosted review fetch when the card does not want it', () => {
    const fetchHostedReviewForBranch = vi.fn()
    useAppStore.setState({ fetchHostedReviewForBranch } as never)
    render(
      <Probe
        worktreeId="wt-1"
        repoPath="/repo"
        branch="feature"
        shouldRefreshHostedReview={false}
      />
    )
    expect(fetchHostedReviewForBranch).not.toHaveBeenCalled()
  })

  it('fetches the linked GitHub issue and Linear issue on mount', () => {
    const fetchIssue = vi.fn()
    const prefetchLinearIssues = vi.fn()
    useAppStore.setState({ fetchIssue, prefetchLinearIssues } as never)
    render(
      <Probe
        worktreeId="wt-1"
        repoPath="/repo"
        linkedIssue={42}
        linkedLinearIssue="ENG-1"
        shouldRefreshHostedReview={false}
      />
    )
    expect(fetchIssue).toHaveBeenCalledWith('/repo', 42)
    expect(prefetchLinearIssues).toHaveBeenCalledWith(['ENG-1'])
  })
})
