// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/repo-header-create-state.ts
//
// D11-004: the repo header's `+` is not a plain button. A folder project creates a
// workspace, a git project creates a worktree, and an SSH-backed project whose target
// is not connected cannot create anything until the user reconnects. Keeping that
// derivation pure lets the header, its tooltip and its accessible name agree.
import type { SshConnectionStatus } from '../../shared/ssh-types'
import type { Repo } from '../../shared/repo-types'
import { isRuntimeOwnedSshTargetId } from '../../shared/execution-host'
import { isGitRepoKind } from '../../shared/repo-kind'
import { translate } from '../../i18n/i18n'

export type RepoHeaderCreateState = {
  disabled: boolean
  tooltip: string
  ariaLabel: string
  /** True when the only way forward is reconnecting the project's SSH target. */
  requiresSshReconnect: boolean
}

/**
 * Orca `getRepoHeaderCreateState`.
 *
 * Why the sshStatus argument instead of reading the store here: the header renders
 * for a specific repo, and a mixed-host list can paint two projects that share a
 * connection id. The caller passes the status it already resolved for this row.
 */
export function getRepoHeaderCreateState(input: {
  repo: Pick<Repo, 'kind' | 'connectionId'>
  label: string
  sshStatus: SshConnectionStatus | null
}): RepoHeaderCreateState {
  if (!isGitRepoKind(input.repo)) {
    const label = translate(
      'components.sidebar.repo-header-create-state.create-workspace',
      'Create workspace for {{label}}',
      { label: input.label }
    )
    return {
      disabled: false,
      tooltip: label,
      ariaLabel: label,
      requiresSshReconnect: false
    }
  }

  // Why: a runtime-owned (per-workspace-env) SSH target is hidden plumbing the user
  // cannot connect to, so it must never drive the reconnect gate.
  const connectionId = isRuntimeOwnedSshTargetId(input.repo.connectionId)
    ? null
    : (input.repo.connectionId ?? null)
  if (connectionId && input.sshStatus !== 'connected') {
    return {
      disabled: true,
      tooltip: translate(
        'components.sidebar.repo-header-create-state.reconnect-ssh',
        'Reconnect SSH target before creating workspaces'
      ),
      ariaLabel: translate(
        'components.sidebar.repo-header-create-state.reconnect-ssh-for',
        'Reconnect SSH target before creating workspaces for {{label}}',
        { label: input.label }
      ),
      requiresSshReconnect: true
    }
  }

  const label = translate(
    'components.sidebar.repo-header-create-state.create-worktree',
    'Create new worktree for {{label}}',
    { label: input.label }
  )
  return {
    disabled: false,
    tooltip: label,
    ariaLabel: label,
    requiresSshReconnect: false
  }
}
