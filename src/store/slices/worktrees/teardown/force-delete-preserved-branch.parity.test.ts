// D02c-012/013/014: the preserved-branch cleanup must address the owning
// repository, keep the head it showed the user, and refuse remote hosts this
// command cannot reach — a fake success here would tell the toast a kept branch
// is gone.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { createForceDeletePreservedBranch } from './force-delete-preserved-branch'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const get = (() => ({
  repos: [{ id: 'repo_1', path: '/repo' }],
})) as never
const action = createForceDeletePreservedBranch((() => undefined) as never, get)

describe('forceDeletePreservedBranch', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset()
  })

  it('sends the owning repository path, branch and expected head', async () => {
    vi.mocked(invoke).mockResolvedValue({ deleted: true, branchName: 'feature/x', head: 'abc' })

    const result = await action('repo_1::/repo/wt', 'feature/x', 'abc', { suppressToast: true })

    expect(invoke).toHaveBeenCalledWith('force_delete_preserved_branch', {
      repoPath: '/repo',
      branchName: 'feature/x',
      expectedHead: 'abc',
    })
    expect(result).toEqual({ ok: true, deleted: true, branchName: 'feature/x', head: 'abc' })
  })

  it('falls back to the worktree path when the repo row is not hydrated', async () => {
    vi.mocked(invoke).mockResolvedValue({ deleted: true, branchName: 'feature/x', head: 'abc' })
    const unhydrated = createForceDeletePreservedBranch(
      (() => undefined) as never,
      (() => ({ repos: [] })) as never
    )

    await unhydrated('repo_9::/other/wt', 'feature/x', 'abc', { suppressToast: true })

    expect(invoke).toHaveBeenCalledWith('force_delete_preserved_branch', {
      repoPath: '/other/wt',
      branchName: 'feature/x',
      expectedHead: 'abc',
    })
  })

  it('refuses to run a remote cleanup on this machine', async () => {
    const result = await action('repo_1::/repo/wt', 'feature/x', 'abc', {
      suppressToast: true,
      hostId: 'ssh:target-1',
    })

    expect(result.ok).toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('reports a host refusal instead of claiming the branch is gone', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Branch feature/x is checked out in worktree /repo/wt'))

    const result = await action('repo_1::/repo/wt', 'feature/x', 'abc', { suppressToast: true })

    expect(result).toEqual({
      ok: false,
      error: 'Branch feature/x is checked out in worktree /repo/wt',
    })
  })
})
