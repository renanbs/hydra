// Parity guard for D15a-006: the workspace options menu and any host scope
// surface must read one reactive derivation (`useSidebarHostScopeOptions`), so a
// label override or runtime environment reaches both without duplicated wiring.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useAppStore } from '@/store'
import type { GlobalSettings } from '../../shared/global-settings-types'
import { useSidebarHostScopeOptions } from './use-sidebar-host-scope-options'

const initialState = useAppStore.getInitialState()

function seedStore(label?: string): void {
  useAppStore.setState({
    repos: [
      { id: 'repo_local', path: '/repo/local', connectionId: null, executionHostId: 'local' },
      { id: 'repo_ssh', path: '/repo/ssh', connectionId: 'srv', executionHostId: 'ssh:srv' }
    ],
    sshTargetLabels: new Map([['srv', 'Build server']]),
    sshConnectionStates: new Map(),
    runtimeEnvironments: [],
    runtimeStatusByEnvironmentId: new Map(),
    settings: (label
      ? { hostSettingOverrides: { 'ssh:srv': { displayLabel: label } } }
      : null) as unknown as GlobalSettings | null,
    visibleWorkspaceHostIds: null,
    workspaceHostScope: 'all'
  } as unknown as Parameters<typeof useAppStore.setState>[0])
}

describe('useSidebarHostScopeOptions (Orca parity)', () => {
  beforeEach(() => seedStore())
  afterEach(() => {
    cleanup()
    useAppStore.setState(initialState, true)
  })

  it('derives host options and the "All hosts" scope option from the store', () => {
    const { result } = renderHook(() => useSidebarHostScopeOptions())

    expect(result.current.hostOptions.map((host) => host.id)).toEqual(['local', 'ssh:srv'])
    expect(result.current.hostScopeOptions[0]).toMatchObject({
      id: 'all',
      health: 'mixed'
    })
    expect(result.current.hostScopeOptions.map((scope) => scope.id)).toContain('ssh:srv')
  })

  it('reacts to a per-host display label override', () => {
    seedStore('Build server renamed')
    const { result } = renderHook(() => useSidebarHostScopeOptions())

    expect(
      result.current.hostScopeOptions.find((scope) => scope.id === 'ssh:srv')?.label
    ).toBe('Build server renamed')
  })
})
