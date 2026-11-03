// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/sleep-worktree-flow.ts
// Shared "sleep worktree" flow (close all panels to free memory / CPU).
//
// Why this is a module helper rather than inlined at the call site: the guard that
// clears the active workspace before tearing down terminals is not optional polish —
// shutting down the active worktree while its TerminalPane is still visible causes a
// visible flicker and can crash the pane (PTY exit callbacks race the live xterm).
// Centralising the ordered sequence (browsers → terminals → VM suspension) keeps the
// safety invariant in one place so a new caller cannot skip it.
import {
  clearWorktreeSleepIntent,
  markWorktreeSleepIntent,
  withWorktreeSleepTeardown,
} from '../../lib/worktree-sleep-intent'

/** Orca `sleepWorktreesAfterMenuClose`: let the menu close before the teardown. */
export const SLEEP_AFTER_MENU_CLOSE_DELAY_MS = 50

export type SleepWorktreePorts = {
  getActiveWorktreeId: () => string | null
  setActiveWorktree: (worktreeId: string | null) => void
  shutdownWorktreeBrowsers: (worktreeId: string) => Promise<void>
  /** `keepIdentifiers: true` preserves tab ids/layout so a wake can re-attach. */
  shutdownWorktreeTerminals: (
    worktreeId: string,
    options: { keepIdentifiers: boolean }
  ) => Promise<void>
  /**
   * Ephemeral-VM suspension. Optional because Hydra has no
   * `window.api.ephemeralVm.suspendWorkspace` bridge; Hydra's suspend contract is
   * the durable `workspace_sleep_state` row written by the sleep-intent sink, so
   * this stays the residual hook for a future VM-backed host.
   */
  suspendEphemeralVm?: (worktreeId: string) => Promise<void>
  /**
   * Serialized intent stored with the durable marker (kept tab ids / active tab),
   * so a restore after restart can rebuild the same wake target.
   */
  getSleepPayload?: (worktreeId: string) => string | undefined
  /** Captures the virtualized scroll anchor in the same tick rows disappear. */
  captureScrollAnchor?: (worktreeId: string) => void
}

export type SleepWorktreesResult = {
  failedWorktreeIds: string[]
  errors: string[]
}

export function describeSleepFailure(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error)
  if (detail.includes('legacy')) {
    return 'The older host runtime could not confirm terminal shutdown. The workspace was kept open; update the host and try again.'
  }
  if (
    detail.includes('terminal_') ||
    detail.includes('runtime') ||
    detail.includes('connection') ||
    detail.includes('Daemon')
  ) {
    return 'The host could not confirm terminal shutdown. The workspace was kept open; check the connection and try again.'
  }
  return 'The workspace was kept open. Try again; if the problem continues, check the host connection.'
}

export async function runSleepWorktrees(
  worktreeIds: readonly string[],
  ports: SleepWorktreePorts
): Promise<SleepWorktreesResult> {
  if (worktreeIds.length === 0) {
    return { failedWorktreeIds: [], errors: [] }
  }

  const activeWorktreeId = ports.getActiveWorktreeId()
  const sleptActiveWorktreeId =
    activeWorktreeId && worktreeIds.includes(activeWorktreeId) ? activeWorktreeId : null
  if (sleptActiveWorktreeId) {
    ports.captureScrollAnchor?.(sleptActiveWorktreeId)
    // Why mark before clearing: clearing the active workspace can unmount panes
    // before the teardown writes PTY suppressions, so those exits must not stamp
    // activity. Kept out of the UI state so it cannot disturb scroll restoration.
    markWorktreeSleepIntent(sleptActiveWorktreeId, ports.getSleepPayload?.(sleptActiveWorktreeId))
    ports.setActiveWorktree(null)
  }

  const errors: string[] = []
  const failedWorktreeIds = new Set<string>()

  try {
    for (const worktreeId of worktreeIds) {
      // Why: the marker outlives teardown so panes left mounted stay cold until an
      // explicit wake; marking per workspace keeps an earlier slow teardown from
      // leaving a later, still-awake workspace marked.
      markWorktreeSleepIntent(worktreeId, ports.getSleepPayload?.(worktreeId))
      try {
        // Why browsers first: unregistering the browser guests must happen before
        // any other teardown, mirroring the remove-worktree shutdown sequence.
        await withWorktreeSleepTeardown(worktreeId, () =>
          ports.shutdownWorktreeBrowsers(worktreeId)
        )
      } catch (error) {
        console.error('[sleep-worktree] browser shutdown failed', { worktreeId, error })
        failedWorktreeIds.add(worktreeId)
        errors.push(describeSleepFailure(error))
        continue
      }
      try {
        // Why keepIdentifiers: sleep is reversible — the tab record and layout stay,
        // only the live PTY processes are released, so wake re-spawns against the
        // same on-disk history.
        await withWorktreeSleepTeardown(worktreeId, async () => {
          await ports.shutdownWorktreeTerminals(worktreeId, { keepIdentifiers: true })
          if (ports.suspendEphemeralVm) {
            await ports.suspendEphemeralVm(worktreeId)
          }
        })
        // Why: a workspace the user activated during the batch is awake by their choice.
        if (ports.getActiveWorktreeId() === worktreeId) {
          clearWorktreeSleepIntent(worktreeId)
        }
      } catch (error) {
        console.error('[sleep-worktree] terminal or host suspension failed', {
          worktreeId,
          error,
        })
        failedWorktreeIds.add(worktreeId)
        errors.push(describeSleepFailure(error))
      }
    }
  } finally {
    // Why: a failed sleep leaves the workspace awake and retryable.
    for (const worktreeId of failedWorktreeIds) {
      clearWorktreeSleepIntent(worktreeId)
    }
    if (sleptActiveWorktreeId && failedWorktreeIds.has(sleptActiveWorktreeId)) {
      ports.setActiveWorktree(sleptActiveWorktreeId)
    }
  }

  return { failedWorktreeIds: [...failedWorktreeIds], errors }
}

/**
 * Orca `sleepWorktreesAfterMenuClose`: close the menu first, then sleep on the next
 * task so the Radix exit/animation does not race the session teardown.
 */
export function scheduleSleepWorktreesAfterMenuClose(
  worktreeIds: readonly string[],
  sleep: (ids: readonly string[]) => void,
  closeMenu: () => void,
  schedule: (callback: () => void, delayMs: number) => void = (callback, delayMs) =>
    window.setTimeout(callback, delayMs)
): void {
  closeMenu()
  if (worktreeIds.length === 0) return
  schedule(() => sleep(worktreeIds), SLEEP_AFTER_MENU_CLOSE_DELAY_MS)
}

export function describeSleepResult(result: SleepWorktreesResult): string | null {
  return result.errors.length > 0 ? result.errors.join('\n') : null
}
