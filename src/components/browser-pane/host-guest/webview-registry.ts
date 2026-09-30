// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// webview-registry: Tracks webview elements by page ID for cleanup coordination.
import { clearLiveBrowserUrl } from '../describe-page/live-browser-url-registry'

export const webviewRegistry = new Map<string, unknown>()
export const registeredWebContentsIds = new Map<string, number>()

export function registerWebview(id: string, webview: unknown): void {
  webviewRegistry.set(id, webview)
}

export function unregisterWebview(id: string): void {
  webviewRegistry.delete(id)
}

export function destroyPersistentWebview(id: string): void {
  webviewRegistry.delete(id)
  clearLiveBrowserUrl(id)
}

export function getWebview(id: string): unknown {
  return webviewRegistry.get(id)
}
