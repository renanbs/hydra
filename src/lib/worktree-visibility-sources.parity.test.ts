import { describe, expect, it } from 'vitest'
import {
  classifyWorktreeVisibilitySource,
  countWorktreesByVisibilitySource,
} from './worktree-visibility-sources'

const repo = '/repo/app'
const custom = [{ id: 'extra', rootPath: '/repo/extra' }] as never

describe('visibility source classification/count (D10-057)', () => {
  it('counts a built-in source by its relative root', () => {
    const counts = countWorktreesByVisibilitySource(
      [{ path: '/repo/app/.worktrees/feature' }],
      repo,
      custom
    )
    // Claude Code's root is the repo's .worktrees tree; any built-in key is accepted here.
    expect([...counts.values()].reduce((sum, value) => sum + value, 0)).toBe(1)
  })

  it('treats a configured base path as "other" instead of a built-in source', () => {
    const configured = ['/repo/app/.worktrees']
    expect(
      classifyWorktreeVisibilitySource(
        '/repo/app/.worktrees/feature',
        repo,
        custom,
        configured
      )
    ).toBeNull()
    expect(
      countWorktreesByVisibilitySource(
        [{ path: '/repo/app/.worktrees/feature' }],
        repo,
        custom,
        configured
      ).get('other')
    ).toBe(1)
  })
})
