// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-unambiguous-id-index.ts
//
// D11-016: worktree ids are not host-qualified. A bare id that names rows on two hosts
// must not resolve to either of them — a drop or an activation would silently land on
// the wrong machine. Callers that must resolve by bare id use this index and treat a
// miss as "ambiguous or unknown".
export function buildUnambiguousIdIndex<T>(
  items: readonly T[],
  getId: (item: T) => string | null | undefined
): Map<string, T> {
  const index = new Map<string, T>()
  const ambiguous = new Set<string>()
  for (const item of items) {
    const id = getId(item)
    if (!id) continue
    if (index.has(id)) {
      index.delete(id)
      ambiguous.add(id)
    } else if (!ambiguous.has(id)) {
      index.set(id, item)
    }
  }
  return index
}

export function buildUnambiguousWorktreeIdIndex<T extends { id: string }>(
  worktrees: readonly T[]
): Map<string, T> {
  return buildUnambiguousIdIndex(worktrees, (worktree) => worktree.id)
}
