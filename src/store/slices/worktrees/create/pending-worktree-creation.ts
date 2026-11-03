// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/store/slices/worktrees/create/pending-worktree-creation.ts
//
// Thin store adapters over the shared transitions in `lib/pending-worktree-creation-state`.
// The live app store composes the same transitions, so the two stores cannot drift.
import type { StateCreator } from 'zustand'
import type { AppState } from '../../../types'
import type { WorktreeSlice } from '../../worktree-helpers'
import {
  beginPendingCreation,
  removePendingCreation,
  setActivePendingCreation,
  updatePendingCreation,
  type PendingCreationState
} from '../../../../lib/pending-worktree-creation-state'

type WorktreeSliceCreator = StateCreator<AppState, [], [], WorktreeSlice>
type WorktreeSliceSet = Parameters<WorktreeSliceCreator>[0]
type WorktreeSliceGet = Parameters<WorktreeSliceCreator>[1]

export function createBeginPendingWorktreeCreation(
  set: WorktreeSliceSet,
  _get: WorktreeSliceGet
): WorktreeSlice['beginPendingWorktreeCreation'] {
  return (entry) => {
    set((state: PendingCreationState) => beginPendingCreation(state, entry))
  }
}

export function createUpdatePendingWorktreeCreation(
  set: WorktreeSliceSet,
  _get: WorktreeSliceGet
): WorktreeSlice['updatePendingWorktreeCreation'] {
  return (creationId, patch) => {
    set((state: PendingCreationState) => updatePendingCreation(state, creationId, patch))
  }
}

export function createRemovePendingWorktreeCreation(
  set: WorktreeSliceSet,
  _get: WorktreeSliceGet
): WorktreeSlice['removePendingWorktreeCreation'] {
  return (creationId) => {
    set((state: PendingCreationState) => removePendingCreation(state, creationId))
  }
}

export function createSetActivePendingWorktreeCreation(
  set: WorktreeSliceSet,
  _get: WorktreeSliceGet
): WorktreeSlice['setActivePendingWorktreeCreation'] {
  return (creationId) => {
    set((state: PendingCreationState) => setActivePendingCreation(state, creationId))
  }
}
