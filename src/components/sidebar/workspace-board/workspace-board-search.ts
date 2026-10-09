import { isClipboardTextByteLengthOverLimit } from '../../../shared/clipboard-text'
import { getExecutionHostIdFromWorktreeHostIdentity } from '../../../shared/worktree/host-qualified-identity'
import type { WorkspaceBoardCard, WorkspaceBoardLane } from './workspace-board-worktrees'

/**
 * The board's search only reads text printed on a card: its display name, its
 * branch, its project and its host. Ports, reviews and automation runs are
 * palette-only evidence and stay out, so a card is never hidden by text the
 * board does not paint (Orca `board` evidence policy).
 */
export type WorkspaceBoardSearchableCard = Pick<
  WorkspaceBoardCard,
  'identity' | 'worktree' | 'project'
>

/** Matches Orca's `WORKTREE_PALETTE_QUERY_MAX_BYTES`: a paste above this is discarded, not searched. */
export const WORKSPACE_BOARD_QUERY_MAX_BYTES = 2 * 1024

/** True when the query was discarded for exceeding the palette byte bound. */
export function isWorkspaceBoardQueryTooLarge(
  query: string,
  maxBytes = WORKSPACE_BOARD_QUERY_MAX_BYTES
): boolean {
  return isClipboardTextByteLengthOverLimit(query, maxBytes)
}

/**
 * Folds case and Unicode once, exactly like Orca's palette normalization: NFC
 * keeps combining marks attached to their base, so a folded query never splits a
 * grapheme. Diacritics stay significant (Orca folds case, not accents).
 */
export function normalizeWorkspaceBoardSearchText(text: string): string {
  return text.normalize('NFC').toLowerCase()
}

/** Whitespace-split query tokens; every token must land somewhere on the card. */
export function tokenizeWorkspaceBoardQuery(query: string): string[] {
  const normalized = normalizeWorkspaceBoardSearchText(query).trim()
  return normalized ? normalized.split(/\s+/) : []
}

/** The card's searchable fields, host-qualified. Empty fields are dropped. */
export function buildWorkspaceBoardSearchFields(card: WorkspaceBoardSearchableCard): string[] {
  const { worktree, project } = card
  const host = getExecutionHostIdFromWorktreeHostIdentity(card.identity)
  return [
    worktree.displayName ?? worktree.display_name ?? worktree.branch,
    worktree.branch,
    project.displayName ?? project.name,
    host ?? '',
  ].filter((field) => field !== '')
}

export type WorkspaceBoardSearchEntry = {
  identity: string
  /** The card's normalized fields joined by a separator no query token can contain. */
  haystack: string
}

const FIELD_SEPARATOR = '\n'

/**
 * Builds the board's search index once per card set.
 *
 * Why split from the match: the index only depends on the cards, so a keystroke
 * reruns the search over an already-normalized haystack instead of re-reading and
 * re-folding every card's fields.
 */
export function buildWorkspaceBoardSearchIndex(
  cards: readonly WorkspaceBoardSearchableCard[]
): WorkspaceBoardSearchEntry[] {
  return cards.map((card) => ({
    identity: card.identity,
    haystack: buildWorkspaceBoardSearchFields(card)
      .map(normalizeWorkspaceBoardSearchText)
      .join(FIELD_SEPARATOR),
  }))
}

/**
 * Returns the host-qualified identities matching every query token, or `null`
 * when no filtering is active — distinct from an empty set, which means a real
 * query matched nothing.
 */
export function matchWorkspaceBoardSearchIndex(
  index: readonly WorkspaceBoardSearchEntry[],
  query: string
): ReadonlySet<string> | null {
  if (!query.trim()) {
    return null
  }
  // Why: an over-bound query would otherwise read as "matched nothing" and blank
  // the whole board on a paste accident. Discard it and leave the board unfiltered.
  if (isWorkspaceBoardQueryTooLarge(query)) {
    return null
  }

  const tokens = tokenizeWorkspaceBoardQuery(query)
  if (tokens.length === 0) {
    return null
  }

  const matched = new Set<string>()
  for (const entry of index) {
    if (tokens.every((token) => entry.haystack.includes(token))) {
      matched.add(entry.identity)
    }
  }
  return matched
}

export type WorkspaceBoardSearchResult = {
  lanes: WorkspaceBoardLane[]
  /** Cards left after filtering, across every lane. */
  matchCount: number
  /** Cards before filtering, across every lane — the "n of m" denominator. */
  totalCount: number
}

/**
 * Applies the match set to the board's lanes.
 *
 * Order is preserved: each lane keeps its own card order and only drops the
 * non-matching cards. A lane's `totalCount` always describes its unfiltered
 * membership, so the lane badge can keep printing "matches / total" while a
 * query is active.
 */
export function filterWorkspaceBoardLanes(
  lanes: readonly WorkspaceBoardLane[],
  matchingIds: ReadonlySet<string> | null
): WorkspaceBoardSearchResult {
  let totalCount = 0
  let matchCount = 0
  const filtered = lanes.map((lane) => {
    totalCount += lane.totalCount
    const cards = matchingIds
      ? lane.cards.filter((card) => matchingIds.has(card.identity))
      : lane.cards
    matchCount += cards.length
    return cards === lane.cards ? lane : { ...lane, cards }
  })
  return { lanes: filtered, matchCount, totalCount }
}
