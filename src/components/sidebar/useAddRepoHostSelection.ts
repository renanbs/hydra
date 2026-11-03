// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-add-repo-host-selection.ts
//
// D02a-003: Add Project can target any execution host that can own a project row.
// The option list is the sidebar's existing host registry (local + configured SSH
// targets + runtime environments), so health, compatibility and labels never
// diverge from the sidebar. Ephemeral VM runtimes are filtered out here.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useAppStore } from '../../store'
import { hydrateSshTargets } from '../../store/ssh-bridge'
import {
  LOCAL_EXECUTION_HOST_ID,
  parseExecutionHostId,
  type ParsedExecutionHost
} from '../../shared/execution-host'
import type { SshReconnectResult, SshTarget } from '../../shared/ssh-types'
import type { PublicKnownRuntimeEnvironment } from '../../shared/runtime-environments'
import type { RuntimeEnvironmentStatus } from '../../shared/runtime-host-status'
import { isEphemeralVmRuntimeEnvironment } from '../../shared/runtime-environments'
import {
  buildSidebarHostOptions,
  type SidebarHostOption
} from './sidebar-host-options'
import {
  canConnectAddRepoHost,
  canSelectAddRepoHost,
  filterAddRepoHostOptions
} from './add-repo-host-availability'
import {
  buildSshConnectingState,
  buildSshReconnectConnectionState,
  sshReconnectFailureMessage
} from './ssh-reconnect-state'

export type AddRepoHostSelection = {
  hostOptions: SidebarHostOption[]
  selectedHostId: string
  selectedHostOption: SidebarHostOption | null
  selectedParsedHost: ParsedExecutionHost | null
  selectedSshTargetId: string | null
  /** Registry rows by target id, so a row can show `username@host` when unlabeled. */
  sshTargetsById: ReadonlyMap<string, SshTarget>
  connectingTargetIds: ReadonlySet<string>
  setSelectedHostId: (hostId: string) => void
  connectTarget: (targetId: string) => Promise<boolean>
}

/**
 * Resets the selected host to local whenever the dialog opens, matching Orca:
 * a host chosen for a previous add must not silently scope the next one.
 */
export function useAddRepoHostSelection({
  isOpen
}: {
  isOpen: boolean
}): AddRepoHostSelection {
  const repos = useAppStore((state) => state.repos)
  const sshTargetLabels = useAppStore((state) => state.sshTargetLabels)
  const sshConnectionStates = useAppStore((state) => state.sshConnectionStates)
  const runtimeEnvironmentsRaw = useAppStore((state) => state.runtimeEnvironments)
  const runtimeEnvironments = useMemo(
    () => (runtimeEnvironmentsRaw ?? []) as readonly PublicKnownRuntimeEnvironment[],
    [runtimeEnvironmentsRaw]
  )
  const runtimeStatusByEnvironmentId = useAppStore(
    (state) => state.runtimeStatusByEnvironmentId
  ) as ReadonlyMap<string, RuntimeEnvironmentStatus>
  const settings = useAppStore((state) => state.settings)
  const [selectedHostId, setSelectedHostId] = useState<string>(LOCAL_EXECUTION_HOST_ID)
  const [connectingTargetIds, setConnectingTargetIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  // Why a registry read: the store keeps only labels/generations, while the wizard row
  // needs the endpoint for the `username@host` fallback. One read per open, and the same
  // call refreshes the labels the option list is built from.
  const [sshTargetsById, setSshTargetsById] = useState<ReadonlyMap<string, SshTarget>>(
    () => new Map()
  )

  const ephemeralRuntimeIds = useMemo(
    () =>
      new Set(
        runtimeEnvironments
          .filter((environment) => isEphemeralVmRuntimeEnvironment(environment))
          .map((environment) => environment.id)
      ),
    [runtimeEnvironments]
  )

  const hostOptions = useMemo(
    () =>
      filterAddRepoHostOptions(
        buildSidebarHostOptions({
          repos,
          sshTargetLabels,
          sshConnectionStates,
          settings,
          runtimeStatusByEnvironmentId,
          runtimeEnvironments
        }),
        ephemeralRuntimeIds
      ),
    [
      ephemeralRuntimeIds,
      repos,
      runtimeEnvironments,
      runtimeStatusByEnvironmentId,
      settings,
      sshConnectionStates,
      sshTargetLabels
    ]
  )

  useEffect(() => {
    if (!isOpen) return
    setSelectedHostId(LOCAL_EXECUTION_HOST_ID)
    setConnectingTargetIds(new Set())
    let cancelled = false
    hydrateSshTargets()
      .then((targets) => {
        if (!cancelled) {
          setSshTargetsById(new Map(targets.map((target) => [target.id, target])))
        }
      })
      // Why not fatal: the picker still shows the registry's labels from the store; a
      // failed read only costs the fallback endpoint, not the ability to add.
      .catch(() => {
        if (!cancelled) {
          setSshTargetsById(new Map())
        }
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const selectHostId = useCallback(
    (hostId: string) => {
      const option = hostOptions.find((host) => host.id === hostId)
      if (!option || !canSelectAddRepoHost(option)) return
      setSelectedHostId(hostId)
    },
    [hostOptions]
  )

  const connectTarget = useCallback(
    async (targetId: string): Promise<boolean> => {
      const option = hostOptions.find((host) => host.id === `ssh:${encodeURIComponent(targetId)}`)
      if (!option || !canConnectAddRepoHost(option)) return false
      const latest = useAppStore.getState()
      latest.setSshConnectionState(
        targetId,
        buildSshConnectingState(targetId, latest.sshConnectionStates.get(targetId))
      )
      setConnectingTargetIds((current) => new Set(current).add(targetId))
      try {
        const result = await invoke<SshReconnectResult>('ssh_reconnect_target', {
          connectionId: targetId
        })
        const afterProbe = useAppStore.getState()
        afterProbe.setSshConnectionState(
          targetId,
          buildSshReconnectConnectionState(
            result,
            afterProbe.sshConnectionStates.get(targetId)
          )
        )
        if (result.status !== 'connected') {
          toast.error('SSH reconnect failed', {
            description: sshReconnectFailureMessage(result)
          })
          return false
        }
        // Why: the optimistic state exists before the probe confirms; selecting
        // the target only makes sense once the host is actually reachable.
        setSelectedHostId(`ssh:${encodeURIComponent(targetId)}`)
        return true
      } catch (error) {
        toast.error('SSH reconnect failed', {
          description: error instanceof Error ? error.message : String(error)
        })
        return false
      } finally {
        setConnectingTargetIds((current) => {
          const next = new Set(current)
          next.delete(targetId)
          return next
        })
      }
    },
    [hostOptions]
  )

  const selectedHostOption =
    hostOptions.find((host) => host.id === selectedHostId) ?? null
  const selectedParsedHost =
    parseExecutionHostId(selectedHostId) ??
    (selectedHostId === LOCAL_EXECUTION_HOST_ID
      ? ({ kind: 'local', id: LOCAL_EXECUTION_HOST_ID } as const)
      : null)
  const selectedSshTargetId =
    selectedParsedHost?.kind === 'ssh' ? selectedParsedHost.targetId : null

  return {
    hostOptions,
    selectedHostId,
    selectedHostOption,
    selectedParsedHost,
    selectedSshTargetId,
    sshTargetsById,
    connectingTargetIds,
    setSelectedHostId: selectHostId,
    connectTarget
  }
}
