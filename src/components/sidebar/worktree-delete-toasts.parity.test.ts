import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { forceDeletePreservedBranchBatch } from './worktree-delete-toasts'

const deleteBranch = vi.hoisted(() => vi.fn())

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn()
  }
}))

type QueueState = {
  forceDeletePreservedBranch: typeof deleteBranch
}

beforeEach(() => {
  deleteBranch.mockReset()
  deleteBranch.mockResolvedValue({ ok: true, deleted: true })
  useAppStore.setState({ forceDeletePreservedBranch: deleteBranch } as unknown as Partial<QueueState>)
})

describe('forceDeletePreservedBranchBatch (D02c-013)', () => {
  it('deletes per repo with bounded concurrency and reports success', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const firstWave = Promise.withResolvers<void>()
    deleteBranch.mockImplementation(async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      if (inFlight === 4) firstWave.resolve()
      await firstWave.promise
      inFlight -= 1
      return { ok: true, deleted: true }
    })
    const branches = Array.from({ length: 8 }, (_, index) => ({
      worktreeId: `repo-${index % 4}::/wt/${index}`,
      branchName: `branch-${index}`,
      expectedHead: `head-${index}`
    }))

    await forceDeletePreservedBranchBatch(branches)

    expect(deleteBranch).toHaveBeenCalledTimes(8)
    expect(maxInFlight).toBeLessThanOrEqual(4)
    expect(toast.success).toHaveBeenCalledWith('Local branches deleted: 8', expect.anything())
  })

  it('keeps failures visible with a retry action', async () => {
    deleteBranch
      .mockResolvedValueOnce({ ok: true, deleted: true })
      .mockResolvedValueOnce({ ok: false, error: 'branch moved' })

    await forceDeletePreservedBranchBatch([
      { worktreeId: 'repo-1::/wt/a', branchName: 'kept', expectedHead: 'head-a' },
      { worktreeId: 'repo-1::/wt/b', branchName: 'moved', expectedHead: 'head-b' }
    ])

    const errorCall = vi.mocked(toast.error).mock.calls.at(-1)
    expect(errorCall?.[0]).toBe('1 deleted, 1 not deleted')
    expect(errorCall?.[1]).toMatchObject({ duration: Infinity, dismissible: true })
  })
})
