// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: renderer/src/components/status-bar/use-workspace-space-manager-bindings.ts
// Adaptations (documented):
// - Hydra store selectors; worktree-git-status slice for git data.
// - Cache slices not yet composed in the live store (hosted-review,
//   linear issue cache, editor drafts, worktree delete-state) are read
//   defensively with {} fallbacks. The decision model treats missing
//   evidence as unknown (not deletable) — when those slices compose in
//   their own fatias, Space lights up with no change here.
// - Delete flows through Hydra's delete_worktree invoke (see the page),
//   not the Orca removeWorktree batch machine.
import { useRef, useState } from 'react'
import { useAppStore } from '@/store'
import { getRepoMapFromState, getWorktreeMapFromState } from '@/store/selectors'
import { useShallow } from 'zustand/react/shallow'
import type {
  WorkspaceSpaceSortDirection,
  WorkspaceSpaceSortKey
} from './workspace-space-presentation'

export type WorkspaceGitRefreshState = {
  isRefreshing: boolean
  error: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OptionalCaches = Partial<Record<
  | 'editorDrafts'
  | 'hostedReviewCache'
  | 'linearIssueCache'
  | 'deleteStateByWorktreeId',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>>

function optionalCaches(): {
  editorDrafts: Record<string, string>
  hostedReviewCache: Record<string, { data?: { number: number; state: string; status: string; title: string } | null }>
  linearIssueCache: Record<string, { data?: { identifier: string; title: string; state?: { name: string } } | null }>
  deleteStateByWorktreeId: Record<string, { isDeleting?: boolean } | undefined>
} {
  const s = useAppStore.getState() as unknown as OptionalCaches
  return {
    editorDrafts: (s.editorDrafts ?? {}) as Record<string, string>,
    hostedReviewCache: (s.hostedReviewCache ?? {}) as Record<string, { data?: { number: number; state: string; status: string; title: string } | null }>,
    linearIssueCache: (s.linearIssueCache ?? {}) as Record<string, { data?: { identifier: string; title: string; state?: { name: string } } | null }>,
    deleteStateByWorktreeId: (s.deleteStateByWorktreeId ?? {}) as Record<string, { isDeleting?: boolean } | undefined>
  }
}

export function useWorkspaceSpaceManagerBindings() {
  const analysis = useAppStore((state) => state.workspaceSpaceAnalysis)
  const progress = useAppStore((state) => state.workspaceSpaceScanProgress)
  const scanError = useAppStore((state) => state.workspaceSpaceScanError)
  const isScanning = useAppStore((state) => state.workspaceSpaceScanning)
  const refreshWorkspaceSpace = useAppStore((state) => state.refreshWorkspaceSpace)
  const cancelWorkspaceSpaceScan = useAppStore((state) => state.cancelWorkspaceSpaceScan)
  const removeWorkspaceSpaceWorktrees = useAppStore((state) => state.removeWorkspaceSpaceWorktrees)
  const repoMap = useAppStore((state) => getRepoMapFromState(state))
  const repos = useAppStore((state) => state.repos)
  const worktreeMap = useAppStore(useShallow((state) => getWorktreeMapFromState(state)))
  const tabsByWorktree = useAppStore((state) => state.tabsByWorktree)
  const ptyIdsByTabId = useAppStore((state) => state.ptyIdsByTabId)
  const agentStatusByPaneKey = useAppStore((state) => state.agentStatusByPaneKey)
  const migrationUnsupportedByPtyId = useAppStore((state) => state.migrationUnsupportedByPtyId)
  const runtimePaneTitlesByTabId = useAppStore((state) => state.runtimePaneTitlesByTabId)
  const agentStatusEpoch = useAppStore((state) => state.agentStatusEpoch)
  const retainedAgentsByPaneKey = useAppStore((state) => state.retainedAgentsByPaneKey)
  const openFiles = useAppStore((state) => state.openFiles)
  const browserTabsByWorktree = useAppStore((state) => state.browserTabsByWorktree)
  const gitStatusByWorktree = useAppStore((state) => state.gitStatusByWorktree)
  const remoteStatusesByWorktree = useAppStore((state) => state.remoteStatusesByWorktree)
  const issueCache = useAppStore((state) => state.issueCache)
  const settings = useAppStore((state) => state.settings)
  const activeWorktreeId = useAppStore((state) => state.activeWorktreeId)
  const [query, setQuery] = useState('')
  const [onlyDeletable, setOnlyDeletable] = useState(false)
  const [sortKey, setSortKey] = useState<WorkspaceSpaceSortKey>('size')
  const [sortDirection, setSortDirection] = useState<WorkspaceSpaceSortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [inspectedWorktreeId, setInspectedWorktreeId] = useState<string | null>(null)
  const [treemapZoomWorktreeId, setTreemapZoomWorktreeId] = useState<string | null>(null)
  const [gitRefreshStateByWorktreeId, setGitRefreshStateByWorktreeId] = useState<
    Record<string, WorkspaceGitRefreshState>
  >({})
  const [gitStatusByWorktreeIdentity, setGitStatusByWorktreeIdentity] = useState<
    Map<string, { path: string }[]>
  >(() => new Map())
  const gitStatusScanGenerationRef = useRef<number | null>(analysis?.scannedAt ?? null)
  const gitStatusByWorktreeIdentityRef = useRef(gitStatusByWorktreeIdentity)
  const inFlightGitStatusRefreshes = useRef<Set<string>>(new Set())
  // Why: optional caches live outside the composed store until their own
  // fatias compose them; read once per render (not subscribed) so Space
  // never re-renders on unrelated cache traffic.
  const caches = optionalCaches()

  return {
    analysis,
    progress,
    scanError,
    isScanning,
    refreshWorkspaceSpace,
    cancelWorkspaceSpaceScan,
    removeWorkspaceSpaceWorktrees,
    deleteStateByWorktreeId: caches.deleteStateByWorktreeId,
    repoMap,
    repos,
    worktreeMap,
    tabsByWorktree,
    ptyIdsByTabId,
    agentStatusByPaneKey,
    migrationUnsupportedByPtyId,
    runtimePaneTitlesByTabId,
    agentStatusEpoch,
    retainedAgentsByPaneKey,
    openFiles,
    editorDrafts: caches.editorDrafts,
    browserTabsByWorktree,
    gitStatusByWorktree,
    remoteStatusesByWorktree,
    hostedReviewCache: caches.hostedReviewCache,
    issueCache,
    linearIssueCache: caches.linearIssueCache,
    settings,
    activeWorktreeId,
    query,
    setQuery,
    onlyDeletable,
    setOnlyDeletable,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    selectedIds,
    setSelectedIds,
    inspectedWorktreeId,
    setInspectedWorktreeId,
    treemapZoomWorktreeId,
    setTreemapZoomWorktreeId,
    gitRefreshStateByWorktreeId,
    setGitRefreshStateByWorktreeId,
    gitStatusByWorktreeIdentity,
    setGitStatusByWorktreeIdentity,
    gitStatusScanGenerationRef,
    gitStatusByWorktreeIdentityRef,
    inFlightGitStatusRefreshes
  }
}
