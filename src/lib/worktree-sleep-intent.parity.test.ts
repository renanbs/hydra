// D04a-067: cards paint sleep/wake transitions, so the intent cache must publish
// state changes independently of the per-worktree wake listeners.
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clearWorktreeSleepIntent,
  forgetWorktreeSleepIntent,
  forgetWorktreeSleepIntents,
  hasWorktreeSleepIntent,
  markWorktreeSleepIntent,
  restoreWorktreeSleepIntent,
  setWorktreeSleepIntentSink,
  subscribeWorktreeSleepIntent
} from './worktree-sleep-intent'

describe('worktree sleep intent subscription', () => {
  afterEach(() => {
    setWorktreeSleepIntentSink(null)
    clearWorktreeSleepIntent('/w/a')
    forgetWorktreeSleepIntent('/w/b')
  })

  it('notifies every sleep/wake transition', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeWorktreeSleepIntent(listener)

    markWorktreeSleepIntent('/w/a')
    expect(listener).toHaveBeenCalledTimes(1)
    restoreWorktreeSleepIntent('/w/b')
    expect(listener).toHaveBeenCalledTimes(2)
    clearWorktreeSleepIntent('/w/a')
    expect(listener).toHaveBeenCalledTimes(3)
    forgetWorktreeSleepIntent('/w/b')
    expect(listener).toHaveBeenCalledTimes(4)

    unsubscribe()
    markWorktreeSleepIntent('/w/a')
    expect(listener).toHaveBeenCalledTimes(4)
  })
})

describe('worktree sleep intent batch forget (D03b-046)', () => {
  afterEach(() => {
    setWorktreeSleepIntentSink(null)
  })

  it('purges every removed workspace marker without waking panes or tearing down guards', async () => {
    const cleared: string[] = []
    setWorktreeSleepIntentSink({
      persist: async () => {},
      clear: async (worktreeId) => {
        cleared.push(worktreeId)
      }
    })
    markWorktreeSleepIntent('/w/a')
    markWorktreeSleepIntent('/w/b')
    markWorktreeSleepIntent('/w/c')
    cleared.length = 0

    forgetWorktreeSleepIntents(['/w/a', '/w/b', '/w/c'])

    // One sink clear per marker: the batch is the loop Orca's prune batch
    // coordinates, not a new backend call.
    expect(cleared.sort()).toEqual(['/w/a', '/w/b', '/w/c'])
    expect(hasWorktreeSleepIntent('/w/a')).toBe(false)
    expect(hasWorktreeSleepIntent('/w/c')).toBe(false)
  })

  it('skips workspaces without markers and reports what it purged', () => {
    markWorktreeSleepIntent('/w/a')

    expect(forgetWorktreeSleepIntents(['/w/a', '/w/ghost'])).toEqual(['/w/a'])
    expect(hasWorktreeSleepIntent('/w/a')).toBe(false)
  })
})
