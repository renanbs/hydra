import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import type { WorkspaceBoardCard } from './workspace-board-worktrees'
import {
  buildWorkspaceBoardSearchIndex,
  isWorkspaceBoardQueryTooLarge,
  matchWorkspaceBoardSearchIndex,
} from './workspace-board-search'

function areIdentitySetsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) {
    return false
  }
  for (const identity of a) {
    if (!b.has(identity)) {
      return false
    }
  }
  return true
}

export type WorkspaceBoardSearchState = {
  query: string
  setQuery: (query: string) => void
  clearQuery: () => void
  /** `null` while nothing filters the board; an empty set means a real query matched nothing. */
  matchingWorktreeIds: ReadonlySet<string> | null
  /** True while a real query is narrowing the board (not whitespace-only, not over-bound). */
  isFiltering: boolean
  /** True when the text was discarded for exceeding the palette byte bound. */
  isQueryTooLarge: boolean
}

/**
 * Owns the board's search text and the host-qualified identity set it matches.
 *
 * Ported from Orca `useWorkspaceKanbanSearch`, reading the board's own cards
 * instead of a separate palette document map.
 */
export function useWorkspaceBoardSearch(args: {
  open: boolean
  cards: readonly WorkspaceBoardCard[]
}): WorkspaceBoardSearchState {
  const [query, setQuery] = useState('')
  // Why: card identities churn on agent-status ticks, so an unchanged match set
  // must keep its identity or every memoized card re-renders on every tick.
  // Store via setState-during-render (not a ref write) so a discarded render does
  // not leak a match set that never committed.
  const [stableMatched, setStableMatched] = useState<ReadonlySet<string> | null>(null)

  // Why: a stale query silently hiding cards on reopen is a trap. Reset during
  // render, so no frame paints the old filter.
  if (!args.open && query !== '') {
    setQuery('')
  }

  // Why: the input stays fully controlled and undebounced, but a query change
  // mounts or unmounts every hidden card — clearing one costs about what opening
  // the board costs. Deferring only the filter keeps the caret responsive and
  // lets React interrupt the board re-render.
  const deferredQuery = useDeferredValue(query)

  const index = useMemo(() => buildWorkspaceBoardSearchIndex(args.cards), [args.cards])

  const matched = useMemo(
    () => matchWorkspaceBoardSearchIndex(index, deferredQuery),
    [index, deferredQuery]
  )

  const matchingWorktreeIds =
    stableMatched && matched && areIdentitySetsEqual(stableMatched, matched)
      ? stableMatched
      : matched
  if (matchingWorktreeIds !== stableMatched) {
    setStableMatched(matchingWorktreeIds)
  }

  const clearQuery = useCallback(() => setQuery(''), [])

  return {
    query,
    setQuery,
    clearQuery,
    matchingWorktreeIds,
    // Why: an over-bound query is non-empty but non-filtering, and the lane
    // counts must not switch to "n / m" for it.
    isFiltering: matchingWorktreeIds !== null,
    // Why: whitespace-only text is also non-filtering, but it is self-evidently
    // so. A discarded 2KB paste looks identical to a query that matched
    // everything, so only that case earns an explanation. Read the deferred
    // query — this describes the board, so it changes on the same frame the board does.
    isQueryTooLarge: isWorkspaceBoardQueryTooLarge(deferredQuery),
  }
}
