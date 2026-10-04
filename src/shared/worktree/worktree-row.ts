import type { ExecutionHostId } from '../execution-host'
import type { Worktree } from './types'

/**
 * The scan's `GitWorktreeInfo` wire row (`src/components/sidebar/types.ts`),
 * read structurally so this shared mapping bridges it into the store
 * `Worktree` without a shared → component import.
 */
export type WorktreeRowSource = {
  id?: string
  path: string
  head_commit: string
  branch: string
  is_bare: boolean
  is_main?: boolean
  isMainWorktree?: boolean
  created_at?: number | null
  status?: string | null
  display_name?: string | null
  displayName?: string | null
  /** Scan-only provenance kind (`'created-by-automation'`), projected into
   *  `Worktree.automationProvenance` so the sidebar filters can read it. */
  automationProvenanceKind?: string
  /** Scan-only provenance kind (`'created-by-cli'`), projected into
   *  `Worktree.cliProvenance`. */
  cliProvenanceKind?: string
  is_pinned?: boolean | null
  is_unread?: boolean | null
}

/**
 * The ONE `GitWorktreeInfo → Worktree` bridge: the sidebar's painted model is
 * Hydra's snake_case git row, while the ported row pipeline (and now the live
 * store's `worktreesByRepo`) speaks Orca's `Worktree`. Grouping, pinning, lane
 * order and section elision stay in the pipeline (`computeSidebarRows`).
 */
export function toWorktreeRow(
  worktree: WorktreeRowSource,
  context: {
    repoId: string
    hostId?: ExecutionHostId
    /** Defaults to the row's persisted pin flag when omitted. */
    isPinned?: boolean
    /** Defaults to the row's persisted unread flag when omitted. */
    isUnread?: boolean
    /** Defaults to the row's persisted status when omitted. */
    status?: string | null
  }
): Worktree {
  const { repoId, hostId, isPinned, isUnread, status } = context
  return {
    id: worktree.id ?? `${repoId}::${worktree.path}`,
    repoId,
    projectId: repoId,
    displayName: worktree.displayName ?? worktree.display_name ?? worktree.branch,
    comment: "",
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: isUnread ?? worktree.is_unread ?? false,
    isPinned: isPinned ?? worktree.is_pinned ?? false,
    sortOrder: 0,
    lastActivityAt: worktree.created_at ?? 0,
    workspaceStatus: status ?? worktree.status ?? undefined,
    createdAt: worktree.created_at ?? undefined,
    path: worktree.path,
    head: worktree.head_commit,
    branch: worktree.branch,
    isBare: worktree.is_bare,
    isMainWorktree: worktree.is_main ?? worktree.isMainWorktree ?? false,
    // Provenance only carries the KIND from the scan; the ported predicates
    // (`visible-worktree-kinds.ts`) read `.kind` alone, so the minimal object is
    // cast past the Orca snapshot fields the sidebar never renders.
    automationProvenance:
      worktree.automationProvenanceKind === "created-by-automation"
        ? ({ kind: "created-by-automation" } as Worktree["automationProvenance"])
        : undefined,
    cliProvenance:
      worktree.cliProvenanceKind === "created-by-cli"
        ? ({ kind: "created-by-cli" } as Worktree["cliProvenance"])
        : undefined,
    ...(hostId ? { hostId } : {}),
  }
}
