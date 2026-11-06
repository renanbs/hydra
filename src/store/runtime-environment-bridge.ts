// Renderer contract for the paired-runtime ("Orca server") registry.
//
// Verify-then-save, mirroring Orca's
// `verifyAndAddRuntimeEnvironmentFromPairingCode`: the link is verified live
// against the remote host over the E2EE browser transport
// (`remote-runtime-browser-pairing.ts`), then persisted by the Rust backend
// (`runtime_verify_and_add_from_pairing_code`, SQLite `runtime_environments`).
// The form already awaits these two calls, so only this module changed.
import { invoke } from '@tauri-apps/api/core'
import { ELECTRON_REMOTE_RUNTIME_CLIENT_CAPABILITIES } from '../shared/protocol-version'
import {
  MIN_COMPATIBLE_RUNTIME_SERVER_VERSION,
  RUNTIME_PROTOCOL_VERSION
} from '../shared/protocol-version'
import { evaluateRuntimeCompat } from '../shared/protocol-compat'
import { parseHostAccessLink } from '../shared/remote-pairing-address'
import { callRemoteRuntimeRpc, verifyRemotePairing } from '../shared/remote-runtime-browser-pairing'

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
  constructor(message = 'Orca server pairing is unavailable in this build.') {
    super(message)
    this.name = 'RuntimePairingUnavailableError'
  }
}

// D02b-010 Rosetta (Orca `translateRemotePairingFailureDescription`): the
// reference names the exact failure with the endpoint; the bridge keeps
// returning Errors (callers toast `.message`) but the copy now matches.
function translateVerifyFailure(kind: string, fallback: string): Error {
  switch (kind) {
    case 'access-link-invalid':
      return new Error('This access link is no longer valid. Generate a new link on the other host.')
    case 'host-unreachable':
      return new Error(fallback)
    case 'host-identity-mismatch':
      return new Error('Orca reached the host, but that host does not match this access link.')
    case 'protocol-incompatible':
      return new Error(fallback)
    default:
      return new Error(fallback)
  }
}

/**
 * Verify a pairing link against the other host, then persist it.
 *
 * Live E2EE verification first (`status.get` over the browser WebSocket); the
 * backend persists the already-parsed link the same way Orca's
 * `addEnvironmentFromPairingCode` persists its already-verified offer.
 */
export async function verifyAndAddRuntimeEnvironmentFromPairingCode(
  args: AddRuntimeEnvironmentArgs
): Promise<RuntimeEnvironmentSummary> {
  const parsed = parseHostAccessLink(args.pairingCode)
  if (!parsed.ok) {
    throw new Error('Invalid pairing code. Expected an orca://pair?... URL or bare pairing payload.')
  }
  if (parsed.value.endpointKind === 'loopback' && !args.allowLoopback) {
    throw new Error('This access link points back to this device.')
  }
  const verified = await verifyRemotePairing(
    parsed.value.pairing,
    [...ELECTRON_REMOTE_RUNTIME_CLIENT_CAPABILITIES]
  )
  if (!verified.ok) {
    throw translateVerifyFailure(verified.kind, verified.message)
  }
  const status = verified.runtimeStatus
  if (status.deviceScope === 'mobile') {
    throw new Error('This link grants mobile-only access. Generate a link for another Orca client.')
  }
  const compatibility = evaluateRuntimeCompat({
    clientProtocolVersion: RUNTIME_PROTOCOL_VERSION,
    minCompatibleServerProtocolVersion: MIN_COMPATIBLE_RUNTIME_SERVER_VERSION,
    serverProtocolVersion:
      typeof status.runtimeProtocolVersion === 'number'
        ? status.runtimeProtocolVersion
        : typeof status.protocolVersion === 'number'
          ? status.protocolVersion
          : 0,
    serverMinCompatibleClientProtocolVersion:
      typeof status.minCompatibleRuntimeClientProtocolVersion === 'number'
        ? status.minCompatibleRuntimeClientProtocolVersion
        : typeof status.minCompatibleMobileVersion === 'number'
          ? status.minCompatibleMobileVersion
          : 0
  })
  if (compatibility.kind === 'blocked') {
    throw new Error(
      compatibility.reason === 'client-too-old'
        ? 'Update this Orca client before adding the remote host.'
        : 'Update Orca on the remote host before adding it.'
    )
  }
  try {
    return await invoke<RuntimeEnvironmentSummary>('runtime_verify_and_add_from_pairing_code', {
      name: args.name,
      pairingCode: args.pairingCode,
      allowLoopback: args.allowLoopback
    })
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to add remote server.')
  }
}

/** Re-read the paired-runtime registry. */
export async function listRuntimeEnvironments(): Promise<RuntimeEnvironmentSummary[]> {
  return invoke<RuntimeEnvironmentSummary[]>('runtime_list_environments')
}

/** Remove a paired server by id. Returns false when it was already gone. */
export async function removeRuntimeEnvironment(environmentId: string): Promise<boolean> {
  return invoke<boolean>('runtime_remove_environment', { environmentId })
}

/** Stored offer (with secrets) for one paired server, to open the E2EE transport. */
export type RuntimeEnvironmentOffer = {
  id: string
  endpoints: {
    id: string
    endpoint: string
    deviceToken?: string | null
    publicKeyB64?: string | null
  }[]
  preferredEndpointId?: string | null
}

async function runtimeEnvironmentOffer(environmentId: string): Promise<RuntimeEnvironmentOffer> {
  return invoke<RuntimeEnvironmentOffer>('runtime_environment_offer', { environmentId })
}

function preferredOffer(offer: RuntimeEnvironmentOffer): {
  endpoint: string
  deviceToken: string
  publicKeyB64?: string
} {
  const endpoint =
    offer.endpoints.find((entry) => entry.id === offer.preferredEndpointId) ?? offer.endpoints[0]
  if (!endpoint) {
    throw new Error('That paired server has no access endpoint.')
  }
  if (!endpoint.deviceToken) {
    throw new Error('That paired server is missing its pairing secret. Pair it again.')
  }
  return {
    endpoint: endpoint.endpoint,
    deviceToken: endpoint.deviceToken,
    ...(endpoint.publicKeyB64 ? { publicKeyB64: endpoint.publicKeyB64 } : {})
  }
}

/**
 * One E2EE JSON-RPC call against a paired server (`repo.clone`, `repo.create`,
 * …): resolves the stored offer, opens the transport from PR1, and returns the
 * remote `result`. Throws the remote `error.message` when the call fails.
 */
export async function callPairedServerRpc<TResult>(
  environmentId: string,
  method: string,
  params: unknown,
  timeoutMs = 60_000
): Promise<TResult> {
  const stored = await runtimeEnvironmentOffer(environmentId)
  const { endpoint, deviceToken, publicKeyB64 } = preferredOffer(stored)
  const response = await callRemoteRuntimeRpc(
    { v: 2, endpoint, deviceToken, ...(publicKeyB64 ? { publicKeyB64 } : {}) },
    method,
    params,
    [...ELECTRON_REMOTE_RUNTIME_CLIENT_CAPABILITIES],
    timeoutMs
  )
  if (!response.ok) {
    throw new Error(response.message)
  }
  return response.result as TResult
}
