// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: renderer/src/store/slices/workspace-space.ts (local subset).
// Transport: Tauri `workspace_space_*` commands + `workspace-space:progress` emit.
// Removed vs Orca: execution-host/removal-target model (Hydra worktrees are
// local paths), measurements lane (folded into progress), feature-interaction
// telemetry. The scan joins concurrent callers on one in-flight promise.
import type { StateCreator } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { AppState } from '../index'
import type { WorkspaceSpaceAnalysis, WorkspaceSpaceWorktree } from './workspace-space-types'

export type WorkspaceSpaceScanProgress = {
  scanId: string
  state: string
  scannedWorktreeCount: number
  totalWorktreeCount: number
  currentWorktreeDisplayName?: string | null
}

export type WorkspaceSpaceSlice = {
  workspaceSpaceAnalysis: WorkspaceSpaceAnalysis | null
  workspaceSpaceScanProgress: WorkspaceSpaceScanProgress | null
  workspaceSpaceScanError: string | null
  workspaceSpaceScanning: boolean
  applyWorkspaceSpaceProgress: (progress: WorkspaceSpaceScanProgress) => void
  cancelWorkspaceSpaceScan: () => Promise<boolean>
  hydrateWorkspaceSpaceFromCache: () => Promise<boolean>
  refreshWorkspaceSpace: () => Promise<WorkspaceSpaceAnalysis>
  removeWorkspaceSpaceWorktrees: (worktreePaths: readonly string[]) => void
}

let inFlightScan: Promise<WorkspaceSpaceAnalysis> | null = null
let progressUnlisten: (() => void) | null = null

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const createWorkspaceSpaceSlice: StateCreator<AppState, [], [], WorkspaceSpaceSlice> = (
  set,
  get
) => ({
  workspaceSpaceAnalysis: null,
  workspaceSpaceScanProgress: null,
  workspaceSpaceScanError: null,
  workspaceSpaceScanning: false,
  applyWorkspaceSpaceProgress: (progress) =>
    set((state) => {
      if (
        state.workspaceSpaceScanProgress?.scanId !== progress.scanId &&
        !state.workspaceSpaceScanning
      ) {
        return state
      }
      return {
        workspaceSpaceScanProgress: progress,
        workspaceSpaceScanning: true
      }
    }),
  cancelWorkspaceSpaceScan: async () => {
    try {
      await invoke('workspace_space_cancel')
    } catch {
      return false
    }
    set((state) =>
      state.workspaceSpaceScanProgress
        ? {
            workspaceSpaceScanProgress: {
              ...state.workspaceSpaceScanProgress,
              state: 'cancelling'
            }
          }
        : state
    )
    return true
  },
  hydrateWorkspaceSpaceFromCache: async () => {
    const hasLiveAnalysis = (): boolean =>
      get().workspaceSpaceAnalysis !== null || get().workspaceSpaceScanning || inFlightScan !== null
    if (hasLiveAnalysis()) {
      return false
    }
    let cached: WorkspaceSpaceAnalysis | null
    try {
      cached = await invoke<WorkspaceSpaceAnalysis | null>('workspace_space_get_cached_analysis')
    } catch {
      // Why: hydration is best-effort; a manual scan remains the recovery path.
      return false
    }
    if (cached === null || hasLiveAnalysis()) {
      return false
    }
    set({ workspaceSpaceAnalysis: cached })
    return true
  },
  refreshWorkspaceSpace: async () => {
    if (inFlightScan) {
      return inFlightScan
    }
    set({
      workspaceSpaceScanning: true,
      workspaceSpaceScanProgress: null,
      workspaceSpaceScanError: null
    })
    // Why: the compact card and the full Storage page share one manual scan
    // result; duplicate button presses join the same IO.
    inFlightScan = (async (): Promise<WorkspaceSpaceAnalysis> => {
      // Build scan targets from the live store: local repos + known worktree paths.
      const state = get() as unknown as {
        repos?: Array<{ id: string; path: string; connectionId?: string | null }>
        worktreesByRepo?: Record<string, Array<{ path: string }>>
      }
      const targets = (state.repos ?? [])
        .filter((r) => !r.connectionId)
        .map((r) => ({
          repoId: r.id,
          repoPath: r.path,
          paths: (state.worktreesByRepo?.[r.id] ?? []).map((w) => w.path),
          branch: null as string | null
        }))
        .filter((t) => t.paths.length > 0)
      if (!progressUnlisten) {
        progressUnlisten = await listen<WorkspaceSpaceScanProgress>(
          'workspace-space:progress',
          (event) => {
            get().applyWorkspaceSpaceProgress(event.payload)
          }
        )
      }
      try {
        const analysis = await invoke<WorkspaceSpaceAnalysis>('workspace_space_analyze', {
          repoWorktrees: targets
        })
        set({
          workspaceSpaceAnalysis: analysis,
          workspaceSpaceScanning: false,
          workspaceSpaceScanProgress: null
        })
        return analysis
      } catch (error: unknown) {
        const msg = errorMessage(error).toLowerCase()
        const cancelled = msg.includes('cancelled') || msg.includes('abort')
        set({
          workspaceSpaceScanError: cancelled ? null : errorMessage(error),
          workspaceSpaceScanning: false,
          workspaceSpaceScanProgress: null
        })
        throw error
      } finally {
        inFlightScan = null
      }
    })()
    return inFlightScan
  },
  removeWorkspaceSpaceWorktrees: (worktreePaths) => {
    if (worktreePaths.length === 0) {
      return
    }
    set((state) => {
      const analysis = state.workspaceSpaceAnalysis
      if (!analysis) {
        return state
      }
      const deleted = new Set(worktreePaths)
      const worktrees: WorkspaceSpaceWorktree[] = analysis.worktrees.filter(
        (w) => !deleted.has(w.path) && !deleted.has(w.worktreeId)
      )
      if (worktrees.length === analysis.worktrees.length) {
        return state
      }
      return {
        workspaceSpaceAnalysis: {
          ...analysis,
          totalSizeBytes: worktrees.reduce((sum, row) => sum + row.sizeBytes, 0),
          worktrees
        }
      }
    })
  }
})
