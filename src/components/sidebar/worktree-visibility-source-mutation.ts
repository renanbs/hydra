// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/worktree-visibility-source-mutation.ts`: every source
// write carries an `isAccepted` predicate evaluated against the repo row the target host
// returned. A host that silently drops the additive `worktreeVisibilitySourcePreferences`
// fails the predicate instead of reporting a false success.
import type { ExternalWorktreeVisibility } from '../../shared/repo-types'
import type { WorktreeVisibilityDefaults } from '../../shared/global-settings-types'
import {
  buildWorktreeSourcePreferenceUpdate,
  effectiveBuiltInWorktreeSourceVisibility,
  effectiveCustomWorktreeSourceVisibility,
  effectiveExternalWorktreeVisibility,
  type WorktreeVisibilityRepoConfig,
  type WorktreeVisibilitySourceRow
} from '@/lib/worktree-visibility-sources'
import type { RepoUpdate } from '@/store/repos/repo-state'

export type WorktreeVisibilitySourceMutation = {
  updates: RepoUpdate
  isAccepted: (latestRepo: WorktreeVisibilityRepoConfig) => boolean
}

/** Pins this project's own visibility for a source, overriding whatever Global Settings holds. */
export function createWorktreeVisibilitySourceMutation(
  repo: WorktreeVisibilityRepoConfig,
  source: WorktreeVisibilitySourceRow,
  visibility: ExternalWorktreeVisibility,
  visibilityDefaults: WorktreeVisibilityDefaults | undefined
): WorktreeVisibilitySourceMutation {
  if (source.kind === 'other') {
    return {
      updates: {
        externalWorktreeVisibility: visibility,
        // Re-showing clears the suppression so discovery can surface the source again.
        ...(visibility === 'show' ? { externalWorktreeDiscoverySuppressedAt: null } : {})
      },
      isAccepted: (latestRepo) =>
        effectiveExternalWorktreeVisibility(latestRepo, visibilityDefaults) === visibility
    }
  }
  const match =
    source.kind === 'built-in'
      ? ({ kind: 'built-in', id: source.id } as const)
      : ({ kind: 'custom', id: source.source.id } as const)
  return {
    updates: {
      worktreeVisibilitySourcePreferences: buildWorktreeSourcePreferenceUpdate(
        repo,
        match,
        visibility
      )
    },
    isAccepted: (latestRepo) =>
      source.kind === 'built-in'
        ? effectiveBuiltInWorktreeSourceVisibility(latestRepo, source.id, visibilityDefaults) ===
          visibility
        : effectiveCustomWorktreeSourceVisibility(
            latestRepo,
            source.source.id,
            visibilityDefaults
          ) === visibility
  }
}
