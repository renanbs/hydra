import type { Repo } from '../../../../shared/repo-types'
import type { ExecutionHostId } from '../../../../shared/execution-host'
import type { HydraProject } from '../../types'

/**
 * The ONE `HydraProject → Repo` projection for the ported row pipeline.
 *
 * Why it lives outside `WorktreeList`: the painted list builds rows from it, and the
 * sidebar's sort needs the same repo labels (`displayName`) to order by Project. Two
 * copies would drift on the display-name fallback.
 */
export function toPipelineRepo(args: {
  project: HydraProject
  projectGroupId: string | null
  hostId: ExecutionHostId | undefined
}): Repo {
  const { project, projectGroupId, hostId } = args
  return {
    id: project.id,
    path: project.path,
    displayName: project.displayName ?? project.name,
    badgeColor: project.color ?? '#64748b',
    addedAt: 0,
    projectGroupId,
    // Why: the discovered-worktree notice candidates are built off the repo
    // (Orca `buildImportedWorktreesCardCandidates`), so the pipeline repo has to
    // carry the phase state the project persists — otherwise every repo looks
    // un-prompted and un-suppressed.
    ...(project.externalWorktreeVisibilityPromptDismissedAt != null
      ? { externalWorktreeVisibilityPromptDismissedAt: project.externalWorktreeVisibilityPromptDismissedAt }
      : {}),
    ...(project.externalWorktreeInboxBaselinePaths
      ? { externalWorktreeInboxBaselinePaths: project.externalWorktreeInboxBaselinePaths }
      : {}),
    ...(project.externalWorktreeDiscoverySuppressedAt != null
      ? { externalWorktreeDiscoverySuppressedAt: project.externalWorktreeDiscoverySuppressedAt }
      : {}),
    ...(hostId ? { executionHostId: hostId } : {}),
  }
}
