// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/project-added-default-checkout.ts
//
// D02a-028/029/030: after a project is added, land the user on its default
// checkout. Hydra's scan is local-only, so every dependency that reaches the
// host is injected: `scan_worktrees` for local repos, the catalog visibility
// command for hidden checkouts, and App's own activation.
import { relativePathInsideRoot } from '../../shared/cross-platform-path'
import { LOCAL_EXECUTION_HOST_ID, type ExecutionHostId } from '../../shared/execution-host'
import type { AddRepoDefaultCheckoutHandoffSource } from '../../shared/telemetry-events'
import { track } from '../../lib/telemetry'

type HandoffResult = 'opened_default_checkout' | 'revealed_project'

type HandoffReason =
  | 'loaded_default_checkout'
  | 'detected_default_checkout'
  | 'no_authoritative_detection'
  | 'no_default_checkout'
  | 'show_detected_default_failed'
  | 'show_detected_linked_failed'
  | 'authoritative_refresh_failed'
  | 'linked_external_refresh_failed'
  | 'refreshed_default_missing'

/** Structural subset of the scan payload the handoff reads. */
export type HandoffWorktree = {
  id?: string
  path: string
  branch?: string
  is_main?: boolean
  isMainWorktree?: boolean
  /** Host stamp when a remote scan is available; absent means local. */
  hostId?: string
}

export type DetectedRepoWorktrees = {
  visible: HandoffWorktree[]
  hidden: HandoffWorktree[]
  authoritative: boolean
}

export type ProjectAddedHandoffDeps = {
  /** Snapshot the caller already holds for this repo; null forces a scan. */
  getWorktrees: (repoId: string) => DetectedRepoWorktrees | null
  /** Authoritative scan. Returns null when the host cannot answer. */
  refreshWorktrees: (
    repoId: string,
    options: { requireAuthoritative: true; executionHostId?: ExecutionHostId }
  ) => Promise<DetectedRepoWorktrees | null>
  /** Rewrites the repo's external-worktree visibility in the catalog. */
  setExternalWorktreeVisibility: (
    repoId: string,
    visibility: 'show',
    options?: { executionHostId?: ExecutionHostId }
  ) => Promise<boolean>
  setHideDefaultBranchWorkspace: (value: boolean) => void
  /** Activates the checkout and reveals its row (`activateAndRevealWorktree`). */
  openDefaultCheckout: (args: {
    repoId: string
    worktree: HandoffWorktree
    initialCwd?: string
    executionHostId?: ExecutionHostId
    source: AddRepoDefaultCheckoutHandoffSource
  }) => void
  finalizeImportedRepoAfterSkip: (
    repoId: string,
    executionHostId?: ExecutionHostId
  ) => void
  /** Test seam; production emits through `lib/telemetry`. */
  track?: typeof track
}

export type ProjectAddedHandoffResult = {
  result: HandoffResult
  reason: HandoffReason
}

export function getProjectDefaultCheckout<T extends HandoffWorktree>(
  worktrees: readonly T[]
): T | null {
  return worktrees.find((worktree) => worktree.isMainWorktree ?? worktree.is_main) ?? null
}

/** Orca filters the detected list by owner host before choosing the checkout. */
export function getProjectWorktreesForHost<T extends HandoffWorktree>(
  worktrees: readonly T[],
  executionHostId?: ExecutionHostId
): T[] {
  if (!executionHostId) {
    return [...worktrees]
  }
  return worktrees.filter((worktree) => {
    const owner = worktree.hostId ?? LOCAL_EXECUTION_HOST_ID
    return owner === executionHostId
  })
}

function ownerRefreshOptions(executionHostId?: ExecutionHostId): {
  requireAuthoritative: true
  executionHostId?: ExecutionHostId
} {
  return {
    requireAuthoritative: true,
    ...(executionHostId ? { executionHostId } : {}),
  }
}

function getDetectedProjectDefaultCheckout(
  detected: DetectedRepoWorktrees | null | undefined,
  executionHostId?: ExecutionHostId
): HandoffWorktree | null {
  if (!detected?.authoritative) {
    return null
  }
  return getProjectDefaultCheckout(
    getProjectWorktreesForHost([...detected.visible, ...detected.hidden], executionHostId)
  )
}

export function hasDetectedHiddenLinkedExternalWorktrees(
  detected: DetectedRepoWorktrees | null | undefined,
  executionHostId?: ExecutionHostId
): boolean {
  if (!detected?.authoritative) {
    return false
  }
  return getProjectWorktreesForHost(detected.hidden, executionHostId).some(
    (worktree) => !(worktree.isMainWorktree ?? worktree.is_main)
  )
}

async function revealDetectedHiddenLinkedExternalWorktrees(
  repoId: string,
  deps: ProjectAddedHandoffDeps,
  executionHostId?: ExecutionHostId
): Promise<HandoffReason | null> {
  const detected = deps.getWorktrees(repoId)
  if (!hasDetectedHiddenLinkedExternalWorktrees(detected, executionHostId)) {
    return null
  }
  const updated = await deps.setExternalWorktreeVisibility(
    repoId,
    'show',
    executionHostId ? { executionHostId } : undefined
  )
  if (!updated) {
    return 'show_detected_linked_failed'
  }
  const refreshed = await deps.refreshWorktrees(repoId, ownerRefreshOptions(executionHostId))
  return refreshed?.authoritative ? null : 'linked_external_refresh_failed'
}

async function findDetectedDefaultCheckout(
  repoId: string,
  deps: ProjectAddedHandoffDeps,
  executionHostId?: ExecutionHostId
): Promise<{ worktree: HandoffWorktree | null; reason: HandoffReason }> {
  const detected = deps.getWorktrees(repoId)
  const detectedDefaultCheckout = getDetectedProjectDefaultCheckout(detected, executionHostId)
  if (!detectedDefaultCheckout) {
    return {
      worktree: null,
      reason: detected?.authoritative ? 'no_default_checkout' : 'no_authoritative_detection',
    }
  }
  const visible = deps
    .getWorktrees(repoId)
    ?.visible.some((worktree) => worktree.path === detectedDefaultCheckout.path)
  if (!visible) {
    // Why: a freshly cloned primary checkout can be detected as hidden; adding
    // the project must make that checkout usable instead of unreachable.
    const updated = await deps.setExternalWorktreeVisibility(
      repoId,
      'show',
      executionHostId ? { executionHostId } : undefined
    )
    if (!updated) {
      return { worktree: null, reason: 'show_detected_default_failed' }
    }
  }
  const refreshed = await deps.refreshWorktrees(repoId, ownerRefreshOptions(executionHostId))
  if (refreshed && !refreshed.authoritative) {
    return { worktree: null, reason: 'authoritative_refresh_failed' }
  }
  const worktree = getProjectDefaultCheckout(
    getProjectWorktreesForHost(
      refreshed ? [...refreshed.visible, ...refreshed.hidden] : [],
      executionHostId
    )
  )
  return {
    worktree,
    reason: worktree ? 'detected_default_checkout' : 'refreshed_default_missing',
  }
}

function resolveInitialCwdForDefaultCheckout(
  defaultCheckout: HandoffWorktree,
  selectedPath: string | undefined
): string | undefined {
  if (!selectedPath) {
    return undefined
  }
  const relativePath = relativePathInsideRoot(defaultCheckout.path, selectedPath)
  return relativePath && relativePath.length > 0 ? selectedPath : undefined
}

function emit(
  deps: ProjectAddedHandoffDeps,
  args: {
    source: AddRepoDefaultCheckoutHandoffSource
    result: HandoffResult
    reason: HandoffReason
  }
): void {
  ;(deps.track ?? track)('add_repo_default_checkout_handoff', args)
}

export async function openProjectDefaultCheckout(args: {
  repoId: string
  source: AddRepoDefaultCheckoutHandoffSource
  selectedPath?: string
  executionHostId?: ExecutionHostId
  deps: ProjectAddedHandoffDeps
}): Promise<ProjectAddedHandoffResult> {
  const { repoId, source, selectedPath, executionHostId, deps } = args
  const loaded = deps.getWorktrees(repoId)
  // Why visible-only: a hidden default checkout must go through the reveal path,
  // not look like a usable loaded row (Orca reads the loaded worktree list here).
  let defaultCheckout = getProjectDefaultCheckout(
    getProjectWorktreesForHost(loaded?.visible ?? [], executionHostId)
  )
  let reason: HandoffReason = 'loaded_default_checkout'
  if (!defaultCheckout) {
    const detected = await findDetectedDefaultCheckout(repoId, deps, executionHostId)
    defaultCheckout = detected.worktree
    reason = detected.reason
  }

  if (defaultCheckout) {
    const revealFailure = await revealDetectedHiddenLinkedExternalWorktrees(
      repoId,
      deps,
      executionHostId
    )
    if (revealFailure) {
      emit(deps, { source, result: 'revealed_project', reason: revealFailure })
      deps.finalizeImportedRepoAfterSkip(repoId, executionHostId)
      return { result: 'revealed_project', reason: revealFailure }
    }
    // Why: the onboarding handoff should land on the default checkout even when
    // the user normally hides default-branch workspaces in the sidebar.
    deps.setHideDefaultBranchWorkspace(false)
    emit(deps, { source, result: 'opened_default_checkout', reason })
    const initialCwd = resolveInitialCwdForDefaultCheckout(defaultCheckout, selectedPath)
    deps.openDefaultCheckout({
      repoId,
      worktree: defaultCheckout,
      ...(initialCwd ? { initialCwd } : {}),
      ...(executionHostId ? { executionHostId } : {}),
      source,
    })
    return { result: 'opened_default_checkout', reason }
  }

  emit(deps, { source, result: 'revealed_project', reason })
  deps.finalizeImportedRepoAfterSkip(repoId, executionHostId)
  return { result: 'revealed_project', reason }
}

export async function finishProjectAddWithDefaultCheckout(args: {
  repoId: string
  source: AddRepoDefaultCheckoutHandoffSource
  selectedPath?: string
  executionHostId?: ExecutionHostId
  closeModal: () => void
  deps: ProjectAddedHandoffDeps
}): Promise<ProjectAddedHandoffResult> {
  args.closeModal()
  return openProjectDefaultCheckout(args)
}
