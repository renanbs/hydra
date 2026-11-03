// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/visible-worktree-activity-inputs.ts
//
// D11-006: what the sidebar's "is this workspace awake?" pass needs from a tab is its
// id and nothing else. These projections keep that contract at the boundary, so a
// title/URL/favicon write repaints the card without re-running visibility.
import type { BrowserWorkspace } from '../../shared/browser-workspace-types'
import type { TerminalTab } from '../../shared/terminal-tab-types'
import { createWorktreeTabBucketProjection } from '@/lib/worktree-tab-bucket-projection'

export type TerminalActivityTab = Pick<TerminalTab, 'id'>
export type BrowserActivityTab = Pick<BrowserWorkspace, 'id'>

export function createVisibleWorktreeTerminalActivityProjection(
  onInspectBucket?: (worktreeId: string) => void
) {
  return createWorktreeTabBucketProjection<
    Pick<TerminalTab, 'id'>,
    TerminalActivityTab
  >({
    projectTab: (tab) => ({ id: tab.id }),
    isSameProjectedTab: (previousTab, nextTab) => previousTab.id === nextTab.id,
    onInspectBucket
  })
}

const terminalProjection = createVisibleWorktreeTerminalActivityProjection()

export function getVisibleWorktreeTerminalActivityTabs(
  tabsByWorktree: Record<string, readonly Pick<TerminalTab, 'id'>[]>
): Record<string, TerminalActivityTab[]> {
  return terminalProjection.project(tabsByWorktree)
}

const browserProjection = createWorktreeTabBucketProjection<
  Pick<BrowserWorkspace, 'id'>,
  BrowserActivityTab
>({
  projectTab: (tab) => ({ id: tab.id }),
  isSameProjectedTab: (previousTab, nextTab) => previousTab.id === nextTab.id
})

export function getVisibleWorktreeBrowserActivityTabs(
  browserTabsByWorktree: Record<string, readonly Pick<BrowserWorkspace, 'id'>[]>
): Record<string, BrowserActivityTab[]> {
  return browserProjection.project(browserTabsByWorktree)
}
