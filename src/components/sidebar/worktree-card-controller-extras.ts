// Extra controller fields consumed by the card surface. They are produced by the
// controller pipeline (D04b) but are not part of `WorktreeCardProps`, so the
// surface reads them through this structural intersection instead of growing the
// public props contract with renderer-internal data.
import type { IssueInfo } from '../../shared/github/pull-request-types'
import type { ExecutionHostId } from '../../shared/execution-host'
import type { WorktreeCardController } from './use-worktree-card-controller'
import type {
  WorktreeCardIssueDisplay,
  WorktreeCardJiraIssueDisplay,
  WorktreeCardLinearIssueDisplay
} from './worktree-card-meta-types'
import type { WorktreeUpstreamStatus } from '../../lib/worktree-upstream-status'

export type ParsedRepoHost = {
  kind: 'local' | 'ssh' | 'runtime'
  id?: string
} | null

/** A work-item link the sidebar knows about but has no provider title for yet. */
export type WorktreeCardLinkFallback = { number: number; provider?: string | null } | null

export type WorktreeCardControllerExtras = {
  /** Git operation currently in flight in this checkout (Orca `conflictOperation`). */
  conflictOperation?: string
  /** The branch already exists on the remote under another local worktree. */
  remoteBranchConflict?: { remote: string; branchName: string } | boolean | null
  /** Ahead/behind of this checkout against its upstream, when it has one. */
  upstreamStatus?: WorktreeUpstreamStatus | null
  issueDisplay?: WorktreeCardIssueDisplay | null
  linearIssueDisplay?: WorktreeCardLinearIssueDisplay | null
  jiraIssueDisplay?: WorktreeCardJiraIssueDisplay | null
  handleEditIssue?: (event: React.MouseEvent) => void
  handleEditComment?: (event: React.MouseEvent) => void
  handleOpenIssueInBrowser?: (url: string) => void
  handleOpenReviewInOrca?: (event: React.MouseEvent) => void
  handleOpenReviewInBrowser?: (url: string) => void
  handleUnlinkReview?: () => void
  sshTargetLabel?: string | null
  sshTargetRemoved?: boolean
  sshStatus?: string | null
  sshOwnerEnvironmentId?: string | null
  isSshDisconnected?: boolean
  runtimeHostLabel?: string | null
  parsedRepoHost?: ParsedRepoHost
  repoHostId?: ExecutionHostId | null
  childWorkspaceShortLabel?: string
  lineageChildAriaLabel?: string
  unreadTooltip?: string
  /** Debounced automation provenance snapshot; absent when the row has none. */
  automationProvenance?: {
    automationId: string
    automationNameSnapshot: string
    automationRunId: string
    automationRunTitleSnapshot: string
    hostId?: ExecutionHostId
  } | null
  /** Review link the backend has not resolved into a provider display yet. */
  linkedReviewFallback?: WorktreeCardLinkFallback
  /** Issue link the backend has not resolved into a provider title yet. */
  linkedIssueFallback?: WorktreeCardLinkFallback
}

// Why Omit first: the controller still carries a placeholder (boolean) for names
// this contract owns, and an intersection of the two would collapse to the
// placeholder type instead of the richer projected one.
export type WorktreeCardWithExtras = Omit<
  WorktreeCardController,
  keyof WorktreeCardControllerExtras
> &
  WorktreeCardControllerExtras

export type { IssueInfo }
