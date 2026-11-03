// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-worktree-issue-link.ts
//
// D04b-018: the "open linked issue" affordance used by the metadata dialog and the
// card menus. A lookup can cross an IPC or runtime boundary that stops answering,
// so every resolve races a 35s deadline instead of leaving the button spinning.
import { useCallback, useMemo, useRef, useState } from 'react'

import { useAppStore } from '../../store'
import { parseGitHubIssueOrPRNumber } from '../../lib/github-links'
import { issueCacheKey } from '../../store/github/cache-identity'
import { useMountedRef } from '../../hooks/useMountedRef'
import { findIndexedWorktreeOwner } from '../../lib/worktree-runtime-owner-index'
import { buildLinearIssueUrl, parseLinearIssueInput } from '../../shared/linear/links'
import type { IssueLinkProvider } from '../../shared/issue-link-input'
import type { TaskSourceContext } from '../../shared/task-source-context'
import { isWorkItemLinkQueryTooLarge } from '../../shared/new-workspace/work-item-link-query-bounds'
import { parseExplicitGitHubIssueUrl } from './worktree-meta-updates'

/**
 * Above the 30s GitHub/Linear client bounds, so a slow-but-live transport reports
 * its own failure rather than being called a bad identifier here.
 */
export const OPEN_ISSUE_TIMEOUT_MS = 35_000

async function resolveIssueUrlWithinTimeout(
  lookup: Promise<{ url?: string } | null>
): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const issue = await Promise.race([
      lookup,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), OPEN_ISSUE_TIMEOUT_MS)
      })
    ])
    return issue?.url ?? null
  } catch {
    // Why: the store's fetchers already log and normalize failures to null; a
    // rejection here is a transport fault and reads the same to the user.
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Linear fetcher, when the Linear slice is composed. */
type LinearIssueFetcher = (
  identifier: string,
  scope: 'all',
  options: { sourceContext: TaskSourceContext | null }
) => Promise<{ url?: string } | null>

export function useWorktreeIssueLink(args: {
  worktreeId: string
  /** The repo bucket the opening row belongs to, for IDs the owner index reports
   *  as ambiguous across hosts. Falls back to the index when absent. */
  ownerRepoId?: string | null
  issueInput: string
  issueProvider: IssueLinkProvider
  linearOrganizationUrlKey?: string | null
  /** The persisted identifier the stored org key belongs to. */
  linkedLinearIssue?: string | null
  linearSourceContext?: TaskSourceContext | null
}): {
  canOpenIssue: boolean
  openingIssue: boolean
  /** A lookup came back empty: wrong identifier, no access, or provider offline. */
  openIssueFailed: boolean
  handleOpenIssue: () => Promise<void>
  resetOpeningIssue: () => void
} {
  const {
    worktreeId,
    ownerRepoId,
    issueInput,
    issueProvider,
    linearOrganizationUrlKey,
    linkedLinearIssue,
    linearSourceContext
  } = args
  const isLinear = issueProvider === 'linear'
  const fetchIssue = useAppStore((s) => s.fetchIssue)
  // Hydra's live store does not compose the Linear slice yet; read it defensively
  // so the GitHub path stays live and a Linear click reports a failure instead of
  // hanging on a missing action.
  const fetchLinearIssue = useAppStore(
    (s) => (s as unknown as { fetchLinearIssue?: LinearIssueFetcher }).fetchLinearIssue
  )
  const [openingIssue, setOpeningIssue] = useState(false)
  const [failedIssueInput, setFailedIssueInput] = useState<string | null>(null)
  const mountedRef = useMountedRef()
  // Why: the field stays editable while a lookup is in flight, and Promise.race
  // cannot cancel the losing promise. A result that lands after the value moved
  // on — or after a reset — must not open the issue the user just replaced.
  const openRequestRef = useRef(0)
  const latestRequestKeyRef = useRef('')
  latestRequestKeyRef.current = `${issueProvider}\u0000${issueInput}`

  // Why: the link parsers strip trailing slashes with an unanchored regex, which
  // is quadratic — these run on every keystroke, so the paste bound applies.
  const boundedInput = useMemo(
    () => (isWorkItemLinkQueryTooLarge(issueInput) ? '' : issueInput),
    [issueInput]
  )

  const issueNumber = useMemo(
    () => (isLinear ? null : parseGitHubIssueOrPRNumber(boundedInput)),
    [isLinear, boundedInput]
  )
  const issueUrlFromInput = useMemo(
    () => (isLinear ? null : parseExplicitGitHubIssueUrl(boundedInput)),
    [isLinear, boundedInput]
  )
  const issueInputLooksLikeUrl = useMemo(
    () => /^https?:\/\//i.test(boundedInput.trim()),
    [boundedInput]
  )
  const parsedLinearIssue = useMemo(
    () => (isLinear ? parseLinearIssueInput(boundedInput) : null),
    [isLinear, boundedInput]
  )
  // Why: only an org key authoritative *for this identifier* may build a URL —
  // the input's own, or the workspace's stored one while the typed identifier is
  // still that issue. Anything else falls through to the all-workspace lookup.
  const linearIssueUrl = useMemo(() => {
    if (!parsedLinearIssue) {
      return null
    }
    const storedKeyApplies =
      typeof linkedLinearIssue === 'string' &&
      linkedLinearIssue.toUpperCase() === parsedLinearIssue.identifier.toUpperCase()
    return buildLinearIssueUrl({
      identifier: parsedLinearIssue.identifier,
      organizationUrlKey:
        parsedLinearIssue.organizationUrlKey ?? (storedKeyApplies ? linearOrganizationUrlKey : null)
    })
  }, [parsedLinearIssue, linkedLinearIssue, linearOrganizationUrlKey])

  const issueRepo = useAppStore((s) => {
    const repoId = ownerRepoId ?? findIndexedWorktreeOwner(s.worktreesByRepo, worktreeId)?.repoId
    return repoId ? s.repos.find((repo) => repo.id === repoId) : undefined
  })
  const cachedIssueUrl = useAppStore((s) => {
    if (!issueRepo || issueNumber === null) {
      return null
    }
    return (
      s.issueCache[
        issueCacheKey(
          issueRepo.path,
          issueRepo.id,
          issueNumber,
          s.settings as never,
          issueRepo.connectionId,
          issueRepo.executionHostId as never,
          true
        )
      ]?.data?.url ?? null
    )
  })
  const canOpenIssue = isLinear
    ? Boolean(parsedLinearIssue)
    : issueInputLooksLikeUrl
      ? Boolean(issueUrlFromInput)
      : Boolean(cachedIssueUrl || (issueRepo && issueNumber))

  const handleOpenIssue = useCallback(async () => {
    if (openingIssue) {
      return
    }
    setFailedIssueInput(null)
    const generation = ++openRequestRef.current
    const requestKey = latestRequestKeyRef.current
    const isCurrentRequest = (): boolean =>
      mountedRef.current &&
      openRequestRef.current === generation &&
      latestRequestKeyRef.current === requestKey

    if (isLinear) {
      if (!parsedLinearIssue) {
        return
      }
      if (linearIssueUrl) {
        void window.api.shell.openUrl(linearIssueUrl)
        return
      }
      if (!fetchLinearIssue) {
        // No Linear transport in this build: say so instead of spinning forever.
        setFailedIssueInput(issueInput)
        return
      }
      setOpeningIssue(true)
      try {
        const url = await resolveIssueUrlWithinTimeout(
          fetchLinearIssue(parsedLinearIssue.identifier, 'all', {
            sourceContext: linearSourceContext ?? null
          })
        )
        if (!isCurrentRequest()) {
          return
        }
        if (url) {
          void window.api.shell.openUrl(url)
        } else {
          setFailedIssueInput(issueInput)
        }
      } finally {
        if (mountedRef.current) {
          setOpeningIssue(false)
        }
      }
      return
    }

    if (issueUrlFromInput) {
      void window.api.shell.openUrl(issueUrlFromInput)
      return
    }

    if (issueInputLooksLikeUrl) {
      return
    }

    if (cachedIssueUrl) {
      void window.api.shell.openUrl(cachedIssueUrl)
      return
    }

    if (!issueRepo || issueNumber === null) {
      return
    }

    setOpeningIssue(true)
    try {
      const url = await resolveIssueUrlWithinTimeout(
        fetchIssue(issueRepo.path, issueNumber, { repoId: issueRepo.id })
      )
      if (!isCurrentRequest()) {
        return
      }
      if (url) {
        void window.api.shell.openUrl(url)
      } else {
        setFailedIssueInput(issueInput)
      }
    } finally {
      if (mountedRef.current) {
        setOpeningIssue(false)
      }
    }
  }, [
    cachedIssueUrl,
    fetchIssue,
    fetchLinearIssue,
    isLinear,
    issueInput,
    issueInputLooksLikeUrl,
    issueNumber,
    issueRepo,
    issueUrlFromInput,
    linearIssueUrl,
    linearSourceContext,
    mountedRef,
    openingIssue,
    parsedLinearIssue
  ])

  const resetOpeningIssue = useCallback(() => {
    // Bumping the generation retires any in-flight lookup: a reset means a fresh
    // dialog session, and the old result must not open or report here.
    openRequestRef.current += 1
    setOpeningIssue(false)
    setFailedIssueInput(null)
  }, [])

  return {
    canOpenIssue,
    openingIssue,
    // Why: the failure belongs to the value that produced it; comparing rather
    // than clearing on change retires the notice without a lagging Effect.
    openIssueFailed: failedIssueInput !== null && failedIssueInput === issueInput,
    handleOpenIssue,
    resetOpeningIssue
  }
}
