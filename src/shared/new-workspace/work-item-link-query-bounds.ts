import { isClipboardTextByteLengthOverLimit } from '../clipboard-text'

export const WORK_ITEM_LINK_QUERY_MAX_BYTES = 2 * 1024

/** Bounds the paste-driven link parsers: `matchGitHubItemPath` strips trailing
 *  slashes with an unanchored regex, which is quadratic on a huge paste. The
 *  length check short-circuits before that. */
export function isWorkItemLinkQueryTooLarge(
  query: string,
  maxBytes = WORK_ITEM_LINK_QUERY_MAX_BYTES
): boolean {
  return isClipboardTextByteLengthOverLimit(query, maxBytes)
}
