// Agent Dashboard pop-out plumbing.
//
// Orca used an Electron main-process IPC bridge (`window.api.dashboard.openPopout`).
// Hydra has no such bridge, so the pop-out is a second Tauri webview window created
// from the renderer, and the two windows exchange the dashboard snapshot as Tauri
// events. Everything Tauri-specific is dynamically imported: the sidebar entry must
// stay mountable in a browser/test environment, where the same click falls back to
// the in-window drawer.
import type { UnlistenFn } from '@tauri-apps/api/event'

export const AGENT_DASHBOARD_WINDOW_LABEL = 'agent-dashboard'
/** Query flag the pop-out window boots with (`index.html?window=agent-dashboard`). */
export const AGENT_DASHBOARD_WINDOW_QUERY_KEY = 'window'
export const AGENT_DASHBOARD_WINDOW_QUERY_VALUE = 'agent-dashboard'

export const AGENT_DASHBOARD_SNAPSHOT_EVENT = 'hydra:agent-dashboard:snapshot'
export const AGENT_DASHBOARD_SNAPSHOT_REQUEST_EVENT = 'hydra:agent-dashboard:snapshot-request'
export const AGENT_DASHBOARD_CLOSED_EVENT = 'hydra:agent-dashboard:closed'
export const AGENT_DASHBOARD_REVEAL_EVENT = 'hydra:agent-dashboard:reveal'

export type AgentDashboardPopoutOpenResult = 'opened' | 'focused' | 'unavailable'

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function isAgentDashboardPopoutLocation(search: string): boolean {
  const params = new URLSearchParams(search)
  return params.get(AGENT_DASHBOARD_WINDOW_QUERY_KEY) === AGENT_DASHBOARD_WINDOW_QUERY_VALUE
}

/**
 * Focus the existing pop-out or create it. A failed creation (permission denied, a
 * second instance racing the first) resolves to `unavailable` so the caller can fall
 * back to the in-window drawer instead of leaving a dead button.
 */
export async function openAgentDashboardPopout(): Promise<AgentDashboardPopoutOpenResult> {
  if (!isTauriRuntime()) {
    return 'unavailable'
  }
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const existing = await WebviewWindow.getByLabel(AGENT_DASHBOARD_WINDOW_LABEL)
    if (existing) {
      await existing.setFocus()
      return 'focused'
    }
    const created = new WebviewWindow(AGENT_DASHBOARD_WINDOW_LABEL, {
      url: `index.html?${AGENT_DASHBOARD_WINDOW_QUERY_KEY}=${AGENT_DASHBOARD_WINDOW_QUERY_VALUE}`,
      title: 'Agent Dashboard',
      width: 1180,
      height: 780,
      minWidth: 720,
      minHeight: 480,
      center: true,
    })
    // Why withResolvers: the two Tauri window events settle one promise.
    const { promise: createdPromise, resolve, reject } = Promise.withResolvers<void>()
    void created.once('tauri://created', () => resolve())
    void created.once('tauri://error', (event) =>
      reject(new Error(typeof event.payload === 'string' ? event.payload : 'popout failed'))
    )
    await createdPromise
    return 'opened'
  } catch {
    return 'unavailable'
  }
}

/** Main → pop-out. A missing window makes this a no-op, which is the desired idle cost. */
export async function emitToAgentDashboardPopout(
  event: string,
  payload?: unknown
): Promise<void> {
  if (!isTauriRuntime()) {
    return
  }
  try {
    const { emitTo } = await import('@tauri-apps/api/event')
    await emitTo(AGENT_DASHBOARD_WINDOW_LABEL, event, payload)
  } catch {
    // The pop-out was closed between the check and the emit; nothing to deliver.
  }
}

/** Pop-out → main. */
export async function emitToAgentDashboardMain(event: string, payload?: unknown): Promise<void> {
  if (!isTauriRuntime()) {
    return
  }
  try {
    const { emitTo } = await import('@tauri-apps/api/event')
    await emitTo('main', event, payload)
  } catch {
    // Main window is gone (app shutting down); the dashboard has nowhere to act.
  }
}

export async function listenAgentDashboardEvent<T>(
  event: string,
  handler: (payload: T) => void
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => {}
  }
  const { listen } = await import('@tauri-apps/api/event')
  return listen<T>(event, (incoming) => handler(incoming.payload))
}

/** Presence check used by the main window to stop feeding a window the user closed. */
export async function isAgentDashboardPopoutOpen(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false
  }
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    return (await WebviewWindow.getByLabel(AGENT_DASHBOARD_WINDOW_LABEL)) !== null
  } catch {
    return false
  }
}

/** Close the calling pop-out window; `window.close()` alone is not honored on WebKitGTK. */
export async function closeAgentDashboardPopoutWindow(): Promise<void> {
  if (!isTauriRuntime()) {
    window.close()
    return
  }
  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    await getCurrentWebviewWindow().close()
  } catch {
    window.close()
  }
}

export async function focusAgentDashboardMainWindow(): Promise<void> {
  if (!isTauriRuntime()) {
    return
  }
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const main = await WebviewWindow.getByLabel('main')
    await main?.setFocus()
  } catch {
    // Focus is a convenience; the reveal event already reached the main window.
  }
}
