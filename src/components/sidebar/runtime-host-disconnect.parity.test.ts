import { describe, expect, it } from 'vitest'
import { isRuntimeExecutionHostDisconnected } from './runtime-host-disconnect'
import type { RuntimeEnvironmentStatus } from '../../shared/runtime-host-status'

function entry(status: 'connected' | 'disconnected'): RuntimeEnvironmentStatus {
  // The projection reads the remote-control channel state, not the raw label.
  return {
    status: { remoteControl: { state: status === 'connected' ? 'ready' : 'closed' } } as never,
    checkedAt: 0
  }
}

describe('isRuntimeExecutionHostDisconnected (D04a-002)', () => {
  it('is false for local and ssh hosts', () => {
    expect(isRuntimeExecutionHostDisconnected(new Map(), 'local')).toBe(false)
    expect(isRuntimeExecutionHostDisconnected(new Map(), 'ssh:box')).toBe(false)
  })

  it('is true only when the runtime probe reported disconnected', () => {
    const statuses = new Map<string, RuntimeEnvironmentStatus>([
      ['env-a', entry('disconnected')],
      ['env-b', entry('connected')],
    ])
    expect(isRuntimeExecutionHostDisconnected(statuses, 'runtime:env-a')).toBe(true)
    expect(isRuntimeExecutionHostDisconnected(statuses, 'runtime:env-b')).toBe(false)
  })

  it('treats a missing entry as not probed, not as disconnected', () => {
    expect(isRuntimeExecutionHostDisconnected(new Map(), 'runtime:env-a')).toBe(false)
  })
})
