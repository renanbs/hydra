// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: shared/issue-link-input.ts
//
// One parser shared by the metadata dialog's save gate and its payload builder,
// so a value that enables Save is always the value that gets written. Kept
// self-contained: Hydra's renderer still carries auto-stub GitHub/Linear link
// modules, and the dialog must not depend on a stub returning null.

export const ISSUE_LINK_PROVIDERS = ['github', 'linear'] as const

export type IssueLinkProvider = (typeof ISSUE_LINK_PROVIDERS)[number]

export function isIssueLinkProvider(value: unknown): value is IssueLinkProvider {
  return ISSUE_LINK_PROVIDERS.includes(value as IssueLinkProvider)
}

const GITHUB_ISSUE_OR_PR_URL_RE =
  /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+)\/(issues|pull)\/(\d+)(?:[/?#]\S*)?$/i
const LINEAR_ISSUE_IDENTIFIER_RE = /^[A-Za-z][A-Za-z0-9]*-\d+$/
const LINEAR_ISSUE_URL_RE =
  /^https?:\/\/(?:www\.)?linear\.app\/[^/\s]+\/issue\/([^/\s?#]+)(?:[/?#]\S*)?$/i

function normalizeLinearIdentifier(value: string): string | null {
  const trimmed = value.trim()
  if (!LINEAR_ISSUE_IDENTIFIER_RE.test(trimmed)) {
    return null
  }
  return trimmed.toUpperCase()
}

/** The Linear identifier an issue URL names (`/issue/eng-123-some-title` → `ENG-123`). */
function linearIdentifierFromUrl(value: string): string | null {
  const match = LINEAR_ISSUE_URL_RE.exec(value.trim())
  if (!match) {
    return null
  }
  const slug = match[1]!
  const identifierMatch = /^([A-Za-z][A-Za-z0-9]*-\d+)(?:-|$)/.exec(slug)
  return identifierMatch ? identifierMatch[1]!.toUpperCase() : normalizeLinearIdentifier(slug)
}

export type ParsedGitHubIssueLink = {
  provider: 'github'
  number: number
  isPullRequest: boolean
}

/** GitHub issue/PR URL, or a bare `#123` / `123` reference. */
export function parseGitHubIssueLink(input: string): ParsedGitHubIssueLink | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }
  const url = GITHUB_ISSUE_OR_PR_URL_RE.exec(trimmed)
  if (url) {
    const number = Number.parseInt(url[4]!, 10)
    if (!Number.isSafeInteger(number) || number <= 0) {
      return null
    }
    return { provider: 'github', number, isPullRequest: url[3]!.toLowerCase() === 'pull' }
  }
  const numeric = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  if (!/^\d+$/.test(numeric)) {
    return null
  }
  const number = Number.parseInt(numeric, 10)
  // Why: `/^\d+$/` accepts 400 digits, which parseInt turns into Infinity.
  return Number.isSafeInteger(number) && number > 0
    ? { provider: 'github', number, isPullRequest: false }
    : null
}

export type ParsedLinearIssueLink = { provider: 'linear'; identifier: string }

/** Linear identifier (`ENG-123`) or issue URL. */
export function parseLinearIssueLink(input: string): ParsedLinearIssueLink | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }
  const identifier = normalizeLinearIdentifier(trimmed) ?? linearIdentifierFromUrl(trimmed)
  return identifier ? { provider: 'linear', identifier } : null
}

/**
 * URL input only. Linear and Jira issue keys are byte-identical in shape, so a
 * bare `STA-335` can never decide a provider — it would override the user's
 * explicit choice.
 */
export function getIssueLinkProviderFromUrl(input: string): IssueLinkProvider | null {
  const trimmed = input.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    return null
  }
  const github = GITHUB_ISSUE_OR_PR_URL_RE.exec(trimmed)
  if (github) {
    // Why: a pull URL is a valid GitHub link but not an issue, and must not flip
    // the provider into a state where the field then refuses to save it.
    return github[3]!.toLowerCase() === 'issues' ? 'github' : null
  }
  return linearIdentifierFromUrl(trimmed) ? 'linear' : null
}

export type ParsedIssueLinkInput =
  | { provider: 'github'; number: number }
  | { provider: 'linear'; identifier: string }

/**
 * Single parse shared by the dialog's save gate and its payload builder, so a
 * value that enables Save is always the value that gets written.
 */
export function parseIssueLinkInput(
  input: string,
  provider: IssueLinkProvider
): ParsedIssueLinkInput | null {
  if (provider === 'linear') {
    const parsed = parseLinearIssueLink(input)
    return parsed ? { provider: 'linear', identifier: parsed.identifier } : null
  }
  const parsed = parseGitHubIssueLink(input)
  // Why: a pull URL pasted in the issue field must not silently become an issue.
  return parsed && !parsed.isPullRequest
    ? { provider: 'github', number: parsed.number }
    : null
}
