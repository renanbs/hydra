// Parity guard for D10-057: Orca's `WorktreeVisibilitySourceList` badges each
// source with `N found` counted from the detected worktrees, but it skips the
// checkout the user selected and anything Orca manages — neither is an external
// worktree the source setting governs.
import { describe, expect, it } from 'vitest'
import {
  countWorktreesByVisibilitySource,
  type WorktreeVisibilityCountRow,
} from './worktree-visibility-sources'

const PROJECT_ROOT = '/repo/hydra'
const CUSTOM = [{ id: 'extra', rootPath: '/repo/extra' }]

function count(worktrees: WorktreeVisibilityCountRow[]) {
  return countWorktreesByVisibilitySource(worktrees, PROJECT_ROOT, CUSTOM)
}

describe('countWorktreesByVisibilitySource (D10-057)', () => {
  it('counts built-in, custom and other locations', () => {
    const counts = count([
      { path: `${PROJECT_ROOT}/.claude/worktrees/a` },
      { path: `${PROJECT_ROOT}/.gsd-workspaces/b` },
      { path: '/repo/extra/c' },
      { path: '/elsewhere/d' },
    ])

    expect(counts.get('built-in:claude')).toBe(1)
    expect(counts.get('built-in:gsd')).toBe(1)
    expect(counts.get('custom:extra')).toBe(1)
    expect(counts.get('other')).toBe(1)
  })

  it('skips the explicitly selected checkout', () => {
    const counts = count([
      { path: `${PROJECT_ROOT}/.claude/worktrees/a` },
      { path: `${PROJECT_ROOT}/.claude/worktrees/selected`, selectedCheckout: true },
    ])

    expect(counts.get('built-in:claude')).toBe(1)
  })

  it('skips an orca-managed worktree even when its source matches', () => {
    const counts = count([
      { path: '/repo/extra/b' },
      { path: '/repo/extra/managed', ownership: 'orca-managed' },
      { path: '/repo/extra/external', ownership: 'external' },
    ])

    expect(counts.get('custom:extra')).toBe(2)
  })

  it('returns no entry for a source with nothing to count', () => {
    const counts = count([{ path: '/elsewhere/d' }])

    expect(counts.get('built-in:claude')).toBeUndefined()
    expect(counts.get('other')).toBe(1)
  })
})
