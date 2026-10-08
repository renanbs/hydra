// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/host-header-menu-items.ts`, reduced to the actions
// Hydra can actually execute today: `ssh_update_target` (rename), `ssh_remove_target`
// (remove), and the "Manage host…" deep link into Settings → SSH Hosts. Orca's
// Reconnect/Disconnect and runtime "Check connection" still need the remote-execution
// subsystem (PTY over SSH, credentials, leases, relay), so they stay absent rather than
// inert — a menu item with nothing behind it is a lie about the product.
import type { ExecutionHostKind } from '../../shared/execution-host'
import type { ExecutionHostHealth } from '../../shared/execution-host-registry'
import type { RuntimeCompatVerdict } from '../../shared/protocol-compat'

export type HostHeaderMenuAction = 'rename' | 'manage' | 'remove'

export type HostHeaderMenuModel = {
  /** Registry actions the host offers, in display order. */
  actions: HostHeaderMenuAction[]
  /** Present only when the host is blocked on a compatibility verdict. */
  blocked: {
    reason: 'client-too-old' | 'server-too-old'
  } | null
}

export type HostHeaderMenuInput = {
  kind: ExecutionHostKind
  health: ExecutionHostHealth
  compatibility?: RuntimeCompatVerdict
}

/**
 * What a host's header menu offers, per host kind.
 *
 * Rename and Remove both write the SSH host registry, so only an SSH target has either:
 * the local host has no registry row, and removing a runtime environment needs the Orca
 * servers pane that owns active-environment switching.
 *
 * The blocked entry is a warning, not an action. It is gated on the registry's own
 * `blocked` health as well as the verdict, so a stale verdict on an otherwise healthy
 * host never paints an alarm, and the severity always comes from the verdict reason.
 */
export function buildHostHeaderMenuModel(input: HostHeaderMenuInput): HostHeaderMenuModel {
  const actions: HostHeaderMenuAction[] = input.kind === 'ssh' ? ['rename', 'manage', 'remove'] : []
  const blocked =
    input.health === 'blocked' && input.compatibility?.kind === 'blocked'
      ? { reason: input.compatibility.reason }
      : null
  return { actions, blocked }
}
