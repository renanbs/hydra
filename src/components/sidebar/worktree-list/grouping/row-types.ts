import type React from 'react'
import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { ProjectGroup } from '../../../../shared/project-group-types'
import type { Repo } from '../../../../shared/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import type { ExecutionHostId } from '../../../../shared/execution-host'
import type { GitWorktreeInfo } from '../../types'

/**
 * The discovered-worktree payload a notice row carries. Orca types it as
 * `DetectedWorktree[]` because its notice rows hand it straight to the lines; Hydra's
 * painted list reads the live props instead (`WorktreeList.renderNoticeRow`), and the
 * only source the renderer has for those worktrees is the `scan_worktrees` wire shape
 * (`hiddenWorktreesByProject`), so the ported payload carries that shape.
 */
export type NoticeWorktreePayload = readonly GitWorktreeInfo[]

export type WorktreeGroupBy = 'none' | 'workspace-status' | 'repo' | 'pr-status'
export type PinnedWorktreeDisplayPolicy = 'single-location' | 'duplicate-in-groups'

export function getPinnedWorktreeDisplayPolicy(
  settings?: { showPinnedWorktreesInGroups?: boolean } | null
): PinnedWorktreeDisplayPolicy {
  return settings?.showPinnedWorktreesInGroups === true ? 'duplicate-in-groups' : 'single-location'
}

export type GroupHeaderRow = {
  type: 'header'
  key: string
  label: string
  count: number
  tone: string
  icon?: React.ComponentType<{ className?: string }>
  repo?: Repo
  projectGroup?: ProjectGroup | { id: null; name: 'Ungrouped'; tabOrder: number }
  projectGroupDepth?: number
  hostId?: ExecutionHostId
  hostWorktreeCounts?: ReadonlyMap<ExecutionHostId, number>
  hostWorktreeIds?: ReadonlyMap<ExecutionHostId, readonly string[]>
  worktreeIds?: readonly string[]
}

export type WorktreeRow = {
  type: 'item'
  rowKey: string
  sectionKey: string
  worktree: Worktree
  repo: Repo | undefined
  depth: number
  groupDepth: number
  lineageTrail: boolean[]
  isLastLineageChild: boolean
  lineageChildCount: number
  lineageGroupKey?: string
  lineageCollapsed?: boolean
  hostContextLabel?: string
}

export type ImportedWorktreesCardCandidate = {
  repo: Repo
  hiddenWorktrees: NoticeWorktreePayload
}

export type ImportedWorktreesCardRow = {
  type: 'imported-worktrees-card'
  key: string
  repo: Repo
  hiddenWorktrees: NoticeWorktreePayload
  placement: 'repo-group' | 'pinned-fallback'
  /** Set only when the row's project is checked out on more than one host. */
  hostContextLabel?: string
  hostContextHostId?: ExecutionHostId
}

export type NewExternalWorktreesInboxCandidate = {
  repo: Repo
  inboxWorktrees: NoticeWorktreePayload
}

export type NewExternalWorktreesInboxRow = {
  type: 'new-external-worktrees-inbox'
  key: string
  repo: Repo
  inboxWorktrees: NoticeWorktreePayload
  /** Set only when the row's project is checked out on more than one host. */
  hostContextLabel?: string
  hostContextHostId?: ExecutionHostId
}

export type PendingCreationRow = {
  type: 'pending-creation'
  key: string
  creationId: string
  repo: Repo | undefined
}

export type FolderWorkspaceRow = {
  type: 'folder-workspace'
  key: string
  folderWorkspace: FolderWorkspace
  projectGroup: ProjectGroup
  depth: number
  groupDepth: number
}

/** Minimal shape buildRows needs for an in-flight create. Deliberately not the
 *  full PendingWorktreeCreation: row identity depends only on which creates
 *  exist and their repo, so callers can subscribe on this stable shape and keep
 *  progress-field churn (phase/loaderVisible) from rebuilding the whole list. */
export type PendingCreationRef = { creationId: string; repoId: string }

export type Row =
  | GroupHeaderRow
  | WorktreeRow
  | ImportedWorktreesCardRow
  | NewExternalWorktreesInboxRow
  | PendingCreationRow
  | FolderWorkspaceRow
