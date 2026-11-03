// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/setup-script-prompt-render-state.ts
import type { GlobalSettings } from '../../shared/global-settings-types'
import type { Repo } from '../../shared/repo-types'
import type { Worktree } from '../../shared/worktree/types'
import type { SetupScriptPromptInspection } from '@/lib/setup-script-prompt'
import { findRepoForHost } from '@/store/slices/repo-host-identity'
import { toRuntimeExecutionHostId } from '../../shared/execution-host'

export type SetupScriptPromptState = SetupScriptPromptInspection & {
  repoHostIdentity: string
}

export type LastVisibleSetupScriptPrompt = {
  state: SetupScriptPromptState
}

/**
 * Resolve the repo that owns the active workspace. A runtime-relayed SSH
 * worktree exposes its transport host separately from the catalog owner, so the
 * runtime owner wins over the row's host id.
 */
export function findSetupScriptPromptRepo(input: {
  repos: readonly Repo[]
  activeRepoId: string | null
  activeWorktree: Pick<Worktree, 'hostId' | 'repoId' | 'runtimeOwnerEnvironmentId'> | null
  settings: Pick<GlobalSettings, 'activeRuntimeEnvironmentId'> | null
}): Repo | null {
  const { activeRepoId, activeWorktree, repos, settings } = input
  if (!activeRepoId) return null

  const runtimeOwnerEnvironmentId = activeWorktree?.runtimeOwnerEnvironmentId?.trim()
  const activeWorktreeHostId =
    activeWorktree?.repoId === activeRepoId
      ? runtimeOwnerEnvironmentId
        ? toRuntimeExecutionHostId(runtimeOwnerEnvironmentId)
        : activeWorktree.hostId
      : undefined
  return findRepoForHost(repos, activeRepoId, {
    settings,
    ...(activeWorktreeHostId ? { hostId: activeWorktreeHostId } : {})
  })
}

/** Mark only the saved host's prompt as effective; the same repo on another host keeps its card. */
export function markSetupScriptPromptSaved(
  current: SetupScriptPromptState | null,
  savedRepoHostIdentity: string
): SetupScriptPromptState | null {
  return current?.repoHostIdentity === savedRepoHostIdentity && current.status === 'ok'
    ? { ...current, hasEffectiveSetup: true }
    : current
}

/**
 * Keep the last visible prompt while a re-inspection round trip is in flight so
 * the card does not flicker out and back on every focus/activation.
 */
export function getRenderedSetupScriptPromptState(input: {
  promptState: SetupScriptPromptState | null
  activeRepoId: string
  activeRepoHostIdentity: string
  lastVisiblePrompt: LastVisibleSetupScriptPrompt | null
}): SetupScriptPromptState | null {
  const { activeRepoHostIdentity, activeRepoId, lastVisiblePrompt, promptState } = input
  if (
    promptState?.repoId === activeRepoId &&
    promptState.repoHostIdentity === activeRepoHostIdentity
  ) {
    return promptState
  }
  return !promptState && lastVisiblePrompt?.state.repoHostIdentity === activeRepoHostIdentity
    ? lastVisiblePrompt.state
    : null
}
