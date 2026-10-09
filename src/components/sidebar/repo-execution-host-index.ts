import type { Repo } from '../../shared/repo-types'
import { getRepoExecutionHostId, type ExecutionHostId } from '../../shared/execution-host'

/**
 * Host ownership per repo. The catalog→sidebar bridge drops host fields, so the
 * only host-aware source on the render path is the store's Orca-compat catalog;
 * when it is empty every repo stays local (exactly today's single-host list).
 *
 * Shared by the sidebar list and the workspace board so a row's host-qualified
 * identity — and therefore its delete state and card key — matches on both.
 */
export function buildHostIdByRepoId(repos: readonly Repo[]): Map<string, ExecutionHostId> {
  const byRepoId = new Map<string, ExecutionHostId>()
  for (const repo of repos) {
    if (!repo?.id) continue
    if (repo.connectionId || repo.executionHostId) {
      byRepoId.set(repo.id, getRepoExecutionHostId(repo))
    }
  }
  return byRepoId
}
