import { describe, expect, it } from 'vitest'
import {
  clampWorktreeParentPickerIndex,
  filterWorktreeParentCandidates,
  getWorktreeParentPickerItemValue
} from './worktree-parent-picker-filtering'

const CANDIDATES = [
  { displayName: 'hydra-main', branch: 'refs/heads/main', path: '/repo/hydra' },
  { displayName: 'fix-login', branch: 'refs/heads/fix/login', path: '/repo/hydra/login' },
  { displayName: 'orca-parity', branch: 'refs/heads/feature/sidebar', path: '/repo/orca' }
]

describe('getWorktreeParentPickerItemValue (D06-026)', () => {
  it('matches on display name, branch display name and path', () => {
    expect(getWorktreeParentPickerItemValue(CANDIDATES[1])).toBe(
      'fix-login fix/login /repo/hydra/login'
    )
  })
})

describe('filterWorktreeParentCandidates (D06-026)', () => {
  it('returns every candidate in order for an empty query', () => {
    expect(filterWorktreeParentCandidates(CANDIDATES, '   ')).toEqual(CANDIDATES)
  })

  it('drops candidates that do not score against the query', () => {
    const filtered = filterWorktreeParentCandidates(CANDIDATES, 'login')
    expect(filtered.map((candidate) => candidate.displayName)).toEqual(['fix-login'])
  })

  it('orders the best score first instead of keeping input order', () => {
    const filtered = filterWorktreeParentCandidates(
      [
        { displayName: 'my sidebar', branch: 'refs/heads/x', path: '/repo/notes' },
        { displayName: 'sidebar', branch: 'refs/heads/x', path: '/repo/sidebar' }
      ],
      'sidebar'
    )

    expect(filtered[0]?.displayName).toBe('sidebar')
  })

  it('never mutates the input order', () => {
    const input = [...CANDIDATES]
    filterWorktreeParentCandidates(input, 'repo')
    expect(input).toEqual(CANDIDATES)
  })
})

describe('clampWorktreeParentPickerIndex (D06-026)', () => {
  it('keeps the highlight inside the filtered array', () => {
    expect(clampWorktreeParentPickerIndex(5, 3)).toBe(2)
    expect(clampWorktreeParentPickerIndex(-1, 3)).toBe(0)
    expect(clampWorktreeParentPickerIndex(1, 3)).toBe(1)
  })

  it('collapses to zero for an empty list', () => {
    expect(clampWorktreeParentPickerIndex(4, 0)).toBe(0)
  })
})
