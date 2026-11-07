// Rail (a): the local dial resolves the command's classified status through
// the connection-state shape the card mirrors into the renderer store.
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (command: string) => {
    if (command === 'ssh_connect_target') {
      return { connectionId: 'nas', status: 'connected', latencyMs: 12, error: null }
    }
    throw new Error(`unexpected ${command}`)
  })
}))

import { connectSshTarget, toSshConnectionState } from './ssh-dial-client'

describe('ssh-dial-client', () => {
  it('dials the persistent master and narrows the status', async () => {
    const result = await connectSshTarget('nas')
    expect(result.status).toBe('connected')
    const state = toSshConnectionState(result, undefined)
    expect(state).toMatchObject({ targetId: 'nas', status: 'connected', reconnectAttempt: 0 })
  })

  it('passes the reconnect attempt through', () => {
    const state = toSshConnectionState(
      { connectionId: 'nas', status: 'auth-failed', latencyMs: 3, error: 'Permission denied' },
      { targetId: 'nas', status: 'connecting', error: null, reconnectAttempt: 2 }
    )
    expect(state).toMatchObject({ status: 'auth-failed', error: 'Permission denied', reconnectAttempt: 2 })
  })

  it('returns null for a null result', () => {
    expect(toSshConnectionState(null, undefined)).toBeNull()
  })
})
