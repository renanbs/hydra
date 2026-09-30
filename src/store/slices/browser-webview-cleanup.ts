// browser-webview-cleanup: Shutdown / detach browser webviews when a worktree is removed.
// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
import type { AppState } from './../index'
import {
  webviewRegistry,
  unregisterWebview,
  destroyPersistentWebview,
} from '../../components/browser-pane/host-guest/webview-registry'
import { clearLiveBrowserUrl } from '../../components/browser-pane/describe-page/live-browser-url-registry'

export { webviewRegistry, unregisterWebview, destroyPersistentWebview }

export function deleteWorktreeBrowserState(_state: AppState, worktreeId: string): Partial<AppState> {
  const entries = Array.from(webviewRegistry.entries())
  for (const [pageId] of entries) {
    // Detect is this webview belongs to the worktree being removed.
    if (pageId.startsWith(`browser:${worktreeId}:`) || pageId.startsWith(`${worktreeId}:`)) {
      destroyPersistentWebview(pageId)
      unregisterWebview(pageId)
      clearLiveBrowserUrl(pageId)
    }
  }
  return {}
}
export const destroyWorkspaceWebviews: any = null
export type destroyWorkspaceWebviews = any
