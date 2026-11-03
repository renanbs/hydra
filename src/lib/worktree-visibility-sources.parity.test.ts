import { describe, expect, it } from 'vitest'
import {
  getWorktreeVisibilityOverrideNotice,
  getWorktreeVisibilitySourceProvenance,
  getWorktreeVisibilitySourceNote,
  listInheritedWorktreeVisibilitySources,
  worktreeVisibilityValueLabel,
  type WorktreeVisibilityRepoConfig,
} from './worktree-visibility-sources'

const PROJECT_ROOT = '/repo/hydra'
const GLOBAL_ROOT = '/repo/global'

const defaults = {
  external: 'hide' as const,
  customSources: [{ id: 'global-root', rootPath: GLOBAL_ROOT }],
  sourcePreferences: {
    builtIn: { claude: 'show' as const },
  },
}

const projectOwnedAndOverridden: WorktreeVisibilityRepoConfig = {
  customWorktreeVisibilitySources: [{ id: 'project-root', rootPath: '/repo/project' }],
  worktreeVisibilitySourcePreferences: {
    builtIn: { gsd: 'show' },
    custom: { 'global-root': 'show' },
  },
}

describe('listInheritedWorktreeVisibilitySources (D06-035)', () => {
  it('lists the built-ins, the global custom roots and "other" with their global values', () => {
    const inherited = listInheritedWorktreeVisibilitySources(projectOwnedAndOverridden, defaults)

    expect(inherited.map(({ source }) => source.kind)).toEqual([
      'built-in',
      'built-in',
      'custom',
      'other',
    ])
    expect(inherited.map(({ globalVisibility }) => globalVisibility)).toEqual([
      'show',
      'hide',
      'hide',
      'hide',
    ])
  })

  it('omits a root the project added itself: there is no global value behind it', () => {
    const inherited = listInheritedWorktreeVisibilitySources(projectOwnedAndOverridden, defaults)

    expect(
      inherited.some(
        ({ source }) => source.kind === 'custom' && source.source.id === 'project-root'
      )
    ).toBe(false)
  })

  it('returns an empty list without a project config', () => {
    expect(listInheritedWorktreeVisibilitySources(null, defaults)).toEqual([])
  })
})

describe('worktreeVisibilityValueLabel (D06-035)', () => {
  it('renders the translated labels', () => {
    expect(worktreeVisibilityValueLabel('show')).toBe('Show')
    expect(worktreeVisibilityValueLabel('hide')).toBe('Hide')
  })
})

describe('getWorktreeVisibilityOverrideNotice (D06-035)', () => {
  const row = { kind: 'built-in' as const, id: 'gsd' as const }

  it('names the global value a divergent override ignores', () => {
    const provenance = getWorktreeVisibilitySourceProvenance(
      projectOwnedAndOverridden,
      row,
      defaults
    )

    expect(getWorktreeVisibilityOverrideNotice(provenance, 'show')).toBe(
      'Overriding global setting: Hide'
    )
  })

  it('stays quiet when the override happens to match Global Settings', () => {
    const provenance = getWorktreeVisibilitySourceProvenance(
      projectOwnedAndOverridden,
      row,
      defaults
    )

    expect(getWorktreeVisibilityOverrideNotice(provenance, 'hide')).toBeNull()
  })

  it('stays quiet for an inherited row and for a project-only root', () => {
    const inherited = getWorktreeVisibilitySourceProvenance(
      projectOwnedAndOverridden,
      { kind: 'other' },
      defaults
    )
    const projectOnly = getWorktreeVisibilitySourceProvenance(
      projectOwnedAndOverridden,
      { kind: 'custom', source: { id: 'project-root', rootPath: '/repo/project' } },
      defaults,
      new Set(['project-root'])
    )

    expect(getWorktreeVisibilityOverrideNotice(inherited, 'show')).toBeNull()
    expect(getWorktreeVisibilityOverrideNotice(projectOnly, 'show')).toBeNull()
  })
})

describe('getWorktreeVisibilitySourceNote (D06-035)', () => {
  it('marks a root the project added itself', () => {
    const provenance = getWorktreeVisibilitySourceProvenance(
      projectOwnedAndOverridden,
      { kind: 'custom', source: { id: 'project-root', rootPath: PROJECT_ROOT } },
      defaults,
      new Set(['project-root'])
    )

    expect(getWorktreeVisibilitySourceNote(provenance)).toBe('Added in this project only.')
  })

  it('is silent for a global root', () => {
    const provenance = getWorktreeVisibilitySourceProvenance(
      { externalWorktreeVisibility: 'show' },
      { kind: 'custom', source: { id: 'global-root', rootPath: GLOBAL_ROOT } },
      defaults
    )

    expect(getWorktreeVisibilitySourceNote(provenance)).toBeNull()
  })
})
