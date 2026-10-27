// The multi-drag rule (D03a-002), exercised without a DOM: which worktrees a press moves is
// answerable from the selection and the surface's rows alone. The host-qualified case is the
// reason the rule exists — two hosts can publish the same workspace id, and a drag must move the
// row that was grabbed, never every row sharing its id.
import { describe, expect, it } from 'vitest'
import { composeWorktreeHostIdentity } from '../../shared/worktree/host-qualified-identity'
import { resolveWorktreeMultiDragSelection } from './worktree-multi-drag-selection'

/** Same workspace id on two hosts: distinct worktrees, distinct identities. */
const LOCAL_A = { worktreeId: 'repo::wt-a', identity: composeWorktreeHostIdentity('local', 'repo::wt-a') }
const REMOTE_A = {
  worktreeId: 'repo::wt-a',
  identity: composeWorktreeHostIdentity('ssh:host-b', 'repo::wt-a')
}
const LOCAL_B = { worktreeId: 'repo::wt-b', identity: composeWorktreeHostIdentity('local', 'repo::wt-b') }
const LOCAL_C = { worktreeId: 'repo::wt-c', identity: composeWorktreeHostIdentity('local', 'repo::wt-c') }

const SURFACE = [LOCAL_A, REMOTE_A, LOCAL_B, LOCAL_C] as const

describe('resolveWorktreeMultiDragSelection', () => {
  it('moves the whole selection when the grabbed worktree is part of one', () => {
    const batch = resolveWorktreeMultiDragSelection({
      draggedWorktreeId: LOCAL_B.worktreeId,
      draggedWorktreeIdentity: LOCAL_B.identity,
      selectedWorktreeIdentities: new Set([LOCAL_A.identity, LOCAL_B.identity, LOCAL_C.identity]),
      surfaceWorktrees: SURFACE
    })

    expect(batch).toEqual([LOCAL_A, LOCAL_B, LOCAL_C])
  })

  it('moves only the grabbed worktree when it is outside the selection', () => {
    const batch = resolveWorktreeMultiDragSelection({
      draggedWorktreeId: LOCAL_C.worktreeId,
      draggedWorktreeIdentity: LOCAL_C.identity,
      selectedWorktreeIdentities: new Set([LOCAL_A.identity, LOCAL_B.identity]),
      surfaceWorktrees: SURFACE
    })

    expect(batch).toEqual([LOCAL_C])
  })

  it('moves only the grabbed worktree when the selection holds just it', () => {
    const batch = resolveWorktreeMultiDragSelection({
      draggedWorktreeId: LOCAL_A.worktreeId,
      draggedWorktreeIdentity: LOCAL_A.identity,
      selectedWorktreeIdentities: new Set([LOCAL_A.identity]),
      surfaceWorktrees: SURFACE
    })

    expect(batch).toEqual([LOCAL_A])
  })

  it('never sweeps in a row of another host that shares the grabbed workspace id', () => {
    // The remote row has the same `worktreeId` but a different identity: a selection of the
    // local rows must not drag it, and grabbing the remote row must not drag the local twins.
    const localBatch = resolveWorktreeMultiDragSelection({
      draggedWorktreeId: LOCAL_A.worktreeId,
      draggedWorktreeIdentity: LOCAL_A.identity,
      selectedWorktreeIdentities: new Set([
        LOCAL_A.identity,
        LOCAL_B.identity,
        LOCAL_C.identity
      ]),
      surfaceWorktrees: SURFACE
    })
    expect(localBatch.map((candidate) => candidate.identity)).not.toContain(REMOTE_A.identity)

    const remoteBatch = resolveWorktreeMultiDragSelection({
      draggedWorktreeId: REMOTE_A.worktreeId,
      draggedWorktreeIdentity: REMOTE_A.identity,
      selectedWorktreeIdentities: new Set([
        LOCAL_A.identity,
        LOCAL_B.identity,
        LOCAL_C.identity
      ]),
      surfaceWorktrees: SURFACE
    })
    expect(remoteBatch).toEqual([REMOTE_A])
  })

  it('resolves the batch in the surface order, not the selection order', () => {
    const batch = resolveWorktreeMultiDragSelection({
      draggedWorktreeId: LOCAL_C.worktreeId,
      draggedWorktreeIdentity: LOCAL_C.identity,
      // Deliberately reversed relative to the painted order.
      selectedWorktreeIdentities: new Set([LOCAL_C.identity, LOCAL_B.identity, LOCAL_A.identity]),
      surfaceWorktrees: SURFACE
    })

    expect(batch.map((candidate) => candidate.identity)).toEqual([
      LOCAL_A.identity,
      LOCAL_B.identity,
      LOCAL_C.identity
    ])
  })

  it('falls back to the grabbed candidate when the surface no longer holds it', () => {
    const goneId = 'repo::gone'
    const goneIdentity = composeWorktreeHostIdentity('local', goneId)
    const batch = resolveWorktreeMultiDragSelection({
      draggedWorktreeId: goneId,
      draggedWorktreeIdentity: goneIdentity,
      selectedWorktreeIdentities: new Set([goneIdentity]),
      surfaceWorktrees: SURFACE
    })

    expect(batch).toEqual([{ worktreeId: goneId, identity: goneIdentity }])
  })

  it('falls back when the gathered selection holds nothing the surface still paints', () => {
    const goneId = 'repo::gone'
    const goneIdentity = composeWorktreeHostIdentity('local', goneId)
    const batch = resolveWorktreeMultiDragSelection({
      draggedWorktreeId: goneId,
      draggedWorktreeIdentity: goneIdentity,
      selectedWorktreeIdentities: new Set([
        goneIdentity,
        composeWorktreeHostIdentity('ssh:host-b', goneId)
      ]),
      surfaceWorktrees: SURFACE
    })

    expect(batch).toEqual([{ worktreeId: goneId, identity: goneIdentity }])
  })
})
