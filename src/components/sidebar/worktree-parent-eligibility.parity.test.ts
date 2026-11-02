import { describe, expect, it } from 'vitest'
import {
  canAssignWorktreeParent,
  collectCyclicWorktreeParentPaths,
  getEligibleWorktreeParents,
  isEligibleWorktreeParent,
  type WorktreeParentPickerCandidate
} from './worktree-parent-eligibility'

function candidate(
  path: string,
  overrides: Partial<WorktreeParentPickerCandidate> = {}
): WorktreeParentPickerCandidate {
  return {
    id: `repo::${path}`,
    path,
    displayName: path,
    branch: 'refs/heads/main',
    repoId: 'repo',
    projectId: 'project',
    hostId: 'local',
    isArchived: false,
    repoLabel: 'Repo',
    status: 'inactive',
    isActive: false,
    ...overrides
  }
}

describe('collectCyclicWorktreeParentPaths (D06-024)', () => {
  it('marks exactly the paths that sit inside a loop', () => {
    const cyclic = collectCyclicWorktreeParentPaths({
      '/a': '/b',
      '/b': '/c',
      '/c': '/a',
      '/tail': '/a'
    })

    expect([...cyclic].sort()).toEqual(['/a', '/b', '/c'])
    expect(cyclic.has('/tail')).toBe(false)
  })

  it('reports nothing for a healthy chain', () => {
    expect(
      collectCyclicWorktreeParentPaths({ '/b': '/a', '/c': '/b' }).size
    ).toBe(0)
  })
})

describe('canAssignWorktreeParent (D06-024)', () => {
  it('rejects the row itself', () => {
    expect(
      canAssignWorktreeParent({ childPath: '/a', candidatePath: '/a', lineageByPath: {} })
    ).toBe(false)
  })

  it('rejects the parent the row already has', () => {
    expect(
      canAssignWorktreeParent({
        childPath: '/a',
        candidatePath: '/b',
        lineageByPath: { '/a': '/b' }
      })
    ).toBe(false)
  })

  it('rejects a descendant through a transitive ancestor chain', () => {
    expect(
      canAssignWorktreeParent({
        childPath: '/a',
        candidatePath: '/c',
        lineageByPath: { '/b': '/a', '/c': '/b' }
      })
    ).toBe(false)
  })

  it('accepts an unrelated ancestor chain', () => {
    expect(
      canAssignWorktreeParent({
        childPath: '/a',
        candidatePath: '/c',
        lineageByPath: { '/b': '/x', '/c': '/b' }
      })
    ).toBe(true)
  })

  it('rejects a candidate parked inside a pre-existing loop', () => {
    expect(
      canAssignWorktreeParent({
        childPath: '/a',
        candidatePath: '/b',
        lineageByPath: { '/b': '/c', '/c': '/b' }
      })
    ).toBe(false)
  })
})

describe('isEligibleWorktreeParent (D06-024)', () => {
  const child = candidate('/child')

  it('accepts a sibling in the same repo, project and host', () => {
    expect(
      isEligibleWorktreeParent({
        child,
        candidateParent: candidate('/sibling'),
        lineageByPath: {}
      })
    ).toBe(true)
  })

  it('rejects a different repo', () => {
    expect(
      isEligibleWorktreeParent({
        child,
        candidateParent: candidate('/other', { repoId: 'other-repo' }),
        lineageByPath: {}
      })
    ).toBe(false)
  })

  it('rejects a different project identity', () => {
    expect(
      isEligibleWorktreeParent({
        child,
        candidateParent: candidate('/other', { projectId: 'other-project' }),
        lineageByPath: {}
      })
    ).toBe(false)
  })

  it('rejects a different execution host', () => {
    expect(
      isEligibleWorktreeParent({
        child,
        candidateParent: candidate('/other', { hostId: 'ssh:build' }),
        lineageByPath: {}
      })
    ).toBe(false)
  })

  it('rejects an archived candidate', () => {
    expect(
      isEligibleWorktreeParent({
        child,
        candidateParent: candidate('/archived', { isArchived: true }),
        lineageByPath: {}
      })
    ).toBe(false)
  })

  it('rejects every candidate when the child has no resolvable host', () => {
    expect(
      isEligibleWorktreeParent({
        child: candidate('/child', { hostId: undefined }),
        candidateParent: candidate('/sibling', { hostId: undefined }),
        lineageByPath: {}
      })
    ).toBe(false)
  })
})

describe('getEligibleWorktreeParents (D06-024)', () => {
  it('keeps same-repo siblings and drops the rest', () => {
    const eligible = getEligibleWorktreeParents({
      child: candidate('/child'),
      candidates: [
        candidate('/main'),
        candidate('/sibling'),
        candidate('/other-repo', { repoId: 'other' }),
        candidate('/archived', { isArchived: true })
      ],
      lineageByPath: {}
    })

    expect(eligible.map((entry) => entry.path)).toEqual(['/main', '/sibling'])
  })

  it('excludes the current parent so re-selecting it is not offered', () => {
    const eligible = getEligibleWorktreeParents({
      child: candidate('/child'),
      candidates: [candidate('/main'), candidate('/sibling')],
      lineageByPath: { '/child': '/main' }
    })

    expect(eligible.map((entry) => entry.path)).toEqual(['/sibling'])
  })
})
