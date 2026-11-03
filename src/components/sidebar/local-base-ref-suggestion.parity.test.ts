// Parity guard for D04b-003: the local base ref nudge is an opt-in invitation, so
// every gate (opt-in, decline, current, gone upstream) keeps it quiet, and the
// branch a base ref names is derived the way the toast labels it.
import { describe, expect, it } from 'vitest'

import {
  buildLocalBaseRefUpdateSuggestion,
  localBaseBranchFromBaseRef
} from './local-base-ref-suggestion'

const DRIFT = { localBranch: 'main', upstream: 'origin/main', behind: 3 }

describe('buildLocalBaseRefUpdateSuggestion (D04b-003)', () => {
  it('offers the opt-in when the local base branch trails its upstream', () => {
    expect(buildLocalBaseRefUpdateSuggestion(DRIFT, {})).toEqual({
      baseRef: 'origin/main',
      localBranch: 'main',
      behind: 3
    })
  })

  it('stays quiet once the user opted in', () => {
    expect(
      buildLocalBaseRefUpdateSuggestion(DRIFT, { refreshLocalBaseRefOnWorktreeCreate: true })
    ).toBeUndefined()
  })

  it('stays quiet after the suggestion was declined', () => {
    expect(
      buildLocalBaseRefUpdateSuggestion(DRIFT, { localBaseRefSuggestionDismissed: true })
    ).toBeUndefined()
  })

  it('stays quiet for a current branch, a missing upstream or a moved base', () => {
    expect(buildLocalBaseRefUpdateSuggestion({ ...DRIFT, behind: 0 }, {})).toBeUndefined()
    expect(buildLocalBaseRefUpdateSuggestion({ ...DRIFT, upstream: null }, {})).toBeUndefined()
    expect(
      buildLocalBaseRefUpdateSuggestion({ ...DRIFT, status: 'base_changed' }, {})
    ).toBeUndefined()
    expect(buildLocalBaseRefUpdateSuggestion(null, {})).toBeUndefined()
  })
})

describe('localBaseBranchFromBaseRef', () => {
  it('strips the remote prefix and keeps slashful branch names', () => {
    expect(localBaseBranchFromBaseRef('origin/main', 'main')).toBe('main')
    expect(localBaseBranchFromBaseRef('upstream/release/1.2', 'main')).toBe('release/1.2')
  })

  it('keeps a local branch name and falls back when empty', () => {
    expect(localBaseBranchFromBaseRef('main', 'develop')).toBe('main')
    expect(localBaseBranchFromBaseRef('   ', 'develop')).toBe('develop')
  })
})
