// Boot hydration of the slice's own `ui.state` row: every key the slice persists comes
// back on the next launch, key by key, and the five keys the App owns through `ui.sidebar`
// are never read from or written to this row (the guard PR #53 pins the write side; this
// spec pins the read side).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceStatusDefinition } from '../shared/worktree/types'
import { cloneDefaultWorkspaceStatuses, normalizeWorkspaceStatuses } from '../shared/workspace-statuses'
import type { AppState } from './types'
import { hydrateUiStatePreferences, useAppStore } from './index'
import {
  UI_PREFS_KEY,
  UI_PREFS_SAVE_DEBOUNCE_MS,
  resetUiPrefsBridge,
  uiPrefsBridge,
} from './ui-prefs-bridge'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

const APP_OWNED_KEYS = [
  'workspaceHostScope',
  'visibleWorkspaceHostIds',
  'collapsedGroups',
  'agentsReadFilter',
  'agentsGroupBy',
] as const

const CUSTOM_STATUSES: WorkspaceStatusDefinition[] = [
  { id: 'todo', label: 'Todo', color: 'neutral', icon: 'circle' },
  { id: 'blocked', label: 'Blocked', color: 'rose', icon: 'ban' },
  { id: 'done', label: 'Ship it', color: 'emerald', icon: 'circle-check' },
]

/** The live store typed through the composition seam the store itself uses. */
const liveStore = (): AppState => useAppStore.getState()

/** A real SQLite-backed pref row, so the write and the read share one transport. */
let prefRows: Record<string, string>

describe('hydrateUiStatePreferences', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetUiPrefsBridge()
    invokeMock.mockReset()
    prefRows = {}
    invokeMock.mockImplementation(async (command: string, args: Record<string, string>) => {
      if (command === 'get_sidebar_pref') {
        return prefRows[args.key] ?? null
      }
      if (command === 'save_sidebar_pref') {
        prefRows[args.key] = args.json
      }
      return undefined
    })
    useAppStore.setState({ workspaceStatuses: cloneDefaultWorkspaceStatuses() })
    // Seed through the slice's own setters: the composition seam (`AppState` from
    // `./types`) is how the store reads its slice-owned members, exactly as
    // `store-ui-slice-composition.parity.test.ts` does.
    const store = liveStore()
    store.setWorkspaceBoardColumnWidth(111)
    store.setPetVisible(false)
    store.setWorkspaceHostScope('ssh:srv')
    store.setVisibleWorkspaceHostIds(['ssh:srv'])
    store.setGroupBy('none')
    store.toggleCollapsedGroup('group:local')
    store.setAgentsReadFilter('unread')
    store.setAgentsGroupBy('none')
  })

  afterEach(() => {
    resetUiPrefsBridge()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('applies only the keys present in the blob, key by key', async () => {
    prefRows[UI_PREFS_KEY] = JSON.stringify({
      workspaceStatuses: CUSTOM_STATUSES,
      workspaceBoardColumnWidth: 444,
      petVisible: true,
    })

    await hydrateUiStatePreferences()

    expect(liveStore().workspaceStatuses).toEqual(normalizeWorkspaceStatuses(CUSTOM_STATUSES))
    expect(liveStore().workspaceBoardColumnWidth).toBe(444)
    expect(liveStore().petVisible).toBe(true)
    // Absent key: the live value stays, it is never reset to a default.
    expect(liveStore().workspaceBoardOpacity).toBe(1)
    expect(liveStore().persistedUIReady).toBe(true)
  })

  it('never reads or writes the five App-owned sidebar keys', async () => {
    const setSpy = vi.spyOn(uiPrefsBridge, 'set').mockResolvedValue(undefined)
    prefRows[UI_PREFS_KEY] = JSON.stringify({
      // A hostile blob: even if the App-owned keys are smuggled into the slice's row,
      // the hydrators have no entry for them.
      workspaceHostScope: 'local',
      visibleWorkspaceHostIds: ['local'],
      collapsedGroups: ['group:other'],
      agentsReadFilter: 'read',
      agentsGroupBy: 'repo',
      workspaceStatuses: CUSTOM_STATUSES,
    })

    await hydrateUiStatePreferences()

    expect(setSpy).not.toHaveBeenCalled()
    const state = liveStore()
    expect(state.workspaceHostScope).toBe('ssh:srv')
    expect(state.visibleWorkspaceHostIds).toEqual(['ssh:srv'])
    expect([...state.collapsedGroups]).toEqual(['group:local'])
    expect(state.agentsReadFilter).toBe('unread')
    expect(state.agentsGroupBy).toBe('none')
    for (const key of APP_OWNED_KEYS) {
      expect(invokeMock.mock.calls.some(([, args]) => args?.json?.includes(key))).toBe(false)
    }
  })

  it('survives a reload: a status edit round-trips through the row', async () => {
    liveStore().setWorkspaceStatuses(CUSTOM_STATUSES)
    await vi.advanceTimersByTimeAsync(UI_PREFS_SAVE_DEBOUNCE_MS)

    expect(prefRows[UI_PREFS_KEY]).toContain('blocked')

    // Fresh launch: the in-memory snapshot is gone and the store holds the defaults.
    resetUiPrefsBridge()
    useAppStore.setState({ workspaceStatuses: cloneDefaultWorkspaceStatuses() })

    await hydrateUiStatePreferences()

    expect(liveStore().workspaceStatuses).toEqual(normalizeWorkspaceStatuses(CUSTOM_STATUSES))
  })

  it('degrades an absent blob to the live defaults without throwing', async () => {
    await expect(hydrateUiStatePreferences()).resolves.toBeUndefined()

    expect(liveStore().workspaceStatuses).toEqual(cloneDefaultWorkspaceStatuses())
    expect(liveStore().persistedUIReady).toBe(true)
  })
})
