// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/add-repo-host-availability.ts
//
// D02a-003: which hosts the Add Project selector may pick, and which disconnected
// SSH hosts it can probe from the popover. The health vocabulary comes from the
// shared execution-host registry, so the selector never invents a status.
import type { SidebarHostOption } from './sidebar-host-options'

export function canSelectAddRepoHost(host: Pick<SidebarHostOption, 'health' | 'kind'>): boolean {
  return host.health === 'local' || host.health === 'available'
}

export function canConnectAddRepoHost(host: Pick<SidebarHostOption, 'health' | 'kind'>): boolean {
  return (
    host.kind === 'ssh' &&
    (host.health === 'disconnected' || host.health === 'error' || host.health === 'connecting')
  )
}

/**
 * The selector hides hosts that cannot back a project row: ephemeral VM runtime
 * environments are provisioning-only and never a user-chosen execution host.
 */
export function filterAddRepoHostOptions<TOption extends Pick<SidebarHostOption, 'id'>>(
  hosts: readonly TOption[],
  ephemeralRuntimeEnvironmentIds: ReadonlySet<string>
): TOption[] {
  return hosts.filter((host) => {
    if (!host.id.startsWith('runtime:')) return true
    return !ephemeralRuntimeEnvironmentIds.has(decodeURIComponent(host.id.slice('runtime:'.length)))
  })
}

/**
 * D02a-003: plain-language update guidance for a runtime host whose protocol
 * handshake failed. `null` means the host is compatible or not a runtime.
 */
export function getAddRepoHostCompatibilityHint(
  host: Pick<SidebarHostOption, 'kind' | 'compatibility'>
): string | null {
  if (host.kind !== 'runtime' || host.compatibility?.kind !== 'blocked') return null
  return host.compatibility.reason === 'client-too-old'
    ? `Update Hydra: this host speaks protocol ${host.compatibility.serverProtocolVersion}.`
    : `Update the host: it must speak protocol ${host.compatibility.requiredServerProtocolVersion ?? 'a newer version'}.`
}
