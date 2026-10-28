// A workspace lives on a runtime host when its execution host id is `runtime:<env>`.
// The sidebar dims/annotates those cards when the last probe says the host is gone;
// an entry that was never probed is NOT a verdict (absent ≠ disconnected).
import { parseExecutionHostId } from '../../shared/execution-host'
import {
  isDisconnectedRuntimeHostState,
  runtimeHostConnectionStateForEntry,
} from '../../runtime/runtime-host-connection-state'
import type { RuntimeEnvironmentStatus } from '../../shared/runtime-host-status'

export function isRuntimeExecutionHostDisconnected(
  statusByEnvironmentId: ReadonlyMap<string, RuntimeEnvironmentStatus> | null | undefined,
  hostId: string | undefined
): boolean {
  const host = parseExecutionHostId(hostId)
  if (host?.kind !== 'runtime') {
    return false
  }
  return isDisconnectedRuntimeHostState(
    runtimeHostConnectionStateForEntry(statusByEnvironmentId?.get(host.environmentId))
  )
}
