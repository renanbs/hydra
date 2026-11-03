// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-card-presentation.tsx
import React from 'react'
import { canShowWorkspaceDeleteQuickAction } from './workspace-delete-quick-action'
import type { WorktreeCardWithExtras } from './worktree-card-controller-extras'
import { WorktreeCardPortsTrigger } from './WorktreeCardPorts'
import { WorktreeCardReviewBadge } from './WorktreeCardReviewBadge'
import { getFlushWorktreeCardPaddingLeft } from './worktree-list/rows/indentation'
import {
  WorktreeCardMetaBadges,
  hasWorktreeCardDetails
} from './worktree-card-metadata-badges'
import { getWorktreeCardTitleDisplay } from './worktree-card-title-display'

export interface WorktreeCardPresentation {
  showPinnedRepoIcon: boolean
  showInlineRepoBadge: boolean
  showRepoBadgeInMetaRow: boolean
  showHostContextBadge: boolean
  showIdentityInNewCard: boolean
  showDetachedHeadInMetaRow: boolean
  showBranch: boolean
  showConflictOperationBadge: boolean
  /** The checkout has commits ahead of or behind its upstream. */
  showUpstreamChips: boolean
  showUnreadQuickAction: boolean
  showCombinedStatusSlot: boolean
  showTitleRowPrimary: boolean
  showMetaRowDetails: boolean
  showTitleRowIndicators: boolean
  hasMetaRow: boolean
  showHeaderActions: boolean
  showDeleteQuickAction: boolean
  hoverBranchName?: string
  hoverWorkspaceTitle?: string
  hasHoverDetails: boolean
  /** Title the card paints, after issue/Linear/Jira/review fallbacks. */
  cardTitle: string
  titleWrapper?: (title: React.ReactElement) => React.ReactElement
  parentContentMarginLeft: number
  cardStyle?: React.CSSProperties
  detailsAndPorts: React.ReactNode
  titleRowIndicators: React.ReactNode
  titleOnlyCard: boolean
}

export function buildWorktreeCardPresentation(
  card: WorktreeCardWithExtras,
  { deleteModifierPressed = false }: { deleteModifierPressed?: boolean } = {}
): WorktreeCardPresentation {
  const {
    worktree,
    repo,
    inPinnedSection,
    hideRepoBadge,
    hostContextLabel,
    affiliateListMode,
    flushSurface,
    contentIndent,
    newCardStyle,
    compactCards,
    isFolder,
    detachedHeadDisplay,
    branch,
    identityDisplay,
    conflictOperation,
    upstreamStatus,
    cacheStartedAt,
    hasDetails,
    hasPorts,
    showStatus,
    showInlineAgentList,
    showLineageChildChip,
    remoteBranchConflict,
    visibleCardTitle,
    workspacePorts,
    ports,
    review,
    metadata,
    metaRowChildren,
    isDeleting,
    issueDisplay,
    linearIssueDisplay,
    jiraIssueDisplay,
    automationProvenance,
    cliCreated
  } = card

  const showPinnedRepoIcon = Boolean(inPinnedSection && repo)
  const showRepoIdentityInTitle = Boolean(newCardStyle || compactCards)
  const showInlineRepoBadge = Boolean(
    showRepoIdentityInTitle && repo && !hideRepoBadge && !isFolder && !showPinnedRepoIcon
  )
  const showRepoBadgeInMetaRow = Boolean(
    !showRepoIdentityInTitle && repo && !hideRepoBadge && !showPinnedRepoIcon
  )
  const showHostContextBadge = Boolean(!compactCards && hostContextLabel)
  const showDetachedHeadInMetaRow = Boolean(!compactCards && !isFolder && detachedHeadDisplay !== null)
  const showBranch = Boolean(
    !isFolder &&
      branch.length > 0 &&
      !newCardStyle &&
      (!compactCards || branch !== (worktree.display_name || worktree.displayName))
  )
  // Why: rebases already surface in source control, so dense cards skip the persistent rebase chip.
  const showConflictOperationBadge = Boolean(
    conflictOperation && conflictOperation !== 'unknown' && conflictOperation !== 'rebase'
  )
  const showUpstreamChips = Boolean(
    upstreamStatus &&
      !isFolder &&
      (upstreamStatus.ahead > 0 || upstreamStatus.behind > 0)
  )
  const hasMetadataDetails = hasWorktreeCardDetails({
    comment: metadata?.comment,
    linkedIssue: metadata?.linkedIssue,
    linkedLinearIssue: metadata?.linkedLinearIssue,
    linkedJiraIssue: metadata?.linkedJiraIssue,
    automationProvenance: worktree.automationProvenanceKind ?? automationProvenance,
    cliProvenance: worktree.cliProvenanceKind ?? cliCreated,
    hasReview: Boolean(review)
  })
  const showUnreadQuickAction = Boolean(!affiliateListMode && showStatus && !newCardStyle)
  const showCombinedStatusSlot = Boolean(showStatus)
  const showTitleRowPrimary = Boolean(compactCards && (worktree.is_main ?? worktree.isMainWorktree) && !isFolder)
  const showMetaRowDetails = Boolean(
    !newCardStyle && !compactCards && (hasDetails || hasPorts || hasMetadataDetails)
  )
  const showTitleRowIndicators = Boolean(
    (newCardStyle || compactCards) && (hasDetails || hasPorts || hasMetadataDetails)
  )
  const showIdentityInNewCard = Boolean(identityDisplay && newCardStyle)

  const hasDetailedMetaRowContent = Boolean(
    (showRepoBadgeInMetaRow && repo) ||
      showHostContextBadge ||
      showBranch ||
      showIdentityInNewCard ||
      showDetachedHeadInMetaRow ||
      showConflictOperationBadge ||
      showUpstreamChips ||
      cacheStartedAt != null ||
      showMetaRowDetails ||
      metaRowChildren
  )
  const hasMetaRow = Boolean(
    compactCards
      ? showConflictOperationBadge ||
        showUpstreamChips ||
        cacheStartedAt != null ||
        Boolean(metaRowChildren)
      : hasDetailedMetaRowContent
  )
  // Orca `canShowWorkspaceDeleteQuickAction`: the trash affordance is gated on the
  // held Option/Alt modifier, and is never offered for an in-flight delete or the
  // primary checkout.
  const isMainWorktree = Boolean(worktree.is_main ?? worktree.isMainWorktree)
  const showDeleteQuickAction =
    !affiliateListMode &&
    canShowWorkspaceDeleteQuickAction({ deleteModifierPressed, isDeleting, isMainWorktree })
  const showHeaderActions = Boolean(showTitleRowPrimary || showDeleteQuickAction)

  const trimmedVisibleCardTitle = visibleCardTitle.trim()
  const showBranchIdentityHover = Boolean(
    newCardStyle
      ? Boolean(identityDisplay) && identityDisplay !== trimmedVisibleCardTitle
      : Boolean(compactCards && showBranch)
  )
  const hoverBranchName = newCardStyle
    ? identityDisplay
    : showBranchIdentityHover
      ? branch
      : undefined
  const hoverWorkspaceTitle =
    trimmedVisibleCardTitle.length > 0 && trimmedVisibleCardTitle !== hoverBranchName
      ? trimmedVisibleCardTitle
      : undefined
  const hasHoverIdentity = Boolean(hoverWorkspaceTitle || hoverBranchName)
  const hasHoverDetails = Boolean(
    review ||
      (ports && ports.length > 0) ||
      hasHoverIdentity ||
      hasMetadataDetails ||
      issueDisplay ||
      linearIssueDisplay ||
      jiraIssueDisplay
  )

  // Orca `getWorktreeCardTitleDisplay`: when the persisted name is just the branch
  // name, the card prefers a real task/review subject over the git identity.
  const displayTitle = getWorktreeCardTitleDisplay({
    storedDisplayName: visibleCardTitle,
    branchName: branch,
    linearIssueTitle: linearIssueDisplay?.title,
    jiraIssueTitle: jiraIssueDisplay?.title,
    issueTitle: issueDisplay?.title,
    reviewTitle: review?.title
  })
  const cardTitle = displayTitle || visibleCardTitle

  // Why: when the details hover is mounted the card owns the rich affordance, so
  // the title must not stack a second (truncation) tooltip on top of it.
  const titleWrapper = newCardStyle
    ? hasHoverDetails
      ? (title: React.ReactElement): React.ReactElement => title
      : undefined
    : undefined

  // Orca parity (`worktree-card-presentation.tsx:193-199`): a flush card pulls its
  // content back toward the surface edge — `max(minInset, contentIndent - pullback)`,
  // with an extra pullback while the status lane owns the left column. Using the raw
  // contentIndent here pushed both the text and the clickable band to the right.
  const applyNewCardStyleStatusLaneOffset = newCardStyle && showCombinedStatusSlot
  const cardPaddingLeft = flushSurface
    ? getFlushWorktreeCardPaddingLeft(contentIndent, applyNewCardStyleStatusLaneOffset)
    : contentIndent > 0
      ? `calc(0.125rem + ${contentIndent}px)`
      : undefined
  const parentContentMarginLeft = 0
  const cardStyle = cardPaddingLeft ? { paddingLeft: cardPaddingLeft } : undefined

  // Why: the new card style moved the review signal into the left status lane, so
  // painting the row badge too would state the same PR twice on one line.
  const showInlineReviewBadge = Boolean(review && !newCardStyle)
  const detailsAndPorts = (
    <div className="flex shrink-0 items-center gap-1">
      <WorktreeCardMetaBadges
        metadata={metadata}
        automationCreated={Boolean(worktree.automationProvenanceKind ?? automationProvenance)}
        cliCreated={Boolean(worktree.cliProvenanceKind ?? cliCreated)}
        hasReview={Boolean(review)}
      />
      {hasPorts && (workspacePorts.length > 0 || (ports && ports.length > 0)) && (
        <WorktreeCardPortsTrigger ports={workspacePorts.length > 0 ? workspacePorts : ports ?? []} />
      )}
      {showInlineReviewBadge && review ? <WorktreeCardReviewBadge review={review} /> : null}
      {metaRowChildren}
    </div>
  )

  const titleRowIndicators = showTitleRowIndicators ? (
    <div className="ml-auto flex shrink-0 items-center gap-1 pr-1.5">{detailsAndPorts}</div>
  ) : null
  const hasSecondaryCardContent = Boolean(
    hasMetaRow || !!remoteBranchConflict || showInlineAgentList || showLineageChildChip
  )
  const titleOnlyCard = !hasSecondaryCardContent

  return {
    showPinnedRepoIcon,
    showInlineRepoBadge,
    showRepoBadgeInMetaRow,
    showHostContextBadge,
    showIdentityInNewCard,
    showDetachedHeadInMetaRow,
    showBranch,
    showConflictOperationBadge,
    showUpstreamChips,
    showUnreadQuickAction,
    showCombinedStatusSlot,
    showTitleRowPrimary,
    showMetaRowDetails,
    showTitleRowIndicators,
    hasMetaRow,
    showHeaderActions,
    showDeleteQuickAction,
    hoverBranchName,
    hoverWorkspaceTitle,
    hasHoverDetails,
    cardTitle,
    titleWrapper,
    parentContentMarginLeft,
    cardStyle,
    detailsAndPorts,
    titleRowIndicators,
    titleOnlyCard
  }
}
