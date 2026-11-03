// Parity guard for D01-017: the onboarding checklist derives each milestone from
// persisted evidence (settings, feature interactions, repos, worktrees, CLI marker)
// and never reports a step done without that evidence.
import { describe, expect, it } from 'vitest'
import { DEFAULT_HYDRA_SETTINGS, type HydraSettings } from '../../shared/settings-types'
import type { FeatureInteractionState } from '../../shared/feature-interactions'
import {
  getFeatureWallSetupProgress,
  isFeatureWallSetupProgressComplete
} from './feature-wall-setup-progress'

function settings(overrides: Partial<HydraSettings> = {}): HydraSettings {
  return { ...DEFAULT_HYDRA_SETTINGS, ...overrides }
}

function interaction(at = 1): { firstInteractedAt: number; interactionCount: number } {
  return { firstInteractedAt: at, interactionCount: 1 }
}

function progress(overrides: {
  ready?: boolean
  settings?: HydraSettings | null
  featureInteractions?: FeatureInteractionState
  repos?: { kind?: 'git' | 'folder'; hookSettings?: unknown }[]
  worktreesByRepo?: Record<string, { path: string; isMainWorktree: boolean }[]>
  orchestrationSetupEnabled?: boolean
}) {
  return getFeatureWallSetupProgress({
    ready: overrides.ready,
    settings: overrides.settings ?? null,
    featureInteractions: overrides.featureInteractions ?? {},
    repos: (overrides.repos ?? []) as never,
    worktreesByRepo: (overrides.worktreesByRepo ?? {}) as never,
    orchestrationSetupEnabled: overrides.orchestrationSetupEnabled ?? false
  })
}

describe('getFeatureWallSetupProgress (D01-017)', () => {
  it('reports the full checklist as incomplete when no evidence exists', () => {
    const result = progress({ ready: true })

    expect(result.ready).toBe(true)
    expect(result.coreTotal).toBe(8)
    expect(result.coreDoneCount).toBe(0)
    expect(Object.values(result.stepDone).every((done) => done === false)).toBe(true)
    expect(isFeatureWallSetupProgressComplete(result)).toBe(false)
  })

  it('marks default agent and notifications from persisted settings', () => {
    const result = progress({
      settings: settings({ default_tui_agent: 'claude', notification_on_blocked: true })
    })

    expect(result.stepDone['default-agent']).toBe(true)
    expect(result.stepDone.notifications).toBe(true)
    expect(result.coreDoneCount).toBe(2)
  })

  it('treats a blank default agent as not chosen', () => {
    const result = progress({ settings: settings({ default_tui_agent: 'blank' }) })

    expect(result.stepDone['default-agent']).toBe(false)
  })

  it('counts two git repos and ignores folder-backed projects', () => {
    expect(progress({ repos: [{ kind: 'git' }, { kind: 'git' }] }).stepDone['add-two-repos']).toBe(
      true
    )
    expect(
      progress({ repos: [{ kind: 'git' }, { kind: 'folder' }] }).stepDone['add-two-repos']
    ).toBe(false)
  })

  it('counts a real linked worktree but not the main checkout', () => {
    expect(
      progress({
        worktreesByRepo: {
          repo: [{ path: '/repo', isMainWorktree: true }]
        }
      }).stepDone['two-worktrees']
    ).toBe(false)

    expect(
      progress({
        worktreesByRepo: {
          repo: [
            { path: '/repo', isMainWorktree: true },
            { path: '/repo/feature', isMainWorktree: false }
          ]
        }
      }).stepDone['two-worktrees']
    ).toBe(true)
  })

  it('uses the persisted setup script only when the source policy runs local scripts', () => {
    const localScript = {
      hookSettings: { scripts: { setup: 'pnpm install' } }
    }
    expect(progress({ repos: [{ kind: 'git', ...localScript }] }).stepDone['setup-script']).toBe(
      true
    )

    expect(
      progress({
        repos: [
          {
            kind: 'git',
            hookSettings: {
              commandSourcePolicy: 'shared-only',
              scripts: { setup: 'pnpm install' }
            }
          }
        ]
      }).stepDone['setup-script']
    ).toBe(false)
  })

  it('derives browser, task-source and capability usage from feature interactions', () => {
    const result = progress({
      featureInteractions: {
        browser: interaction(),
        'linear-tasks': interaction(),
        'agent-orchestration': interaction()
      }
    })

    expect(result.stepDone.browser).toBe(true)
    expect(result.stepDone['task-sources']).toBe(true)
    expect(result.stepDone['agent-capabilities']).toBe(true)
    expect(result.coreDoneCount).toBe(3)
  })

  it('counts the persisted Orca CLI setup marker as enabled capabilities', () => {
    expect(progress({ orchestrationSetupEnabled: true }).stepDone['agent-capabilities']).toBe(true)
  })

  it('keeps ready false until the caller says hydration finished', () => {
    expect(progress({ ready: false }).ready).toBe(false)
    expect(progress({}).ready).toBe(true)
  })

  it('is complete only when all eight milestones are done', () => {
    const result = progress({
      settings: settings({ default_tui_agent: 'claude', notification_on_blocked: true }),
      repos: [
        { kind: 'git', hookSettings: { scripts: { setup: 'pnpm install' } } },
        { kind: 'git' }
      ],
      worktreesByRepo: {
        repo: [
          { path: '/repo', isMainWorktree: true },
          { path: '/repo/feature', isMainWorktree: false }
        ]
      },
      featureInteractions: {
        browser: interaction(),
        'github-tasks': interaction()
      },
      orchestrationSetupEnabled: true
    })

    expect(result.coreDoneCount).toBe(result.coreTotal)
    expect(isFeatureWallSetupProgressComplete(result)).toBe(true)
  })
})
