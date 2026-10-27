// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import React, { useCallback, useState } from 'react'
import type { GitWorktreeInfo, HydraProject, WorkspacePort, WorktreeReviewStatus, WorktreeSession } from './types'
import type { WorktreeStatus } from '../../lib/worktree-status'
import type { PrDisplay } from './pr-display'
import type { ResolvedWorktreeCardProps, WorktreeCardProps, WorktreeRenameRequest } from './worktree-card-model'

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
  const visibleCardTitle =
    worktree.display_name?.trim() ||
    worktree.displayName?.trim() ||
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
      if (onCardDragStart) {
        onCardDragStart(e, worktree.path, [worktree.path])
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

  const handleContextMenuSelect = useCallback(
    (e: React.MouseEvent<HTMLElement>, wt: GitWorktreeInfo) => {
      if (onContextMenu && effectiveRepo) {
        onContextMenu(e, wt, effectiveRepo)
      } else if (onContextMenuSelect) {
        onContextMenuSelect(e, wt)
      }
    },
    [onContextMenu, effectiveRepo, onContextMenuSelect]
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
    conflictOperation: '',
    cacheStartedAt: null,
    cacheTtlMs: 300_000,
    hasDetails: Boolean(review || (ports && ports.length > 0) || metaRowChildren),
    hasPorts: Boolean(ports && ports.length > 0),
    showStatus: true,
    status: status ?? 'inactive',
    prDisplay: prDisplay ?? null,
    showInlineAgentList: Boolean(onSelectSession || (sessions && sessions.length > 0)),
    showLineageChildChip: false,
    remoteBranchConflict: false,
    visibleCardTitle,
    workspacePorts: ports,
    isDeleting,
    isRuntimeDisconnected: false,
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
    showUnreadEmphasis: isUnread,
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
