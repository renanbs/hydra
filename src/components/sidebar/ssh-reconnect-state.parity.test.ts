import { describe, expect, it } from 'vitest'
import type { SshConnectionState, SshReconnectResult } from '../../shared/ssh-types'
import {
  buildSshConnectingState,
  buildSshReconnectConnectionState,
  sshReconnectFailureMessage
} from './ssh-reconnect-state'

const previous: SshConnectionState = {
  targetId: 'ssh-1',
  status: 'disconnected',
  error: 'old',
  reconnectAttempt: 2,
  connectionGeneration: 7
}

function result(overrides: Partial<SshReconnectResult>): SshReconnectResult {
  return {
    connectionId: 'ssh-1',
    status: 'connected',
    latencyMs: 12,
    error: null,
    ...overrides
  }
}

describe('ssh reconnect state mapping', () => {
  it('marks the target connecting and increments the attempt counter', () => {
    expect(buildSshConnectingState('ssh-1', previous)).toEqual({
      ...previous,
      status: 'connecting',
      error: null,
      reconnectAttempt: 3
    })
    expect(buildSshConnectingState('ssh-1', undefined)).toEqual({
      targetId: 'ssh-1',
      status: 'connecting',
      error: null,
      reconnectAttempt: 1
    })
  })

  it('publishes connected without an error', () => {
    const next = buildSshReconnectConnectionState(result({}), previous)
    expect(next.status).toBe('connected')
    expect(next.error).toBeNull()
    expect(next.connectionGeneration).toBe(7)
  })

  it('classifies auth and transport failures into renderer states', () => {
    const auth = buildSshReconnectConnectionState(
      result({ status: 'auth-failed', error: 'Permission denied (publickey)' }),
      previous
    )
    expect(auth.status).toBe('auth-failed')
    expect(auth.error).toBe('Permission denied (publickey)')

    const unreachable = buildSshReconnectConnectionState(
      result({ status: 'unreachable', error: 'Connection timed out' }),
      previous
    )
    expect(unreachable.status).toBe('reconnection-failed')
    expect(unreachable.error).toBe('Connection timed out')

    const hostKey = buildSshReconnectConnectionState(
      result({ status: 'host-key-verification', error: null }),
      previous
    )
    expect(hostKey.status).toBe('reconnection-failed')
    expect(hostKey.error).toBe('SSH host key verification failed')
  })

  it('falls back to a stable message per status when stderr is empty', () => {
    expect(sshReconnectFailureMessage(result({ status: 'unreachable', error: '  ' }))).toBe(
      'SSH host is unreachable'
    )
    expect(sshReconnectFailureMessage(result({ status: 'error', error: '' }))).toBe(
      'SSH reconnect failed'
    )
  })
})
