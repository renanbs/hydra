import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useAppStore } from '@/store'
import type { FolderWorkspace } from '@/shared/folder-workspace-types'
import type { Worktree } from '@/shared/worktree/types'
import { useWorktreeMetaWorkspace } from './use-worktree-meta-workspace'

const REPO_ID = 'repo_1'

function worktree(id: string, overrides: Partial<Worktree> = {}): Worktree {
  return {
    id,
    repoId: REPO_ID,
    displayName: id,
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    path: `/repo/hydra/${id}`,
    head: 'abc1234',
    branch: id,
    isBare: false,
    isMainWorktree: false,
    ...overrides,
  }
}

function folderWorkspace(overrides: Partial<FolderWorkspace> = {}): FolderWorkspace {
  return {
    id: 'fw_1',
    projectGroupId: 'group_1',
    name: 'Docs',
    folderPath: '/docs',
    linkedTask: null,
    comment: '',
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

function resetStore(): void {
  useAppStore.setState({ worktreesByRepo: {}, folderWorkspaces: null })
}

describe('useWorktreeMetaWorkspace (Orca parity)', () => {
  beforeEach(resetStore)
  afterEach(() => {
    cleanup()
    resetStore()
  })

  it('resolves the owner repo bucket before the ambiguous owner index', () => {
    const local = worktree('shared', { hostId: 'local', displayName: 'Local row' })
    const ssh = worktree('shared', { hostId: 'ssh:box', displayName: 'SSH row' })
    useAppStore.setState({ worktreesByRepo: { [REPO_ID]: [local, ssh] } })

    const { result } = renderHook(() =>
      useWorktreeMetaWorkspace({
        worktreeId: 'shared',
        ownerRepoId: REPO_ID,
        executionHostId: 'ssh:box',
      })
    )

    expect(result.current.worktree?.displayName).toBe('SSH row')
  })

  it('seeds GitHub links, the live PR and the Linear org key from one source', () => {
    useAppStore.setState({
      worktreesByRepo: {
        [REPO_ID]: [
          worktree('wt', {
            linkedIssue: 42,
            linkedPR: 7,
            linkedLinearIssue: 'ENG-9',
            linkedLinearIssueOrganizationUrlKey: 'acme',
            linkedWorkItem: {
              provider: 'github',
              type: 'issue',
              number: 42,
              title: 'Issue',
              url: 'https://github.com/acme/hydra/issues/42',
            },
          }),
        ],
      },
    })

    const { result } = renderHook(() =>
      useWorktreeMetaWorkspace({ worktreeId: 'wt', ownerRepoId: REPO_ID })
    )

    expect(result.current.currentProvider).toBe('github')
    expect(result.current.currentIssue).toBe('42')
    expect(result.current.linkedLinearIssue).toBe('ENG-9')
    expect(result.current.liveLinks).toEqual({
      linkedPR: 7,
      linkedIssue: 42,
      linkedLinearIssue: 'ENG-9',
      linkedLinearIssueOrganizationUrlKey: 'acme',
      linkedWorkItemProvider: 'github',
      linkedWorkItemType: 'issue',
    })
    expect(result.current.isFolderWorkspace).toBe(false)
  })

  it('reports Linear as the current provider when only a Linear link exists', () => {
    useAppStore.setState({
      worktreesByRepo: { [REPO_ID]: [worktree('wt', { linkedLinearIssue: 'ENG-7' })] },
    })

    const { result } = renderHook(() =>
      useWorktreeMetaWorkspace({ worktreeId: 'wt', ownerRepoId: REPO_ID })
    )

    expect(result.current.currentProvider).toBe('linear')
    expect(result.current.currentIssue).toBe('ENG-7')
    expect(result.current.liveLinks.linkedIssue).toBeNull()
  })

  it('projects folder workspaces from the catalog, links included', () => {
    useAppStore.setState({
      worktreesByRepo: {},
      folderWorkspaces: [
        folderWorkspace({
          linkedTask: {
            provider: 'linear',
            type: 'issue',
            number: 7,
            title: 'Folder task',
            url: 'https://linear.app/acme/issue/ENG-7/x',
            linearIdentifier: 'ENG-7',
          },
        }),
      ],
    })

    const { result } = renderHook(() =>
      useWorktreeMetaWorkspace({ worktreeId: 'folder:fw_1', ownerRepoId: REPO_ID })
    )

    expect(result.current.isFolderWorkspace).toBe(true)
    expect(result.current.worktree?.id).toBe('folder:fw_1')
    expect(result.current.linkedLinearIssue).toBe('ENG-7')
    expect(result.current.currentProvider).toBe('linear')
  })
})
