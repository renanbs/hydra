import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { create } from 'zustand'
import type { AppState } from './types'
import { createUISlice } from './slices/ui'
import { useAppStore } from './index'

// Reference surface: the very creator the live store spreads, mounted on its own, so the spec
// can tell "the UI slice provides this" from "the live literal provides this".
const referenceStore = create<AppState>()((...a) => createUISlice(...a))
const referenceState = referenceStore.getState()
const sliceKeys = Object.keys(referenceState).sort()

// Snapshot taken before the behaviour specs mutate the live store.
const initialLiveState = useAppStore.getState()

/**
 * Test-side view of the composed store. `AppState` from `./types` is the shape the store
 * helpers already use; the live `AppState` interface in `./index` still declares only what the
 * removed literal defined, because `UISlice` is an auto-stub (`any`) on this branch. Reading the
 * live store through this alias is the seam that stands in for that missing type — the store
 * itself is the real one.
 */
const liveStore = (): AppState => useAppStore.getState()

describe('live store composition of the UI slice', () => {
  it('exposes every key the UI slice defines', () => {
    const liveKeys = Object.keys(initialLiveState)
    expect(sliceKeys.filter((key) => !liveKeys.includes(key))).toEqual([])
  })

  it('takes the slice value for every slice-owned key (the slice wins over the old literal)', () => {
    const mismatched = sliceKeys.filter(
      (key) =>
        typeof referenceState[key] !== 'function' &&
        !isDeepStrictEqual(initialLiveState[key], referenceState[key])
    )
    expect(mismatched).toEqual([])
  })

  it('keeps the live-store keys no slice provides', () => {
    expect(typeof initialLiveState.createWorktree).toBe('function')
    expect(typeof initialLiveState.setTabsForWorktree).toBe('function')
    expect(initialLiveState.repos).toEqual([])
    expect(initialLiveState.tabsByWorktree).toEqual({})
  })

  it('defines no key twice: the live literal shadows no slice key', () => {
    const source = readFileSync('src/store/index.ts', 'utf8')
    // The store literal's top-level keys are the only place a duplicate could live.
    const literalKeys = [...source.matchAll(/^ {4}([A-Za-z_$][\w$]*)\s*:/gm)].map((match) => match[1])
    expect(literalKeys.filter((key) => sliceKeys.includes(key))).toEqual([])
    expect(source.match(/createUISlice\(/g) ?? []).toHaveLength(1)
  })
})

describe('slice-owned actions are the live actions', () => {
  it('setGroupBy/setSortBy mutate the composed state', () => {
    liveStore().setGroupBy('none')
    expect(liveStore().groupBy).toBe('none')
    liveStore().setGroupBy('repo')
    expect(liveStore().groupBy).toBe('repo')

    liveStore().setSortBy('name')
    expect(liveStore().sortBy).toBe('name')
    liveStore().setSortBy('recent')
    expect(liveStore().sortBy).toBe('recent')
  })

  it('setWorkspaceHostScope narrows the host filter and resets to all hosts', () => {
    liveStore().setWorkspaceHostScope('ssh:srv')
    expect(liveStore().workspaceHostScope).toBe('ssh:srv')
    expect(liveStore().visibleWorkspaceHostIds).toEqual(['ssh:srv'])

    liveStore().setWorkspaceHostScope('all')
    expect(liveStore().workspaceHostScope).toBe('all')
    expect(liveStore().visibleWorkspaceHostIds).toBeNull()
  })

  it('setVisibleWorkspaceHostIds keeps a multi-host list while the scope stays all', () => {
    liveStore().setVisibleWorkspaceHostIds(['local', 'ssh:srv'])
    expect(liveStore().visibleWorkspaceHostIds).toEqual(['local', 'ssh:srv'])
    expect(liveStore().workspaceHostScope).toBe('all')

    liveStore().setVisibleWorkspaceHostIds(null)
    expect(liveStore().visibleWorkspaceHostIds).toBeNull()
  })

  it('sidebar, worktree visibility and status-bar actions write the slice state', () => {
    liveStore().setSidebarOpen(false)
    expect(liveStore().sidebarOpen).toBe(false)
    liveStore().toggleSidebar()
    expect(liveStore().sidebarOpen).toBe(true)

    liveStore().setHideCliCreatedWorkspaces(true)
    expect(liveStore().hideCliCreatedWorkspaces).toBe(true)
    liveStore().setHideCliCreatedWorkspaces(false)
    expect(liveStore().hideCliCreatedWorkspaces).toBe(false)

    liveStore().setStatusBarUsageMode('compact')
    expect(liveStore().statusBarUsageMode).toBe('compact')
    liveStore().setStatusBarUsageMode('verbose')
    expect(liveStore().statusBarUsageMode).toBe('verbose')

    liveStore().toggleStatusBarItem('gemini')
    expect(liveStore().statusBarItems).not.toContain('gemini')
    liveStore().toggleStatusBarItem('gemini')
    expect(liveStore().statusBarItems).toContain('gemini')
  })

  it('pet and port-scan actions own their slice-only state', () => {
    liveStore().setPetVisible(false)
    expect(liveStore().petVisible).toBe(false)
    liveStore().setPetVisible(true)
    expect(liveStore().petVisible).toBe(true)

    const scansByKey = { local: { ports: [3000] } }
    const projection = { key: 'all', result: { ports: [3000] } }
    liveStore().replaceWorkspacePortScans(scansByKey, projection)
    expect(liveStore().workspacePortScansByKey).toBe(scansByKey)
    expect(liveStore().workspacePortScan).toBe(projection)
    liveStore().replaceWorkspacePortScans({}, null)
    expect(liveStore().workspacePortScansByKey).toEqual({})
  })

  it('revealWorktreeInSidebar publishes the pending reveal on the workspaces body', () => {
    liveStore().revealWorktreeInSidebar('wt-1', { highlight: true })
    expect(liveStore().pendingRevealWorktree).toEqual({
      worktreeId: 'wt-1',
      behavior: 'smooth',
      highlight: true
    })
    expect(liveStore().sidebarBody).toBe('workspaces')
    liveStore().clearPendingRevealWorktreeId()
    expect(liveStore().pendingRevealWorktree).toBeNull()
  })

  it('acknowledgeAgents stamps the slice-owned acknowledgement map', () => {
    liveStore().acknowledgeAgents(['pane-a'])
    expect(liveStore().acknowledgedAgentsByPaneKey['pane-a']).toBeGreaterThan(0)
    liveStore().unacknowledgeAgents(['pane-a'])
    expect(liveStore().acknowledgedAgentsByPaneKey['pane-a']).toBeUndefined()

    liveStore().applyActivityClearedAt({ 'pane-a': 42 })
    expect(liveStore().activityClearedAtByPaneKey).toEqual({ 'pane-a': 42 })
    liveStore().applyActivityClearedAt({ 'pane-a': null })
    expect(liveStore().activityClearedAtByPaneKey).toEqual({})
  })

  it('recordFeatureInteraction is the slice action, not the removed void stub', () => {
    // The live literal's stub returned `undefined`; the slice returns its persistence promise.
    expect(liveStore().recordFeatureInteraction('usage-tracking')).toBeInstanceOf(Promise)
  })
})

describe('slice-owned workspace board surface', () => {
  it('carries the board state the sidebar board reads', () => {
    // `openWorkspaceBoard` is a component hook in Orca (`useWorkspaceBoardPanel`), not a store
    // action; what the store owes the board is this state and its setters.
    const board = liveStore()
    expect(board.workspaceBoardColumnWidth).toBeGreaterThan(0)
    expect(board.workspaceBoardOpacity).toBe(1)
    expect(board.workspaceStatuses.map((status: { id: string }) => status.id)).toContain('todo')
    expect(board.syncTaskStatusFromWorkspaceBoard).toBe(false)

    board.setWorkspaceBoardColumnWidth(400)
    expect(liveStore().workspaceBoardColumnWidth).toBe(400)
  })
})

describe('cross-slice interop the composed slice calls', () => {
  it('runs the page actions instead of throwing on an undefined sibling', () => {
    liveStore().openAutomationsPage()
    expect(liveStore().activeView).toBe('automations')
    liveStore().closeAutomationsPage()
    expect(liveStore().activeView).toBe('terminal')

    liveStore().openActivityPage()
    expect(liveStore().activeView).toBe('activity')
    liveStore().closeActivityPage()
    expect(liveStore().activeView).toBe('terminal')

    expect(typeof liveStore().recordViewVisit).toBe('function')
    expect(liveStore().getDiffComments('wt-1')).toEqual([])
  })
})
