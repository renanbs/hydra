import { describe, expect, it, vi } from 'vitest'
import { unnestWorktrees } from './worktree-unnest'

describe('unnestWorktrees (D06-030)', () => {
  it('does nothing for an empty selection', async () => {
    const clearParent = vi.fn(() => Promise.resolve())

    await unnestWorktrees([], clearParent)

    expect(clearParent).not.toHaveBeenCalled()
  })

  it('clears every child in parallel', async () => {
    const cleared: string[] = []
    const pending: (() => void)[] = []
    const clearParent = vi.fn((childPath: string) => {
      const gate = Promise.withResolvers<void>()
      cleared.push(childPath)
      pending.push(() => gate.resolve())
      return gate.promise
    })

    const done = unnestWorktrees(['/repo/a', '/repo/b'], clearParent)
    // Both writes are in flight before either resolves — the batch is parallel, not serial.
    expect(cleared).toEqual(['/repo/a', '/repo/b'])
    for (const resolve of pending) resolve()
    await done
  })

  it('reports a single translated failure toast when the batch rejects', async () => {
    const showError = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const clearParent = vi.fn(() => Promise.reject(new Error('lineage store offline')))

    await unnestWorktrees(['/repo/a', '/repo/b'], clearParent, { showError })

    expect(clearParent).toHaveBeenCalledTimes(2)
    expect(showError).toHaveBeenCalledTimes(1)
    expect(showError).toHaveBeenCalledWith('Failed to unnest workspace')
    consoleError.mockRestore()
  })
})
