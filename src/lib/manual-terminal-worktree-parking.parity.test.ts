// D04a-066: the Developer menu publishes a park request; the consumer can be
// mounted later, so the pending set must survive the event gap.
import { describe, expect, it, vi } from 'vitest'

import {
  MANUAL_TERMINAL_WORKTREE_PARK_EVENT,
  requestManualTerminalWorktreePark,
  takeAllPendingManualTerminalWorktreeParks,
  takePendingManualTerminalWorktreePark
} from './manual-terminal-worktree-parking'

describe('manual terminal worktree parking', () => {
  it('dispatches the request and keeps it pending until consumed', () => {
    const listener = vi.fn()
    window.addEventListener(MANUAL_TERMINAL_WORKTREE_PARK_EVENT, listener)
    try {
      requestManualTerminalWorktreePark('/w/a')
      expect(listener).toHaveBeenCalledTimes(1)
      expect(takePendingManualTerminalWorktreePark('/w/a')).toBe(true)
      expect(takePendingManualTerminalWorktreePark('/w/a')).toBe(false)
    } finally {
      window.removeEventListener(MANUAL_TERMINAL_WORKTREE_PARK_EVENT, listener)
    }
  })

  it('drains every pending request for late consumers', () => {
    requestManualTerminalWorktreePark('/w/a')
    requestManualTerminalWorktreePark('/w/b')
    expect(takeAllPendingManualTerminalWorktreeParks()).toEqual(['/w/a', '/w/b'])
    expect(takeAllPendingManualTerminalWorktreeParks()).toEqual([])
  })
})
