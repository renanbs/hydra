import { invoke } from '@tauri-apps/api/core'

// Tauri adapter for the Electron preload `api.ui` surface the Orca-ported slices
// used to call. The Electron preload bridge has no Hydra equivalent — this module
// is the single transport, NOT a global shim, so nothing else in the store can
// resurrect the dead path.
//
// Key choice: the App owns the `ui.sidebar` blob (8 keys, its own debounced
// writer). The store-side UI snapshot gets its own row so the two writers never
// race on the same JSON.

export const UI_PREFS_KEY = 'ui.state'

// Same debounce spirit as the App's `ui.sidebar` writer (250ms): a burst of
// preference edits collapses into one durable write.
export const UI_PREFS_SAVE_DEBOUNCE_MS = 250

let snapshot: Record<string, unknown> = {}
let saveTimer: number | null = null
let savePromise: Promise<void> | null = null
let resolveSave: (() => void) | null = null

function flushSnapshot(): void {
  saveTimer = null
  const resolve = resolveSave
  savePromise = null
  resolveSave = null
  // Best-effort write: a failed invoke must not surface as an unhandled rejection
  // at every call site (they still `.catch(console.error)` historically).
  invoke('save_sidebar_pref', { key: UI_PREFS_KEY, json: JSON.stringify(snapshot) })
    .catch(() => {})
    .then(() => resolve?.())
}

function scheduleSave(): Promise<void> {
  clearTimeout(saveTimer ?? undefined)
  if (savePromise === null) {
    savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve
    })
  }
  saveTimer = window.setTimeout(flushSnapshot, UI_PREFS_SAVE_DEBOUNCE_MS)
  return savePromise
}

/** Snapshot shape `recordFeatureInteraction` echoes back to the calling slice. */
export type UiPrefsFeatureInteractionSnapshot = {
  featureInteractions: unknown
  contextualToursSeenIds: unknown
}

/**
 * Transport for the store-side UI preferences. Mirrors the shape the ported
 * slices expect from the Electron preload `api.ui` bridge (`set` +
 * `recordFeatureInteraction`).
 */
export const uiPrefsBridge = {
  /**
   * Shallow-merges `patch` into the in-memory snapshot and schedules a debounced
   * full-blob write. Resolves when the flush that carries the patch lands.
   */
  set(patch: Record<string, unknown>): Promise<void> {
    snapshot = { ...snapshot, ...patch }
    return scheduleSave()
  },

  /**
   * Documented no-op. Hydra has no feature-interaction telemetry sink (no
   * backend was invented for it). We echo the local snapshot so the caller's
   * `.then((ui) => merge(...))` reconciliation keeps its shape without a
   * server round-trip.
   */
  recordFeatureInteraction(_id: string): Promise<UiPrefsFeatureInteractionSnapshot> {
    return Promise.resolve({
      featureInteractions: snapshot.featureInteractions ?? {},
      contextualToursSeenIds: snapshot.contextualToursSeenIds ?? []
    })
  }
}

/**
 * Reads the persisted `ui.state` blob for boot hydration. Tolerant parse: an
 * absent or malformed blob degrades to an empty snapshot (never throws on
 * shape). Returns the snapshot the caller should hydrate from.
 */
export async function hydrateUiPrefsBridge(): Promise<Record<string, unknown>> {
  const storedJson = await invoke<string | null>('get_sidebar_pref', { key: UI_PREFS_KEY })
  if (typeof storedJson !== 'string' || storedJson.length === 0) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(storedJson)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      snapshot = parsed as Record<string, unknown>
      return snapshot
    }
  } catch {
    // fall through to the empty snapshot
  }
  return {}
}

/** Test-only: clear the in-memory snapshot and any pending debounced write. */
export function resetUiPrefsBridge(): void {
  clearTimeout(saveTimer ?? undefined)
  saveTimer = null
  snapshot = {}
  savePromise = null
  resolveSave = null
}
