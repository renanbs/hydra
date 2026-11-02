// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-parent-candidates.ts (candidate collection half)
//
// Hydra's sidebar is driven by the catalog's snake_case git rows, so the picker's universe is
// built here in one place: every project's main row plus every scanned worktree, each carrying
// the identity eligibility needs (repo/project/host) and the chrome the row paints.
import { LOCAL_EXECUTION_HOST_ID, type ExecutionHostId } from '../../shared/execution-host'
import type { Repo } from '../../shared/repo-types'
import { branchName } from '../../lib/git-utils'
import { workspaceStatusFrom } from '../../lib/workspace-status-signals'
import { buildHostIdByRepoId } from './repo-execution-host-index'
import type { WorktreeParentPickerCandidate } from './worktree-parent-eligibility'
import type { GitWorktreeInfo, HydraProject, WorktreeSession } from './types'

/**
 * The parent picker's candidate universe, in sidebar order (projects, then their worktrees).
 *
 * Archived workspaces stay in the universe but are excluded by the eligibility rule; the
 * `archivedWorkspacePaths` input is how a caller that knows about archives marks them.
 */
export function buildWorktreeParentPickerCandidates(args: {
  projects: readonly HydraProject[]
  worktreesByProject: Readonly<Record<string, readonly GitWorktreeInfo[]>>
  repos?: readonly Repo[]
  sessions?: readonly WorktreeSession[]
  liveWorkspacePaths?: ReadonlySet<string>
  activeWorktreePath?: string | null
  archivedWorkspacePaths?: ReadonlySet<string>
}): WorktreeParentPickerCandidate[] {
  const hostIdByRepoId = buildHostIdByRepoId(args.repos ?? [])
  const repoById = new Map((args.repos ?? []).map((repo) => [repo.id, repo]))
  const sessions = args.sessions ?? []
  const liveWorkspacePaths = args.liveWorkspacePaths ?? new Set<string>()
  const archivedWorkspacePaths = args.archivedWorkspacePaths ?? new Set<string>()
  const activeWorktreePath = args.activeWorktreePath ?? null

  const candidates: WorktreeParentPickerCandidate[] = []
  const seen = new Set<string>()
  const pushCandidate = (args: {
    project: HydraProject
    worktree: GitWorktreeInfo
    displayName: string
  }): void => {
    const { project, worktree } = args
    if (seen.has(worktree.path)) {
      return
    }
    seen.add(worktree.path)
    const repo = repoById.get(project.id)
    const hostId: ExecutionHostId = hostIdByRepoId.get(project.id) ?? LOCAL_EXECUTION_HOST_ID
    // Same base/fallback the board reads: the project's own row owns sessions recorded
    // against the repo path, a linked worktree owns the ones recorded against its path.
    const isMainWorktree = worktree.is_main ?? worktree.isMainWorktree ?? false
    const worktreeSessions = sessions.filter(
      (session) =>
        session.project_path === worktree.path ||
        (isMainWorktree && session.project_path === project.path)
    )
    candidates.push({
      id: worktree.id ?? `${project.id}::${worktree.path}`,
      path: worktree.path,
      displayName: args.displayName,
      branch: worktree.branch,
      repoId: project.id,
      projectId: project.id,
      hostId,
      isArchived: archivedWorkspacePaths.has(worktree.path),
      repoLabel: repo?.displayName ?? project.displayName ?? project.name,
      ...(repo?.badgeColor ? { repoBadgeColor: repo.badgeColor } : {}),
      ...(repo?.connectionId ? { connectionId: repo.connectionId } : {}),
      status: workspaceStatusFrom({
        sessions: worktreeSessions,
        hasLiveTerminal: liveWorkspacePaths.has(worktree.path)
      }),
      isActive: activeWorktreePath === worktree.path
    })
  }

  for (const project of args.projects) {
    const projectWorktrees = args.worktreesByProject[project.path] ?? []
    const mainWorktree =
      projectWorktrees.find((worktree) => worktree.is_main ?? worktree.isMainWorktree) ?? null
    // A project that has not been scanned yet still needs to be its own candidate.
    pushCandidate({
      project,
      worktree:
        mainWorktree ??
        ({
          path: project.path,
          head_commit: '',
          branch: project.current_branch,
          is_bare: false,
          is_locked: false,
          is_main: true
        } as GitWorktreeInfo),
      displayName: project.displayName ?? project.name
    })
    for (const worktree of projectWorktrees) {
      pushCandidate({
        project,
        worktree,
        displayName:
          worktree.displayName ??
          worktree.display_name ??
          (branchName(worktree.branch) || worktree.path)
      })
    }
  }
  return candidates
}
