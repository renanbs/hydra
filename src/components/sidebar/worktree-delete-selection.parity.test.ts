import { describe, expect, it } from 'vitest'
import { selectDeletableWorktrees } from './worktree-delete-selection'

const worktrees = [
  { path: '/repo/main', is_main: true },
  { path: '/repo/feature', is_main: false },
  { path: '/repo/other', isMainWorktree: true },
  { path: '/repo/feature-2' },
]

describe('selectDeletableWorktrees (D10-077)', () => {
  it('drops the primary checkout and keeps the rest', () => {
    expect(selectDeletableWorktrees(worktrees, '/repo/main').map((w) => w.path)).toEqual([
      '/repo/feature',
      '/repo/feature-2',
    ])
  })

  it('returns nothing when the selection only holds the primary checkout', () => {
    expect(selectDeletableWorktrees([worktrees[0]!], '/repo/main')).toEqual([])
  })
})
