// D04a-067: the card badge/opacity must follow the sleep marker without a store
// write or a remount.
import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import {
  clearWorktreeSleepIntent,
  markWorktreeSleepIntent,
  setWorktreeSleepIntentSink
} from '../../lib/worktree-sleep-intent'
import { useWorktreeSleeping } from './use-worktree-sleeping'

describe('useWorktreeSleeping (Orca parity)', () => {
  afterEach(() => {
    setWorktreeSleepIntentSink(null)
    clearWorktreeSleepIntent('/w/a')
  })

  it('repaints on sleep and wake', () => {
    markWorktreeSleepIntent('/w/a')
    const { result } = renderHook(() => useWorktreeSleeping('/w/a'))
    expect(result.current).toBe(true)

    act(() => {
      clearWorktreeSleepIntent('/w/a')
    })
    expect(result.current).toBe(false)

    act(() => {
      markWorktreeSleepIntent('/w/a')
    })
    expect(result.current).toBe(true)
  })
})
