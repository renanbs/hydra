// browser-webview-cleanup: Shutdown / detach browser webviews when a worktree is
// slept or removed. Ported from Orca (https://github.com/stablyai/orca) — Copyright
// (c) 2026 Lovecast Inc. (MIT)
// Source: store/slices/browser-webview-cleanup.ts
//
// Why this must touch the registry, not just the store: a sleeping/removed
// worktree keeps its React tree mounted long enough for a stale guest to keep a
// live process, a live URL and a retained WebContents. The store entry is only
// the recipe; this module is the teardown.
import type { BrowserPage, BrowserWorkspace } from '../../shared/browser-workspace-types'
import {
  webviewRegistry,
  unregisterWebview,
  destroyPersistentWebview,
} from '../../components/browser-pane/host-guest/webview-registry'
import { clearLiveBrowserUrl } from '../../components/browser-pane/describe-page/live-browser-url-registry'

export { webviewRegistry, unregisterWebview, destroyPersistentWebview }

/**
 * Destroys one guest and forgets every renderer-side trace of it. Resolves the
 * persistent host webview, the registry entry and the live URL in one place so a
 * caller cannot half-teardown a page.
 */
export function destroyRemovedBrowserWebview(browserPageId: string): void {
  destroyPersistentWebview(browserPageId)
  unregisterWebview(browserPageId)
  clearLiveBrowserUrl(browserPageId)
}

/** Page ids (plus legacy tab-keyed guests) that own a webview in this state. */
export function collectBrowserWebviewIds(
  browserTabsByWorktree: Record<string, BrowserWorkspace[]>,
  browserPagesByWorkspace: Record<string, BrowserPage[]>
): Set<string> {
  const ids = new Set<string>()
  for (const pages of Object.values(browserPagesByWorkspace)) {
    for (const page of pages) {
      ids.add(page.id)
    }
  }
  // Legacy sessions persisted before pages existed key their webview by the
  // workspace/tab id, so a page-less tab still owns one guest.
  for (const tabs of Object.values(browserTabsByWorktree)) {
    for (const tab of tabs) {
      if ((browserPagesByWorkspace[tab.id] ?? []).length === 0) {
        ids.add(tab.id)
      }
    }
  }
  return ids
}

/**
 * Guest-budget eviction: the user did not close anything, so tabs/pages stay in
 * the store and a revisit rebuilds the guest from state.
 */
export function destroyWorktreeBrowserGuests(
  browserTabsByWorktree: Record<string, BrowserWorkspace[]>,
  browserPagesByWorkspace: Record<string, BrowserPage[]>,
  worktreeId: string
): void {
  for (const tab of browserTabsByWorktree[worktreeId] ?? []) {
    const pages = browserPagesByWorkspace[tab.id] ?? []
    const guestIds = pages.length === 0 ? [tab.id] : pages.map((page) => page.id)
    for (const guestId of guestIds) {
      destroyRemovedBrowserWebview(guestId)
    }
  }
}

/**
 * Destroys every webview owned by one workspace. Idempotent: a missing page,
 * a missing registry entry or an already-destroyed legacy guest is a no-op, so
 * sleep, removal and re-hydration can all call it without coordination.
 */
export function destroyWorkspaceWebviews(
  browserPagesByWorkspace: Record<string, BrowserPage[]>,
  workspaceId: string
): void {
  const pages = browserPagesByWorkspace[workspaceId] ?? []
  if (pages.length === 0) {
    // Legacy fallback: the workspace itself was the webview key.
    destroyRemovedBrowserWebview(workspaceId)
    return
  }
  for (const page of pages) {
    destroyRemovedBrowserWebview(page.id)
  }
}
