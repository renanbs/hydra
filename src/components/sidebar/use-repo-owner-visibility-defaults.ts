// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-repo-owner-visibility-defaults.ts
//
// D11-005: the visibility dialog resolves defaults for the repo it is mutating, not
// for whichever host the settings happen to be focused on.
import { useAppStore } from '@/store'
import type { WorktreeVisibilityDefaults } from '../../shared/global-settings-types'
import {
  getRepoOwnerWorktreeVisibilityDefaults,
  type RepoVisibilityOwner
} from '../../store/worktree-visibility-defaults-by-host'

export function useRepoOwnerVisibilityDefaults(
  repo: RepoVisibilityOwner | null | undefined
): WorktreeVisibilityDefaults | undefined {
  const settings = useAppStore((state) => state.settings)
  const defaultsByHost = useAppStore((state) => state.worktreeVisibilityDefaultsByHost)
  return repo ? getRepoOwnerWorktreeVisibilityDefaults(repo, settings, defaultsByHost) : undefined
}
