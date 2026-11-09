// Workspace cleanup classification (TS-side).
// Ported from Orca `shared/workspace-cleanup.ts` (candidate/blocker model) +
// the classification half of `main/ipc/workspace-cleanup-scan.ts`.
// The evidence comes from the ported decision projection + space scan +
// persisted dismissals; the Rust side only persists (scan cache, dismissals,
// prune batches).
//
// Blocker semantics (Orca parity):
// - main-worktree: never a candidate.
// - active-workspace: the focused worktree is not suggested.
// - running-terminal / live-agent / dirty-editor-buffer / dirty-files /
//   unpushed-commits: evidence of live work — review, not auto.
// - git-status-error: unknown cleanliness — not deletable until checked.
// - dismissed: user explicitly hid it.
// A row with zero blockers is `ready`; with blockers, `review`.
import { useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { WorkspaceSpaceWorktree } from '@/store/slices/workspace-space-types'
import type { WorkspaceDecisionDetails } from './workspace-space-decision-details'

export type CleanupBlocker =
  | 'main-worktree'
  | 'active-workspace'
  | 'running-terminal'
  | 'live-agent'
  | 'dirty-editor-buffer'
  | 'dirty-files'
  | 'unpushed-commits'
  | 'git-status-error'
  | 'dismissed'

export type CleanupCandidate = {
  worktree: WorkspaceSpaceWorktree
  decision: WorkspaceDecisionDetails
  blockers: CleanupBlocker[]
  ready: boolean
}

export function classifyCleanupCandidate(
  worktree: WorkspaceSpaceWorktree,
  decision: WorkspaceDecisionDetails,
  isActive: boolean,
  dismissed: ReadonlySet<string>
): CleanupCandidate {
  const blockers: CleanupBlocker[] = []
  if (worktree.isMainWorktree) {
    blockers.push('main-worktree')
  }
  if (isActive) {
    blockers.push('active-workspace')
  }
  if (decision.liveTerminalCount > 0) {
    blockers.push('running-terminal')
  }
  if (decision.activeAgentCount > 0) {
    blockers.push('live-agent')
  }
  if (decision.dirtyEditorBufferCount > 0) {
    blockers.push('dirty-editor-buffer')
  }
  if ((decision.changedFileCount ?? -1) > 0) {
    blockers.push('dirty-files')
  }
  if (decision.changedFileCount === null) {
    blockers.push('git-status-error')
  }
  const upstreamAhead =
    decision.branchStatus !== null && decision.branchStatus.includes('ahead')
  if (upstreamAhead) {
    blockers.push('unpushed-commits')
  }
  if (dismissed.has(worktree.worktreeId) || dismissed.has(worktree.path)) {
    blockers.push('dismissed')
  }
  return { worktree, decision, blockers, ready: blockers.length === 0 }
}

export function useWorkspaceCleanupCandidates(
  rows: readonly WorkspaceSpaceWorktree[],
  detailsById: ReadonlyMap<string, WorkspaceDecisionDetails>,
  dismissed: ReadonlySet<string>,
  activeWorktreeId: string | null
): CleanupCandidate[] {
  return useMemo(
    () =>
      rows
        .filter((w) => w.status === 'ok')
        .map((w) => {
          const decision = detailsById.get(w.worktreeId)
          if (!decision) {
            return null
          }
          return classifyCleanupCandidate(w, decision, activeWorktreeId === w.worktreeId, dismissed)
        })
        .filter((c): c is CleanupCandidate => c !== null),
    [rows, detailsById, dismissed, activeWorktreeId]
  )
}

export async function dismissCleanupCandidate(worktreeId: string): Promise<string[]> {
  return invoke<string[]>('workspace_cleanup_dismiss', { worktreeId })
}

export async function clearCleanupDismissals(): Promise<void> {
  await invoke('workspace_cleanup_clear_dismissals')
}

export async function listCleanupDismissals(): Promise<string[]> {
  return invoke<string[]>('workspace_cleanup_list_dismissals')
}
