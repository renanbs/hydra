// D04a-067: cards paint sleep/wake transitions, so the intent cache must publish
// state changes independently of the per-worktree wake listeners.
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clearWorktreeSleepIntent,
  forgetWorktreeSleepIntent,
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
