// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/add-repo-runtime-owner.ts
//
// D02a-033: resolve the execution host that owns an Add Project request and the
// authoritative worktree-refresh options for it. A captured runtime owner or SSH
// connection must be converted to the shared ExecutionHostId instead of letting
// the refresh fall back to whichever host happens to be active.
import {
  LOCAL_EXECUTION_HOST_ID,
  toRuntimeExecutionHostId,
  toSshExecutionHostId,
  type ExecutionHostId
} from '../../shared/execution-host'

export type CapturedRuntimeOwner = string | null | undefined

export function capturedAddRepoExecutionHostId(
  owner: CapturedRuntimeOwner,
  sshConnectionId?: string | null
): ExecutionHostId | undefined {
  return sshConnectionId
    ? toSshExecutionHostId(sshConnectionId)
    : owner !== undefined
      ? owner
        ? toRuntimeExecutionHostId(owner)
        : LOCAL_EXECUTION_HOST_ID
      : undefined
}

export function worktreeRefreshOptions(
  owner: CapturedRuntimeOwner,
  sshConnectionId?: string | null
): {
  requireAuthoritative: true
  executionHostId?: ExecutionHostId
} {
  const executionHostId = capturedAddRepoExecutionHostId(owner, sshConnectionId)
  return {
    requireAuthoritative: true,
    ...(executionHostId ? { executionHostId } : {})
  }
}
