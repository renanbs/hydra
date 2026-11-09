// Worktree-indexed git status cache for delete readiness + Space decisions.
// Subset port of Orca `EditorGitSlice` (gitStatusByWorktree, setGitStatus,
// remoteStatusesByWorktree, setUpstreamStatus, fetchUpstreamStatus).
// Out of scope here (separate fatias): conflict tracking, branch compare,
// remote-op refcount, push/pull/fetch flows — the SourceControl panel owns
// those through its own invokes.
import type { StateCreator } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import type { AppState } from '../index'

export type WorktreeGitStatusEntry = {
  path: string
  indexStatus?: string
  worktreeStatus?: string
  isStaged?: boolean
  isUntracked?: boolean
  isConflicted?: boolean
}

export type WorktreeUpstreamStatus = {
  hasUpstream: boolean
  upstreamName?: string | null
  ahead: number
  behind: number
}

export type WorktreeGitStatusSlice = {
  gitStatusByWorktree: Record<string, WorktreeGitStatusEntry[]>
  remoteStatusesByWorktree: Record<string, WorktreeUpstreamStatus>
  setWorktreeGitStatus: (worktreeId: string, entries: WorktreeGitStatusEntry[]) => void
  setWorktreeUpstreamStatus: (worktreeId: string, status: WorktreeUpstreamStatus) => void
  fetchWorktreeGitStatus: (worktreeId: string, repoPath: string) => Promise<WorktreeGitStatusEntry[]>
  fetchWorktreeUpstreamStatus: (
    worktreeId: string,
    repoPath: string
  ) => Promise<WorktreeUpstreamStatus | null>
}

export const createWorktreeGitStatusSlice: StateCreator<
  AppState,
  [],
  [],
  WorktreeGitStatusSlice
> = (set) => ({
  gitStatusByWorktree: {},
  remoteStatusesByWorktree: {},
  setWorktreeGitStatus: (worktreeId, entries) =>
    set((s) => ({
      gitStatusByWorktree: { ...s.gitStatusByWorktree, [worktreeId]: entries }
    })),
  setWorktreeUpstreamStatus: (worktreeId, status) =>
    set((s) => ({
      remoteStatusesByWorktree: { ...s.remoteStatusesByWorktree, [worktreeId]: status }
    })),
  fetchWorktreeGitStatus: async (worktreeId, repoPath) => {
    const res = await invoke<{ files?: Array<{
      path: string
      index_status?: string
      worktree_status?: string
      is_staged?: boolean
      is_untracked?: boolean
      is_conflicted?: boolean
    }> }>('get_detailed_git_status_cmd', { repoPath })
    const entries: WorktreeGitStatusEntry[] = (res.files ?? []).map((f) => ({
      path: f.path,
      indexStatus: f.index_status,
      worktreeStatus: f.worktree_status,
      isStaged: f.is_staged,
      isUntracked: f.is_untracked,
      isConflicted: f.is_conflicted
    }))
    set((s) => ({
      gitStatusByWorktree: { ...s.gitStatusByWorktree, [worktreeId]: entries }
    }))
    return entries
  },
  fetchWorktreeUpstreamStatus: async (worktreeId, repoPath) => {
    try {
      const status = await invoke<WorktreeUpstreamStatus>('git_upstream_status_cmd', { repoPath })
      set((s) => ({
        remoteStatusesByWorktree: { ...s.remoteStatusesByWorktree, [worktreeId]: status }
      }))
      return status
    } catch {
      return null
    }
  }
})
