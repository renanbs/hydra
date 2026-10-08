// Guard for the single-writer cutover: the five sidebar-preference keys that the
// App already persists in its `ui.sidebar` blob must never be mirrored into the
// slice adapter's `ui.state` row (`uiPrefsBridge`). The App's debounced writer is
// the sole owner; the slice setters only touch local state.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_AGENTS_GROUP_BY, DEFAULT_AGENTS_READ_FILTER } from '../shared/agents-view-thread-filters'
import { useAppStore } from './index'
import { uiPrefsBridge } from './ui-prefs-bridge'

const APP_OWNED_KEYS = [
  'workspaceHostScope',
  'visibleWorkspaceHostIds',
  'collapsedGroups',
  'agentsReadFilter',
  'agentsGroupBy'
] as const

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

/** Every argument block passed to `uiPrefsBridge.set(...)` in a source string. */
function bridgeSetArguments(source: string): string[] {
  const marker = 'uiPrefsBridge.set('
  const args: string[] = []
  let from = 0
  for (;;) {
    const start = source.indexOf(marker, from)
    if (start === -1) {
      break
    }
    let cursor = start + marker.length
    let depth = 1
    while (cursor < source.length && depth > 0) {
      const char = source[cursor]
      if (char === '(') {
        depth += 1
      } else if (char === ')') {
        depth -= 1
      }
      cursor += 1
    }
    args.push(source.slice(start + marker.length, cursor - 1))
    from = cursor
  }
  return args
}

function resetOwnedState(): void {
  useAppStore.setState({
    workspaceHostScope: 'all',
    visibleWorkspaceHostIds: null,
    groupBy: 'repo',
    collapsedGroups: new Set<string>(),
    agentsReadFilter: DEFAULT_AGENTS_READ_FILTER,
    agentsGroupBy: DEFAULT_AGENTS_GROUP_BY
  })
}

describe('App-owned sidebar prefs have a single writer', () => {
  beforeEach(resetOwnedState)
  afterEach(() => {
    resetOwnedState()
    vi.restoreAllMocks()
  })

  it('never passes an App-owned key to the slice adapter (src/store static scan)', () => {
    const files = storeSourceFiles(join(process.cwd(), 'src', 'store')).filter(
      (file) => !file.endsWith('.test.ts') && !file.endsWith('.test.tsx')
    )
    expect(files.length).toBeGreaterThan(20)

    const offenders: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const arg of bridgeSetArguments(source)) {
        for (const key of APP_OWNED_KEYS) {
          if (new RegExp(`\\b${key}\\s*:`).test(arg)) {
            offenders.push(`${file}: ${key}`)
          }
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('keeps the App-owned keys off the adapter while the setters still update local state', () => {
    const setSpy = vi.spyOn(uiPrefsBridge, 'set').mockResolvedValue(undefined)

    const state = useAppStore.getState()
    state.setWorkspaceHostScope('ssh:srv')
    state.setVisibleWorkspaceHostIds(['local', 'ssh:srv'])
    state.setGroupBy('worktree')
    state.toggleCollapsedGroup('group:local')
    state.setAgentsReadFilter('unread')
    state.setAgentsGroupBy('none')

    const writtenKeys = setSpy.mock.calls.flatMap(([patch]) => Object.keys(patch))
    for (const key of APP_OWNED_KEYS) {
      expect(writtenKeys).not.toContain(key)
    }

    const next = useAppStore.getState()
    expect(next.workspaceHostScope).toBe('ssh:srv')
    expect(next.visibleWorkspaceHostIds).toEqual(['local', 'ssh:srv'])
    expect(next.groupBy).toBe('worktree')
    expect([...next.collapsedGroups]).toEqual(['group:local'])
    expect(next.agentsReadFilter).toBe('unread')
    expect(next.agentsGroupBy).toBe('none')
  })
})
