// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/setup-script-prompt-render-state.ts
//
// The setup-script prompt resolves its repo per host, and the card unmounts for a
// whole inspection round trip. Rendering straight from the live inspection would
// flicker the card off and back on every focus/revalidation; this retains the
// last visible state for the same repo identity so a re-inspection cannot leak
// another repo's prompt or blink the current one away.
import type { SetupScriptPromptInspection } from '@/lib/setup-script-prompt'
import type { Repo } from '@/shared/repo-types'
import type { Worktree } from '@/shared/worktree/types'
import { toRuntimeExecutionHostId } from '@/shared/execution-host'
import { findRepoForHost } from '@/store/slices/repo-host-identity'

export type SetupScriptPromptState = SetupScriptPromptInspection & {
  repoHostIdentity: string
}

export type LastVisibleSetupScriptPrompt = {
  state: SetupScriptPromptState
}

export function findSetupScriptPromptRepo(input: {
  repos: readonly Repo[]
  activeRepoId: string | null
  activeWorktree: Pick<Worktree, 'hostId' | 'repoId' | 'runtimeOwnerEnvironmentId'> | null
  settings: { activeRuntimeEnvironmentId?: string | null } | null
}): Repo | null {
  const { activeRepoId, activeWorktree, repos, settings } = input
  if (!activeRepoId) {
    return null
  }
  // Why: runtime-relayed SSH worktrees expose their transport host separately
  // from the repo catalog owner.
  const runtimeOwnerEnvironmentId = activeWorktree?.runtimeOwnerEnvironmentId?.trim()
  const activeWorktreeHostId =
    activeWorktree?.repoId === activeRepoId
      ? runtimeOwnerEnvironmentId
        ? toRuntimeExecutionHostId(runtimeOwnerEnvironmentId)
        : activeWorktree.hostId
      : undefined
  return findRepoForHost(repos, activeRepoId, {
    settings,
    ...(activeWorktreeHostId ? { hostId: activeWorktreeHostId } : {}),
  })
}

export function markSetupScriptPromptSaved(
  current: SetupScriptPromptState | null,
  savedRepoHostIdentity: string
): SetupScriptPromptState | null {
  return current?.repoHostIdentity === savedRepoHostIdentity && current.status === 'ok'
    ? { ...current, hasEffectiveSetup: true }
    : current
}

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
