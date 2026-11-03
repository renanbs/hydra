import { describe, expect, it } from 'vitest'
import { getEmptyProjectPlaceholderRepoIds } from './empty-project-placeholder-repos'
import type { Repo } from '../../shared/repo-types'

const repo = (id: string, projectGroupId?: string): Repo => ({
  id,
  path: `/${id}`,
  displayName: id,
  badgeColor: '#fff',
  addedAt: 0,
  ...(projectGroupId ? { projectGroupId } : {})
})

const worktree = (repoId: string) => ({ id: `${repoId}::/wt`, repoId })

describe('getEmptyProjectPlaceholderRepoIds (D02c-017)', () => {
  it('returns nothing outside repo grouping', () => {
    expect(
      getEmptyProjectPlaceholderRepoIds({
        groupBy: 'workspace-status',
        repos: [repo('a')],
        worktreesByRepo: {},
        visibleWorktrees: [],
        filterRepoIds: []
      }).size
    ).toBe(0)
  })

  it('keeps repos with no scanned worktrees and filtered project-group members', () => {
    const result = getEmptyProjectPlaceholderRepoIds({
      groupBy: 'repo',
      repos: [repo('empty'), repo('filtered', 'group-1'), repo('visible')],
      worktreesByRepo: { filtered: [worktree('filtered')], visible: [worktree('visible')] },
      visibleWorktrees: [worktree('visible')],
      filterRepoIds: []
    })
    expect([...result].sort()).toEqual(['empty', 'filtered'])
  })

  it('honors the workspace project filter before adding placeholders', () => {
    const result = getEmptyProjectPlaceholderRepoIds({
      groupBy: 'repo',
      repos: [repo('selected', 'group-1'), repo('unselected', 'group-1')],
      worktreesByRepo: {},
      visibleWorktrees: [],
      filterRepoIds: ['selected']
    })
    expect([...result]).toEqual(['selected'])
  })
})
