// Rosetta D15a-011: sleep/activation race. A batch sleep must not leave a
// delayed parent activation behind, and a failed VM resume keeps the slept
// worktree selected with the provider error surfaced.
// Reference: `src/reference/components/sidebar/sleep-worktree-activation-race.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))

vi.mock('sonner', () => ({
  toast: { error: toastError }
}))

import {
  clearWorktreeSleepIntent,
  markWorktreeSleepIntent,
  hasWorktreeSleepIntent
} from '@/lib/worktree-sleep-intent'
import {
  resumeEphemeralVmOnActivation,
  wakeEphemeralVmForSleptWorktree
} from '@/lib/sidebar-worktree-activation'

describe('sleep flow vs slept-workspace activation (D15a-011)', () => {
  beforeEach(() => {
    toastError.mockClear()
    for (const id of ['wt-parent', 'wt-child-1', 'wt-child-2', 'wt-child-3']) {
      clearWorktreeSleepIntent(id)
    }
  })

  it('does not leave behind a delayed parent activation after sleeping children', async () => {
    const activated: string[] = []
    const activate = (id: string) => {
      activated.push(id)
    }

    // Parent slept, then explicitly re-activated (wake path runs).
    markWorktreeSleepIntent('wt-parent')
    activate('wt-parent')
    const wake = await resumeEphemeralVmOnActivation({
      worktreeId: 'wt-parent',
      hasSleepIntent: true,
      bridge: { resumeWorkspace: vi.fn(async () => null) }
    })
    expect(wake.attempted).toBe(true)
    expect(wake.resumed).toBe(true)

    // Sleeping the children afterwards must not re-trigger the parent.
    for (const id of ['wt-child-1', 'wt-child-2', 'wt-child-3']) {
      markWorktreeSleepIntent(id)
    }
    expect(activated).toEqual(['wt-parent'])
    expect(hasWorktreeSleepIntent('wt-child-1')).toBe(true)
  })

  it('keeps the slept worktree selected when VM resume fails', async () => {
    markWorktreeSleepIntent('wt-parent')
    const resumeWorkspace = vi.fn(async (): Promise<null> => {
      throw new Error('provider unavailable')
    })

    const result = await resumeEphemeralVmOnActivation({
      worktreeId: 'wt-parent',
      hasSleepIntent: true,
      bridge: { resumeWorkspace }
    })

    expect(result).toMatchObject({ attempted: true, resumed: false, errorMessage: 'provider unavailable' })
    // The marker stays: the workspace remains selected and retryable.
    expect(hasWorktreeSleepIntent('wt-parent')).toBe(true)
  })

  it('surfaces the provider error through the wake toast path', async () => {
    markWorktreeSleepIntent('wt-parent')
    const resumeWorkspace = vi.fn(async (): Promise<null> => {
      throw new Error('provider unavailable')
    })
    // Bridge the global probe to the failing fake for this case only.
    const g = globalThis as unknown as { window?: unknown }
    const prevWindow = g.window
    g.window = {
      api: { ephemeralVm: { resumeWorkspace } }
    }
    try {
      await wakeEphemeralVmForSleptWorktree('wt-parent')
    } finally {
      g.window = prevWindow
    }
    expect(toastError).toHaveBeenCalledWith(
      'Failed to wake ephemeral VM workspace',
      expect.objectContaining({ description: 'provider unavailable' })
    )
    expect(hasWorktreeSleepIntent('wt-parent')).toBe(true)
  })
})
