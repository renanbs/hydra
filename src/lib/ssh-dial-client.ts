// Local SSH dial transport (`ssh_connect_target` / `ssh_reconnect_target`).
//
// The local path never had a `window.api.ssh` bridge (the preload is Electron
// only), so this module invokes the Tauri commands directly and returns the
// connection status the card mirrors into the renderer store.
import { invoke } from '@tauri-apps/api/core'
import type { SshConnectionState } from '../shared/ssh-types'

export type SshConnectResult = {
  connectionId: string
  status: string
  latencyMs: number
  error?: string | null
}

/** Dials a persistent master for one target; resolves the classified status. */

export function connectSshTarget(targetId: string): Promise<SshConnectResult> {
  return invoke<SshConnectResult>('ssh_connect_target', { connectionId: targetId })
}

/** Classifies reachability without dialing (probe-only). */
export function reconnectSshTarget(targetId: string): Promise<SshConnectResult> {
  return invoke<SshConnectResult>('ssh_reconnect_target', { connectionId: targetId })
}

/**
 * Rail (e): fetches the host key with ssh-keyscan and appends it to
 * ~/.ssh/known_hosts when not already covered. After accepting, dial again.
 */
export function acceptSshHostKey(targetId: string): Promise<string> {
  return invoke<string>('ssh_accept_host_key', { connectionId: targetId })
}

/**
 * Rail (b): true only when a previous dial classified as `auth-failed` and no
 * live master exists — so automation skips instead of hanging on a prompt.
 */
export function needsSshPassphrasePrompt(targetId: string): Promise<boolean> {
  return invoke<boolean>('ssh_needs_passphrase_prompt', { connectionId: targetId })
}
/** Narrows the command's string status to the renderer's connection state shape. */
export function toSshConnectionState(
  result: SshConnectResult | null,
  previous: SshConnectionState | undefined
): SshConnectionState | null {
  if (!result) {
    return null
  }
  return {
    targetId: result.connectionId,
    status: result.status as SshConnectionState['status'],
    error: result.error ?? null,
    reconnectAttempt: previous?.reconnectAttempt ?? 0
  }
}
