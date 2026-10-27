// PR 11: the live store must actually hydrate from the backend SSH host registry.
// Guards the boot bridge (targets + removed labels land in the store, the hydration
// flag flips even for an empty list, a backend failure leaves the store non-lying)
// and the payoff — the sidebar "Hosts" gate opens once a non-local target exists.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hydrateSshTargets } from './ssh-bridge'
import { useAppStore } from './index'
import {
  buildSidebarHostOptions,
  shouldShowHostScopeControls
} from '../components/sidebar/sidebar-host-options'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

const LIST_TARGETS = 'ssh_list_targets'
const LIST_REMOVED = 'ssh_list_removed_target_labels'

const TARGET = {
  id: 'srv',
  label: 'Build server',
  generation: 3,
  host: 'srv.example.com',
  port: 22,
  username: 'dev'
}

function stubRegistry(
  targets: unknown[],
  removedLabels: Record<string, string>
): void {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === LIST_TARGETS) {
      return Promise.resolve(targets)
    }
    if (cmd === LIST_REMOVED) {
      return Promise.resolve(removedLabels)
    }
    return Promise.reject(new Error(`unexpected command: ${cmd}`))
  })
}

function resetSshState(): void {
  useAppStore.setState({
    sshConnectionStates: new Map(),
    sshTargetLabels: new Map(),
    sshTargetGenerations: new Map(),
    removedSshTargetLabels: new Map(),
    sshTargetsHydrated: false
  })
}

describe('hydrateSshTargets', () => {
  beforeEach(() => {
    resetSshState()
    invokeMock.mockReset()
  })

  it('populates labels, generations, removed tombstones and flips the hydration flag', async () => {
    stubRegistry([TARGET], { ghost: 'Ghost host' })

    await hydrateSshTargets()

    const state = useAppStore.getState()
    expect(state.sshTargetLabels.get('srv')).toBe('Build server')
    expect(state.sshTargetGenerations.get('srv')).toBe(3)
    expect(state.sshTargetsHydrated).toBe(true)
    expect(state.removedSshTargetLabels.get('ghost')).toBe('Ghost host')
  })

  it('still marks hydrated (and calls the removed-labels setter) for empty lists', async () => {
    stubRegistry([], {})

    await hydrateSshTargets()

    const state = useAppStore.getState()
    expect(state.sshTargetsHydrated).toBe(true)
    expect(state.sshTargetLabels.size).toBe(0)
    expect(state.sshTargetGenerations.size).toBe(0)
    expect(state.removedSshTargetLabels.size).toBe(0)
  })

  it('leaves the store non-lying when the backend fails', async () => {
    invokeMock.mockRejectedValue(new Error('db down'))

    await expect(hydrateSshTargets()).rejects.toThrow('db down')

    expect(useAppStore.getState().sshTargetsHydrated).toBe(false)
  })
})

describe('the sidebar Hosts gate after hydration', () => {
  beforeEach(() => {
    resetSshState()
    invokeMock.mockReset()
  })

  it('opens with a non-local (ssh) target hydrated into the store', async () => {
    stubRegistry([TARGET], {})
    await hydrateSshTargets()

    const state = useAppStore.getState()
    const hosts = buildSidebarHostOptions({
      repos: [{ connectionId: 'srv', executionHostId: 'ssh:srv' }],
      sshTargetLabels: state.sshTargetLabels,
      sshConnectionStates: state.sshConnectionStates,
      settings: null
    })

    expect(shouldShowHostScopeControls(hosts)).toBe(true)
  })

  it('stays closed when only the local host exists', () => {
    const state = useAppStore.getState()
    const hosts = buildSidebarHostOptions({
      repos: [{ connectionId: null, executionHostId: 'local' }],
      sshTargetLabels: state.sshTargetLabels,
      sshConnectionStates: state.sshConnectionStates,
      settings: null
    })

    expect(shouldShowHostScopeControls(hosts)).toBe(false)
  })
})
