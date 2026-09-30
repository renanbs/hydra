// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React from 'react'
import type { WorktreeCardController } from './use-worktree-card-controller'
import { WorktreeCardPortsTrigger } from './WorktreeCardPortsTrigger'
import { WorktreeCardReviewBadge } from './WorktreeCardReviewBadge'

export interface WorktreeCardPresentation {
  showPinnedRepoIcon: boolean
  showInlineRepoBadge: boolean
  showRepoBadgeInMetaRow: boolean
  showHostContextBadge: boolean
  showIdentityInNewCard: boolean
  showDetachedHeadInMetaRow: boolean
  showBranch: boolean
  showConflictOperationBadge: boolean
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
  titleWrapper?: (title: React.ReactElement) => React.ReactElement
  parentContentMarginLeft: number
  cardStyle?: React.CSSProperties
  detailsAndPorts: React.ReactNode
  titleRowIndicators: React.ReactNode
  titleOnlyCard: boolean
}

export function buildWorktreeCardPresentation(card: WorktreeCardController): WorktreeCardPresentation {
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
    metaRowChildren,
    isDeleting
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
  const showConflictOperationBadge = Boolean(
    conflictOperation && conflictOperation !== 'unknown' && conflictOperation !== 'rebase'
  )
  const hasMetadataBadge = showConflictOperationBadge
  const showUnreadQuickAction = Boolean(!affiliateListMode && showStatus && !newCardStyle)
  const showCombinedStatusSlot = Boolean(showStatus)
  const showTitleRowPrimary = Boolean(compactCards && (worktree.is_main ?? worktree.isMainWorktree) && !isFolder)
  const showMetaRowDetails = Boolean(!newCardStyle && !compactCards && (hasDetails || hasPorts))
  const showTitleRowIndicators = Boolean((newCardStyle || compactCards) && (hasDetails || hasPorts))
  const showIdentityInNewCard = Boolean(identityDisplay && newCardStyle)

  const hasDetailedMetaRowContent = Boolean(
    (showRepoBadgeInMetaRow && repo) ||
    showHostContextBadge ||
    showBranch ||
    showIdentityInNewCard ||
    showDetachedHeadInMetaRow ||
    showConflictOperationBadge ||
    cacheStartedAt != null ||
    showMetaRowDetails ||
    metaRowChildren
  )
  const hasMetaRow = Boolean(
    compactCards
      ? hasMetadataBadge || cacheStartedAt != null || Boolean(metaRowChildren)
      : hasDetailedMetaRowContent
  )
  const showDeleteQuickAction = Boolean(
    !affiliateListMode && !isDeleting && !(worktree.is_main ?? worktree.isMainWorktree)
  )
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
  const hasHoverDetails = Boolean(review || (ports && ports.length > 0) || hasHoverIdentity)

  const cardPaddingLeft = flushSurface
    ? (contentIndent > 0 ? `${contentIndent}px` : undefined)
    : contentIndent > 0
      ? `calc(0.125rem + ${contentIndent}px)`
      : undefined
  const parentContentMarginLeft = 0
  const cardStyle = cardPaddingLeft ? { paddingLeft: cardPaddingLeft } : undefined

  const detailsAndPorts = (
    <div className="flex shrink-0 items-center gap-1">
      {hasPorts && (workspacePorts.length > 0 || (ports && ports.length > 0)) && (
        <WorktreeCardPortsTrigger ports={workspacePorts.length > 0 ? workspacePorts : ports ?? []} />
      )}
      {review && <WorktreeCardReviewBadge review={review} />}
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
    parentContentMarginLeft,
    cardStyle,
    detailsAndPorts,
    titleRowIndicators,
    titleOnlyCard
  }
}
