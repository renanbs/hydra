// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-list/listing/pending-worktree-creation-keys.ts
//
// The sidebar row model is mounted for the whole session and this list is empty almost
// always, so it shares one frozen empty array. Non-empty key arrays are cached on the
// source slice identity: the pipeline rebuilds them on every store write otherwise.
export const EMPTY_PENDING_WORKTREE_CREATION_KEYS: readonly string[] = Object.freeze([]);

const keysBySource = new WeakMap<object, readonly string[]>();

export type PendingCreationKeySource = {
  creationId: string;
  repoId: string;
};

export function selectPendingWorktreeCreationKeys(
  pendingCreations: readonly PendingCreationKeySource[] | null | undefined
): readonly string[] {
  if (!pendingCreations) {
    return EMPTY_PENDING_WORKTREE_CREATION_KEYS;
  }
  const cached = keysBySource.get(pendingCreations);
  if (cached) {
    return cached;
  }
  const keys =
    pendingCreations.length === 0
      ? EMPTY_PENDING_WORKTREE_CREATION_KEYS
      : pendingCreations.map((creation) => `${creation.creationId} ${creation.repoId}`);
  keysBySource.set(pendingCreations, keys);
  return keys;
}
