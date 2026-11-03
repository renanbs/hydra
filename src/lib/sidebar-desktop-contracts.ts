import { invoke } from '@tauri-apps/api/core'
import type { GitHubViewer } from '../shared/github/pull-request-types'
import type { UpdateCheckOptions } from '../shared/update-status-types'

/**
 * Desktop integration contracts for the sidebar help/feedback surfaces.
 *
 * Hydra has no Electron preload bridge: every callable is a Tauri command or a
 * documented absent surface. Each helper returns a typed unavailable result
 * instead of pretending the operation happened, so the UI can report the real
 * state to the user.
 */

export type FeedbackImagePayload = {
  contentType: string
  data: Uint8Array
}

export type FeedbackSubmitPayload = {
  feedback: string
  submitAnonymously: boolean
  githubLogin: string | null
  githubEmail: string | null
  images: FeedbackImagePayload[]
}

export type FeedbackSubmitResult =
  | { ok: true; imagesDelivered?: boolean }
  | { ok: false; error: string }

type FeedbackBridge = {
  submit?: (payload: FeedbackSubmitPayload) => Promise<FeedbackSubmitResult>
}

type GhBridge = {
  viewer?: () => Promise<GitHubViewer | null>
}

type UpdaterBridge = {
  check?: (options: UpdateCheckOptions) => Promise<unknown>
}

type AppBridge = {
  restart?: () => Promise<void>
}

type DesktopBridge = {
  feedback?: FeedbackBridge
  gh?: GhBridge
  updater?: UpdaterBridge
  app?: AppBridge
}

function bridge(): DesktopBridge | null {
  // Why the cast: `window.api` is the Orca preload bridge, absent under Tauri.
  // Narrow the raw value first so a missing/primitive bridge never reaches a
  // member access.
  const rawApi: unknown = window.api
  if (typeof rawApi !== 'object' || rawApi === null) {
    return null
  }
  return rawApi as DesktopBridge
}

/** Opens a URL through the real `open_external_url_cmd` Tauri command. */
export async function openExternalUrl(url: string): Promise<void> {
  await invoke('open_external_url_cmd', { url })
}

/**
 * Submits sidebar feedback. BLOCKED surface: Hydra registers no
 * `submit_feedback` command and has no preload `window.api.feedback.submit`.
 * The helper still forwards to a bridge when one exists (tests, future host).
 */
export async function submitSidebarFeedback(
  payload: FeedbackSubmitPayload
): Promise<FeedbackSubmitResult> {
  const submit = bridge()?.feedback?.submit
  if (typeof submit === 'function') {
    return submit(payload)
  }
  return {
    ok: false,
    error: 'Feedback submission backend is not available in this build.'
  }
}

/**
 * Resolves the GitHub viewer identity for feedback attribution.
 * BLOCKED surface: no `gh_viewer` command / preload bridge exists, so the
 * dialog falls back to the anonymous/typed-feedback guidance.
 */
export async function loadGitHubViewer(): Promise<GitHubViewer | null> {
  const viewer = bridge()?.gh?.viewer
  if (typeof viewer === 'function') {
    return viewer()
  }
  return null
}

/** True when the renderer can actually hand an update check to a host. */
export function isUpdateCheckAvailable(): boolean {
  return typeof bridge()?.updater?.check === 'function'
}

/**
 * Requests an update check.
 * BLOCKED surface: `tauri-plugin-updater` is not a Hydra dependency and no
 * update command is registered, so this rejects with a precise reason.
 */
export async function checkForAppUpdates(options: UpdateCheckOptions): Promise<void> {
  const check = bridge()?.updater?.check
  if (typeof check === 'function') {
    await check(options)
    return
  }
  throw new Error('Update checks are not available in this build.')
}

/** True when the renderer can ask the host to relaunch. */
export function isAppRestartAvailable(): boolean {
  return typeof bridge()?.app?.restart === 'function'
}

/**
 * Relaunches the application.
 * BLOCKED surface: no relaunch/exit command and no process/shell plugin.
 */
export async function restartApp(): Promise<void> {
  const restart = bridge()?.app?.restart
  if (typeof restart === 'function') {
    await restart()
    return
  }
  throw new Error('Application restart is not available in this build.')
}
