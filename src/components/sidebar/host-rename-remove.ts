// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/host-rename-remove.ts
// Client-side host display names and per-kind removal routing.
//
// Hydra's live settings snapshot is the legacy `HydraSettings` object persisted by Rust and
// carries `hostSettingOverrides` through its index signature, so these helpers accept the
// unknown-shaped snapshot and narrow it instead of pretending the settings type declares it.
import { parseExecutionHostId, type ExecutionHostId } from '../../shared/execution-host'
import {
  clearHostSettingOverride,
  getHostSettingOverride,
  setHostSettingOverride,
  type HostSettingOverrides
} from '../../shared/host-setting-overrides'

type OverridesMap = Partial<Record<ExecutionHostId, HostSettingOverrides>>

function normalizeOverrides(settings: unknown): OverridesMap {
  if (!settings || typeof settings !== 'object' || !('hostSettingOverrides' in settings)) {
    return {}
  }
  const raw = settings.hostSettingOverrides
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  // Why validate: this blob comes from persisted settings (external data), so a stale or
  // hand-edited entry must not become an unchecked display label.
  const overrides: OverridesMap = {}
  for (const [hostId, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') {
      continue
    }
    const entry: HostSettingOverrides = {}
    if ('displayLabel' in value && typeof value.displayLabel === 'string') {
      entry.displayLabel = value.displayLabel
    }
    if ('defaultWorktreeLocation' in value && typeof value.defaultWorktreeLocation === 'string') {
      entry.defaultWorktreeLocation = value.defaultWorktreeLocation
    }
    overrides[hostId as ExecutionHostId] = entry
  }
  return overrides
}

/** The user-chosen display-label override for a host, or undefined when it uses its derived label. */
export function getHostDisplayLabelOverride(
  settings: unknown,
  hostId: ExecutionHostId
): string | undefined {
  return getHostSettingOverride({ hostSettingOverrides: normalizeOverrides(settings) }, hostId, 'displayLabel')
}

/** Next overrides map after a rename. A blank label clears it so the derived label returns. */
export function applyHostRename(
  settings: unknown,
  hostId: ExecutionHostId,
  nextLabel: string
): OverridesMap {
  return setHostSettingOverride(
    { hostSettingOverrides: normalizeOverrides(settings) },
    hostId,
    'displayLabel',
    nextLabel
  )
}

/** Next overrides map after "Reset to default". */
export function clearHostRename(settings: unknown, hostId: ExecutionHostId): OverridesMap {
  return clearHostSettingOverride(
    { hostSettingOverrides: normalizeOverrides(settings) },
    hostId,
    'displayLabel'
  )
}

export type HostRemovalTarget =
  | { kind: 'ssh'; targetId: string }
  | { kind: 'runtime'; environmentId: string }
  | null

/**
 * How a host can be removed. SSH targets are deleted inline; runtime environments need the
 * paired-server settings pane, which Hydra does not render yet — the resolver still reports
 * them so a caller can deep-link once that pane exists, but the dialog offers no removal for
 * a runtime host today. Local has nothing to remove.
 */
export function resolveHostRemoval(hostId: ExecutionHostId): HostRemovalTarget {
  const parsed = parseExecutionHostId(hostId)
  if (parsed?.kind === 'ssh') {
    return { kind: 'ssh', targetId: parsed.targetId }
  }
  if (parsed?.kind === 'runtime') {
    return { kind: 'runtime', environmentId: parsed.environmentId }
  }
  return null
}
