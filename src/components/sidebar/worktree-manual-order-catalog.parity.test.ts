import { describe, expect, it } from 'vitest'
import type { FolderWorkspace } from '../../shared/folder-workspace-types'
import type { Worktree } from '../../shared/worktree/types'
import { buildWorktreeManualOrderCatalog } from './worktree-manual-order-catalog'

function worktree(
  id: string,
  overrides: Partial<Worktree> = {}
): Worktree {
  return {
    id,
    repoId: 'repo-1',
    path: `/tmp/${id}`,
    head: 'abc123',
    branch: `refs/heads/${id}`,
    isBare: false,
    isMainWorktree: false,
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
    ...overrides
  }
}

function folderWorkspace(
  id: string,
  overrides: Partial<FolderWorkspace> = {}
): FolderWorkspace {
  return {
    id,
    projectGroupId: 'group-1',
    name: id,
    folderPath: `/tmp/folder-${id}`,
    linkedTask: null,
    comment: '',
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    createdAt: 0,
    ...overrides
  } as FolderWorkspace
}

describe('buildWorktreeManualOrderCatalog (D06-020)', () => {
  it('orders by manualOrder descending with a sortOrder fallback', () => {
    const catalog = buildWorktreeManualOrderCatalog({
      worktrees: [
        worktree('low', { manualOrder: 100 }),
        worktree('high', { manualOrder: 500 }),
        worktree('never-dragged', { sortOrder: 300 })
      ],
      folderWorkspaces: []
    })

    // `sortOrder` is the fallback rank, so a never-dragged row still sorts between ranks.
    expect(catalog.orderedIds).toEqual(['high', 'never-dragged', 'low'])
    expect(catalog.rankByWorktreeId.get('high')).toBe(500)
    expect(catalog.rankByWorktreeId.get('low')).toBe(100)
    // No durable rank for the fallback row: its value lives in `sortOrder`.
    expect(catalog.rankByWorktreeId.has('never-dragged')).toBe(false)
  })

  it('combines folder workspaces with git worktrees and excludes archived rows', () => {
    const catalog = buildWorktreeManualOrderCatalog({
      worktrees: [
        worktree('git-a', { manualOrder: 200 }),
        worktree('git-archived', { manualOrder: 900, isArchived: true })
      ],
      folderWorkspaces: [
        folderWorkspace('folder-a', { manualOrder: 400 }),
        folderWorkspace('folder-archived', { manualOrder: 950, isArchived: true })
      ]
    })

    expect(catalog.orderedIds).toEqual(['folder:folder-a', 'git-a'])
    expect(catalog.rankByWorktreeId.get('folder:folder-a')).toBe(400)
    expect(catalog.orderedIds).not.toContain('git-archived')
    expect(catalog.orderedIds).not.toContain('folder:folder-archived')
  })

  it('breaks equal ranks with the sidebar sort label', () => {
    const catalog = buildWorktreeManualOrderCatalog({
      worktrees: [
        worktree('wt-z', { manualOrder: 100, displayName: 'zulu' }),
        worktree('wt-a', { manualOrder: 100, displayName: 'alpha' })
      ],
      folderWorkspaces: []
    })

    expect(catalog.orderedIds).toEqual(['wt-a', 'wt-z'])
  })

  it('keeps one ordered id for a multi-host cluster and only ranks it when every instance agrees', () => {
    const catalog = buildWorktreeManualOrderCatalog({
      worktrees: [
        worktree('shared', { manualOrder: 700, hostId: 'local' }),
        worktree('shared', { manualOrder: 700, hostId: 'ssh:build' }),
        worktree('diverged', { manualOrder: 300, hostId: 'local' }),
        worktree('diverged', { manualOrder: 250, hostId: 'ssh:build' })
      ],
      folderWorkspaces: []
    })

    expect(catalog.orderedIds).toEqual(['shared', 'diverged'])
    expect(catalog.rankByWorktreeId.get('shared')).toBe(700)
    expect(catalog.rankByWorktreeId.has('diverged')).toBe(false)
  })

  it('never ranks a row whose manualOrder is not a finite number', () => {
    const catalog = buildWorktreeManualOrderCatalog({
      worktrees: [
        worktree('infinite', { manualOrder: Number.POSITIVE_INFINITY }),
        worktree('nan', { manualOrder: Number.NaN })
      ],
      folderWorkspaces: []
    })

    expect(catalog.rankByWorktreeId.size).toBe(0)
  })
})
