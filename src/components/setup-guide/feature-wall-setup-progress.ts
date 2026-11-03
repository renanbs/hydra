// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/feature-wall/feature-wall-setup-progress.ts (progress model only;
// Hydra reads persisted evidence instead of runtime probes it does not own yet).
import type { FeatureInteractionState } from '../../shared/feature-interactions'
import { hasFeatureInteraction } from '../../shared/feature-interactions'
import {
  FEATURE_WALL_SETUP_STEPS,
  type FeatureWallSetupStepId
} from '../../shared/feature-wall-setup-steps'
import type { HydraSettings } from '../../shared/settings-types'
import type { Repo } from '../../shared/repo-types'
import type { Worktree } from '../../shared/worktree/types'
import { isGitRepoKind } from '../../shared/repo-kind'
import { resolveHookCommandSourcePolicy } from '../../shared/hook-command-source-policy'

export type FeatureWallSetupProgressInput = {
  ready?: boolean
  settings: Pick<HydraSettings, 'default_tui_agent' | 'notification_on_blocked'> | null
  featureInteractions: FeatureInteractionState
  repos: readonly Pick<Repo, 'kind' | 'hookSettings'>[]
  worktreesByRepo: Record<string, readonly Pick<Worktree, 'path' | 'isMainWorktree'>[]>
  /** Persisted Orca CLI setup marker (`lib/orchestration-setup-state`). */
  orchestrationSetupEnabled: boolean
}

export type FeatureWallSetupProgress = {
  ready: boolean
  stepDone: Record<FeatureWallSetupStepId, boolean>
  coreDoneCount: number
  coreTotal: number
}

/** Task-source usage: opening a provider work item is the persisted proof that the
 *  integration is connected and usable. */
const TASK_SOURCE_INTERACTION_IDS = [
  'github-tasks',
  'gitlab-tasks',
  'linear-tasks',
  'jira-tasks'
] as const

/** Agent-capability usage: an orchestration/browser/computer-use interaction means the
 *  CLI and its skills are already doing real work on this profile. */
const AGENT_CAPABILITY_INTERACTION_IDS = [
  'agent-orchestration',
  'agent-browser-use',
  'computer-use'
] as const

function countAvailableNonMainWorktrees(
  worktreesByRepo: Record<string, readonly Pick<Worktree, 'path' | 'isMainWorktree'>[]>
): number {
  // Why: imported git worktrees count as real parallel-work capacity, but
  // partially hydrated placeholders can appear before a worktree path is known.
  return Object.values(worktreesByRepo).reduce(
    (sum, worktrees) =>
      sum +
      worktrees.filter(
        (worktree) => !worktree.isMainWorktree && typeof worktree.path === 'string' && worktree.path
      ).length,
    0
  )
}

function hasConfiguredSetupScript(repos: readonly Pick<Repo, 'kind' | 'hookSettings'>[]): boolean {
  return repos.some((repo) => {
    if (!isGitRepoKind(repo)) {
      return false
    }
    const localSetup = repo.hookSettings?.scripts?.setup?.trim()
    if (!localSetup) {
      return false
    }
    // Why: `shared-only` ignores the local script entirely, so persisting one there
    // must not claim the workspace runs it.
    return (
      resolveHookCommandSourcePolicy(repo.hookSettings?.commandSourcePolicy, {
        hasLocalScript: true
      }) !== 'shared-only'
    )
  })
}

export function getFeatureWallSetupProgress(
  input: FeatureWallSetupProgressInput
): FeatureWallSetupProgress {
  const taskSourceUsed = TASK_SOURCE_INTERACTION_IDS.some((id) =>
    hasFeatureInteraction(input.featureInteractions, id)
  )
  const agentCapabilitiesUsed = AGENT_CAPABILITY_INTERACTION_IDS.some((id) =>
    hasFeatureInteraction(input.featureInteractions, id)
  )
  const gitRepoCount = input.repos.filter(isGitRepoKind).length
  const stepDone: Record<FeatureWallSetupStepId, boolean> = {
    'default-agent':
      Boolean(input.settings?.default_tui_agent) &&
      input.settings?.default_tui_agent !== 'blank',
    'add-two-repos': gitRepoCount >= 2,
    // Why: Hydra exposes one persisted notification switch (notify when an agent is
    // blocked); it is the surface that decides whether agents can reach the user.
    notifications: input.settings?.notification_on_blocked === true,
    'two-worktrees': countAvailableNonMainWorktrees(input.worktreesByRepo) >= 1,
    browser: hasFeatureInteraction(input.featureInteractions, 'browser'),
    'task-sources': taskSourceUsed,
    'agent-capabilities': input.orchestrationSetupEnabled || agentCapabilitiesUsed,
    'setup-script': hasConfiguredSetupScript(input.repos)
  }
  return {
    ready: input.ready ?? true,
    stepDone,
    coreDoneCount: FEATURE_WALL_SETUP_STEPS.filter((step) => stepDone[step.id]).length,
    coreTotal: FEATURE_WALL_SETUP_STEPS.length
  }
}

/** Entry/modal completion: every core milestone is done. */
export function isFeatureWallSetupProgressComplete(progress: FeatureWallSetupProgress): boolean {
  return progress.coreDoneCount >= progress.coreTotal
}
