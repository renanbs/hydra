import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { buildHostIdByRepoId } from '../repo-execution-host-index'
import type { WorkspaceStatus } from '../../../shared/worktree/types'
import type { PrDisplay } from '../pr-display'
import type { GitWorktreeInfo, HydraProject, WorkspacePort, WorktreeSession } from '../types'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import {
  buildWorkspaceBoardDragGroups,
  buildWorkspaceBoardLaneFullWorktreeIds,
  buildWorkspaceBoardLanes,
  buildWorkspaceBoardUnambiguousWorktreeIdIndex,
  type WorkspaceBoardCard,
  type WorkspaceBoardLane,
} from './workspace-board-worktrees'
import { useVisibleWorkspaceKanbanWorktreeIds } from './use-visible-workspace-kanban-worktree-ids'

/** Stable empty set: a fresh one per render would thrash the lane memo. */
const EMPTY_PATHS: ReadonlySet<string> = new Set<string>()

export type WorkspaceBoardProjection = {
  lanes: WorkspaceBoardLane[]
  /** The full board order, one group per lane, in the ids a sidebar drag speaks. */
  boardDragGroups: Array<{ key: WorkspaceStatus; worktreeIds: string[] }>
  /** Each lane's full membership, by status. */
  laneFullWorktreeIds: Map<WorkspaceStatus, string[]>
  /** id → card for ids that name exactly one host-qualified card. */
  worktreeById: Map<string, WorkspaceBoardCard>
  /**
   * Persisted lane width (Orca `workspaceBoardColumnWidth`). The drawer hands it to the
   * resize hook as the committed value; the hook's live draft is what actually paints.
   */
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
  /** The sidebar's sort mode; `manual` preserves the user's explicit order. */
  sortBy?: string
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
    sortBy,
  } = args
  const workspaceStatuses = useAppStore((state) => state.workspaceStatuses)
  const columnWidth = useAppStore((state) => state.workspaceBoardColumnWidth)
  const storeRepos = useAppStore((state) => state.repos)
  const hostIdByRepoId = useMemo(() => buildHostIdByRepoId(storeRepos), [storeRepos])
  const visibleWorktreeIdentities = useVisibleWorkspaceKanbanWorktreeIds()
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
        sortBy,
        portsByWorktree,
        prByPath,
        visibleWorktreeIdentities,
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
      sortBy,
      unreadPaths,
      visibleWorktreeIdentities,
      workspaceStatuses,
    ]
  )

  const boardDragGroups = useMemo(() => buildWorkspaceBoardDragGroups(lanes), [lanes])
  const laneFullWorktreeIds = useMemo(
    () => buildWorkspaceBoardLaneFullWorktreeIds(lanes),
    [lanes]
  )
  const worktreeById = useMemo(
    () => buildWorkspaceBoardUnambiguousWorktreeIdIndex(lanes.flatMap((lane) => lane.cards)),
    [lanes]
  )

  return { lanes, boardDragGroups, laneFullWorktreeIds, worktreeById, columnWidth }
}
