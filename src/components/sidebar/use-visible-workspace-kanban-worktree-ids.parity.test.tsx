// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-visible-workspace-kanban-worktree-ids.test.tsx
//
// D15a-012: the board's visible set must be host-qualified. Workspace ids collide
// across hosts, so filtering by id alone would let a visible local row vouch for a
// remote row the user scoped out.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useAppStore } from '@/store'
import { makeWorktree } from '../../store/slices/store-test-helpers'
import type { Repo } from '../../shared/repo-types'
import { getWorktreeHostIdentity } from '../../shared/worktree/host-qualified-identity'
import { useVisibleWorkspaceKanbanWorktreeIds } from './use-visible-workspace-kanban-worktree-ids'

const initialState = useAppStore.getInitialState()

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: 'repo-1',
    path: '/repo',
    displayName: 'Repo',
    badgeColor: '#000000',
    addedAt: 0,
    ...overrides
  }
}

describe('useVisibleWorkspaceKanbanWorktreeIds (D15a-012)', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true)
  })

  afterEach(() => {
    cleanup()
    useAppStore.setState(initialState, true)
  })

  it('keeps a single-host filter host-qualified when workspace ids collide', () => {
    const local = makeWorktree({
      id: 'shared',
      repoId: 'repo-1',
      hostId: 'local',
      path: '/local/shared'
    })
    const ssh = makeWorktree({
      id: 'shared',
      repoId: 'repo-1',
      hostId: 'ssh:box',
      path: '/ssh/shared'
    })
    const repo = makeRepo()
    useAppStore.setState({
      visibleWorkspaceHostIds: ['local'],
      workspaceHostScope: 'all',
      settings: null
    })

    const { result } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({
        allWorktrees: [local, ssh],
        repoMap: new Map([[repo.id, repo]])
      })
    )

    expect(result.current).toEqual(new Set([getWorktreeHostIdentity(local)]))
  })

  it('returns null (no narrowing) when the sidebar shows every host', () => {
    const local = makeWorktree({ id: 'a', repoId: 'repo-1', hostId: 'local' })
    useAppStore.setState({
      visibleWorkspaceHostIds: null,
      workspaceHostScope: 'all',
      settings: null
    })

    const { result } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({
        allWorktrees: [local],
        repoMap: new Map([['repo-1', makeRepo()]])
      })
    )

    expect(result.current).toBeNull()
  })

  it('returns an authoritative empty set when the scoped host owns nothing', () => {
    const ssh = makeWorktree({ id: 'b', repoId: 'repo-1', hostId: 'ssh:box' })
    useAppStore.setState({
      visibleWorkspaceHostIds: ['local'],
      workspaceHostScope: 'all',
      settings: null
    })

    const { result } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({
        allWorktrees: [ssh],
        repoMap: new Map([['repo-1', makeRepo()]])
      })
    )

    expect(result.current).toEqual(new Set())
  })
})
