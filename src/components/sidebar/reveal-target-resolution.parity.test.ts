import { describe, expect, it } from 'vitest'
import { resolveRevealWorktreePath } from './reveal-target-resolution'

const entries = [
  {
    projectId: 'repo_a',
    path: '/repo/a',
    worktrees: [
      { id: 'repo_a::/repo/a', path: '/repo/a' },
      { id: 'repo_a::/repo/a-feat', path: '/repo/a-feat' },
    ],
  },
]

describe('resolveRevealWorktreePath (D03b-018)', () => {
  it('resolves the host-qualified id the store queue carries', () => {
    expect(resolveRevealWorktreePath('repo_a::/repo/a-feat', entries)).toBe('/repo/a-feat')
  })

  it('falls back to a bare path and to the primary checkout id', () => {
    expect(resolveRevealWorktreePath('/repo/a-feat', entries)).toBe('/repo/a-feat')
    expect(resolveRevealWorktreePath('repo_a::/repo/a', entries)).toBe('/repo/a')
  })

  it('returns null for unknown ids instead of guessing', () => {
    expect(resolveRevealWorktreePath('repo_b::/repo/b', entries)).toBeNull()
  })
})
