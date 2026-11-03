// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/ssh-workspace-forget-resolution.ts
// How a workspace on an SSH host should be deleted, given the host's live state.
export type SshWorkspaceForgetResolution =
  | { kind: 'not-ssh' }
  | { kind: 'connected'; targetId: string }
  | { kind: 'disconnected'; targetId: string; status: string }
  | { kind: 'ghost'; targetId: string }

export function resolveSshWorkspaceForget(args: {
  repo:
    | { connectionId?: string | null; executionHostId?: string | null }
    | null
    | undefined
  sshConnectionStates: ReadonlyMap<string, { status?: string } | undefined>
  /** Keys are configured SSH target ids (targets that still exist in settings). */
  sshTargetLabels: ReadonlyMap<string, string>
}): SshWorkspaceForgetResolution {
  const connectionId = args.repo?.connectionId?.trim()
  // Why: runtime-VM workspaces are not SSH even when they carry a connection id; the
  // runtime owns their lifecycle, so the SSH reconnect/forget path would be wrong.
  if (args.repo?.executionHostId?.trim().startsWith('runtime:')) {
    return { kind: 'not-ssh' }
  }
  if (!connectionId || connectionId.startsWith('runtime:')) {
    return { kind: 'not-ssh' }
  }
  const isConfigured = args.sshTargetLabels.has(connectionId)
  const status = args.sshConnectionStates.get(connectionId)?.status
  // A removed target leaves repos pinned to a dead id with no configured target —
  // reconnect can never succeed, so only a local-only forget applies.
  if (!isConfigured) {
    return { kind: 'ghost', targetId: connectionId }
  }
  if (status === 'connected') {
    return { kind: 'connected', targetId: connectionId }
  }
  return { kind: 'disconnected', targetId: connectionId, status: status ?? 'disconnected' }
}
