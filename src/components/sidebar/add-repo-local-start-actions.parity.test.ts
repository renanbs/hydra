// D02a-006: the start screen's primary/secondary action set and remote-first order.
import { describe, expect, it, vi } from 'vitest'
import { getAddRepoLocalStartActions } from './add-repo-local-start-actions'

function actions() {
  return {
    onBrowse: vi.fn(),
    onOpenCloneStep: vi.fn(),
    onOpenRemoteStep: vi.fn(),
    onOpenCreateStep: vi.fn()
  }
}

describe('getAddRepoLocalStartActions (D02a-006)', () => {
  it('keeps Browse primary and puts clone first without SSH targets', () => {
    const { primaryAction, secondaryActions } = getAddRepoLocalStartActions({
      isSshLikely: false,
      ...actions()
    })
    expect(primaryAction.kind).toBe('browse')
    expect(secondaryActions.map((action) => action.kind)).toEqual(['clone', 'remote', 'create'])
  })

  it('orders the SSH entry first when the client already has SSH targets', () => {
    const { secondaryActions } = getAddRepoLocalStartActions({
      isSshLikely: true,
      ...actions()
    })
    expect(secondaryActions.map((action) => action.kind)).toEqual(['remote', 'clone', 'create'])
  })

  it('drops the SSH entry when the surface hides it and disables unsupported create', () => {
    const { secondaryActions } = getAddRepoLocalStartActions({
      isSshLikely: true,
      showRemoteAction: false,
      canCreateProject: false,
      ...actions()
    })
    expect(secondaryActions.map((action) => action.kind)).toEqual(['clone', 'create'])
    expect(secondaryActions[1].disabled).toBe(true)
  })

  it('describes a browse on an SSH or runtime host', () => {
    expect(
      getAddRepoLocalStartActions({ isSshLikely: true, browseHostKind: 'ssh', ...actions() })
        .primaryAction.title
    ).toBe('Open project on SSH host')
    expect(
      getAddRepoLocalStartActions({ isSshLikely: false, browseHostKind: 'runtime', ...actions() })
        .primaryAction.description
    ).toBe('Existing Git repository or folder on this host')
  })
})
