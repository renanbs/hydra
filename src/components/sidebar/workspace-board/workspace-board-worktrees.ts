import type { ExecutionHostId } from '../../../shared/execution-host'
import type { WorkspaceStatus, WorkspaceStatusDefinition } from '../../../shared/worktree/types'
import { getWorkspaceStatus } from '../../../shared/workspace-statuses'
import { getWorktreeHostIdentity } from '../../../shared/worktree/host-qualified-identity'
import { toWorktreeRow } from '../../../shared/worktree/worktree-row'
import { workspaceStatusFrom } from '../../../lib/workspace-status-signals'
import { buildSidebarLiveActivityIndex, isVisibleUnderSidebarMenuFilters } from '../visible-worktree-filters'
import type { PrDisplay } from '../pr-display'
import type { GitWorktreeInfo, HydraProject, WorkspacePort, WorktreeSession } from '../types'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import type { WorktreeStatus } from '../../../lib/worktree-status'

/** One board card: the Hydra worktree props its `WorktreeCard` paints from. */
export type WorkspaceBoardCard = {
  /** Host-qualified identity — the board's card key and `data-*` value. */
  identity: string
  /**
   * The workspace id the native HTML5 drag speaks (Orca's `Worktree.id` — the scan row's own
   * id, or `repoId::path` when it has none). The drop targets key on it — the sidebar's own
   * drag publishes the same id — and the board bridges it back onto the path the app's writers
   * key on.
   */
  worktreeId: string
  worktree: GitWorktreeInfo
  project: HydraProject
  sessions: WorktreeSession[]
  /** Agent/activity status of the card's own lane dot (never the board status). */
  activityStatus: WorktreeStatus
  prDisplay: PrDisplay | null
  ports: WorkspacePort[]
  isPinned: boolean
  isUnread: boolean
  isActive: boolean
  /** Position inside its status lane, published as `data-workspace-board-card-index`. */
  laneIndex: number
}

export type WorkspaceBoardLane = {
  status: WorkspaceStatusDefinition
  cards: WorkspaceBoardCard[]
  /**
   * Lane membership before the board's search filter. A filtered lane keeps this
   * so its badge can print "matches / total" without re-deriving the denominator.
   */
  totalCount: number
}

/**
 * Groups the sidebar's own visible workspaces into the user's `WorkspaceStatus`
 * lanes.
 *
 * Why `getProjectWorktrees` is injected: the board must show exactly the set the
 * sidebar paints, and that set is defined by the sidebar's per-project filter +
 * sort chain (`WorktreeSidebar.getFilteredAndSortedWorktrees`). Re-implementing it
 * here is how the two surfaces drift; the board reuses the sidebar's callback and
 * adds only the menu filters it shares through `isVisibleUnderSidebarMenuFilters`.
 */
export function buildWorkspaceBoardLanes(args: {
  projects: readonly HydraProject[]
  getProjectWorktrees: (project: HydraProject) => GitWorktreeInfo[]
  sessions: readonly WorktreeSession[]
  liveWorkspacePaths: ReadonlySet<string>
  pinnedWorktreePaths: ReadonlySet<string>
  unreadWorktreePaths: ReadonlySet<string>
  displayOptions: WorkspaceDisplayOptions
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
  activeWorktreePath: string | null
  hostIdByRepoId: ReadonlyMap<string, ExecutionHostId>
  portsByWorktree?: ReadonlyMap<string, WorkspacePort[]>
  prByPath?: Readonly<Record<string, PrDisplay>>
}): WorkspaceBoardLane[] {
  const {
    projects,
    getProjectWorktrees,
    sessions,
    liveWorkspacePaths,
    pinnedWorktreePaths,
    unreadWorktreePaths,
    displayOptions,
    workspaceStatuses,
    activeWorktreePath,
    hostIdByRepoId,
    portsByWorktree,
    prByPath,
  } = args
  const liveActivity = buildSidebarLiveActivityIndex(sessions, liveWorkspacePaths)
  const cardsByStatus = new Map<WorkspaceStatus, WorkspaceBoardCard[]>(
    workspaceStatuses.map((status) => [status.id, []])
  )

  for (const project of projects) {
    const hostId = hostIdByRepoId.get(project.id)
    for (const worktree of getProjectWorktrees(project)) {
      const worktreeSessions = sessions.filter(
        (session) =>
          session.project_path === worktree.path ||
          (worktree.is_main && session.project_path === project.path)
      )
      // Why no `status` context: `toWorktreeRow` must read the row's persisted
      // workspace status. Overriding it with the agent/activity status would put
      // every card in the default lane.
      const projected = toWorktreeRow(worktree, {
        repoId: project.id,
        hostId,
        isPinned: pinnedWorktreePaths.has(worktree.path),
        isUnread: unreadWorktreePaths.has(worktree.path),
      })
      if (!isVisibleUnderSidebarMenuFilters({ worktree: projected, displayOptions, liveActivity })) {
        continue
      }
      const status = getWorkspaceStatus(projected, workspaceStatuses)
      cardsByStatus.get(status)?.push({
        identity: getWorktreeHostIdentity(projected),
        worktreeId: projected.id,
        worktree,
        project,
        sessions: worktreeSessions,
        activityStatus: workspaceStatusFrom({
          sessions: worktreeSessions,
          hasLiveTerminal: liveWorkspacePaths.has(worktree.path),
        }),
        prDisplay: prByPath?.[worktree.path] ?? null,
        ports: portsByWorktree?.get(worktree.path) ?? [],
        isPinned: pinnedWorktreePaths.has(worktree.path),
        isUnread: unreadWorktreePaths.has(worktree.path),
        isActive: activeWorktreePath === worktree.path,
        laneIndex: 0,
      })
    }
  }

  // Why stable: pinned cards lead their lane (Orca's board order) while the rest
  // keep the sidebar's own sort, so the board never invents a second ordering.
  for (const cards of cardsByStatus.values()) {
    cards.sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
    cards.forEach((card, index) => {
      card.laneIndex = index
    })
  }

  return workspaceStatuses.map((status) => {
    const cards = cardsByStatus.get(status.id) ?? []
    return {
      status,
      cards,
      totalCount: cards.length,
    }
  })
}
