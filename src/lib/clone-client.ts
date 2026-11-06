// Local clone transport (`clone_project` / `clone_abort`).
//
// The clone runs as a child process in the Rust core and is registered under the
// renderer-generated `cloneId`, so Cancel has a real handle to kill instead of
// only hiding the progress bar. `cancelled` is an observation: it is false when
// the child was still running after the abort request.
import { invoke } from '@tauri-apps/api/core'
 import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export type CloneProgress = {
  clone_id: string
  phase: string
  percent: number
}
export type CloneAbortResult = {
  cloneId: string
  found: boolean
  cancelled: boolean
}

const CLONE_ID_PREFIX = 'clone'

/** Unique-enough id for one clone attempt: timestamp plus randomness. */
export function createCloneId(): string {
  return `${CLONE_ID_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Clones `url` into `parentDir`; `cloneId` is what `abortClone` cancels. */
export function cloneRepository(
  url: string,
  parentDir: string,
  cloneId: string
): Promise<string> {
  return invoke<string>('clone_project', { url, parentDir, cloneId })
}

/** Asks the core to kill a running clone and reports whether it observed the exit. */
export function abortClone(cloneId: string): Promise<CloneAbortResult> {
  return invoke<CloneAbortResult>('clone_abort', { cloneId })
}

/**
 * Subscribes to live `clone:progress` events for one clone id.
 * Rosetta D02a-014 (Orca `window.api.repos.onCloneProgress`): returns the
 * unlisten function, mirroring the reference's subscription shape.
 */
export function onCloneProgress(
  cloneId: string,
  onProgress: (progress: { phase: string; percent: number }) => void
): Promise<UnlistenFn> {
  return listen<CloneProgress>('clone:progress', (event) => {
    if (event.payload.clone_id !== cloneId) {
      return
    }
    onProgress({ phase: event.payload.phase, percent: event.payload.percent })
  })
}
