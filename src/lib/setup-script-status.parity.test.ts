import { describe, expect, it } from 'vitest'
import { hasEffectiveSetupCommand } from './setup-script-status'
import type { Repo } from '../shared/repo-types'

const baseRepo = {
  id: 'repo-1',
  path: '/repo',
  displayName: 'Repo',
  badgeColor: '#fff',
  addedAt: 0
} satisfies Repo

function hooks(setup?: string) {
  return {
    hasHooks: Boolean(setup),
    hooks: setup ? { scripts: { setup } } : null,
    mayNeedUpdate: false
  }
}

describe('hasEffectiveSetupCommand (D02c-019)', () => {
  it('counts a shared orca.yaml setup under the default shared-only policy', () => {
    expect(hasEffectiveSetupCommand(baseRepo, hooks('pnpm install'))).toBe(true)
    expect(hasEffectiveSetupCommand(baseRepo, hooks())).toBe(false)
  })

  it('ignores the shared hook when the repo is local-only', () => {
    const repo: Repo = {
      ...baseRepo,
      hookSettings: {
        mode: 'override',
        commandSourcePolicy: 'local-only',
        scripts: { setup: '', archive: '' }
      }
    }
    expect(hasEffectiveSetupCommand(repo, hooks('pnpm install'))).toBe(false)
    expect(
      hasEffectiveSetupCommand(
        {
          ...repo,
          hookSettings: { ...repo.hookSettings!, scripts: { setup: 'make', archive: '' } }
        },
        hooks('pnpm install')
      )
    ).toBe(true)
  })

  it('accepts either source under run-both and treats whitespace as absent', () => {
    const repo: Repo = {
      ...baseRepo,
      hookSettings: {
        mode: 'auto',
        commandSourcePolicy: 'run-both',
        scripts: { setup: '   ', archive: '' }
      }
    }
    expect(hasEffectiveSetupCommand(repo, hooks('pnpm install'))).toBe(true)
    expect(hasEffectiveSetupCommand(repo, hooks('   '))).toBe(false)
  })
})
