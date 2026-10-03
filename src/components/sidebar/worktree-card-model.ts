// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import type React from 'react'
import type { GitWorktreeInfo, HydraProject, WorkspacePort, WorktreeReviewStatus, WorktreeSession } from './types'
import type { WorktreeStatus } from '../../lib/worktree-status'
import type { PrDisplay } from './pr-display'

export type WorktreeRenameRequest = {
  worktreeId: string
  rowKey?: string
}

export type ActiveSurfaceVariant = 'primary' | 'secondary'

export interface WorktreeCardProps {
  worktree: GitWorktreeInfo
  repo?: HydraProject
  project?: HydraProject
  isActive?: boolean
  isCurrentWorktree?: boolean
  isActiveSurface?: boolean
  activeSurfaceVariant?: ActiveSurfaceVariant
  isMultiSelected?: boolean
  revealHighlight?: boolean
  revealHighlightTone?: 'default' | 'ai'
  selectedWorktrees?: readonly GitWorktreeInfo[]
  hideRepoBadge?: boolean
  hostContextLabel?: string
  inPinnedSection?: boolean
  isPinned?: boolean
  isUnread?: boolean
  isFocused?: boolean
  isDragged?: boolean
  dropTarget?: { path: string; position: 'top' | 'bottom' } | null
  activationRowKey?: string
  renameRowKey?: string
  contentIndent?: number
  flushSurface?: boolean
  compactCards?: boolean
  lineageChildCount?: number
  lineageCollapsed?: boolean
  lineageChildren?: React.ReactNode
  lineageChildrenStyle?: React.CSSProperties
  onLineageToggle?: (event: React.MouseEvent<HTMLButtonElement>) => void
  isLineageDropTarget?: boolean
  onActivate?: () => void
  onSelect?: (wt: GitWorktreeInfo) => void
  onImmediateActivate?: (worktreeId: string, rowKey: string | undefined) => void
  onSelectionGesture?: (event: React.MouseEvent<HTMLElement>, worktree: GitWorktreeInfo) => boolean
  onContextMenuSelect?: (
    event: React.MouseEvent<HTMLElement>,
    worktree: GitWorktreeInfo
  ) => readonly GitWorktreeInfo[]
  onContextMenu?: (e: React.MouseEvent, wt: GitWorktreeInfo, proj: HydraProject) => void
  onAssignWorkspaceStatus?: (worktreeIds: readonly string[], status: string) => void
  onCardDragStart?: (
    event: React.DragEvent<HTMLDivElement>,
    worktreeId: string,
    draggedIds: readonly string[]
  ) => void
  onDragStart?: (e: React.DragEvent, path: string) => void
  onDragOver?: (e: React.DragEvent, path: string) => void
  onDrop?: (e: React.DragEvent, path: string) => void
  onCardDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  onDelete?: (wt: GitWorktreeInfo, proj: HydraProject) => void
  onRename?: (newTitle: string) => Promise<void> | void
  nativeDragEnabled?: boolean
  affiliateListMode?: boolean
  statusPrDisplay?: unknown | null
  ports?: WorkspacePort[]
  review?: WorktreeReviewStatus
  metaRowChildren?: React.ReactNode
  sessions?: WorktreeSession[]
  onSelectSession?: (id: string) => void
  activeSessionId?: string | null
  /** Workspace status for the card lane (Orca `useWorktreeActivityStatus`). */
  status?: WorktreeStatus
  /** Review display for the card lane; merged renders purple (Orca `WorktreeCardStatusSlot`). */
  prDisplay?: PrDisplay | null
}

type DefaultedWorktreeCardProp =
  | 'isActiveSurface'
  | 'activeSurfaceVariant'
  | 'isMultiSelected'
  | 'revealHighlight'
  | 'revealHighlightTone'
  | 'nativeDragEnabled'
  | 'inPinnedSection'
  | 'contentIndent'
  | 'flushSurface'
  | 'lineageChildCount'
  | 'lineageCollapsed'
  | 'isLineageDropTarget'
  | 'affiliateListMode'
  | 'statusPrDisplay'

export type ResolvedWorktreeCardProps = Omit<WorktreeCardProps, DefaultedWorktreeCardProp> & {
  isActiveSurface: boolean
  activeSurfaceVariant: ActiveSurfaceVariant
  isMultiSelected: boolean
  revealHighlight: boolean
  revealHighlightTone: 'default' | 'ai'
  nativeDragEnabled: boolean
  inPinnedSection: boolean
  contentIndent: number
  flushSurface: boolean
  lineageChildCount: number
  lineageCollapsed: boolean
  isLineageDropTarget: boolean
  affiliateListMode: boolean
  statusPrDisplay: unknown | null
}

export const EMPTY_WORKSPACE_PORTS: WorkspacePort[] = []
export const HOSTED_REVIEW_CARD_REFRESH_INTERVAL_MS = 60_000

export function shouldBeginWorktreeRename(
  request: WorktreeRenameRequest | null,
  worktreeId: string,
  rowKey: string | undefined
): boolean {
  return (
    request?.worktreeId === worktreeId &&
    (request.rowKey === undefined || request.rowKey === rowKey)
  )
}

export function formatSparseDirectoryPreview(directories: string[]): string {
  const preview = directories.slice(0, 4).join(', ')
  return directories.length <= 4 ? preview : `${preview}, +${directories.length - 4} more`
}

export function isWebClient(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean('__ORCA_WEB_CLIENT__' in window && window.__ORCA_WEB_CLIENT__)
}

export function getDirectoryName(folderPath: string): string {
  const normalized = folderPath.replace(/[\\/]+$/, '')
  const parts = normalized.split(/[\\/]+/)
  return parts.at(-1) || normalized || folderPath
}
