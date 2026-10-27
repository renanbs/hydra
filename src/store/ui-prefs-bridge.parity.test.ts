// Guards the Tauri UI-prefs transport that replaces the Orca Electron
// `api.ui` bridge in the live store: the adapter must shallow-merge patches,
// debounce the durable write, hydrate tolerantly, and stay the ONLY transport
// (no file under src/store may reference the dead global path again).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  UI_PREFS_KEY,
  UI_PREFS_SAVE_DEBOUNCE_MS,
  hydrateUiPrefsBridge,
  resetUiPrefsBridge,
  uiPrefsBridge
} from './ui-prefs-bridge'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

const SAVE_CMD = 'save_sidebar_pref'
const GET_CMD = 'get_sidebar_pref'

describe('uiPrefsBridge transport', () => {
  beforeEach(() => {
    resetUiPrefsBridge()
    invokeMock.mockReset()
    invokeMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    resetUiPrefsBridge()
  })

  it('shallow-merges patches and persists the whole blob once per debounce window', async () => {
    vi.useFakeTimers()

    const first = uiPrefsBridge.set({ a: 1 })
    const second = uiPrefsBridge.set({ b: 2, a: 3 })

    expect(invokeMock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(UI_PREFS_SAVE_DEBOUNCE_MS)
    await Promise.all([first, second])

    expect(invokeMock).toHaveBeenCalledTimes(1)
    expect(invokeMock).toHaveBeenCalledWith(SAVE_CMD, { key: UI_PREFS_KEY, json: expect.any(String) })
    expect(JSON.parse(invokeMock.mock.calls[0][1].json)).toEqual({ a: 3, b: 2 })
  })

  it('carries the previously persisted keys into the next debounce window', async () => {
    vi.useFakeTimers()

    const first = uiPrefsBridge.set({ sidebarBody: 'agents' })
    await vi.advanceTimersByTimeAsync(UI_PREFS_SAVE_DEBOUNCE_MS)
    await first

    const second = uiPrefsBridge.set({ collapsedGroups: ['x'] })
    await vi.advanceTimersByTimeAsync(UI_PREFS_SAVE_DEBOUNCE_MS)
    await second

    expect(invokeMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(invokeMock.mock.calls[1][1].json)).toEqual({
      sidebarBody: 'agents',
      collapsedGroups: ['x']
    })
  })

  it('writes to the store-owned ui.state key, never the App-owned ui.sidebar blob', async () => {
    vi.useFakeTimers()

    const save = uiPrefsBridge.set({ petVisible: false })
    await vi.advanceTimersByTimeAsync(UI_PREFS_SAVE_DEBOUNCE_MS)
    await save

    expect(UI_PREFS_KEY).toBe('ui.state')
    expect(invokeMock.mock.calls[0][1].key).toBe('ui.state')
  })

  it('swallows an invoke failure without leaving a rejected promise at the call site', async () => {
    vi.useFakeTimers()
    invokeMock.mockRejectedValue(new Error('db down'))

    const save = uiPrefsBridge.set({ petVisible: true })
    await vi.advanceTimersByTimeAsync(UI_PREFS_SAVE_DEBOUNCE_MS)

    await expect(save).resolves.toBeUndefined()
  })

  it('recordFeatureInteraction is a documented no-op echoing the local snapshot', async () => {
    vi.useFakeTimers()
    const save = uiPrefsBridge.set({ featureInteractions: { tasks: { interactionCount: 2 } } })
    await vi.advanceTimersByTimeAsync(UI_PREFS_SAVE_DEBOUNCE_MS)
    await save

    const echoed = await uiPrefsBridge.recordFeatureInteraction('tasks')

    expect(invokeMock).toHaveBeenCalledTimes(1)
    expect(echoed).toEqual({
      featureInteractions: { tasks: { interactionCount: 2 } },
      contextualToursSeenIds: []
    })
  })
})

describe('hydrateUiPrefsBridge', () => {
  beforeEach(() => {
    resetUiPrefsBridge()
    invokeMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    resetUiPrefsBridge()
  })

  it('reads a valid persisted blob and returns the snapshot', async () => {
    invokeMock.mockResolvedValue(JSON.stringify({ sidebarBody: 'workspaces', petSize: 120 }))

    const snapshot = await hydrateUiPrefsBridge()

    expect(invokeMock).toHaveBeenCalledWith(GET_CMD, { key: UI_PREFS_KEY })
    expect(snapshot).toEqual({ sidebarBody: 'workspaces', petSize: 120 })
  })

  it('hydrates a set() later onto the blob read at boot', async () => {
    vi.useFakeTimers()
    invokeMock.mockResolvedValueOnce(JSON.stringify({ sidebarBody: 'agents' }))
    await hydrateUiPrefsBridge()
    invokeMock.mockResolvedValue(undefined)

    const save = uiPrefsBridge.set({ petVisible: false })
    await vi.advanceTimersByTimeAsync(UI_PREFS_SAVE_DEBOUNCE_MS)
    await save

    expect(invokeMock).toHaveBeenLastCalledWith(SAVE_CMD, {
      key: UI_PREFS_KEY,
      json: JSON.stringify({ sidebarBody: 'agents', petVisible: false })
    })
  })

  it('degrades an absent blob to an empty snapshot', async () => {
    invokeMock.mockResolvedValue(null)

    await expect(hydrateUiPrefsBridge()).resolves.toEqual({})
  })

  it('degrades an empty-string blob to an empty snapshot', async () => {
    invokeMock.mockResolvedValue('')

    await expect(hydrateUiPrefsBridge()).resolves.toEqual({})
  })

  it('degrades a malformed blob to an empty snapshot', async () => {
    invokeMock.mockResolvedValue('{not json')

    await expect(hydrateUiPrefsBridge()).resolves.toEqual({})
  })

  it('degrades a non-object JSON blob to an empty snapshot', async () => {
    invokeMock.mockResolvedValue('[1,2,3]')

    await expect(hydrateUiPrefsBridge()).resolves.toEqual({})
  })
})

// The needle is assembled at runtime so this guard file does not itself contain
// the dead path literal it forbids.
const DEAD_PATH = ['window', 'api', 'ui'].join('.')

function storeSourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...storeSourceFiles(full))
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(full)
    }
  }
  return files
}

describe('store dead-path guard', () => {
  it('has zero references to the removed Electron bridge under src/store', () => {
    const storeDir = join(process.cwd(), 'src', 'store')
    const files = storeSourceFiles(storeDir)

    expect(files.length).toBeGreaterThan(20)

    const offenders = files.filter((file) => readFileSync(file, 'utf8').includes(DEAD_PATH))

    expect(offenders).toEqual([])
  })
})
