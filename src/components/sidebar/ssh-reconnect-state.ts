// D07-028: map the Rust probe result onto the renderer's connection-state
// vocabulary. Kept pure so the failure classes are testable without a host.
import type {
  SshConnectionState,
  SshReconnectResult
} from '../../shared/ssh-types'

export function buildSshConnectingState(
  targetId: string,
  previous: SshConnectionState | undefined
): SshConnectionState {
  return {
    ...(previous ?? {
      targetId,
      status: 'disconnected' as const,
      error: null,
      reconnectAttempt: 0
    }),
    targetId,
    status: 'connecting',
    error: null,
    reconnectAttempt: (previous?.reconnectAttempt ?? 0) + 1
  }
}

export function buildSshReconnectConnectionState(
  result: SshReconnectResult,
  previous: SshConnectionState | undefined
): SshConnectionState {
  const base: SshConnectionState = {
    ...(previous ?? {
      targetId: result.connectionId,
      status: 'disconnected' as const,
      error: null,
      reconnectAttempt: 0
    }),
    targetId: result.connectionId,
    reconnectAttempt: previous?.reconnectAttempt ?? 0
  }

  if (result.status === 'connected') {
    return { ...base, status: 'connected', error: null }
  }
  if (result.status === 'auth-failed') {
    return {
      ...base,
      status: 'auth-failed',
      error: result.error ?? 'SSH authentication failed'
    }
  }
  return {
    ...base,
    status: 'reconnection-failed',
    error: sshReconnectFailureMessage(result)
  }
}

export function sshReconnectFailureMessage(result: SshReconnectResult): string {
  if (result.error?.trim()) return result.error.trim()
  switch (result.status) {
    case 'auth-failed':
      return 'SSH authentication failed'
    case 'host-key-verification':
      return 'SSH host key verification failed'
    case 'unreachable':
      return 'SSH host is unreachable'
    default:
      return 'SSH reconnect failed'
  }
}
