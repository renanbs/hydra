import { describe, expect, it } from 'vitest'
import { pruneClosedDeleteStates } from './worktree-delete-state-prune'
import type { DeleteWorktreeDialogState } from '../DeleteWorktreeDialog'

const state = (overrides: Partial<NonNullable<DeleteWorktreeDialogState[string]>> = {}) => ({
  isDeleting: false,
  error: null,
  canForceDelete: false,
  forceDeleteReason: null,
  ...overrides
})

describe('pruneClosedDeleteStates (D10-017)', () => {
  it('drops settled entries and keeps the ones still deleting', () => {
    const states: DeleteWorktreeDialogState = {
      'host|repo::/a': state(),
      'host|repo::/b': state({ isDeleting: true }),
      'repo::/c': state({ phase: 'queued' }),
    }
    expect(Object.keys(pruneClosedDeleteStates(states))).toEqual([
      'host|repo::/b',
      'repo::/c',
    ])
  })

  it('is a no-op for an empty or undefined-filled map', () => {
    expect(pruneClosedDeleteStates({})).toEqual({})
    expect(pruneClosedDeleteStates({ 'repo::/a': undefined })).toEqual({})
  })
})
