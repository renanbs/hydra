// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: renderer/src/runtime/runtime-environment-ssh-state.ts
// (`connectRuntimeEnvironmentSshTarget` / `resyncRuntimeEnvironmentSshTargets`)
// Verbatim: src/reference/runtime/runtime-environment-ssh-state.ts
//
// D04a-013 Rosetta: runtime-owned SSH targets dial through the paired-server
// bridge (`ssh.connect` RPC on the environment), not the local SSH map.
// Bucket writes mirror the reference: the returned state lands in the
// per-environment bucket, and failed connects resync from the environment.
import { useAppStore } from '../store'
import { callPairedServerRpc } from '../store/runtime-environment-bridge'
import { getEnvironmentSshStateGeneration } from '../store/slices/runtime-environment-ssh'
import type { SshConnectionState } from '../shared/ssh-types'

type SshConnectResult = {
  state: SshConnectionState | null
}

/** Dials the environment's own SSH target via its runtime RPC and mirrors the state into the bucket. */
export async function connectRuntimeEnvironmentSshTarget(
  environmentId: string,
  targetId: string
): Promise<SshConnectionState | null> {
  const generation = getEnvironmentSshStateGeneration(environmentId)
  const { state } = await callPairedServerRpc<SshConnectResult>(environmentId, 'ssh.connect', { targetId }, 60_000)
  const admitted = state && typeof state === 'object' && (state as SshConnectionState).targetId === targetId
    ? (state as SshConnectionState)
    : null
  if (admitted) {
    useAppStore.getState().setEnvironmentSshConnectionState(environmentId, targetId, admitted, generation)
  }
  return admitted
}

/** Resyncs the environment's target metadata after a failed connect (STA-1468). */
export async function resyncRuntimeEnvironmentSshTargets(environmentId: string): Promise<void> {
  await callPairedServerRpc<unknown>(environmentId, 'ssh.listTargetSummaries', undefined, 15_000)
}
