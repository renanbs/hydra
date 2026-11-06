// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: renderer/src/store/slices/github-work-items-query-bounds.ts
// (re-exports shared/github/work-items-query-bounds)
// Verbatim: src/reference/shared/github/work-items-query-bounds.ts
import { isClipboardTextByteLengthOverLimit } from '../../shared/clipboard-text'
import { sortWorkItemsByNumber } from '../github/cache-identity'

export const GITHUB_WORK_ITEMS_QUERY_MAX_BYTES = 8 * 1024

/**
 * The Search API's free-text 422 wording is the only signal separating a
 * permanently unreachable page (past the first 1000 matches) from a transient failure.
 */
export const GITHUB_SEARCH_RESULT_WINDOW_ERROR_PATTERN = /first 1000 search results/i

export function isGitHubWorkItemsQueryTooLarge(
  query: string,
  maxBytes = GITHUB_WORK_ITEMS_QUERY_MAX_BYTES
): boolean {
  return isClipboardTextByteLengthOverLimit(query, maxBytes)
}

export { sortWorkItemsByNumber }
