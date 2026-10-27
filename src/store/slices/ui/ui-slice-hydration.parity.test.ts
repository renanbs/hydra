import { describe, expect, it, vi } from 'vitest'
import type * as cardPropertiesModule from '@/shared/worktree/card-properties'

// `normalizeWorktreeCardProperties` is still an auto-stub in this branch
// (`any = null`), yet `hydratePersistedUI` calls it unconditionally — stand it in
// so the integration assertion exercises hydration, not the unported subsystem.
vi.mock('@/shared/worktree/card-properties', async (importOriginal) => {
  const actual = await importOriginal<typeof cardPropertiesModule>()
  return { ...actual, normalizeWorktreeCardProperties: (value: unknown) => value ?? {} }
})

// pet-models imports bundled `.webp?url` assets that vitest can't resolve; hydration
// only needs the id guard/default, so stand the module in.
vi.mock('@/components/pet/pet-models', () => ({
  DEFAULT_PET_ID: 'test-pet',
  isBundledPetId: (id: unknown) => id === 'test-pet'
}))

import type { PersistedUIState } from '../../../shared/persisted-ui-state-types'
import {
  clampPetSize,
  hydrateTrustedOrcaHooks,
  hydrateUnexpectedSignoutDismissal,
  hydratedUIPartialMatchesState,
  migrateStatusBarItems,
  normalizeHydratedVisibleWorkspaceHostIds,
  presetToQuery,
  preserveStringArrayIdentity,
  sanitizeHydratedActiveView,
  sanitizePaneKeyTimestampRecord,
  sanitizePersistedRepoIds,
  sanitizePersistedSidebarWidth,
  sanitizeShowDotfilesByWorktree,
  sanitizeTrustedOrcaHooks,
  sanitizeWorkspaceCleanupDismissals
} from './ui-slice-hydration-sanitizers'
import {
  hydrateAgentReadState,
  mergeContextualTourSeenIds,
  mergeFeatureInteractionState,
  sanitizeTaskResumeState
} from './ui-slice-hydration-values'
import { createUiHydrationActions } from './ui-slice-hydration-actions'

// PersistedUIState has required fields the sanitizers never touch; a partial blob
// is exactly what hydration receives from disk, so cast at the test boundary.
const persisted = (value: Partial<PersistedUIState>): PersistedUIState =>
  value as PersistedUIState

describe('ui-slice-hydration-sanitizers', () => {
  it('preserveStringArrayIdentity keeps the current ref when equal, else returns next', () => {
    const current = ['a', 'b']
    expect(preserveStringArrayIdentity(current, ['a', 'b'])).toBe(current)
    const next = ['a', 'c']
    expect(preserveStringArrayIdentity(current, next)).toBe(next)
    expect(preserveStringArrayIdentity(null, ['a'])).toEqual(['a'])
    expect(preserveStringArrayIdentity(['a'], null)).toBeNull()
    expect(preserveStringArrayIdentity(null, null)).toBeNull()
  })

  it('sanitizePersistedRepoIds keeps only strings, empty on non-array', () => {
    expect(sanitizePersistedRepoIds(['a', 'b'])).toEqual(['a', 'b'])
    expect(sanitizePersistedRepoIds(['a', 2, null, 'b'])).toEqual(['a', 'b'])
    expect(sanitizePersistedRepoIds(undefined)).toEqual([])
    expect(sanitizePersistedRepoIds({})).toEqual([])
  })

  it('sanitizeShowDotfilesByWorktree drops non-boolean and unsafe keys', () => {
    expect(sanitizeShowDotfilesByWorktree({ w1: true, w2: false })).toEqual({
      w1: true,
      w2: false
    })
    expect(sanitizeShowDotfilesByWorktree({ w1: true, w2: 'nope', '': true })).toEqual({
      w1: true
    })
    expect(sanitizeShowDotfilesByWorktree(undefined)).toEqual({})
    expect(sanitizeShowDotfilesByWorktree([])).toEqual({})
  })

  it('sanitizePersistedSidebarWidth clamps numbers in range and falls back on garbage', () => {
    expect(sanitizePersistedSidebarWidth(300, 250, 500)).toBe(300)
    expect(sanitizePersistedSidebarWidth(10, 250, 500)).toBe(220)
    expect(sanitizePersistedSidebarWidth(9000, 250, 500)).toBe(500)
    expect(sanitizePersistedSidebarWidth('300', 250, 500)).toBe(250)
    expect(sanitizePersistedSidebarWidth(undefined, 250, 500)).toBe(250)
  })

  it('sanitizePaneKeyTimestampRecord keeps fresh positive timestamps', () => {
    const now = Date.now()
    expect(sanitizePaneKeyTimestampRecord({ p1: now })).toEqual({ p1: now })
    expect(sanitizePaneKeyTimestampRecord({ p1: now, p2: 0, p3: -1, p4: 'x' })).toEqual({
      p1: now
    })
    expect(sanitizePaneKeyTimestampRecord(undefined)).toEqual({})
  })

  it('sanitizeWorkspaceCleanupDismissals keeps only current-classifier records', () => {
    const valid = {
      worktreeId: 'wt-1',
      dismissedAt: 123,
      fingerprint: 'fp',
      classifierVersion: 2
    }
    expect(sanitizeWorkspaceCleanupDismissals({ k: valid })).toEqual({ k: valid })
    expect(
      sanitizeWorkspaceCleanupDismissals({
        k: { ...valid, classifierVersion: 1 },
        bad: 'nope'
      })
    ).toEqual({})
    expect(sanitizeWorkspaceCleanupDismissals(undefined)).toEqual({})
  })

  it('sanitizeHydratedActiveView falls back to terminal for unknown values', () => {
    expect(sanitizeHydratedActiveView('settings')).toBe('settings')
    expect(sanitizeHydratedActiveView('bogus' as PersistedUIState['activeView'])).toBe('terminal')
    expect(sanitizeHydratedActiveView(undefined as PersistedUIState['activeView'])).toBe('terminal')
  })

  it('clampPetSize rounds and clamps, falls back on non-finite', () => {
    const defaults = { min: 60, max: 360, fallback: 180 }
    expect(clampPetSize(200.4, defaults)).toBe(200)
    expect(clampPetSize(10, defaults)).toBe(60)
    expect(clampPetSize(9999, defaults)).toBe(360)
    expect(clampPetSize(Number.NaN, defaults)).toBe(180)
  })

  it('presetToQuery maps each persisted preset (and null) to its query', () => {
    expect(presetToQuery('all')).toBe('is:issue is:open')
    expect(presetToQuery(null)).toBe('is:issue is:open')
    expect(presetToQuery('my-issues')).toBe('assignee:@me is:issue is:open')
    expect(presetToQuery('my-prs')).toBe('author:@me is:pr is:open')
    expect(presetToQuery('review')).toBe('review-requested:@me is:pr is:open')
    expect(presetToQuery('prs')).toBe('is:pr is:open')
  })

  it('migrateStatusBarItems maps retired ids, dedupes, defaults when absent', () => {
    expect(migrateStatusBarItems(undefined)).toContain('claude')
    expect(migrateStatusBarItems(['memory', 'memory', 'ports', 'sessions'])).toEqual([
      'resource-usage',
      'ports'
    ])
  })

  it('hydrateUnexpectedSignoutDismissal records a new version once without undoing others', () => {
    expect(
      hydrateUnexpectedSignoutDismissal({ unexpectedSignoutDismissedVersions: [] }, '1.2.3')
    ).toEqual({
      dismissedUnexpectedSignoutVersion: '1.2.3',
      unexpectedSignoutDismissedVersions: ['1.2.3']
    })
    expect(
      hydrateUnexpectedSignoutDismissal(
        { unexpectedSignoutDismissedVersions: ['1.0.0'] },
        undefined
      )
    ).toEqual({
      dismissedUnexpectedSignoutVersion: null,
      unexpectedSignoutDismissedVersions: ['1.0.0']
    })
    expect(
      hydrateUnexpectedSignoutDismissal(
        { unexpectedSignoutDismissedVersions: ['1.2.3'] },
        '1.2.3'
      ).unexpectedSignoutDismissedVersions
    ).toEqual(['1.2.3'])
  })

  it('normalizeHydratedVisibleWorkspaceHostIds prefers persisted ids, then legacy scope', () => {
    expect(
      normalizeHydratedVisibleWorkspaceHostIds(
        persisted({ visibleWorkspaceHostIds: ['local'], workspaceHostScope: 'ssh:x' })
      )
    ).toEqual(['local'])
    expect(
      normalizeHydratedVisibleWorkspaceHostIds(
        persisted({ visibleWorkspaceHostIds: null, workspaceHostScope: 'ssh:x' })
      )
    ).toEqual(['ssh:x'])
    expect(
      normalizeHydratedVisibleWorkspaceHostIds(
        persisted({ visibleWorkspaceHostIds: null, workspaceHostScope: 'all' })
      )
    ).toBeNull()
    expect(normalizeHydratedVisibleWorkspaceHostIds(persisted({}))).toBeNull()
  })

  it('sanitizeTrustedOrcaHooks / hydrateTrustedOrcaHooks drop unsafe or stale entries', () => {
    const entry = { trust: 'granted' }
    expect(sanitizeTrustedOrcaHooks({ repo: entry, bad: 'nope' })).toEqual({ repo: entry })
    expect(sanitizeTrustedOrcaHooks(undefined)).toEqual({})
    expect(hydrateTrustedOrcaHooks({ repo: entry }, new Set(['repo']))).toEqual({ repo: entry })
    expect(hydrateTrustedOrcaHooks({ repo: entry }, new Set(['other']))).toEqual({})
    expect(hydrateTrustedOrcaHooks({ repo: entry }, new Set())).toEqual({ repo: entry })
  })

  it('hydratedUIPartialMatchesState compares each hydrated key to the store', () => {
    const state = { sidebarWidth: 300 } as never
    expect(hydratedUIPartialMatchesState(state, { sidebarWidth: 300 } as never)).toBe(true)
    expect(hydratedUIPartialMatchesState(state, { sidebarWidth: 301 } as never)).toBe(false)
  })
})

describe('ui-slice-hydration-values', () => {
  it('sanitizeTaskResumeState keeps valid fields, drops unknown enums, undefined when empty', () => {
    expect(
      sanitizeTaskResumeState({
        githubMode: 'items',
        githubItemsPreset: 'my-prs',
        githubItemsQuery: 'is:open',
        linearPreset: 'assigned',
        linearMode: 'views',
        linearQuery: 'q',
        jiraPreset: 'done',
        jiraQuery: 'j'
      })
    ).toEqual({
      githubMode: 'items',
      githubItemsPreset: 'my-prs',
      githubItemsQuery: 'is:open',
      linearPreset: 'assigned',
      linearMode: 'views',
      linearQuery: 'q',
      jiraPreset: 'done',
      jiraQuery: 'j'
    })
    expect(
      sanitizeTaskResumeState({
        githubMode: 'bogus',
        githubItemsPreset: 'nope',
        linearPreset: 'nope',
        linearMode: 'nope',
        jiraPreset: 'nope'
      })
    ).toBeUndefined()
    expect(sanitizeTaskResumeState(undefined)).toBeUndefined()
    expect(sanitizeTaskResumeState('nope')).toBeUndefined()
  })

  it('sanitizeTaskResumeState keeps githubItemsPreset null and validates linearContext', () => {
    expect(sanitizeTaskResumeState({ githubItemsPreset: null })).toEqual({ githubItemsPreset: null })
    expect(
      sanitizeTaskResumeState({
        linearContext: { kind: 'project', id: 'p1', workspaceId: 'ws', model: 'issue' }
      })
    ).toEqual({
      linearContext: { kind: 'project', id: 'p1', workspaceId: 'ws', model: 'issue' }
    })
    expect(
      sanitizeTaskResumeState({
        linearContext: { kind: 'project', id: 'p1', workspaceId: 'all' }
      })
    ).toBeUndefined()
  })

  it('mergeFeatureInteractionState takes min firstInteractedAt and max interactionCount', () => {
    const merged = mergeFeatureInteractionState(
      { browser: { firstInteractedAt: 100, interactionCount: 1 } },
      { browser: { firstInteractedAt: 50, interactionCount: 5 } }
    )
    expect(merged.browser).toEqual({ firstInteractedAt: 50, interactionCount: 5 })
  })

  it('mergeContextualTourSeenIds unions and dedupes', () => {
    expect(mergeContextualTourSeenIds(['browser'], ['tasks', 'browser'])).toEqual([
      'browser',
      'tasks'
    ])
    expect(mergeContextualTourSeenIds([], undefined)).toEqual([])
  })

  it('hydrateAgentReadState sanitizes each pane-key record', () => {
    const now = Date.now()
    expect(
      hydrateAgentReadState(
        persisted({
          acknowledgedAgentsByPaneKey: { p1: now, p2: -1 },
          activityClearedAtByPaneKey: { p1: now },
          manuallyUnreadTurnsByPaneKey: undefined
        })
      )
    ).toEqual({
      acknowledgedAgentsByPaneKey: { p1: now },
      activityClearedAtByPaneKey: { p1: now },
      manuallyUnreadTurnsByPaneKey: {}
    })
  })
})

describe('hydratePersistedUI applies normalized values to the store', () => {
  it('clamps, sanitizes and defaults an empty/malformed blob', () => {
    let state: Record<string, unknown> = {
      repos: [],
      sidebarWidth: 300,
      rightSidebarWidth: 400,
      markdownTocPanelWidth: 320,
      combinedDiffFileTreeWidth: 320,
      agentsVisibleHostIds: null,
      agentsFilterRepoIds: [],
      workspaceCleanupBrowse: {},
      activeView: 'terminal',
      persistedUIWriteBaseline: undefined,
      persistedUIWriteBaselineGeneration: 0,
      persistedUIWriteInFlightCounts: {}
    }
    // UISlice is typed `any` in this branch; hydratePersistedUI only ever calls set(fn).
    const set = ((updater: (s: Record<string, unknown>) => object) => {
      state = { ...state, ...updater(state) }
    }) as never
    const actions = createUiHydrationActions(set, (() => state) as never)

    actions.hydratePersistedUI({
      // Explicit true keeps hydrateStatusBarItems off the (not-yet-ported) ui.set bridge.
      _portsStatusBarDefaultAdded: true,
      _kimiStatusBarDefaultAdded: true,
      _minimaxStatusBarDefaultAdded: true,
      _antigravityStatusBarDefaultAdded: true,
      _grokStatusBarDefaultAdded: true,
      sidebarWidth: 9000,
      rightSidebarWidth: 'nope',
      filterRepoIds: ['r1', 2, null],
      showDotfilesByWorktree: { w1: true, w2: 'nope' },
      petSize: 9999,
      taskResumeState: { githubMode: 'bogus', jiraPreset: 'done', jiraQuery: 'x' },
      trustedOrcaHooks: { bad: 'not-object' },
      acknowledgedAgentsByPaneKey: { p1: 1 }
    })

    expect(state.persistedUIReady).toBe(true)
    expect(state.sidebarWidth).toBe(500)
    expect(state.rightSidebarWidth).toBe(400)
    expect(state.filterRepoIds).toEqual(['r1'])
    expect(state.showDotfilesByWorktree).toEqual({ w1: true })
    expect(state.petSize).toBe(360)
    expect(state.taskResumeState).toEqual({ jiraPreset: 'done', jiraQuery: 'x' })
    expect(state.trustedOrcaHooks).toEqual({})
    expect(state.acknowledgedAgentsByPaneKey).toEqual({})
    expect(state.statusBarItems as string[]).toContain('claude')
  })
})
