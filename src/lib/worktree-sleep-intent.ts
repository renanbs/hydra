// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: lib/worktree-sleep-intent.ts
// Why: a slept workspace keeps its panes mounted with only dead PTYs behind them.
// Any pane connect that runs while the marker is set waits here, and the clear
// that marks the workspace awake resumes every waiting connect. Hydra's sleep
// pipeline keeps the same contract so a wake (explicit or by activating the row)
// is observable instead of implicit.
//
// D07: the marker's durable half lives in SQLite (`workspace_sleep_state`), so a
// workspace slept before a restart stays asleep after it. This module stays
// synchronous for the hot path (`hasWorktreeSleepIntent` is read from PTY
// binding) and mirrors every transition through an injected sink.
const sleepingWorktreeIds = new Set<string>()
const tearingDownWorktreeIds = new Set<string>()
const wakeListenersByWorktreeId = new Map<string, Set<() => void>>()
// Why: cards paint a sleeping state, so every transition needs a subscription apart
// from the per-worktree wake listeners (which only fire when a marker clears).
const sleepStateListeners = new Set<() => void>()

function notifySleepState(): void {
  for (const listener of sleepStateListeners) {
    try {
      listener()
    } catch (error) {
      // A broken card subscription must not abort the sleep/wake transition.
      console.error('[sleep-intent] sleep-state listener failed', { error })
    }
  }
}

export function subscribeWorktreeSleepIntent(listener: () => void): () => void {
  sleepStateListeners.add(listener)
  return () => {
    sleepStateListeners.delete(listener)
  }
}

/**
 * Durable projection of the sleep intent. Injected once at app boot so this
 * module never imports Tauri (pure tests and non-Tauri surfaces keep working).
 * Failures are logged, never thrown: an unpersisted marker degrades the next
 * boot, it must not break the sleep or the wake.
 */
export type WorktreeSleepIntentSink = {
  persist: (worktreeId: string, payload?: string) => Promise<unknown>
  clear: (worktreeId: string) => Promise<unknown>
}

let intentSink: WorktreeSleepIntentSink | null = null

export function setWorktreeSleepIntentSink(sink: WorktreeSleepIntentSink | null): void {
  intentSink = sink
}

function runSink(operation: () => Promise<unknown>, event: string, worktreeId: string): void {
  try {
    void operation().catch((error) => {
      console.error(`[sleep-intent] ${event} failed`, { worktreeId, error })
    })
  } catch (error) {
    console.error(`[sleep-intent] ${event} threw`, { worktreeId, error })
  }
}

export function markWorktreeSleepIntent(worktreeId: string, payload?: string): void {
  sleepingWorktreeIds.add(worktreeId)
  if (intentSink) {
    runSink(() => intentSink!.persist(worktreeId, payload), 'persist sleep intent', worktreeId)
  }
  notifySleepState()
}

/**
 * Re-adds a marker restored from the database without writing it back. Used by
 * boot hydration: persisting on restore would refresh `suspended_at` for a
 * workspace that never slept again.
 */
export function restoreWorktreeSleepIntent(worktreeId: string): void {
  sleepingWorktreeIds.add(worktreeId)
  notifySleepState()
}

/**
 * Why: a spawn that resolves while the sleep teardown is still awaiting its host
 * would bind a PTY and clear the marker, waking every waiting pane mid-sleep.
 * Binds during the teardown window are not wakes.
 */
export async function withWorktreeSleepTeardown<T>(
  worktreeId: string,
  teardown: () => Promise<T>
): Promise<T> {
  tearingDownWorktreeIds.add(worktreeId)
  try {
    return await teardown()
  } finally {
    tearingDownWorktreeIds.delete(worktreeId)
  }
}

export function clearWorktreeSleepIntent(worktreeId: string | null): void {
  if (!worktreeId || tearingDownWorktreeIds.has(worktreeId)) {
    return
  }
  if (!sleepingWorktreeIds.delete(worktreeId)) {
    return
  }
  notifySleepState()
  if (intentSink) {
    runSink(() => intentSink!.clear(worktreeId), 'clear sleep intent', worktreeId)
  }
  const listeners = wakeListenersByWorktreeId.get(worktreeId)
  wakeListenersByWorktreeId.delete(worktreeId)
  for (const listener of listeners ?? []) {
    try {
      listener()
    } catch (error) {
      // Why: one pane's connect failure must not strand its siblings or throw out of a store action.
      console.error('[sleep-intent] wake listener failed', { worktreeId, error })
    }
  }
}

// D03b-046: the multi-removal batch. Orca coordinates its snapshot prune through a
// `beginRemovalSnapshotPruneBatch` IPC; Hydra's durable sleep half is one SQLite row
// per workspace, so the batch is one loop over the same per-path forget — no new
// backend call, and panes of removed rows are never woken.
export function forgetWorktreeSleepIntents(worktreeIds: readonly string[]): string[] {
  const purged: string[] = []
  for (const worktreeId of worktreeIds) {
    if (!worktreeId || !hasWorktreeSleepIntent(worktreeId)) {
      continue
    }
    forgetWorktreeSleepIntent(worktreeId)
    purged.push(worktreeId)
  }
  return purged
}

// Why: a purged worktree must not wake its panes; they are being unmounted. Its
// persisted row must go too, or a future workspace reusing the path starts asleep.
export function forgetWorktreeSleepIntent(worktreeId: string): void {
  const hadMarker = sleepingWorktreeIds.delete(worktreeId)
  tearingDownWorktreeIds.delete(worktreeId)
  wakeListenersByWorktreeId.delete(worktreeId)
  if (hadMarker) {
    notifySleepState()
  }
  if (hadMarker && intentSink) {
    runSink(() => intentSink!.clear(worktreeId), 'forget sleep intent', worktreeId)
  }
}

export function hasWorktreeSleepIntent(worktreeId: string | null): boolean {
  return worktreeId !== null && sleepingWorktreeIds.has(worktreeId)
}

export function onWorktreeSleepIntentCleared(worktreeId: string, listener: () => void): () => void {
  const listeners = wakeListenersByWorktreeId.get(worktreeId) ?? new Set<() => void>()
  listeners.add(listener)
  wakeListenersByWorktreeId.set(worktreeId, listeners)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && wakeListenersByWorktreeId.get(worktreeId) === listeners) {
      wakeListenersByWorktreeId.delete(worktreeId)
    }
  }
}
