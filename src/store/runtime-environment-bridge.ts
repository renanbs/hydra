// Renderer contract for the paired-runtime ("Orca server") registry.
//
// Hydra's Rust side does not expose runtime-environment pairing yet — the Tauri handler list
// has no `runtime_*` commands — so the Add-remote-server form validates its input here and
// fails with an explicit, typed error instead of pretending the host was saved. When the
// backend lands, only this module changes: the form already awaits these two calls.
import { invoke } from '@tauri-apps/api/core'

/** One paired runtime host, as the Add-remote-server flow needs it. */
export type RuntimeEnvironmentSummary = {
  id: string
  name: string
}

export type AddRuntimeEnvironmentArgs = {
  name: string
  pairingCode: string
  /** Set only when the user accepted the loopback (SSH tunnel) override. */
  allowLoopback: boolean
}

/** The renderer cannot reach a pairing backend in this build. */
export class RuntimePairingUnavailableError extends Error {
  constructor() {
    super('Orca server pairing is unavailable in this build.')
    this.name = 'RuntimePairingUnavailableError'
  }
}

function isUnknownCommandError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /not found|unknown command|no such command|not allowed/i.test(message)
}

/**
 * Verify a pairing link against the other host, then persist it.
 *
 * BLOCKED on the backend: `runtime_verify_and_add_from_pairing_code` does not exist in
 * `src-tauri/src`. The rejection is surfaced to the form so Save reports a real failure.
 */
export async function verifyAndAddRuntimeEnvironmentFromPairingCode(
  args: AddRuntimeEnvironmentArgs
): Promise<RuntimeEnvironmentSummary> {
  try {
    return await invoke<RuntimeEnvironmentSummary>('runtime_verify_and_add_from_pairing_code', {
      name: args.name,
      pairingCode: args.pairingCode,
      allowLoopback: args.allowLoopback
    })
  } catch (error) {
    if (isUnknownCommandError(error)) {
      throw new RuntimePairingUnavailableError()
    }
    throw error
  }
}

/** Re-read the paired-runtime registry. BLOCKED on the same missing backend. */
export async function listRuntimeEnvironments(): Promise<RuntimeEnvironmentSummary[]> {
  try {
    return await invoke<RuntimeEnvironmentSummary[]>('runtime_list_environments')
  } catch (error) {
    if (isUnknownCommandError(error)) {
      throw new RuntimePairingUnavailableError()
    }
    throw error
  }
}
