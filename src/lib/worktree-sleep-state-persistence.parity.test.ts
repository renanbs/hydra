// D07 durable sleep contract: the in-memory marker is only a cache; every
// transition must be mirrored to `workspace_sleep_state` and boot must restore
// the markers written by a previous renderer.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const invokeMock = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }))

import {
  hydrateWorktreeSleepStates,
  installWorktreeSleepStatePersistence,
  serializeWorktreeSleepIntentPayload,
} from './worktree-sleep-state-persistence'
import {
  clearWorktreeSleepIntent,
  hasWorktreeSleepIntent,
  markWorktreeSleepIntent,
  setWorktreeSleepIntentSink,
} from './worktree-sleep-intent'

describe('worktree sleep state persistence', () => {
  beforeEach(() => {
    invokeMock.mockReset()
    invokeMock.mockResolvedValue(undefined)
    installWorktreeSleepStatePersistence()
  })

  afterEach(() => {
    setWorktreeSleepIntentSink(null)
    clearWorktreeSleepIntent('/w/sleep')
    clearWorktreeSleepIntent('/w/hydrated')
  })

  it('mirrors a sleep marker to the backend with the kept layout payload', async () => {
    const payload = serializeWorktreeSleepIntentPayload({
      version: 1,
      reason: 'manual-sleep',
      tabIds: ['tab-1'],
      activeTabId: 'tab-1',
    })
    markWorktreeSleepIntent('/w/sleep', payload)
    await Promise.resolve()

    expect(invokeMock).toHaveBeenCalledWith('set_workspace_sleep_state', {
      worktreePath: '/w/sleep',
      payload,
    })
    expect(hasWorktreeSleepIntent('/w/sleep')).toBe(true)
  })

  it('defaults the payload when the flow has no layout to keep', async () => {
    markWorktreeSleepIntent('/w/sleep')
    await Promise.resolve()

    expect(invokeMock).toHaveBeenCalledWith('set_workspace_sleep_state', {
      worktreePath: '/w/sleep',
      payload: expect.stringContaining('"reason":"manual-sleep"'),
    })
  })

  it('clears the persisted row on the wake path', async () => {
    markWorktreeSleepIntent('/w/sleep')
    await Promise.resolve()
    invokeMock.mockClear()

    clearWorktreeSleepIntent('/w/sleep')
    await Promise.resolve()

    expect(invokeMock).toHaveBeenCalledWith('clear_workspace_sleep_state', {
      worktreePath: '/w/sleep',
    })
    expect(hasWorktreeSleepIntent('/w/sleep')).toBe(false)
  })

  it('restores persisted markers at boot without writing them back', async () => {
    invokeMock.mockResolvedValueOnce([
      { worktree_path: '/w/hydrated', suspended_at: 1, payload: '{"reason":"manual-sleep"}' },
    ])

    const states = await hydrateWorktreeSleepStates()

    expect(invokeMock).toHaveBeenCalledWith('get_workspace_sleep_states')
    expect(states).toHaveLength(1)
    expect(hasWorktreeSleepIntent('/w/hydrated')).toBe(true)
    const writes = invokeMock.mock.calls.filter(
      ([command]) => command === 'set_workspace_sleep_state'
    )
    expect(writes).toEqual([])
  })

  it('leaves the cache untouched when the restore read fails', async () => {
    invokeMock.mockRejectedValueOnce(new Error('db unavailable'))

    await expect(hydrateWorktreeSleepStates()).rejects.toThrow('db unavailable')
    expect(hasWorktreeSleepIntent('/w/hydrated')).toBe(false)
  })
})
