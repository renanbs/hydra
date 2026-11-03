// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: lib/sidebar-worktree-activation.ts
//
// D15a-011: selecting a slept workspace is also the wake signal for a VM-backed
// host. Hydra's durable sleep contract lives in SQLite (`workspace_sleep_state`)
// and local/SSH PTYs re-spawn on mount, so the optional `ephemeralVm` bridge is
// the only part that may be absent. The wake runs AFTER activation, never before:
// a failed provider resume must leave the workspace selected and retryable.
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { hasWorktreeSleepIntent } from './worktree-sleep-intent'

export type EphemeralVmResumeBridge = {
  resumeWorkspace?: (
    args: { workspaceId: string }
  ) => Promise<{ runtimeEnvironmentId?: string } | null>
}

export type EphemeralVmResumeResult = {
  /** False when there was nothing to do (awake workspace or no bridge). */
  attempted: boolean
  resumed: boolean
  runtimeEnvironmentId?: string
  /** Provider error text, shown as the toast description. */
  errorMessage?: string
}

/**
 * Resolve the optional VM bridge without assuming it exists. Hydra has no
 * `window.api.ephemeralVm` yet; probing (rather than calling) keeps activation
 * working on local and SSH hosts while the backend surface is missing.
 */
export function getEphemeralVmResumeBridge(): EphemeralVmResumeBridge | null {
  if (typeof window === 'undefined' || !window.api) {
    return null
  }
  const bridge: unknown = window.api.ephemeralVm
  return bridge !== null && typeof bridge === 'object'
    ? (bridge as EphemeralVmResumeBridge)
    : null
}

export function describeEphemeralVmWakeFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Pure decision + call, separated from the toast so the race test can drive it.
 * `hasSleepIntent` is required input instead of a store read: the intent marker
 * is synchronous and the caller already owns it.
 */
export async function resumeEphemeralVmOnActivation(args: {
  worktreeId: string
  hasSleepIntent: boolean
  bridge?: EphemeralVmResumeBridge | null
}): Promise<EphemeralVmResumeResult> {
  if (!args.hasSleepIntent) {
    return { attempted: false, resumed: false }
  }
  const resume = args.bridge?.resumeWorkspace
  if (typeof resume !== 'function') {
    // Why: the workspace is still usable (local PTYs re-spawn on mount); only a
    // VM-backed host needed the wake, and Hydra does not expose that bridge yet.
    return { attempted: false, resumed: false }
  }
  try {
    const runtime = await resume({ workspaceId: args.worktreeId })
    return {
      attempted: true,
      resumed: true,
      ...(runtime?.runtimeEnvironmentId
        ? { runtimeEnvironmentId: runtime.runtimeEnvironmentId }
        : {})
    }
  } catch (error) {
    return {
      attempted: true,
      resumed: false,
      errorMessage: describeEphemeralVmWakeFailure(error)
    }
  }
}

/**
 * Sidebar activation side effect: wake a slept workspace's VM when a bridge
 * exists. Never throws and never changes selection — a provider failure keeps
 * the workspace selected and shows the provider message.
 */
export async function wakeEphemeralVmForSleptWorktree(worktreeId: string): Promise<void> {
  if (!hasWorktreeSleepIntent(worktreeId)) {
    return
  }
  const result = await resumeEphemeralVmOnActivation({
    worktreeId,
    hasSleepIntent: true,
    bridge: getEphemeralVmResumeBridge()
  })
  if (!result.attempted || result.resumed) {
    return
  }
  toast.error(
    translate(
      'auto.lib.sidebarWorktreeActivation.wakeEphemeralVmFailed',
      'Failed to wake ephemeral VM workspace'
    ),
    { description: result.errorMessage ?? '' }
  )
}
