// D02a-003: pickable hosts, connectable SSH hosts, and ephemeral-VM filtering.
import { describe, expect, it } from 'vitest'
import {
  canConnectAddRepoHost,
  canSelectAddRepoHost,
  filterAddRepoHostOptions,
  getAddRepoHostCompatibilityHint
} from './add-repo-host-availability'

describe('Add Project host availability (D02a-003)', () => {
  it('selects local and available hosts only', () => {
    expect(canSelectAddRepoHost({ kind: 'local', health: 'local' })).toBe(true)
    expect(canSelectAddRepoHost({ kind: 'ssh', health: 'available' })).toBe(true)
    expect(canSelectAddRepoHost({ kind: 'ssh', health: 'disconnected' })).toBe(false)
    expect(canSelectAddRepoHost({ kind: 'runtime', health: 'blocked' })).toBe(false)
  })

  it('offers connect only for SSH hosts that are not connected', () => {
    expect(canConnectAddRepoHost({ kind: 'ssh', health: 'disconnected' })).toBe(true)
    expect(canConnectAddRepoHost({ kind: 'ssh', health: 'error' })).toBe(true)
    expect(canConnectAddRepoHost({ kind: 'ssh', health: 'available' })).toBe(false)
    expect(canConnectAddRepoHost({ kind: 'runtime', health: 'disconnected' })).toBe(false)
  })

  it('explains which side must update when a runtime protocol is incompatible', () => {
    expect(
      getAddRepoHostCompatibilityHint({
        kind: 'runtime',
        compatibility: {
          kind: 'blocked',
          reason: 'client-too-old',
          clientProtocolVersion: 1,
          serverProtocolVersion: 3
        }
      })
    ).toBe('Update Hydra: this host speaks protocol 3.')
    expect(
      getAddRepoHostCompatibilityHint({
        kind: 'runtime',
        compatibility: {
          kind: 'blocked',
          reason: 'server-too-old',
          clientProtocolVersion: 3,
          serverProtocolVersion: 1,
          requiredServerProtocolVersion: 3
        }
      })
    ).toBe('Update the host: it must speak protocol 3.')
    expect(getAddRepoHostCompatibilityHint({ kind: 'local' })).toBeNull()
  })

  it('filters ephemeral VM runtimes but keeps manual ones and every other host', () => {
    const hosts = [
      { id: 'local' },
      { id: 'ssh:host-1' },
      { id: 'runtime:machine' },
      { id: 'runtime:fork%20vm' }
    ]
    const filtered = filterAddRepoHostOptions(hosts, new Set(['fork vm']))
    expect(filtered.map((host) => host.id)).toEqual(['local', 'ssh:host-1', 'runtime:machine'])
  })
})
