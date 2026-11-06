// Rosetta D04a-013: runtime-owned SSH targets dial through the paired-server
// bridge (`ssh.connect` RPC), write bucket state, and resync after failure.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcCalls: Array<{ environmentId: string; method: string; params: unknown }> = []
vi.mock('../store/runtime-environment-bridge', () => ({
  callPairedServerRpc: vi.fn(async (environmentId: string, method: string, params: unknown) => {
    rpcCalls.push({ environmentId, method, params })
    if (method === 'ssh.connect') {
      return { state: { targetId: 't1', status: 'connected', error: null, reconnectAttempt: 0 } }
    }
    return {}
  })
}))

vi.mock('../store', () => {
  const states = new Map<string, Map<string, unknown>>()
  return {
    useAppStore: {
      getState: () => ({
        setEnvironmentSshConnectionState: (
          environmentId: string,
          targetId: string,
          state: unknown
        ) => {
          let bucket = states.get(environmentId)
          if (!bucket) {
            bucket = new Map()
            states.set(environmentId, bucket)
          }
          bucket.set(targetId, state)
        },
        __states: states
      })
    }
  }
})

import { connectRuntimeEnvironmentSshTarget, resyncRuntimeEnvironmentSshTargets } from './runtime-environment-ssh-target'
import { useAppStore } from '../store'

describe('runtime-environment-ssh-target (D04a-013)', () => {
  beforeEach(() => {
    rpcCalls.length = 0
  })

  it('dials ssh.connect on the environment and mirrors state into the bucket', async () => {
    const state = await connectRuntimeEnvironmentSshTarget('env1', 't1')
    expect(state?.status).toBe('connected')
    expect(rpcCalls).toEqual([{ environmentId: 'env1', method: 'ssh.connect', params: { targetId: 't1' } }])
    const bucket = (useAppStore.getState() as unknown as { __states: Map<string, Map<string, unknown>> }).__states.get('env1')
    expect(bucket?.get('t1')).toEqual(state)
  })

  it('rejects a state for the wrong target', async () => {
    const { callPairedServerRpc } = await import('../store/runtime-environment-bridge')
    vi.mocked(callPairedServerRpc).mockResolvedValueOnce({
      state: { targetId: 'other', status: 'connected', error: null, reconnectAttempt: 0 }
    })
    const state = await connectRuntimeEnvironmentSshTarget('env1', 't1')
    expect(state).toBeNull()
  })

  it('resyncs target metadata after a failed connect', async () => {
    await resyncRuntimeEnvironmentSshTargets('env1')
    expect(rpcCalls.some((call) => call.method === 'ssh.listTargetSummaries')).toBe(true)
  })
})
