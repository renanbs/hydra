// D04a-051/053/069: the card menu's policy model. Orca derives every label and
// gate from `useWorktreeContextMenuModel`; Hydra keeps the same derivations pure so
// the App-owned menu cannot drift from the row shape.
import { describe, expect, it } from 'vitest'

import {
  getWorktreeDeleteMenuLabel,
  getWorktreeDeleteMenuState,
  getWorktreeRemoteWebUrls,
  hasAnyContextLineageParent,
  shouldShowSingleContextWorktreeItems,
  shouldShowWorktreeUpdateItem,
} from './worktree-context-menu-model'

describe('worktree context-menu model (Orca parity)', () => {
  it('derives the variable delete label', () => {
    expect(
      getWorktreeDeleteMenuLabel({
        isDeleting: false,
        isMultiContext: false,
        deleteTargetCount: 1,
        lineageDescendantCount: 0,
        removesProject: false,
      })
    ).toBe('Delete')
    expect(
      getWorktreeDeleteMenuLabel({
        isDeleting: false,
        isMultiContext: false,
        deleteTargetCount: 1,
        lineageDescendantCount: 2,
        removesProject: false,
      })
    ).toBe('Delete with Descendants…')
    expect(
      getWorktreeDeleteMenuLabel({
        isDeleting: false,
        isMultiContext: true,
        deleteTargetCount: 3,
        lineageDescendantCount: 0,
        removesProject: false,
      })
    ).toBe('Delete 3 Workspaces')
    expect(
      getWorktreeDeleteMenuLabel({
        isDeleting: false,
        isMultiContext: false,
        deleteTargetCount: 0,
        lineageDescendantCount: 0,
        removesProject: false,
        folderWorkspace: true,
      })
    ).toBe('Remove Workspace')
    expect(
      getWorktreeDeleteMenuLabel({
        isDeleting: false,
        isMultiContext: false,
        deleteTargetCount: 1,
        lineageDescendantCount: 0,
        removesProject: true,
      })
    ).toBe('Remove Project from Hydra')
    expect(
      getWorktreeDeleteMenuLabel({
        isDeleting: true,
        isMultiContext: true,
        deleteTargetCount: 2,
        lineageDescendantCount: 0,
        removesProject: false,
      })
    ).toBe('Deleting…')
  })

  it('disables the delete row while removing and names a missing project', () => {
    const pending = getWorktreeDeleteMenuState({
      isMultiContext: false,
      isDeleting: true,
      isMainWorktree: false,
      removesProject: false,
      repoResolved: true,
      deleteTargetCount: 1,
    })
    expect(pending.disabled).toBe(true)
    expect(pending.label).toBe('Deleting…')

    const missingProject = getWorktreeDeleteMenuState({
      isMultiContext: false,
      isDeleting: false,
      isMainWorktree: true,
      removesProject: false,
      repoResolved: false,
      deleteTargetCount: 1,
    })
    expect(missingProject.disabled).toBe(true)
    expect(missingProject.title).toBe('The project could not be found')

    const deletable = getWorktreeDeleteMenuState({
      isMultiContext: false,
      isDeleting: false,
      isMainWorktree: false,
      removesProject: false,
      repoResolved: true,
      deleteTargetCount: 1,
    })
    expect(deletable).toEqual({ label: 'Delete', disabled: false, title: undefined })
  })

  it('keeps Update and the single-workspace rows out of a batch menu', () => {
    expect(shouldShowWorktreeUpdateItem(false)).toBe(true)
    expect(shouldShowWorktreeUpdateItem(true)).toBe(false)
    expect(shouldShowSingleContextWorktreeItems(false)).toBe(true)
    expect(shouldShowSingleContextWorktreeItems(true)).toBe(false)
  })

  it('detects a parent link in any workspace of the batch', () => {
    expect(hasAnyContextLineageParent(['/a', '/b'], { '/a': null, '/b': '/parent' })).toBe(true)
    expect(hasAnyContextLineageParent(['/a', '/b'], { '/a': null, '/b': undefined })).toBe(false)
  })

  it('builds GitHub URLs without guessing a missing owner/repo', () => {
    const urls = getWorktreeRemoteWebUrls({
      canonicalKey: 'github.com/acme/hydra.git',
      branch: 'feature/menu',
      prNumber: 42,
    })
    expect(urls).toEqual({
      repositoryUrl: 'https://github.com/acme/hydra',
      openBranchUrl: 'https://github.com/acme/hydra/tree/feature%2Fmenu',
      createPullRequestUrl: 'https://github.com/acme/hydra/compare/feature%2Fmenu?expand=1',
      pullRequestUrl: 'https://github.com/acme/hydra/pull/42',
    })

    const noPr = getWorktreeRemoteWebUrls({
      canonicalKey: 'github.com/acme/hydra',
      branch: 'main',
    })
    expect(noPr?.pullRequestUrl).toBeNull()
    expect(noPr?.openBranchUrl).toBe('https://github.com/acme/hydra/tree/main')

    expect(getWorktreeRemoteWebUrls({ canonicalKey: null, branch: 'main' })).toBeNull()
    expect(getWorktreeRemoteWebUrls({ canonicalKey: 'github.com/acme', branch: 'main' })).toBeNull()
  })
})
