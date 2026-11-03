// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-sidebar-host-scope-options.ts
import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { getHostDisplayLabelOverrides } from '../../shared/host-setting-overrides'
import {
  buildSidebarHostOptions,
  buildSidebarHostScopeOptions,
  type SidebarHostOption,
  type SidebarHostScopeOption
} from './sidebar-host-options'
import { toHostSourceMap } from './rendered-sidebar-worktree-order'

/**
 * Shared host-scope derivation for every sidebar surface that lists execution
 * hosts (workspace options menu + host scope strip). Centralised so both read the
 * same live runtime status/label overrides instead of growing parallel store
 * wiring that drifts when a new host field appears.
 */
export function useSidebarHostScopeOptions(): {
  hostOptions: SidebarHostOption[]
  hostScopeOptions: SidebarHostScopeOption[]
} {
  const repos = useAppStore((s) => s.repos)
  const sshTargetLabels = useAppStore((s) => s.sshTargetLabels)
  const sshConnectionStates = useAppStore((s) => s.sshConnectionStates)
  const settings = useAppStore((s) => s.settings)
  const runtimeEnvironments = useAppStore((s) => s.runtimeEnvironments)
  const runtimeStatusByEnvironmentId = useAppStore((s) => s.runtimeStatusByEnvironmentId)

  // Why the structural cast: the live store snapshot is Hydra's narrower settings
  // type, while display-label overrides are an optional Orca-era field. Reading it
  // structurally lets existing profiles with the field win without widening the store.
  const hostLabelOverrides = useMemo(
    () =>
      getHostDisplayLabelOverrides(
        settings as unknown as Parameters<typeof getHostDisplayLabelOverrides>[0]
      ),
    [settings]
  )
  const hostOptions = useMemo(
    () =>
      buildSidebarHostOptions({
        repos,
        sshTargetLabels: toHostSourceMap<string>(sshTargetLabels) ?? new Map<string, string>(),
        sshConnectionStates: toHostSourceMap(sshConnectionStates),
        settings,
        runtimeEnvironments: Array.isArray(runtimeEnvironments) ? runtimeEnvironments : undefined,
        runtimeStatusByEnvironmentId: toHostSourceMap(runtimeStatusByEnvironmentId),
        hostLabelOverrides
      }),
    [
      hostLabelOverrides,
      repos,
      runtimeEnvironments,
      runtimeStatusByEnvironmentId,
      settings,
      sshConnectionStates,
      sshTargetLabels
    ]
  )
  const hostScopeOptions = useMemo(() => buildSidebarHostScopeOptions(hostOptions), [hostOptions])

  return { hostOptions, hostScopeOptions }
}
