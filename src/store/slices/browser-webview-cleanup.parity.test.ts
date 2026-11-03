// Browser webview teardown parity: sleep/removal must destroy the guest, forget
// the registry entry and clear the live URL, and must survive being called for a
// workspace that owns nothing (idempotent by contract).
import { beforeEach, describe, expect, it } from 'vitest'
import type { BrowserPage, BrowserWorkspace } from '../../shared/browser-workspace-types'
import {
  webviewRegistry,
  destroyWorkspaceWebviews,
  destroyWorktreeBrowserGuests,
  collectBrowserWebviewIds,
} from './browser-webview-cleanup'
import { registerWebview } from '../../components/browser-pane/host-guest/webview-registry'
import {
  getLiveBrowserUrl,
  seedLiveBrowserUrl,
} from '../../components/browser-pane/describe-page/live-browser-url-registry'

function page(id: string, workspaceId = 'ws-1'): BrowserPage {
  return { id, workspaceId, worktreeId: '/w/a' } as BrowserPage
}

function workspace(id: string): BrowserWorkspace {
  return { id } as BrowserWorkspace
}

function seedGuest(id: string, url = 'https://example.com'): void {
  registerWebview(id, { destroy: () => {} })
  seedLiveBrowserUrl(id, url)
}

describe('destroyWorkspaceWebviews', () => {
  beforeEach(() => {
    webviewRegistry.clear()
  })

  it('destroys every page guest and clears its live URL', () => {
    seedGuest('page-1')
    seedGuest('page-2')

    destroyWorkspaceWebviews(
      { 'ws-1': [page('page-1'), page('page-2')] },
      'ws-1'
    )

    expect(webviewRegistry.has('page-1')).toBe(false)
    expect(webviewRegistry.has('page-2')).toBe(false)
    expect(getLiveBrowserUrl('page-1')).toBeNull()
    expect(getLiveBrowserUrl('page-2')).toBeNull()
  })

  it('keeps unrelated workspaces registered', () => {
    seedGuest('page-1')
    seedGuest('other-page')

    destroyWorkspaceWebviews({ 'ws-1': [page('page-1')] }, 'ws-1')

    expect(webviewRegistry.has('page-1')).toBe(false)
    expect(webviewRegistry.has('other-page')).toBe(true)
  })

  it('falls back to the workspace id for legacy page-less sessions', () => {
    seedGuest('ws-legacy')

    destroyWorkspaceWebviews({}, 'ws-legacy')

    expect(webviewRegistry.has('ws-legacy')).toBe(false)
    expect(getLiveBrowserUrl('ws-legacy')).toBeNull()
  })

  it('is idempotent for missing pages, missing entries and repeated calls', () => {
    seedGuest('page-1')
    const state = { 'ws-1': [page('page-1'), page('page-2')] }

    destroyWorkspaceWebviews(state, 'ws-1')
    expect(() => destroyWorkspaceWebviews(state, 'ws-1')).not.toThrow()
    expect(() => destroyWorkspaceWebviews({}, 'never-opened')).not.toThrow()
    expect(webviewRegistry.size).toBe(0)
  })
})

describe('destroyWorktreeBrowserGuests', () => {
  beforeEach(() => {
    webviewRegistry.clear()
  })

  it('destroys each tab page and the legacy tab-keyed guest', () => {
    const tabs = { '/w/a': [workspace('tab-paged'), workspace('tab-legacy')] }
    seedGuest('page-1')
    seedGuest('tab-legacy')

    destroyWorktreeBrowserGuests(tabs, { 'tab-paged': [page('page-1', 'tab-paged')] }, '/w/a')

    expect(webviewRegistry.has('page-1')).toBe(false)
    expect(webviewRegistry.has('tab-legacy')).toBe(false)
  })
})

describe('collectBrowserWebviewIds', () => {
  it('includes pages and page-less tab keys, never the same id twice', () => {
    const ids = collectBrowserWebviewIds(
      { '/w/a': [workspace('tab-paged'), workspace('tab-legacy')] },
      { 'tab-paged': [page('page-1', 'tab-paged'), page('page-1', 'tab-paged')] }
    )

    expect([...ids].sort()).toEqual(['page-1', 'tab-legacy'])
  })
})
