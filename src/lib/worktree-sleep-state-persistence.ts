// D07: durable sleep-state bridge. Hydra has no ephemeral VM to suspend
// (`window.api.ephemeralVm.suspendWorkspace` does not exist), so the suspend
// contract is the `workspace_sleep_state` table: a workspace whose PTYs were
// released on purpose is recorded in SQLite and restored cold after a restart.
import { invoke } from '@tauri-apps/api/core'
import {
  restoreWorktreeSleepIntent,
  setWorktreeSleepIntentSink,
} from './worktree-sleep-intent'

/** Wire shape of `get_workspace_sleep_states` (Rust snake_case fields). */
export type WorkspaceSleepStateRecord = {
  worktree_path: string
  suspended_at: number
  payload: string | null
}

/** What the sleep flow stores; `tabIds`/`activeTabId` describe the kept layout. */
export type WorktreeSleepIntentPayload = {
  version: 1
  reason: 'manual-sleep'
  tabIds?: string[]
  activeTabId?: string | null
}

export const DEFAULT_SLEEP_INTENT_PAYLOAD: WorktreeSleepIntentPayload = {
  version: 1,
  reason: 'manual-sleep',
}

export function serializeWorktreeSleepIntentPayload(
  payload: WorktreeSleepIntentPayload = DEFAULT_SLEEP_INTENT_PAYLOAD
): string {
  return JSON.stringify(payload)
}

/**
 * Installs the SQLite sink once per app boot. Persistence stays fire-and-forget:
 * a DB failure must not abort the teardown that already released the PTYs.
 */
export function installWorktreeSleepStatePersistence(): void {
  setWorktreeSleepIntentSink({
    persist: (worktreeId, payload) =>
      invoke('set_workspace_sleep_state', {
        worktreePath: worktreeId,
        payload: payload ?? serializeWorktreeSleepIntentPayload(),
      }),
    clear: (worktreeId) => invoke('clear_workspace_sleep_state', { worktreePath: worktreeId }),
  })
}

/**
 * Restores every persisted marker into the synchronous cache. Returns the raw
 * records so a caller can inspect the persisted payloads; an empty/failed read
 * leaves the cache untouched (a DB hiccup must not wake slept workspaces).
 */
export async function hydrateWorktreeSleepStates(): Promise<WorkspaceSleepStateRecord[]> {
  const states = await invoke<WorkspaceSleepStateRecord[]>('get_workspace_sleep_states')
  for (const state of states ?? []) {
    if (!state?.worktree_path) continue
    restoreWorktreeSleepIntent(state.worktree_path)
  }
  return states ?? []
}
