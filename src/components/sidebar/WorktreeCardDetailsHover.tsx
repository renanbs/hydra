// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/WorktreeCardMeta.tsx
//
// The workspace details hover: identity heading plus one section per piece of
// linked metadata. Sections are data-gated — an empty hover never opens — and
// every action closes the card before running so a portaled overlay cannot race
// the popover it came from.
import React, { useCallback } from 'react'
import { toast } from 'sonner'
import {
  BookOpenText,
  ExternalLink,
  Folder,
  MonitorUp,
  Pencil,
  SquareTerminal,
  StickyNote
} from 'lucide-react'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card'
import { Badge } from '@/components/ui/badge'
import { translate } from '@/i18n/i18n'
import { SelectedTextCopyMenu } from '@/components/SelectedTextCopyMenu'
import { CommentMarkdownAsync, preloadCommentMarkdown } from './comment-markdown-lazy'
import { WorktreeNotesDocumentDialog } from './WorktreeNotesDocumentDialog'
import {
  WorktreeCardDetailSection,
  WorktreeCardDetailSectionContent
} from './WorktreeCardDetailSection'
import { DetailHeader, MetadataActionIcon } from './worktree-card-detail-controls'
import { WorktreeCardHoverIdentityHeader } from './WorktreeCardHoverIdentityHeader'
import { WorktreeCardIssueDetailSection } from './WorktreeCardIssueDetailSection'
import { WorktreeCardReviewDetailSection } from './WorktreeCardReviewDetailSection'
import { LinearStateBadge } from './WorktreeCardMetadataStatusBadges'
import { WorktreeCardPortsDetails } from './WorktreeCardPorts'
import { WORKTREE_NATIVE_CONTEXT_MENU_ATTR } from './worktree-context-menu-policy'
import {
  useWorktreeCardDetailsHoverControl,
  type WorktreeCardDetailsHoverControl
} from './worktree-card-details-hover-state'
import type {
  WorktreeCardIssueDisplay,
  WorktreeCardJiraIssueDisplay,
  WorktreeCardLinearIssueDisplay
} from './worktree-card-meta-types'
import type { GitWorktreeInfo, HydraProject, WorkspacePort, WorktreeReviewStatus } from './types'
import type { PrDisplay } from './pr-display'
import { getProviderName, getReviewLabel } from './pr-display'

const COMMENT_MARKDOWN_CLASS_NAME =
  'text-[11.5px] text-foreground break-words leading-normal [&_.comment-md-p]:block [&_.comment-md-p+.comment-md-p]:mt-1'


export interface WorktreeCardDetailsHoverProps {
  worktree: GitWorktreeInfo
  project?: HydraProject
  ports?: WorkspacePort[]
  review?: WorktreeReviewStatus
  /** Persisted workspace metadata (notes + linked work items). */
  metadata?: {
    comment: string
    linkedIssue: number | null
    linkedPR: number | null
    linkedLinearIssue: string | null
    linkedJiraIssue?: string | null
  } | null
  /** Provider-projected display objects; fall back to the persisted links. */
  issue?: WorktreeCardIssueDisplay | null
  linearIssue?: WorktreeCardLinearIssueDisplay | null
  jiraIssue?: WorktreeCardJiraIssueDisplay | null
  /** The workspace was created through the CLI (Orca CLI provenance section). */
  cliCreated?: boolean
  /** Opens the workspace metadata editor for this card (Orca detail actions). */
  onEditMetadata?: () => void
  onEditIssue?: (event: React.MouseEvent) => void
  onEditComment?: (event: React.MouseEvent) => void
  onRenameWorkspaceTitle?: (displayName: string) => Promise<void> | void
  onWorkspaceTitleEditingChange?: (editing: boolean) => void
  workspaceTitleRenameDisabled?: boolean
  identityOrder?: 'workspace-first' | 'branch-first'
  onOpenIssueInBrowser?: (url: string) => void
  onOpenReviewInBrowser?: (url: string) => void
  onUnlinkReview?: () => void
  openDelay?: number
  closeDelay?: number
  hoverControl?: WorktreeCardDetailsHoverControl
  onPortKilled?: () => void
  children: React.ReactNode
}

function hasComment(comment: string | null | undefined): boolean {
  return (comment ?? '').trim().length > 0
}


/** Adapt the sidebar's review status wire shape to the badges' display shape. */
function toReviewDisplay(review: WorktreeReviewStatus | undefined): PrDisplay | null {
  if (!review?.state) {
    return null
  }
  return {
    number: review.pr_number ?? null,
    state: review.state,
    status: review.has_failing_checks ? 'failure' : null,
    provider: review.provider ?? null,
    title: review.title ?? null,
    url: review.url ?? null
  }
}

/** A persisted link with no provider title yet. */
function fallbackIssue(number: number | null | undefined): WorktreeCardIssueDisplay | null {
  return number == null ? null : { number, title: '' }
}

function fallbackLinear(identifier: string | null | undefined): WorktreeCardLinearIssueDisplay | null {
  return identifier ? { identifier, title: '' } : null
}

/**
 * Persisted Jira link → card projection. A URL yields the issue key from its last
 * path segment plus a working external link; a bare key still names the issue but
 * has no URL, so the section omits the link action rather than rendering a dead
 * one.
 */
function fallbackJira(value: string | null | undefined): WorktreeCardJiraIssueDisplay | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) {
    return { identifier: trimmed, title: '', url: '' }
  }
  const path = trimmed.split(/[?#]/)[0]
  const identifier = path.split('/').filter(Boolean).pop() ?? trimmed
  return { identifier, title: '', url: trimmed }
}

export function WorktreeCardDetailsHover(
  props: WorktreeCardDetailsHoverProps
): React.JSX.Element {
  const {
    worktree,
    project,
    ports = [],
    review,
    metadata = null,
    issue,
    linearIssue,
    jiraIssue,
    cliCreated = false,
    onEditMetadata,
    onEditIssue,
    onEditComment,
    onRenameWorkspaceTitle,
    onWorkspaceTitleEditingChange,
    workspaceTitleRenameDisabled = false,
    identityOrder = 'workspace-first',
    onOpenIssueInBrowser,
    onOpenReviewInBrowser,
    onUnlinkReview,
    openDelay = 250,
    closeDelay = 120,
    hoverControl,
    children
  } = props
  const internalHoverControl = useWorktreeCardDetailsHoverControl()
  const {
    hoverOpen,
    issueMenuOpen,
    reviewMenuOpen,
    handleHoverOpenChange,
    handleIssueMenuOpenChange,
    handleReviewMenuOpenChange,
    closeHover
  } = hoverControl ?? internalHoverControl

  const [workspaceTitleEditing, setWorkspaceTitleEditing] = React.useState(false)
  const [notesDocumentOpen, setNotesDocumentOpen] = React.useState(false)
  const pendingWorkspaceTitleCloseRef = React.useRef(false)

  const handleWorkspaceTitleEditingChange = useCallback(
    (editing: boolean): void => {
      setWorkspaceTitleEditing(editing)
      onWorkspaceTitleEditingChange?.(editing)
      if (!editing && pendingWorkspaceTitleCloseRef.current) {
        pendingWorkspaceTitleCloseRef.current = false
        handleHoverOpenChange(false)
      }
    },
    [handleHoverOpenChange, onWorkspaceTitleEditingChange]
  )

  // Why: a close requested mid-rename is deferred until the editor commits, so
  // the hover does not unmount the input the user is typing into.
  const handleEffectiveHoverOpenChange = useCallback(
    (next: boolean): void => {
      if (!next && workspaceTitleEditing) {
        pendingWorkspaceTitleCloseRef.current = true
        return
      }
      pendingWorkspaceTitleCloseRef.current = false
      handleHoverOpenChange(next)
    },
    [handleHoverOpenChange, workspaceTitleEditing]
  )

  const dismissAndRun = useCallback(
    (handler: ((event: React.MouseEvent) => void) | undefined) =>
      (event: React.MouseEvent): void => {
        closeHover()
        handler?.(event)
      },
    [closeHover]
  )

  const copyLink = useCallback(async (url: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(
        translate('auto.components.sidebar.WorktreeCardMeta.copyLinkSuccess', '{{value0}} copied', {
          value0: label
        })
      )
    } catch {
      toast.error(
        translate(
          'auto.components.sidebar.WorktreeCardMeta.copyLinkFailure',
          'Failed to copy link'
        )
      )
    }
  }, [])

  const issueDisplay = issue ?? fallbackIssue(metadata?.linkedIssue)
  const linearDisplay = linearIssue ?? fallbackLinear(metadata?.linkedLinearIssue)
  const jiraDisplay = jiraIssue ?? fallbackJira(metadata?.linkedJiraIssue)
  const reviewDisplay = toReviewDisplay(review)
  const comment = metadata?.comment ?? ''
  const branchName = (worktree.branch ?? '').trim() || undefined
  const workspaceTitle = (worktree.displayName ?? worktree.display_name ?? '').trim() || undefined
  const reviewLabelText = reviewDisplay ? getReviewLabel(reviewDisplay) : 'PR'
  const showIdentityHeader = Boolean(branchName || workspaceTitle)

  const handleCopyIssueLink = useCallback((): void => {
    const url = issueDisplay && 'url' in issueDisplay ? issueDisplay.url : undefined
    if (!url) {
      return
    }
    closeHover()
    void copyLink(
      url,
      translate('auto.components.sidebar.WorktreeCardMeta.issueLinkLabel', 'Issue link')
    )
  }, [closeHover, copyLink, issueDisplay])

  const handleCopyReviewLink = useCallback((): void => {
    if (!reviewDisplay?.url) {
      return
    }
    void copyLink(
      reviewDisplay.url,
      translate('auto.components.sidebar.WorktreeCardMeta.reviewLinkLabel', '{{value0}} link', {
        value0: reviewLabelText
      })
    )
  }, [copyLink, reviewDisplay, reviewLabelText])

  const hasDetails = Boolean(
    showIdentityHeader ||
      issueDisplay ||
      linearDisplay ||
      jiraDisplay ||
      reviewDisplay ||
      cliCreated ||
      hasComment(comment) ||
      ports.length > 0
  )
  if (!hasDetails) {
    return <>{children}</>
  }

  return (
    <>
    <HoverCard
      open={hoverOpen || workspaceTitleEditing}
      onOpenChange={handleEffectiveHoverOpenChange}
      openDelay={openDelay}
      closeDelay={closeDelay}
    >
      <HoverCardTrigger
        asChild
        onPointerEnter={hasComment(comment) ? preloadCommentMarkdown : undefined}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="scrollbar-sleek max-h-[28rem] w-80 overflow-y-auto p-3 text-xs"
        {...{ [WORKTREE_NATIVE_CONTEXT_MENU_ATTR]: '' }}
        // Why: the card underneath owns click/double-click activation; a click in
        // the popover must never also select or rename the workspace.
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <SelectedTextCopyMenu className="space-y-3">
          {showIdentityHeader && (
            <WorktreeCardHoverIdentityHeader
              branchName={branchName}
              workspaceTitle={workspaceTitle}
              identityOrder={identityOrder}
              workspaceTitleRenameDisabled={workspaceTitleRenameDisabled}
              onRenameWorkspaceTitle={onRenameWorkspaceTitle}
              onWorkspaceTitleEditingChange={handleWorkspaceTitleEditingChange}
            />
          )}

          <WorktreeCardIssueDetailSection
            issue={issueDisplay}
            issueMenuOpen={issueMenuOpen}
            onIssueMenuOpenChange={handleIssueMenuOpenChange}
            onCopyIssueLink={
              issueDisplay && 'url' in issueDisplay && issueDisplay.url
                ? handleCopyIssueLink
                : undefined
            }
            onEditIssue={onEditIssue ? dismissAndRun(onEditIssue) : undefined}
            onOpenIssueInBrowser={
              onOpenIssueInBrowser && issueDisplay && 'url' in issueDisplay && issueDisplay.url
                ? (url: string) => {
                    closeHover()
                    onOpenIssueInBrowser(url)
                  }
                : undefined
            }
          />

          {linearDisplay && (
            <WorktreeCardDetailSection>
              <DetailHeader
                icon={<span className="text-[9px] font-bold text-muted-foreground">L</span>}
                label={translate(
                  'auto.components.sidebar.WorktreeCardMeta.5e982e6128',
                  'Linear {{value0}}',
                  { value0: linearDisplay.identifier }
                )}
                actions={
                  linearDisplay.url ? (
                    <MetadataActionIcon
                      label={translate(
                        'auto.components.sidebar.WorktreeCardMeta.e42941631a',
                        'View on Linear'
                      )}
                      href={linearDisplay.url}
                    >
                      <ExternalLink className="size-3" />
                    </MetadataActionIcon>
                  ) : null
                }
              />
              <WorktreeCardDetailSectionContent className="space-y-1.5">
                {linearDisplay.title ? (
                  <div className="break-words text-[13px] font-semibold leading-snug text-foreground">
                    {linearDisplay.title}
                  </div>
                ) : null}
                {((linearDisplay.labels && linearDisplay.labels.length > 0) ||
                  linearDisplay.stateName) && (
                  <div className="flex flex-wrap gap-1">
                    {linearDisplay.stateName && (
                      <LinearStateBadge stateName={linearDisplay.stateName} />
                    )}
                    {(linearDisplay.labels ?? []).map((label) => (
                      <Badge key={label} variant="outline" className="h-4 px-1.5 text-[9px]">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </WorktreeCardDetailSectionContent>
            </WorktreeCardDetailSection>
          )}

          {jiraDisplay && (
            <WorktreeCardDetailSection>
              <DetailHeader
                icon={<span className="text-[9px] font-bold text-muted-foreground">J</span>}
                label={translate(
                  'auto.components.sidebar.WorktreeCardMeta.jiraIssue',
                  'Jira {{value0}}',
                  { value0: jiraDisplay.identifier }
                )}
                actions={
                  jiraDisplay.url ? (
                    <MetadataActionIcon
                      label={translate(
                        'auto.components.sidebar.WorktreeCardMeta.viewOnJira',
                        'View on Jira'
                      )}
                      href={jiraDisplay.url}
                    >
                      <ExternalLink className="size-3" />
                    </MetadataActionIcon>
                  ) : undefined
                }
              />
              <WorktreeCardDetailSectionContent>
                {jiraDisplay.title ? (
                  <div className="break-words text-[13px] font-semibold leading-snug text-foreground">
                    {jiraDisplay.title}
                  </div>
                ) : null}
              </WorktreeCardDetailSectionContent>
            </WorktreeCardDetailSection>
          )}

          <WorktreeCardReviewDetailSection
            review={reviewDisplay}
            fallbackNumber={metadata?.linkedPR ?? null}
            reviewMenuOpen={reviewMenuOpen}
            onReviewMenuOpenChange={handleReviewMenuOpenChange}
            onOpenReviewInBrowser={
              onOpenReviewInBrowser && reviewDisplay?.url ? onOpenReviewInBrowser : undefined
            }
            onCopyReviewLink={reviewDisplay?.url ? handleCopyReviewLink : undefined}
            onUnlinkReview={onUnlinkReview}
            closeHover={closeHover}
          />

          {cliCreated ? (
            <WorktreeCardDetailSection>
              <DetailHeader
                icon={<SquareTerminal className="size-3 text-muted-foreground" />}
                label={translate('auto.components.sidebar.WorktreeCardMeta.cliHeader', 'CLI')}
              />
              <WorktreeCardDetailSectionContent>
                <div className="break-words text-[11.5px] leading-snug text-muted-foreground">
                  {translate(
                    'auto.components.sidebar.WorktreeCardMeta.cliCreatedFromShell',
                    'Created via the CLI'
                  )}
                </div>
              </WorktreeCardDetailSectionContent>
            </WorktreeCardDetailSection>
          ) : null}

          {hasComment(comment) && (
            <WorktreeCardDetailSection>
              <DetailHeader
                icon={<StickyNote className="size-3 text-muted-foreground" />}
                label={translate('auto.components.sidebar.WorktreeCardMeta.93cbea12c2', 'Notes')}
                actions={
                  <>
                    <MetadataActionIcon
                      label={translate(
                        'auto.components.sidebar.WorktreeCardMeta.openNotesDocument',
                        'Open notes document view'
                      )}
                      onClick={() => {
                        preloadCommentMarkdown()
                        setNotesDocumentOpen(true)
                      }}
                    >
                      <BookOpenText className="size-3" />
                    </MetadataActionIcon>
                    {onEditComment || onEditMetadata ? (
                      <MetadataActionIcon
                        label={translate(
                          'auto.components.sidebar.WorktreeCardMeta.c7fa72ead0',
                          'Edit notes'
                        )}
                        onClick={onEditComment ?? (onEditMetadata ? dismissAndRun(onEditMetadata) : undefined)}
                      >
                        <Pencil className="size-3" />
                      </MetadataActionIcon>
                    ) : null}
                  </>
                }
              />
              <WorktreeCardDetailSectionContent className="space-y-2">
                <CommentMarkdownAsync
                  content={comment}
                  className={COMMENT_MARKDOWN_CLASS_NAME}
                  // Mirrors remark-breaks so the fallback keeps the note's line count.
                  fallbackClassName="whitespace-pre-wrap"
                  expandImages
                  linkifyFilePaths
                  fileLinkBasePath={worktree.path}
                />
              </WorktreeCardDetailSectionContent>
            </WorktreeCardDetailSection>

          )}

          <WorktreeCardPortsDetails ports={ports} />

          {onEditMetadata ? (
            <WorktreeCardDetailSection>
              <DetailHeader
                icon={<Folder className="size-3 text-muted-foreground" />}
                label={translate(
                  'auto.components.sidebar.WorktreeCardMeta.workspaceHeader',
                  'Workspace'
                )}
                actions={
                  <MetadataActionIcon
                    label={translate(
                      'auto.components.sidebar.WorktreeCardMeta.editMetadata',
                      'Edit workspace metadata'
                    )}
                    onClick={dismissAndRun(onEditMetadata)}
                  >
                    <Pencil className="size-3" />
                  </MetadataActionIcon>
                }
              />
              <WorktreeCardDetailSectionContent className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>{project?.displayName || project?.name || 'Workspace'}</span>
                </div>
                <div
                  className="break-all rounded border border-border/80 bg-muted/50 p-1.5 font-mono text-[10px] text-muted-foreground select-all"
                  title={worktree.path}
                >
                  {worktree.path}
                </div>
              </WorktreeCardDetailSectionContent>
            </WorktreeCardDetailSection>
          ) : null}

          {reviewDisplay && onOpenReviewInBrowser && reviewDisplay.url ? (
            <div className="flex justify-end">
              <MetadataActionIcon
                label={translate(
                  'auto.components.sidebar.WorktreeCardMeta.viewOnProvider',
                  'View on {{value0}}',
                  { value0: getProviderName(reviewDisplay) }
                )}
                href={reviewDisplay.url}
              >
                <MonitorUp className="size-3" />
              </MetadataActionIcon>
            </div>
          ) : null}
        </SelectedTextCopyMenu>
      </HoverCardContent>
    </HoverCard>
    <WorktreeNotesDocumentDialog
      open={notesDocumentOpen}
      onOpenChange={setNotesDocumentOpen}
      title={workspaceTitle ?? branchName ?? worktree.path}
      content={comment}
      fileLinkBasePath={worktree.path}
    />
    </>
  )

}

export default WorktreeCardDetailsHover
