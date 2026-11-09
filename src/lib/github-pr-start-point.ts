// Hydra-local resolve of a GitHub PR start point via the Tauri backend.
// Mirrors Orca `renderer/src/lib/github-pr-start-point.ts` (local subset:
// no runtime-RPC branch — Hydra has no remote execution hosts).
import { invoke } from '@tauri-apps/api/core'

import type { GitHubPrStartPoint } from '@/shared/worktree/types'

export type PrStartPoint = GitHubPrStartPoint & {
  isCrossRepository: boolean
}

export type GitHubPrStartPointInput = {
  repoPath: string
  prNumber: number
  headRefName?: string
  baseRefName?: string
  isCrossRepository?: boolean
}

export async function resolveGitHubPrStartPointForRepo(
  input: GitHubPrStartPointInput
): Promise<PrStartPoint> {
  const result = await invoke<PrStartPoint | { error: string }>('worktrees_resolve_pr_base', {
    repoPath: input.repoPath,
    prNumber: input.prNumber,
    ...(input.headRefName ? { headRefName: input.headRefName } : {}),
    ...(input.baseRefName ? { baseRefName: input.baseRefName } : {}),
    ...(input.isCrossRepository !== undefined ? { isCrossRepository: input.isCrossRepository } : {})
  })
  if ('error' in result) {
    throw new Error(result.error)
  }
  // Backend has no push-target model (local-only): normalize wire nulls.
  return {
    baseBranch: result.baseBranch,
    ...(result.compareBaseRef ? { compareBaseRef: result.compareBaseRef } : {}),
    ...(result.pushTarget && typeof result.pushTarget === 'object'
      ? { pushTarget: result.pushTarget as GitHubPrStartPoint['pushTarget'] }
      : {}),
    ...(result.headSha ? { headSha: result.headSha } : {}),
    ...(result.branchNameOverride ? { branchNameOverride: result.branchNameOverride } : {}),
    ...(result.maintainerCanModify !== undefined && result.maintainerCanModify !== null
      ? { maintainerCanModify: result.maintainerCanModify }
      : {}),
    isCrossRepository: result.isCrossRepository ?? false
  }
}
