// D02a-030: skipping the worktree handoff still reveals the imported project.
import { describe, expect, it, vi, type Mock } from 'vitest'
import { toWorktreeRow } from '../../shared/worktree/worktree-row'
import type { Worktree } from '../../shared/worktree/types'
import {
  finalizeImportedRepoAfterSkip,
  type AddRepoSkipFinalizationState
} from './add-repo-skip-finalization'

const REPO_ID = 'repo_a'

type MockedSkipState = AddRepoSkipFinalizationState & {
  setActiveRepo: Mock
  setShowActiveOnly: Mock
  setHideDefaultBranchWorkspace: Mock
  setAlwaysShowDefaultBranchWorkspace: Mock
  setFilterRepoIds: Mock
}

function mainWorktree(): Worktree {
  return toWorktreeRow(
    { path: '/work/repo_a', head_commit: 'abc1234', branch: 'main', is_bare: false, is_main: true },
    { repoId: REPO_ID, hostId: 'local' }
  ) as Worktree
}

function state(overrides: Partial<AddRepoSkipFinalizationState> = {}): MockedSkipState {
  return {
    activeRepoId: null,
    showActiveOnly: false,
    hideDefaultBranchWorkspace: false,
    showSleepingWorkspaces: true,
    alwaysShowDefaultBranchWorkspace: true,
    worktreesByRepo: {},
    filterRepoIds: [],
    setActiveRepo: vi.fn(),
    setShowActiveOnly: vi.fn(),
    setHideDefaultBranchWorkspace: vi.fn(),
    setAlwaysShowDefaultBranchWorkspace: vi.fn(),
    setFilterRepoIds: vi.fn(),
    ...overrides
  } as MockedSkipState
}

describe('finalizeImportedRepoAfterSkip (D02a-030)', () => {
  it('activates the imported repo and turns off the active-only filter', () => {
    const s = state({ showActiveOnly: true })
    finalizeImportedRepoAfterSkip(s, REPO_ID)
    expect(s.setActiveRepo).toHaveBeenCalledWith(REPO_ID)
    expect(s.setShowActiveOnly).toHaveBeenCalledWith(false)
  })

  it('reveals the imported repo inside an active project filter', () => {
    const s = state({ filterRepoIds: ['repo_other'] })
    finalizeImportedRepoAfterSkip(s, REPO_ID)
    expect(s.setFilterRepoIds).toHaveBeenCalledWith(['repo_other', REPO_ID])
  })

  it('reveals main-branch-only imports instead of leaving them hidden', () => {
    const s = state({
      worktreesByRepo: { [REPO_ID]: [mainWorktree()] },
      hideDefaultBranchWorkspace: true
    })
    finalizeImportedRepoAfterSkip(s, REPO_ID)
    expect(s.setHideDefaultBranchWorkspace).toHaveBeenCalledWith(false)
  })

  it('keeps a live project visible when sleeping workspaces are hidden', () => {
    const s = state({
      worktreesByRepo: { [REPO_ID]: [mainWorktree()] },
      showSleepingWorkspaces: false,
      alwaysShowDefaultBranchWorkspace: false
    })
    finalizeImportedRepoAfterSkip(s, REPO_ID)
    expect(s.setAlwaysShowDefaultBranchWorkspace).toHaveBeenCalledWith(true)
  })

  it('does not touch filters that already admit the imported repo', () => {
    const s = state({ filterRepoIds: [], showActiveOnly: false })
    finalizeImportedRepoAfterSkip(s, REPO_ID)
    expect(s.setFilterRepoIds).not.toHaveBeenCalled()
    expect(s.setShowActiveOnly).not.toHaveBeenCalled()
  })
})
