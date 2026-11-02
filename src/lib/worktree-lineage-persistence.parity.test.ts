import { describe, expect, it } from 'vitest'
import {
  normalizeWorktreeLineage,
  parseLegacyWorktreeLineage,
  planWorktreeLineageHydration,
  worktreeLineageChanges
} from './worktree-lineage-persistence'

describe('worktree lineage persistence helpers', () => {
  it('normalizes hostile or malformed maps without inventing edges', () => {
    expect(
      normalizeWorktreeLineage({
        '/child': '/parent',
        '': '/parent',
        '/empty-parent': '   ',
        '/number-parent': 4,
        '/null-parent': null
      })
    ).toEqual({ '/child': '/parent' })
    expect(normalizeWorktreeLineage(null)).toEqual({})
    expect(normalizeWorktreeLineage(['/child'])).toEqual({})
    expect(parseLegacyWorktreeLineage('{not json')).toEqual({})
    expect(parseLegacyWorktreeLineage(null)).toEqual({})
  })

  it('migrates a legacy blob only when the DB is empty', () => {
    const migrated = planWorktreeLineageHydration(
      {},
      { '/child': '/parent', '/other': '/parent' }
    )
    expect(migrated.lineage).toEqual({ '/child': '/parent', '/other': '/parent' })
    expect(migrated.migrate).toHaveLength(2)
    expect(migrated.clearLegacy).toBe(true)

    const authoritative = planWorktreeLineageHydration(
      { '/db-child': '/db-parent' },
      { '/legacy-child': '/legacy-parent' }
    )
    expect(authoritative.lineage).toEqual({ '/db-child': '/db-parent' })
    expect(authoritative.migrate).toEqual([])
    expect(authoritative.clearLegacy).toBe(true)
  })

  it('never migrates when both sources are empty', () => {
    const plan = planWorktreeLineageHydration({}, {})
    expect(plan.lineage).toEqual({})
    expect(plan.migrate).toEqual([])
    expect(plan.clearLegacy).toBe(false)
  })

  it('diffs only the edges that changed', () => {
    expect(
      worktreeLineageChanges(
        { '/keep': '/a', '/move': '/a', '/drop': '/a' },
        { '/keep': '/a', '/move': '/b' }
      )
    ).toEqual([
      { childPath: '/move', parentPath: '/b' },
      { childPath: '/drop', parentPath: null }
    ])
    expect(worktreeLineageChanges({}, {})).toEqual([])
  })
})
