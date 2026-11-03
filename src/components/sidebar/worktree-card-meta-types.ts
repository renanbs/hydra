// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-meta-types.ts
//
// The metadata contract the card's badge row and details hover share. `issue`,
// `linearIssue`, `jiraIssue` and `review` are provider-projected display objects:
// the sidebar stores links as numbers/identifiers, and the hover must not invent
// a title it never got from the provider.
import type { IssueInfo } from '../../shared/github/pull-request-types'
import type { PrDisplay } from './pr-display'
import type { WorktreeCardDetailsHoverControl } from './worktree-card-details-hover-state'

export type WorktreeCardIssueDisplay =
  | IssueInfo
  | {
      number: number
      title: string
      state?: IssueInfo['state']
      url?: string
      labels?: string[]
    }

export type WorktreeCardLinearIssueDisplay = {
  identifier: string
  title: string
  url?: string
  stateName?: string
  labels?: string[]
}

export type WorktreeCardJiraIssueDisplay = {
  identifier: string
  title: string
  url: string
}

export type WorktreeCardMetaBadgesProps = {
  issue: WorktreeCardIssueDisplay | null
  linearIssue: WorktreeCardLinearIssueDisplay | null
  jiraIssue?: WorktreeCardJiraIssueDisplay | null
  review: PrDisplay | null
  comment: string | null
  automationProvenance?: unknown
  cliProvenance?: unknown
}

export type WorktreeCardMetaBadgesRootProps = WorktreeCardMetaBadgesProps &
  React.HTMLAttributes<HTMLDivElement>

export type WorktreeCardDetailsHoverProps = WorktreeCardMetaBadgesProps & {
  children: React.ReactElement
  branchName?: string
  workspaceTitle?: string
  identityOrder?: 'workspace-first' | 'branch-first'
  workspaceTitleRenameDisabled?: boolean
  detailsAfter?: React.ReactNode
  openDelay?: number
  closeDelay?: number
  onRenameWorkspaceTitle?: (displayName: string) => Promise<void> | void
  onWorkspaceTitleEditingChange?: (editing: boolean) => void
  onEditIssue?: (event: React.MouseEvent) => void
  onEditComment?: (event: React.MouseEvent) => void
  onOpenIssueInBrowser?: (url: string) => void
  onOpenReviewInBrowser?: (url: string) => void
  onUnlinkReview?: () => void
  hoverControl?: WorktreeCardDetailsHoverControl
}
