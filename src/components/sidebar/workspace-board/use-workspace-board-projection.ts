import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { buildHostIdByRepoId } from '../repo-execution-host-index'
import type { PrDisplay } from '../pr-display'
import type { GitWorktreeInfo, HydraProject, WorkspacePort, WorktreeSession } from '../types'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import {
  buildWorkspaceBoardLanes,
  type WorkspaceBoardLane,
} from './workspace-board-worktrees'

/** Stable empty set: a fresh one per render would thrash the lane memo. */
const EMPTY_PATHS: ReadonlySet<string> = new Set<string>()

export type WorkspaceBoardProjection = {
  lanes: WorkspaceBoardLane[]
  /** Persisted lane width (Orca `workspaceBoardColumnWidth`); this increment has no resize handle. */
  columnWidth: number
}

/**
 * Projects the sidebar's visible workspaces into the board's status lanes.
 *
 * `getProjectWorktrees` is the sidebar's own per-project filter + sort callback:
 * whatever the sidebar hides (hidden worktrees, "Hide primary"/"Hide detached",
 * its search box, its project filter) is absent here too.
 */
export function useWorkspaceBoardProjection(args: {
  displayProjects: readonly HydraProject[]
  getProjectWorktrees: (project: HydraProject) => GitWorktreeInfo[]
  sessions: readonly WorktreeSession[]
  displayOptions: WorkspaceDisplayOptions
  activeWorktreePath?: string | null
  liveWorkspacePaths?: ReadonlySet<string>
  pinnedWorktreePaths?: ReadonlySet<string>
  unreadWorktreePaths?: ReadonlySet<string>
  portsByWorktree?: ReadonlyMap<string, WorkspacePort[]>
  prByPath?: Readonly<Record<string, PrDisplay>>
}): WorkspaceBoardProjection {
  const {
    displayProjects,
    getProjectWorktrees,
    sessions,
    displayOptions,
    activeWorktreePath,
    liveWorkspacePaths,
    pinnedWorktreePaths,
    unreadWorktreePaths,
    portsByWorktree,
    prByPath,
  } = args
  const workspaceStatuses = useAppStore((state) => state.workspaceStatuses)
  const columnWidth = useAppStore((state) => state.workspaceBoardColumnWidth)
  const storeRepos = useAppStore((state) => state.repos)
  const hostIdByRepoId = useMemo(() => buildHostIdByRepoId(storeRepos), [storeRepos])
  const livePaths = liveWorkspacePaths ?? EMPTY_PATHS
  const pinnedPaths = pinnedWorktreePaths ?? EMPTY_PATHS
  const unreadPaths = unreadWorktreePaths ?? EMPTY_PATHS

  const lanes = useMemo(
    () =>
      buildWorkspaceBoardLanes({
        projects: displayProjects,
        getProjectWorktrees,
        sessions,
        liveWorkspacePaths: livePaths,
        pinnedWorktreePaths: pinnedPaths,
        unreadWorktreePaths: unreadPaths,
        displayOptions,
        workspaceStatuses,
        activeWorktreePath: activeWorktreePath ?? null,
        hostIdByRepoId,
        portsByWorktree,
        prByPath,
      }),
    [
      activeWorktreePath,
      displayOptions,
      displayProjects,
      getProjectWorktrees,
      hostIdByRepoId,
      livePaths,
      pinnedPaths,
      portsByWorktree,
      prByPath,
      sessions,
      unreadPaths,
      workspaceStatuses,
    ]
  )

  return { lanes, columnWidth }
}
