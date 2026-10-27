// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: orca/src/renderer/src/components/sidebar/worktree-list/viewport/use-visible-review-refresh.ts
//
// Reports which sidebar rows are on screen so the GitHub PR/CI coordinator refreshes exactly
// those, and no more. The window changes on every scroll, so the report is keyed on the visible
// identity (id + branch + linked PR) instead of the window itself — re-reporting an unchanged
// identity would re-fetch the same PRs.
//
// Adapted to Hydra:
//  - Orca also adds the workspace open in its right sidebar when that panel shows PR data. Hydra
//    has no `activeView` and its right-sidebar visibility module is an auto-stub
//    (`src/lib/right-sidebar-visibility.ts`), so only the visible-row leg is ported.
//  - the live store declares only the slices it composes, and the Orca PR-refresh slice is still
//    a port buffer: the reporter and its generation are probed and the report degrades to
//    "nothing to report" until that slice is composed.
import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import type { VirtualItem } from '@tanstack/react-virtual'
import { useAppStore, type AppState } from '@/store'
import type { WorktreeCardProperty } from '../../../../shared/ui-chrome-types'
import type { WorktreeGroupBy } from '../grouping/row-types'
import type { HostSectionRow } from '../../host-section-rows'

export function installWorktreeVisibleRefreshVisibilityListener(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

const DOCUMENT_HIDDEN_KEY = '__document_hidden__'
const NOTHING_TO_TRACK_KEY = '__hidden__'

/** Stable empty default, so the selector below never hands back a fresh array per read. */
const NO_CARD_PROPERTIES: readonly WorktreeCardProperty[] = []

/**
 * The Orca PR-refresh slice members this reporter drives. The live store's interface declares only
 * the slices it composes, so none of these are typed on it: the UI slice provides
 * `worktreeCardProperties` at runtime, while the reporter and its generation come from the
 * not-yet-composed GitHub slice and are probed.
 */
type ReviewRefreshSlice = {
  reportVisibleGitHubPRRefreshCandidates?: (worktreeIds: string[], generation: number) => void
  worktreeCardProperties?: readonly WorktreeCardProperty[]
  prVisibleRefreshGeneration?: number
}
type ReviewRefreshState = AppState & ReviewRefreshSlice

/** Reports the worktrees whose rows are on screen, so the PR/CI coordinator refreshes them. */
export function useVisiblePrRefreshReporting(args: {
  groupBy: WorktreeGroupBy
  rows: readonly HostSectionRow[]
  virtualItems: readonly VirtualItem[]
  scrollRef: React.RefObject<HTMLDivElement | null>
}): void {
  const { groupBy, rows, virtualItems, scrollRef } = args
  const [documentVisibilityRevision, setDocumentVisibilityRevision] = useState(0)
  const lastVisibleRefreshKeyRef = useRef('')
  const reportVisibleGitHubPRRefreshCandidates = useAppStore(
    (s) => (s as ReviewRefreshState).reportVisibleGitHubPRRefreshCandidates
  )
  const cardProps = useAppStore(
    (s) => (s as ReviewRefreshState).worktreeCardProperties ?? NO_CARD_PROPERTIES
  )
  const newCardStyle = useAppStore((s) => s.settings?.experimentalNewWorktreeCardStyle === true)
  const sshConnectedGeneration = useAppStore((s) => s.sshConnectedGeneration)
  const prVisibleRefreshGeneration = useAppStore(
    (s) => (s as ReviewRefreshState).prVisibleRefreshGeneration ?? 0
  )

  useEffect(
    () =>
      installWorktreeVisibleRefreshVisibilityListener(() => {
        if (document.visibilityState !== 'visible') {
          // Why: row identity may be unchanged after a hidden window; reset the key so PR/CI
          // rows refresh when the user comes back.
          lastVisibleRefreshKeyRef.current = DOCUMENT_HIDDEN_KEY
          return
        }
        setDocumentVisibilityRevision((revision) => revision + 1)
      }),
    []
  )

  useEffect(() => {
    // Why probe: the coordinator is not composed into the live store yet, and a missing
    // coordinator means there is nobody to report to.
    if (typeof reportVisibleGitHubPRRefreshCandidates !== 'function') {
      return
    }
    if (document.visibilityState !== 'visible') {
      lastVisibleRefreshKeyRef.current = DOCUMENT_HIDDEN_KEY
      return
    }
    // Why: only PR/CI chrome reads review data, so there is nothing to report until the card
    // shows it or the list groups by PR status.
    const shouldTrackVisibleRows =
      groupBy === 'pr-status' ||
      (newCardStyle
        ? cardProps.includes('status')
        : cardProps.includes('pr') || cardProps.includes('ci'))
    if (!shouldTrackVisibleRows) {
      if (lastVisibleRefreshKeyRef.current !== NOTHING_TO_TRACK_KEY) {
        lastVisibleRefreshKeyRef.current = NOTHING_TO_TRACK_KEY
        reportVisibleGitHubPRRefreshCandidates([], Date.now())
      }
      return
    }
    const scrollEl = scrollRef.current
    if (!scrollEl) {
      return
    }
    const viewportTop = scrollEl.scrollTop
    const viewportBottom = viewportTop + scrollEl.clientHeight
    // Why no `repo.kind === 'git'` check (Orca's): Hydra paints a folder workspace as its own row
    // type, so an `item` row is already a git checkout with a repo behind it.
    const visibleRows = virtualItems
      .filter((item) => item.start < viewportBottom && item.end > viewportTop)
      .map((item) => rows[item.index])
      .filter(
        (row): row is Extract<HostSectionRow, { type: 'item' }> =>
          row?.type === 'item' &&
          row.repo !== undefined &&
          !row.worktree.isBare &&
          !!row.worktree.branch
      )
    const visibleIdentity = visibleRows
      .map((row) => `${row.worktree.id}:${row.worktree.branch}:${row.worktree.linkedPR ?? ''}`)
      .join('|')
    const key = `${visibleIdentity}:${sshConnectedGeneration}:${prVisibleRefreshGeneration}:${cardProps.join(',')}`
    if (!key || key === lastVisibleRefreshKeyRef.current) {
      return
    }
    lastVisibleRefreshKeyRef.current = key
    reportVisibleGitHubPRRefreshCandidates(
      Array.from(new Set(visibleRows.map((row) => row.worktree.id))),
      Date.now()
    )
  }, [
    cardProps,
    documentVisibilityRevision,
    groupBy,
    rows,
    reportVisibleGitHubPRRefreshCandidates,
    prVisibleRefreshGeneration,
    scrollRef,
    sshConnectedGeneration,
    newCardStyle,
    virtualItems
  ])
}
