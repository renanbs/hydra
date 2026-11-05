// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/host-header-menu-items.ts
// Why: the host-header dropdown shows different lifecycle actions per host kind. Keeping the
// availability rules in a pure function makes them unit-testable without rendering the sidebar.
//
// What Hydra can actually execute today:
// - rename: client-side label override, every host kind.
// - ssh-reconnect / ssh-disconnect: `ssh_reconnect_target` (a real system-OpenSSH probe that
//   marks the host reachable) and `ssh_disconnect_target` (writes the explicit disconnect to
//   the durable connection record; no PTY is bound to a target, so there is no session to
//   close). Only the action that changes state is offered — Disconnect when connected,
//   Connect/Reconnect otherwise — so neither is a dead item.
// - manage: the Settings deep link. SSH lands on the SSH pane; local lands on General. A
//   runtime host would need the paired-servers pane, which Hydra does not render yet, so it
//   gets no manage/remove entry instead of a link to nothing.
// - remove: `ssh_remove_target`, SSH only.
import type { ExecutionHostKind } from '../../shared/execution-host'
import type { ExecutionHostHealth } from '../../shared/execution-host-registry'
import type { RuntimeCompatVerdict } from '../../shared/protocol-compat'

export type HostHeaderMenuAction =
  | 'rename'
  | 'ssh-reconnect'
  | 'ssh-disconnect'
  | 'manage'
  | 'remove'

export type HostHeaderMenuModel = {
  /** Lifecycle/navigation actions, in display order. */
  actions: HostHeaderMenuAction[]
  /** Present only when the host is blocked on a compatibility verdict. */
  blocked: {
    reason: 'client-too-old' | 'server-too-old'
  } | null
}

export type HostHeaderMenuInput = {
  kind: ExecutionHostKind
  health: ExecutionHostHealth
  /** SSH connection status drives whether a reconnect is meaningful. */
  sshConnected?: boolean
  compatibility?: RuntimeCompatVerdict
}

export function buildHostHeaderMenuModel(input: HostHeaderMenuInput): HostHeaderMenuModel {
  const actions: HostHeaderMenuAction[] = ['rename']
  if (input.kind === 'ssh') {
    // Only the action that changes state: Disconnect when up, Connect/Reconnect otherwise.
    actions.push(input.sshConnected ? 'ssh-disconnect' : 'ssh-reconnect')
    actions.push('manage', 'remove')
  } else if (input.kind === 'local') {
    actions.push('manage')
  }
  const blocked =
    input.health === 'blocked' && input.compatibility?.kind === 'blocked'
      ? { reason: input.compatibility.reason }
      : null
  return { actions, blocked }
}
