// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: renderer/src/components/status-bar/use-workspace-space-decision-projection.ts
// Adaptations: Hydra bindings shape (no executionHost-indexed delete state;
// deleteStateByWorktreeId is optional-cache); identity is the worktree path.
import { useCallback, useMemo } from 'react'
import { getAgentStatusEpochNow } from '@/lib/agent-status-epoch-clock'
import {
  getWorkspaceDecisionDetails,
  type WorkspaceDecisionDetails
} from './workspace-space-decision-details'
import { getWorkspaceSpaceWorktreeIdentity } from './workspace-space-helpers'
import type { WorkspaceSpaceWorktree } from '@/store/slices/workspace-space-types'
import type { useWorkspaceSpaceManagerBindings } from './use-workspace-space-manager-bindings'

type WorkspaceSpaceManagerBindings = ReturnType<typeof useWorkspaceSpaceManagerBindings>

export function useWorkspaceSpaceDecisionProjection(bindings: WorkspaceSpaceManagerBindings) {
  const {
    activeWorktreeId,
    agentStatusEpoch,
    agentStatusByPaneKey,
    analysis,
    browserTabsByWorktree,
    deleteStateByWorktreeId,
    editorDrafts,
    gitStatusByWorktree,
    hostedReviewCache,
    issueCache,
    linearIssueCache,
    migrationUnsupportedByPtyId,
    openFiles,
    ptyIdsByTabId,
    remoteStatusesByWorktree,
    repoMap,
    repos,
    retainedAgentsByPaneKey,
    runtimePaneTitlesByTabId,
    settings,
    tabsByWorktree,
    worktreeMap
  } = bindings

  const sourceRows = useMemo(() => analysis?.worktrees ?? [], [analysis?.worktrees])
  const decisionDetailsByWorktreeId = useMemo(() => {
    // Why: the epoch bumps when fresh hook entries cross the stale boundary so
    // delete readiness recomputes with the same wall-clock sample as the store.
    const agentStatusNow = getAgentStatusEpochNow(agentStatusEpoch)
    const details = new Map<string, WorkspaceDecisionDetails>()
    for (const worktree of sourceRows) {
      details.set(
        getWorkspaceSpaceWorktreeIdentity(worktree),
        getWorkspaceDecisionDetails(worktree, {
          repoMap,
          worktreeMap,
          repos,
          tabsByWorktree,
          ptyIdsByTabId,
          agentStatusByPaneKey,
          migrationUnsupportedByPtyId,
          runtimePaneTitlesByTabId,
          retainedAgentsByPaneKey,
          openFiles,
          editorDrafts,
          browserTabsByWorktree,
          gitStatusByWorktree,
          remoteStatusesByWorktree,
          hostedReviewCache,
          issueCache,
          linearIssueCache,
          settings,
          activeWorktreeId,
          now: agentStatusNow
        })
      )
    }
    return details
  }, [
    activeWorktreeId,
    agentStatusEpoch,
    agentStatusByPaneKey,
    browserTabsByWorktree,
    editorDrafts,
    gitStatusByWorktree,
    hostedReviewCache,
    issueCache,
    linearIssueCache,
    migrationUnsupportedByPtyId,
    openFiles,
    ptyIdsByTabId,
    remoteStatusesByWorktree,
    repoMap,
    repos,
    retainedAgentsByPaneKey,
    runtimePaneTitlesByTabId,
    settings,
    sourceRows,
    tabsByWorktree,
    worktreeMap
  ])
  const getDeleteStateForWorktree = useCallback(
    (worktree: WorkspaceSpaceWorktree) =>
      deleteStateByWorktreeId[getWorkspaceSpaceWorktreeIdentity(worktree)],
    [deleteStateByWorktreeId]
  )
  const isWorktreeDeleting = useCallback(
    (worktree: WorkspaceSpaceWorktree): boolean =>
      getDeleteStateForWorktree(worktree)?.isDeleting ?? false,
    [getDeleteStateForWorktree]
  )

  return {
    sourceRows,
    decisionDetailsByWorktreeId,
    getDeleteStateForWorktree,
    isWorktreeDeleting
  }
}
