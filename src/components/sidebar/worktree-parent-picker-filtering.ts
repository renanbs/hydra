// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-parent-picker-filtering.ts
import { defaultFilter } from 'cmdk'
import { branchName } from '../../lib/git-utils'

/** The strings a parent candidate is matched on: name, branch and path. */
export type WorktreeParentPickerFilterable = {
  displayName: string
  branch: string
  path: string
}

export function getWorktreeParentPickerItemValue(
  candidate: WorktreeParentPickerFilterable
): string {
  return `${candidate.displayName} ${branchName(candidate.branch)} ${candidate.path}`
}

/**
 * Rank candidates for the picker's search box.
 *
 * Why score here instead of handing the list to cmdk: a repo with hundreds of workspaces makes
 * every eligible sibling a candidate, and cmdk mounts, scores and DOM-reorders every registered
 * item on each keystroke. The picker drives its own virtual window, so it needs the scored,
 * sorted array up front.
 */
export function filterWorktreeParentCandidates<T extends WorktreeParentPickerFilterable>(
  candidates: readonly T[],
  search: string
): T[] {
  const query = search.trim()
  if (!query) {
    return [...candidates]
  }
  return candidates
    .map((candidate) => ({
      candidate,
      score: defaultFilter(getWorktreeParentPickerItemValue(candidate), query, [])
    }))
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((scored) => scored.candidate)
}

/** Keep the highlighted row inside the filtered array after a re-rank. */
export function clampWorktreeParentPickerIndex(index: number, count: number): number {
  if (count <= 0) {
    return 0
  }
  return Math.min(Math.max(index, 0), count - 1)
}
