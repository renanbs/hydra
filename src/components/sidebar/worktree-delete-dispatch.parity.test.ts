import { describe, expect, it } from 'vitest'
import { canHydrateDeleteTargetLocally, groupDeleteTargetsForDispatch } from './worktree-delete-dispatch'

describe('groupDeleteTargetsForDispatch (D10-013)', () => {
  it('keeps one sequential list per repo+host, preserving child-first order', () => {
    const targets = [
      { path: 'child', repoPath: '/repo/a' },
      { path: 'parent', repoPath: '/repo/a' },
      { path: 'other', repoPath: '/repo/b', hostId: 'ssh:box' },
    ]
    expect(groupDeleteTargetsForDispatch(targets)).toEqual([
      [
        { path: 'child', repoPath: '/repo/a' },
        { path: 'parent', repoPath: '/repo/a' },
      ],
      [{ path: 'other', repoPath: '/repo/b', hostId: 'ssh:box' }],
    ])
  })

  it('separates the same repo on different hosts', () => {
    const groups = groupDeleteTargetsForDispatch([
      { repoPath: '/repo/a', hostId: 'local' },
      { repoPath: '/repo/a', hostId: 'ssh:box' },
    ])
    expect(groups).toHaveLength(2)
  })
})

describe('canHydrateDeleteTargetLocally (D10-016)', () => {
  it('answers only for unqualified and local targets', () => {
    expect(canHydrateDeleteTargetLocally(undefined)).toBe(true)
    expect(canHydrateDeleteTargetLocally('local')).toBe(true)
    expect(canHydrateDeleteTargetLocally('ssh:box')).toBe(false)
    expect(canHydrateDeleteTargetLocally('runtime:env')).toBe(false)
  })
})
