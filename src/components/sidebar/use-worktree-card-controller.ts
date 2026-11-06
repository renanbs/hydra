// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-worktree-card-controller.ts
import React, { useCallback, useState } from 'react'
import type { GitWorktreeInfo, HydraProject, WorkspacePort, WorktreeReviewStatus, WorktreeSession } from './types'
import type { WorktreeUpstreamStatus } from '../../lib/worktree-upstream-status'
import type { WorktreeStatus } from '../../lib/worktree-status'
import type { PrDisplay } from './pr-display'
import type { ResolvedWorktreeCardProps, WorktreeCardProps, WorktreeRenameRequest } from './worktree-card-model'
import { usePromptCacheCountdownStartedAt, usePromptCacheTtlMs } from './CacheTimer'
import { useWorktreeUpstreamStatus } from '../../hooks/useWorktreeUpstreamStatus'
import { toast } from 'sonner'
import { useAppStore } from '../../store'
import { openExternalUrl } from '../../lib/sidebar-desktop-contracts'
import { useWorktreeCardLifecycleEffects } from './use-worktree-card-lifecycle-effects'
import { writeWorkspaceDragData } from './workspace-status-drag-data'
import { getConfiguredWorktreeCardJiraIssueDisplay } from './worktree-card-jira-issue-display'
import {
  coerceWorktreeCardVisibleTitle,
  getWorktreeCardTitleDisplay
} from './worktree-card-title-display'
import { parseExecutionHostId, type ParsedExecutionHost } from '../../shared/execution-host'
import type { IssueInfo } from '../../shared/github/pull-request-types'
import type { LinearIssue } from '../../shared/linear/issue-types'
import {
  selectRuntimeAwareSshStatus,
  selectRuntimeAwareSshTargetLabel,
  selectRuntimeAwareSshTargetRemoved
} from '../../store/slices/runtime-environment-ssh-selectors'

export interface WorktreeCardController extends ResolvedWorktreeCardProps {
  repo: HydraProject | undefined
  project: HydraProject | undefined
  isFocused?: boolean
  isPinned?: boolean
  isUnread?: boolean
  isDragged?: boolean
  dropTarget?: { path: string; position: 'top' | 'bottom' } | null
  compactCards?: boolean
  onSelect?: (wt: GitWorktreeInfo) => void
  onContextMenu?: (e: React.MouseEvent, wt: GitWorktreeInfo, proj: HydraProject) => void
  onDragStart?: (e: React.DragEvent, path: string) => void
  onDragOver?: (e: React.DragEvent, path: string) => void
  onDrop?: (e: React.DragEvent, path: string) => void
  onDragEnd?: () => void
  onDelete?: () => void
  onRename?: (newTitle: string) => Promise<void> | void
  ports?: WorkspacePort[]
  review?: WorktreeReviewStatus
  metaRowChildren?: React.ReactNode
  sessions?: WorktreeSession[]
  onSelectSession?: (id: string) => void
  activeSessionId?: string | null
  newCardStyle: boolean
  isFolder: boolean
  identityDisplay?: string
  branch: string
  detachedHeadDisplay: string | null
  conflictOperation: string
  /** Ahead/behind against the upstream branch, fetched per mounted card. */
  upstreamStatus?: WorktreeUpstreamStatus | null
  cacheStartedAt: number | null
  cacheTtlMs: number
  hasDetails: boolean
  hasPorts: boolean
  showStatus: boolean
  status: WorktreeStatus
  prDisplay: PrDisplay | null
  showInlineAgentList: boolean
  showLineageChildChip: boolean
  remoteBranchConflict: boolean
  visibleCardTitle: string
  workspacePorts: WorkspacePort[]
  isDeleting: boolean
  isRuntimeDisconnected: boolean
  sshTargetLabel: string
  sshStatus: string | null
  sshTargetRemoved: boolean
  sshOwnerEnvironmentId: string | null
  parsedRepoHost: ParsedExecutionHost | null
  isQueuedForDeletion: boolean
  deleteLabel: string
  titleRenaming: boolean
  setTitleRenaming: (val: boolean) => void
  renamingWorktreeId: string | null
  renameRequest: WorktreeRenameRequest | null
  setRenamingWorktreeId: (id: string | null) => void
  showRenameErrorDialog: boolean
  setShowRenameErrorDialog: (val: boolean) => void
  handleOpenRenameErrorDialog: (error?: string) => void
  handleClick: (e: React.MouseEvent<HTMLDivElement>) => void
  handleDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void
  handleDragStart: (e: React.DragEvent<HTMLDivElement>) => void
  handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void
  handleContextMenuSelect: (e: React.MouseEvent<HTMLElement>, wt: GitWorktreeInfo) => void
  handleRenameTitle: (newTitle: string) => Promise<void>
  handleDelete: () => void
  handleWorkspaceQuickAction: () => void
  stopQuickActionPointerPropagation: (e: React.MouseEvent | React.PointerEvent) => void
  showUnreadEmphasis: boolean
  handleUnlinkReview: () => void
  handleOpenIssueInBrowser: (url: string) => void
  handleOpenReviewInBrowser: (url: string) => void
  handleToggleUnreadQuick: (event: React.MouseEvent<HTMLButtonElement>) => void
  jiraIssueDisplay: import('./worktree-card-meta-types').WorktreeCardJiraIssueDisplay | null
  linearIssueDisplay: import('./worktree-card-meta-types').WorktreeCardLinearIssueDisplay | null
  issueDisplay: import('./worktree-card-meta-types').WorktreeCardIssueDisplay | null
  linearIssue: LinearIssue | null
  handleOpenAutomation: (event: React.MouseEvent) => void
  handleOpenAutomationRun: (event: React.MouseEvent) => void
  automationProvenance: {
    automationId: string
    automationNameSnapshot: string
    automationRunId: string
    automationRunTitleSnapshot: string
    hostId?: import('../../shared/execution-host').ExecutionHostId
  } | null
}

export function useWorktreeCardController(props: ResolvedWorktreeCardProps | WorktreeCardProps): WorktreeCardController {
  const {
    worktree,
    repo,
    project = repo,
    isActive = false,
    isFocused = isActive,
    isActiveSurface = isFocused || isActive,
    activeSurfaceVariant = 'primary',
    isMultiSelected = false,
    revealHighlight = false,
    revealHighlightTone = 'default',
    selectedWorktrees,
    hideRepoBadge = false,
    hostContextLabel,
    isRuntimeDisconnected = false,
    inPinnedSection = false,
    isPinned = inPinnedSection,
    isUnread = false,
    isDragged = false,
    dropTarget = null,
    activationRowKey,
    renameRowKey,
    contentIndent = 0,
    flushSurface = false,
    compactCards = false,
    lineageChildCount = 0,
    lineageCollapsed = false,
    lineageChildren,
    lineageChildrenStyle,
    onLineageToggle,
    isLineageDropTarget = false,
    onActivate,
    onSelect,
    onImmediateActivate,
    onSelectionGesture,
    onContextMenuSelect,
    onContextMenu,
    onAssignWorkspaceStatus,
    onCardDragStart,
    onDragStart,
    onDragOver,
    onDrop,
    onCardDragEnd,
    onDragEnd,
    onDelete,
    onRename,
    deleteState = null,
    renameRequest = null,
    onRenameRequestConsumed,
    nativeDragEnabled = true,
    affiliateListMode = false,
    statusPrDisplay = null,
    ports = [],
    review,
    metaRowChildren,
    sessions = [],
    onSelectSession,
    activeSessionId,
    status,
    prDisplay,
  } = props

  const [titleRenaming, setTitleRenaming] = useState(false)
  const [showRenameErrorDialog, setShowRenameErrorDialog] = useState(false)

  // Why (D04a G5 / D04b-012): the in-place delete overlay is derived from the
  // row's published delete state instead of a local flag latched when the
  // confirmation dialog opens. A cancelled, failed or dismissed dialog clears
  // that state, and the card is interactive again — `handleClick`,
  // `handleDoubleClick` and drag all read this derived value.
  const isDeleting = deleteState?.isDeleting ?? false
  const isQueuedForDeletion = deleteState?.phase === 'queued'
  const deleteLabel = isQueuedForDeletion ? 'Queued for deletion' : 'Deleting workspace...'

  // D01-049: the countdown's data source. The card shows its worktree's most urgent
  // cache start (the store keys caches by pane and `tabsByWorktree` by worktree path,
  // exactly like the terminal writers) and reads the TTL from the same settings blob
  // the terminal seeding consults.
  const cacheTimerActive = !compactCards
  const cacheStartedAt = usePromptCacheCountdownStartedAt(worktree.path, cacheTimerActive)
  const cacheTtlMs = usePromptCacheTtlMs(cacheTimerActive)

  // Why (D04a G9): the sidebar keyboard path (`workspace.rename`) hands the card
  // the request it should consume, exactly as Orca's card reads it from the store.
  const renamingWorktreeId = renameRequest?.worktreeId ?? null
  const setRenamingWorktreeId = useCallback(
    (id: string | null) => {
      if (id === null) {
        onRenameRequestConsumed?.()
      }
    },
    [onRenameRequestConsumed]
  )

  const effectiveRepo = repo || project
  const worktreeId = worktree.id ?? worktree.path

  // D04a-012/D04a-013 Rosetta (Orca `use-worktree-card-foundation.ts:135-166`):
  // runtime-aware SSH selectors for the card title-row control. Local targets
  // read the local maps; runtime-owned targets read their environment bucket.
  const connectionId = effectiveRepo?.connectionId ?? null
  const parsedRepoHost = parseExecutionHostId(effectiveRepo?.executionHostId ?? null)
  const sshOwnerEnvironmentId = useAppStore(() =>
    connectionId && parsedRepoHost?.kind === 'runtime'
      ? ((parsedRepoHost as { environmentId?: string }).environmentId ?? null)
      : null
  )
  const sshStatus = useAppStore((state) =>
    connectionId
      ? selectRuntimeAwareSshStatus(state as never, sshOwnerEnvironmentId, connectionId)
      : null
  )
  const sshTargetRemoved = useAppStore((state) =>
    connectionId
      ? selectRuntimeAwareSshTargetRemoved(state as never, sshOwnerEnvironmentId, connectionId)
      : false
  )
  const sshTargetLabel = useAppStore((state) =>
    connectionId
      ? selectRuntimeAwareSshTargetLabel(state as never, sshOwnerEnvironmentId, connectionId)
      : ''
  )

  const branchName = (worktree.branch ?? '').trim()
  const isDetached =
    branchName === '' ||
    branchName === 'HEAD' ||
    branchName === '(detached)' ||
    branchName.startsWith('(HEAD detached')

  const detachedHeadDisplay = isDetached
    ? worktree.head_commit
      ? worktree.head_commit.slice(0, 7)
      : 'detached'
    : null

  const isFolder = !branchName && !worktree.head_commit && !(worktree.is_main ?? worktree.isMainWorktree)
  // Why hostContextLabel gates it: this command runs Git on this machine, so a
  // workspace owned by another host must not be measured against a local path.
  const upstreamStatus = useWorktreeUpstreamStatus({
    repoPath: effectiveRepo?.path,
    worktreePath: worktree.path,
    head: worktree.head_commit,
    enabled: !isFolder && !hostContextLabel && Boolean(effectiveRepo?.path)
  })
  // D04a-010/D04b-012 Rosetta: conflict op from the store (Orca
  // `gitConflictOperationByWorktree`), remote-branch collision, and the lineage
  // chip derived from count + toggle — not hardcoded placeholders.
  const conflictOperation = useAppStore(
    (state) => (state as unknown as { gitConflictOperationByWorktree?: Record<string, string> }).gitConflictOperationByWorktree?.[worktreeId] ?? ''
  )
  const remoteBranchConflictRaw = useAppStore(
    (state) =>
      (state as unknown as { remoteBranchConflictByWorktreeId?: Record<string, unknown> }).remoteBranchConflictByWorktreeId?.[worktreeId] ?? false
  ) as boolean | { remote: string; branchName: string } | null
  const remoteBranchConflict = Boolean(remoteBranchConflictRaw)
  // D04b-016 Rosetta (Orca `use-worktree-card-secondary-details`): unread
  // emphasis is owned by the status toggle (`showStatus && isUnread`). Hydra's
  // showStatus is constant-true today, so this reduces to isUnread — but the
  // conjunction documents the owner, so a future status-toggle port keeps the
  // gate instead of re-hardcoding emphasis.
  const showStatus = true
  const showUnreadEmphasis = showStatus && isUnread
  const showLineageChildChip = lineageChildCount > 0 && onLineageToggle !== undefined

  // D04b-016 Rosetta (Orca `use-worktree-card-secondary-details:handleUnlinkReview`):
  // the hover's Unlink action clears the linked review and — for GitHub —
  // records the tombstone so the branch lookup does not re-suggest it.
  const updateWorktreeMeta = useAppStore(
    (state) =>
      (state as unknown as { updateWorktreeMeta: (id: string, updates: Record<string, unknown>, options?: { executionHostId?: string }) => Promise<{ ok: true } | { ok: false; error: string }> }).updateWorktreeMeta
  )
  const handleUnlinkReview = useCallback(async (): Promise<void> => {
    const provider = (prDisplay as unknown as { provider?: string } | null)?.provider
    const number = (prDisplay as unknown as { number?: number } | null)?.number
    const hostId = ((worktree as unknown as { hostId?: string }).hostId ?? 'local') as 'local'
    if (provider === 'github') {
      const result = await updateWorktreeMeta(
        worktreeId,
        { linkedPR: null, suppressedGitHubPR: typeof number === 'number' ? number : null },
        { executionHostId: hostId }
      )
      if (!result.ok) {
        toast.error(result.error)
      }
      return
    }
    if (provider === 'gitlab' || provider === 'bitbucket' || provider === 'azure-devops' || provider === 'gitea') {
      const field =
        provider === 'gitlab' ? 'linkedGitLabMR'
        : provider === 'bitbucket' ? 'linkedBitbucketPR'
        : provider === 'azure-devops' ? 'linkedAzureDevOpsPR'
        : 'linkedGiteaPR'
      await updateWorktreeMeta(worktreeId, { [field]: null } as never, { executionHostId: hostId })
    }
  }, [prDisplay, updateWorktreeMeta, worktree, worktreeId])
  const handleOpenIssueInBrowser = useCallback(
    (url: string): void => {
      void openExternalUrl(url).catch(() => {
        toast.error('Unable to open URL.')
      })
    },
    []
  )
  const handleOpenReviewInBrowser = handleOpenIssueInBrowser
  // D04a-045/D04b-012 Rosetta (Orca `use-worktree-card-foundation:handleOpenAutomation[Run]`):
  // navigate to the automation (or run) recorded on the provenance — the
  // automation's host, not the workspace's, owns the navigation.
  const openAutomationsPage = useAppStore(
    (state) => (state as unknown as { openAutomationsPage?: () => void }).openAutomationsPage
  )
  const setPendingAutomationRunNavigation = useAppStore(
    (state) =>
      (state as unknown as { setPendingAutomationRunNavigation?: (nav: unknown) => void }).setPendingAutomationRunNavigation
  )
  const automationProvenance =
    (worktree as unknown as { automationProvenance?: import('./worktree-card-controller-extras').WorktreeCardControllerExtras['automationProvenance'] }).automationProvenance ?? null
  const handleOpenAutomation = useCallback(
    (event: React.MouseEvent): void => {
      event.stopPropagation()
      if (!automationProvenance || !openAutomationsPage || !setPendingAutomationRunNavigation) {
        return
      }
      const hostId =
        automationProvenance.hostId ?? (worktree as unknown as { hostId?: string }).hostId
      setPendingAutomationRunNavigation({
        automationId: automationProvenance.automationId,
        runId: null,
        ...(hostId ? { hostId } : {})
      })
      openAutomationsPage()
    },
    [automationProvenance, openAutomationsPage, setPendingAutomationRunNavigation, worktree]
  )
  const handleOpenAutomationRun = useCallback(
    (event: React.MouseEvent): void => {
      event.stopPropagation()
      if (!automationProvenance || !openAutomationsPage || !setPendingAutomationRunNavigation) {
        return
      }
      const hostId =
        automationProvenance.hostId ?? (worktree as unknown as { hostId?: string }).hostId
      setPendingAutomationRunNavigation({
        automationId: automationProvenance.automationId,
        runId: automationProvenance.automationRunId,
        ...(hostId ? { hostId } : {})
      })
      openAutomationsPage()
    },
    [automationProvenance, openAutomationsPage, setPendingAutomationRunNavigation, worktree]
  )
  // D04b-010 Rosetta (Orca `use-worktree-card-activation-actions:handleToggleUnreadQuick`):
  // the legacy bell button stays unmounted (newCardStyle constant-true,
  // D04a-023 n/a), but the handler is wired so the surface can bind it.
  const handleToggleUnreadQuick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      event.preventDefault()
      event.stopPropagation()
      const hostId = ((worktree as unknown as { hostId?: string }).hostId ?? 'local') as 'local'
      void updateWorktreeMeta(worktreeId, { isUnread: !isUnread }, { executionHostId: hostId })
    },
    [isUnread, updateWorktreeMeta, worktree, worktreeId]
  )

  // D04b-013: card data lifecycle (initial fetch + visibility-gated polls +
  // hover refetch for hosted review / GitHub issue / Linear issue).
  useWorktreeCardLifecycleEffects({
    worktreeId,
    repoPath: effectiveRepo?.path ?? '',
    ...(effectiveRepo?.id ? { repoId: effectiveRepo.id } : {}),
    ...(branchName ? { branch: branchName } : {}),
    ...(typeof (worktree as unknown as { linkedIssue?: unknown }).linkedIssue === 'number'
      ? { linkedIssue: (worktree as unknown as { linkedIssue: number }).linkedIssue }
      : {}),
    ...(((worktree as unknown as { linkedLinearIssue?: unknown }).linkedLinearIssue)
      ? { linkedLinearIssue: (worktree as unknown as { linkedLinearIssue: string }).linkedLinearIssue }
      : {}),
    shouldRefreshHostedReview: true
  })

  // D04a-102/D04b-014 Rosetta (Orca `use-worktree-card-linked-details`): project
  // linkedWorkItem into the hover displays. Jira is gated on the jira-issue
  // property (compact preset drops it); the title composes stored name + branch
  // + linked item titles like the Orca new-card title.
  const cardProperties = compactCards
    ? (['status', 'unread'] as const)
    : (['status', 'unread', 'issue', 'linear-issue', 'jira-issue', 'pr', 'automation', 'cli', 'comment', 'ports', 'inline-agents'] as const)
  const jiraIssueDisplay = getConfiguredWorktreeCardJiraIssueDisplay(
    worktree as unknown as never,
    cardProperties as unknown as readonly never[]
  )
  // D04b-014/D04b-015 Rosetta (Orca `use-worktree-card-linked-details` +
  // `use-worktree-card-review-details`): subscribe to ONLY the specific cache
  // entries for this card's links. Linked metadata persists immediately but
  // provider details arrive async — the display carries Loading/unavailable
  // states instead of looking unlinked.
  const linkedIssueNumber =
    (worktree as unknown as { linkedIssue?: unknown }).linkedIssue ?? null
  const issueEntry = useAppStore((state) =>
    typeof linkedIssueNumber === 'number'
      ? (state as unknown as { issueCache?: Record<string, { data?: IssueInfo | null } | undefined> }).issueCache?.[
          `issue:${linkedIssueNumber}`
        ] ??
        (state as unknown as { issueCache?: Record<string, { data?: IssueInfo | null } | undefined> }).issueCache?.[
          String(linkedIssueNumber)
        ]
      : undefined
  )
  const issueFromCache = issueEntry?.data ?? undefined
  const issueDisplay = (
    (issueFromCache as { number?: number; title?: string } | null | undefined) ??
    (typeof linkedIssueNumber === 'number'
      ? {
          number: linkedIssueNumber,
          title: issueFromCache === null ? 'Issue details unavailable' : 'Loading issue...'
        }
      : null)
  ) as import('./worktree-card-meta-types').WorktreeCardIssueDisplay | null
  const linkedLinearTitle =
    (worktree as unknown as { linkedLinearIssue?: string }).linkedLinearIssue ?? null
  const linearIssueCacheEntry = useAppStore((state) =>
    linkedLinearTitle
      ? (state as unknown as { linearIssueCache?: Record<string, { data?: LinearIssue } | undefined> }).linearIssueCache?.[linkedLinearTitle]
      : undefined
  )
  const linearIssue = linkedLinearTitle
    ? (linearIssueCacheEntry?.data ?? null)
    : null
  const linearStatus = useAppStore(
    (state) => (state as unknown as { linearStatus?: { viewer?: { organizationUrlKey?: string } | null } }).linearStatus
  )
  const linearOrgUrlKey = linearStatus?.viewer?.organizationUrlKey
  const linearIssueUrlFallback =
    linkedLinearTitle && !linearIssue?.url && linearOrgUrlKey
      ? `https://linear.app/${encodeURIComponent(linearOrgUrlKey)}/issue/${encodeURIComponent(linkedLinearTitle)}`
      : undefined
  const linearIssueDisplay = linkedLinearTitle
    ? linearIssue
      ? {
          identifier: linearIssue.identifier,
          title: linearIssue.title,
          url: linearIssue.url,
          stateName: linearIssue.state?.name,
          labels: linearIssue.labels
        }
      : {
          identifier: linkedLinearTitle,
          title: linearIssueCacheEntry ? 'Linear issue details unavailable' : 'Loading Linear issue...',
          url: linearIssueUrlFallback
        }
    : null
  const visibleCardTitle =
    getWorktreeCardTitleDisplay({
      storedDisplayName: worktree.display_name ?? worktree.displayName,
      branchName,
      linearIssueTitle: (linearIssueDisplay as { title?: string } | null)?.title,
      jiraIssueTitle: (jiraIssueDisplay as { title?: string } | null)?.title,
      issueTitle: undefined,
      reviewTitle: (prDisplay as unknown as { title?: string } | null)?.title
    }) ||
    coerceWorktreeCardVisibleTitle(worktree.display_name ?? worktree.displayName) ||
    branchName ||
    worktree.path.split('/').filter(Boolean).pop() ||
    'worktree'

  const firstRenameError =
    worktree.first_agent_message_rename_error || worktree.firstAgentMessageRenameError

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDeleting) return
      if (onSelectionGesture && onSelectionGesture(e, worktree)) {
        return
      }
      if (onSelect) {
        onSelect(worktree)
      } else if (onActivate) {
        onActivate()
      } else if (onImmediateActivate) {
        onImmediateActivate(worktree.path, activationRowKey)
      }
    },
    [isDeleting, onSelectionGesture, onSelect, onActivate, onImmediateActivate, worktree, activationRowKey]
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDeleting || affiliateListMode) return
      e.stopPropagation()
      setTitleRenaming(true)
    },
    [isDeleting, affiliateListMode]
  )

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!nativeDragEnabled || isDeleting || titleRenaming) {
        e.preventDefault()
        return
      }
      // D04b-017: the drag payload carries worktree ids (multi-selection
      // aware) — the board drop targets read ids, and a path-only drag lands nowhere.
      const dragIds =
        isMultiSelected && selectedWorktrees && selectedWorktrees.length > 1
          ? selectedWorktrees.map((item) => item.id ?? item.path)
          : worktreeId
      writeWorkspaceDragData(e.dataTransfer, dragIds)
      const ids = Array.isArray(dragIds) ? dragIds : [dragIds]
      if (onCardDragStart) {
        onCardDragStart(e, worktree.path, ids)
      } else if (onDragStart) {
        onDragStart(e, worktree.path)
      }
    },
    [nativeDragEnabled, isDeleting, titleRenaming, onCardDragStart, onDragStart, worktree.path]
  )

  const handleDragEnd = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (onCardDragEnd) {
        onCardDragEnd(e)
      } else if (onDragEnd) {
        onDragEnd()
      }
    },
    [onCardDragEnd, onDragEnd]
  )

  // D04b-017 Rosetta (Orca `handleContextMenuSelect`): resolve the
  // multi-selection targets at the card — the menu acts on every selected
  // row, not just the right-clicked one.
  const handleContextMenuSelect = useCallback(
    (e: React.MouseEvent<HTMLElement>, wt: GitWorktreeInfo) => {
      if (onContextMenu && effectiveRepo) {
        onContextMenu(e, wt, effectiveRepo)
        return
      }
      if (onContextMenuSelect) {
        if (isMultiSelected && selectedWorktrees && selectedWorktrees.length > 1) {
          for (const item of selectedWorktrees) {
            onContextMenuSelect(e, item)
          }
          return
        }
        onContextMenuSelect(e, wt)
      }
    },
    [onContextMenu, effectiveRepo, onContextMenuSelect, isMultiSelected, selectedWorktrees]
  )

  const handleRenameTitle = useCallback(
    async (newTitle: string) => {
      if (onRename) {
        await onRename(newTitle)
      }
      setTitleRenaming(false)
    },
    [onRename]
  )

  const handleOpenRenameErrorDialog = useCallback((_error?: string) => {
    setShowRenameErrorDialog(true)
  }, [])

  const handleDelete = useCallback(() => {
    if (onDelete && effectiveRepo) {
      // Why (D04a G5): opening the confirmation dialog publishes no delete state
      // — only the confirmed removal does — so the card must not mark itself.
      onDelete(worktree, effectiveRepo)
    }
  }, [onDelete, effectiveRepo, worktree])

  return {
    ...props,
    worktree: {
      ...worktree,
      displayName: visibleCardTitle,
      display_name: visibleCardTitle,
      isMainWorktree: worktree.is_main ?? worktree.isMainWorktree ?? (effectiveRepo ? worktree.path === effectiveRepo.path : false),
      is_main: worktree.is_main ?? worktree.isMainWorktree ?? (effectiveRepo ? worktree.path === effectiveRepo.path : false),
      firstAgentMessageRenameError: firstRenameError,
      first_agent_message_rename_error: firstRenameError,
      isSparse: worktree.is_sparse ?? worktree.isSparse ?? false,
      is_sparse: worktree.is_sparse ?? worktree.isSparse ?? false,
      sparseDirectories: worktree.sparse_directories ?? worktree.sparseDirectories ?? [],
      sparse_directories: worktree.sparse_directories ?? worktree.sparseDirectories ?? []
    },
    repo: effectiveRepo,
    project: effectiveRepo,
    isActive: isFocused || isActive,
    isActiveSurface,
    activeSurfaceVariant,
    isMultiSelected,
    revealHighlight,
    revealHighlightTone,
    selectedWorktrees,
    hideRepoBadge,
    hostContextLabel,
    inPinnedSection: isPinned || inPinnedSection,
    isPinned: isPinned || inPinnedSection,
    isUnread,
    isDragged,
    dropTarget,
    activationRowKey,
    renameRowKey,
    contentIndent,
    flushSurface,
    compactCards,
    lineageChildCount,
    lineageCollapsed,
    lineageChildren,
    lineageChildrenStyle,
    onLineageToggle,
    isLineageDropTarget,
    affiliateListMode,
    statusPrDisplay,
    nativeDragEnabled,
    newCardStyle: true,
    isFolder,
    // Orca parity (`use-worktree-card-review-details.ts:37-40`): a folder workspace has
    // no branch, so its identity line carries the FOLDER PATH instead. Without it the
    // folder card rendered a title with no path line at all.
    identityDisplay:
      !isFolder && branchName.length > 0
        ? branchName
        : isFolder && worktree.path.trim().length > 0
          ? worktree.path
          : undefined,
    branch: branchName,
    detachedHeadDisplay,
    conflictOperation,
    upstreamStatus,
    cacheStartedAt,
    cacheTtlMs,
    hasDetails: Boolean(review || (ports && ports.length > 0) || metaRowChildren),
    hasPorts: Boolean(ports && ports.length > 0),
    showStatus: true,
    status: status ?? 'inactive',
    prDisplay: prDisplay ?? null,
    showInlineAgentList: Boolean(onSelectSession || (sessions && sessions.length > 0)),
    showLineageChildChip,
    remoteBranchConflict,
    visibleCardTitle,
    workspacePorts: ports,
    isDeleting,
    isRuntimeDisconnected,
    sshTargetLabel,
    sshStatus,
    sshTargetRemoved,
    sshOwnerEnvironmentId,
    parsedRepoHost,
    isQueuedForDeletion,
    deleteLabel,
    titleRenaming,
    setTitleRenaming,
    renamingWorktreeId,
    renameRequest,
    setRenamingWorktreeId,
    showRenameErrorDialog,
    setShowRenameErrorDialog,
    handleOpenRenameErrorDialog,
    handleClick,
    handleDoubleClick,
    handleDragStart,
    handleDragEnd,
    handleContextMenuSelect,
    handleRenameTitle,
    handleDelete,
    handleWorkspaceQuickAction: handleDelete,
    stopQuickActionPointerPropagation: (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation(),
    showUnreadEmphasis,
    handleUnlinkReview,
    handleOpenIssueInBrowser,
    handleOpenReviewInBrowser,
    handleToggleUnreadQuick,
    jiraIssueDisplay,
    linearIssueDisplay,
    issueDisplay,
    linearIssue,
    handleOpenAutomation,
    handleOpenAutomationRun,
    automationProvenance,
    onDelete: handleDelete,
    onAssignWorkspaceStatus,
    onDragOver,
    onDrop,
    sessions,
    onSelectSession,
    activeSessionId,
    metaRowChildren,
    ports,
    review
  }
}
