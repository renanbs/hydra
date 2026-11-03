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

type DesktopBridge = {
  feedback?: FeedbackBridge
  gh?: GhBridge
  updater?: UpdaterBridge
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

const GH_NOT_AUTHENTICATED_PREFIX = 'gh-not-authenticated:'

function normalizeGitHubViewer(value: unknown): GitHubViewer | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const raw = value as { login?: unknown; email?: unknown }
  const login = typeof raw.login === 'string' ? raw.login.trim() : ''
  if (!login) {
    return null
  }
  const email = typeof raw.email === 'string' ? raw.email.trim() : ''
  return { login, email: email || null }
}

/**
 * Resolves the GitHub viewer identity for feedback attribution.
 *
 * The `gh_viewer` command runs `gh api user` on the host. A missing or
 * unauthenticated CLI is a typed `gh-not-authenticated:` error that maps to
 * `null` so the dialog keeps the anonymous path instead of showing a failure.
 */
export async function loadGitHubViewer(): Promise<GitHubViewer | null> {
  const viewer = bridge()?.gh?.viewer
  if (typeof viewer === 'function') {
    return viewer()
  }
  try {
    return normalizeGitHubViewer(await invoke<unknown>('gh_viewer'))
  } catch (error) {
    if (typeof error === 'string' && error.startsWith(GH_NOT_AUTHENTICATED_PREFIX)) {
      return null
    }
    throw error
  }
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

/** True when the renderer runs inside the Tauri host that owns `restart_app`. */
export function isAppRestartAvailable(): boolean {
  return typeof window === 'object' && '__TAURI_INTERNALS__' in window
}

/**
 * Relaunches the application through the Rust `restart_app` command.
 *
 * The command flags the runtime and returns before teardown; the host replaces
 * the process once the event loop exits. Rejections (missing command in an old
 * build, dead IPC) reach the caller so the menu can restore and show an error.
 */
export async function restartApp(): Promise<void> {
  await invoke('restart_app')
}
