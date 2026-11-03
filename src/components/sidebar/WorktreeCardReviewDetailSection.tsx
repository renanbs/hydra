// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeCardReviewDetailSection.tsx
import React from 'react'
import { Copy, Ellipsis, ExternalLink, GitPullRequest, Globe, MonitorUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { HostedReviewUnlinkMenuItem } from '@/components/HostedReviewUnlinkMenuItem'
import {
  WorktreeCardDetailSection,
  WorktreeCardDetailSectionContent
} from './WorktreeCardDetailSection'
import { DetailHeader, MetadataActionIcon } from './worktree-card-detail-controls'
import { ReviewChecksBadge, ReviewStateBadge } from './WorktreeCardMetadataStatusBadges'
import type { PrDisplay } from './pr-display'
import { getProviderName, getReviewLabel, reviewLabel, ReviewIcon } from './pr-display'

type WorktreeCardReviewDetailSectionProps = {
  review: PrDisplay | null
  /** Persisted review number with no provider details cached yet. */
  fallbackNumber?: number | null
  reviewMenuOpen: boolean
  onReviewMenuOpenChange: (open: boolean) => void
  onCopyReviewLink?: () => void
  onOpenReviewInBrowser?: (url: string) => void
  /** Opens the review in Hydra's Tasks view (Orca `Open in Orca`). */
  onOpenReviewInOrca?: (event: React.MouseEvent) => void
  onUnlinkReview?: () => void
  closeHover: () => void
}

export function WorktreeCardReviewDetailSection({
  review,
  fallbackNumber,
  reviewMenuOpen,
  onReviewMenuOpenChange,
  onCopyReviewLink,
  onOpenReviewInBrowser,
  onOpenReviewInOrca,
  onUnlinkReview,
  closeHover
}: WorktreeCardReviewDetailSectionProps): React.JSX.Element | null {
  if (!review && fallbackNumber == null) {
    return null
  }

  const label = review ? getReviewLabel(review) : 'PR'
  const number = review?.number ?? fallbackNumber ?? null
  const provider = review ? getProviderName(review) : 'GitHub'
  const moreActionsLabel = translate(
    'auto.components.sidebar.WorktreeCardMeta.dbe2d18972',
    'More {{value0}} actions',
    { value0: label }
  )
  const dismissAndOpenReview = (event: React.MouseEvent): void => {
    closeHover()
    onOpenReviewInOrca?.(event)
  }
  const moreActionsTrigger = (
    <DropdownMenuTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="size-6"
        aria-label={moreActionsLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <Ellipsis className="size-3" />
      </Button>
    </DropdownMenuTrigger>
  )

  return (
    <WorktreeCardDetailSection>
      <DetailHeader
        icon={
          review ? (
            <ReviewIcon review={review} className="size-3" />
          ) : (
            <GitPullRequest className="size-3 text-muted-foreground" />
          )
        }
        label={translate(
          'auto.components.sidebar.WorktreeCardReviewDetailSection.reviewHeader',
          '{{value0}} #{{value1}}',
          { value0: label, value1: number ?? '' }
        )}
        actions={
          <>
            {(onCopyReviewLink || onOpenReviewInBrowser || onUnlinkReview) && (
              <DropdownMenu
                modal={false}
                open={reviewMenuOpen}
                onOpenChange={onReviewMenuOpenChange}
              >
                {reviewMenuOpen ? (
                  moreActionsTrigger
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>{moreActionsTrigger}</TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4}>
                      {moreActionsLabel}
                    </TooltipContent>
                  </Tooltip>
                )}
                <DropdownMenuContent align="end" className="w-52">
                  {onOpenReviewInBrowser && (
                    <DropdownMenuItem
                      onSelect={() => {
                        closeHover()
                        onOpenReviewInBrowser(review?.url ?? '')
                      }}
                    >
                      <Globe className="size-3.5" />
                      {translate(
                        'auto.components.sidebar.WorktreeCardMeta.openInOrcaBrowser',
                        'Open in Orca browser'
                      )}
                    </DropdownMenuItem>
                  )}
                  {onCopyReviewLink && (
                    <DropdownMenuItem
                      onSelect={() => {
                        closeHover()
                        onCopyReviewLink()
                      }}
                    >
                      <Copy className="size-3.5" />
                      {translate(
                        'auto.components.sidebar.WorktreeCardReviewDetailSection.copyLink',
                        'Copy link'
                      )}
                    </DropdownMenuItem>
                  )}
                  {onUnlinkReview && (
                    <HostedReviewUnlinkMenuItem
                      reviewLabel={label}
                      reviewIdentifier={`${label === 'MR' ? '!' : '#'}${number ?? ''}`}
                      providerLabel={provider}
                      onSelect={() => {
                        closeHover()
                        onUnlinkReview()
                      }}
                    />
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {review?.url && onOpenReviewInOrca && (
              <MetadataActionIcon
                label={translate(
                  'auto.components.sidebar.WorktreeCardMeta.2c67730e07',
                  'Open in Orca'
                )}
                onClick={dismissAndOpenReview}
              >
                <MonitorUp className="size-3" />
              </MetadataActionIcon>
            )}
            {review?.url && (
              <MetadataActionIcon
                label={translate(
                  'auto.components.sidebar.WorktreeCardMeta.ad25c3ff05',
                  'View on {{value0}}',
                  { value0: provider }
                )}
                href={review?.url}
              >
                <ExternalLink className="size-3" />
              </MetadataActionIcon>
            )}
          </>
        }
      />
      <WorktreeCardDetailSectionContent className="space-y-1.5">
        <div className="break-words text-[13px] font-semibold leading-snug text-foreground">
          {review ? (review.title ?? reviewLabel(review)) : `${label} details unavailable`}
        </div>
        {(review?.state || review?.status) && (
          <div className="flex flex-wrap gap-1">
            <ReviewStateBadge state={review?.state} label={label} />
            <ReviewChecksBadge status={review?.status} />
          </div>
        )}
      </WorktreeCardDetailSectionContent>
    </WorktreeCardDetailSection>
  )
}
