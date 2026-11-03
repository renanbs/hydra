// Pure transitions for the background worktree-create state (D03b-021/022).
//
// Both stores — the live app store (src/store/index.ts) and the ported Orca slice
// (src/store/slices/worktrees/create/pending-worktree-creation.ts) — own a copy of this
// state, so the rules (one active surface, no-op patches, dismissal that only clears the
// surface it owns) live here instead of being written twice.
import type { PendingWorktreeCreation } from "./pending-worktree-creation";

export type PendingCreationState = {
  pendingWorktreeCreations: Record<string, PendingWorktreeCreation>;
  activePendingCreationId: string | null;
};

export type PendingCreationPatch = {
  phase?: PendingWorktreeCreation["phase"];
  status?: PendingWorktreeCreation["status"];
  startedAt?: number;
  error?: string;
  loaderVisible?: boolean;
  request?: PendingWorktreeCreation["request"];
  provisioningLog?: string;
};

export function beginPendingCreation(
  state: PendingCreationState,
  entry: PendingWorktreeCreation
): Partial<PendingCreationState> {
  return {
    pendingWorktreeCreations: { ...(state.pendingWorktreeCreations ?? {}), [entry.creationId]: entry },
    // A background create takes the content surface immediately, like Orca's faux tab.
    activePendingCreationId: entry.creationId,
  };
}

export function updatePendingCreation(
  state: PendingCreationState,
  creationId: string,
  patch: PendingCreationPatch
): Partial<PendingCreationState> {
  const entry = state.pendingWorktreeCreations?.[creationId];
  if (!entry) {
    return state;
  }
  // Why skip no-ops: the create re-emits the same phase; a fresh map identity would
  // repaint the sidebar row on every event.
  const changed = (Object.keys(patch) as (keyof PendingCreationPatch)[]).some(
    (key) => patch[key] !== entry[key as keyof PendingWorktreeCreation]
  );
  if (!changed) {
    return state;
  }
  return {
    pendingWorktreeCreations: {
      ...state.pendingWorktreeCreations,
      [creationId]: { ...entry, ...patch },
    },
  };
}

export function removePendingCreation(
  state: PendingCreationState,
  creationId: string
): Partial<PendingCreationState> {
  if (!state.pendingWorktreeCreations?.[creationId]) {
    return state;
  }
  const { [creationId]: _removed, ...rest } = state.pendingWorktreeCreations;
  return {
    pendingWorktreeCreations: rest,
    // Dismissing a background create must not yank the user off an unrelated surface.
    ...(state.activePendingCreationId === creationId
      ? { activePendingCreationId: null }
      : {}),
  };
}

export function setActivePendingCreation(
  state: PendingCreationState,
  creationId: string | null
): Partial<PendingCreationState> {
  if (creationId !== null && !state.pendingWorktreeCreations?.[creationId]) {
    return state;
  }
  return { activePendingCreationId: creationId };
}
