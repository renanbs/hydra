// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/worktree-visibility-repo-sources.ts`: repo-row lookups
// scoped by host identity. The acceptance predicates read the latest row for the mutation
// scope, so a write that landed on a stale/other host never reads as a success.
import { useAppStore } from '@/store'
import type { CustomWorktreeVisibilitySource, Repo } from '../../shared/repo-types'
import type { WorktreeVisibilityDefaults } from '../../shared/global-settings-types'
import {
  normalizeCustomWorktreeVisibilitySources,
  resolveCustomWorktreeVisibilitySources,
  type WorktreeVisibilityRepoConfig
} from '@/lib/worktree-visibility-sources'
import { getRepoHostIdentity } from '@/store/slices/repo-host-identity'

export function getLatestRepoForVisibilityScope(scope: string): Repo | null {
  return useAppStore.getState().repos.find((repo) => getRepoHostIdentity(repo) === scope) ?? null
}

export function getRepoCustomWorktreeVisibilitySourceIds(
  repo: WorktreeVisibilityRepoConfig | null
): Set<string> {
  return new Set(
    normalizeCustomWorktreeVisibilitySources(repo?.customWorktreeVisibilitySources)?.map(
      (source) => source.id
    ) ?? []
  )
}

export function isDuplicateWorktreeVisibilitySource(
  repo: WorktreeVisibilityRepoConfig,
  defaults: WorktreeVisibilityDefaults | undefined,
  candidate: CustomWorktreeVisibilitySource
): boolean {
  const current = resolveCustomWorktreeVisibilitySources(repo, defaults)
  return (
    normalizeCustomWorktreeVisibilitySources([...current, candidate])?.length !== current.length + 1
  )
}
