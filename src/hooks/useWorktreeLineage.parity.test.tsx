import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEGACY_WORKTREE_LINEAGE_KEY } from '../lib/worktree-lineage-persistence'

const invokeMock = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (command: string, args?: unknown) => invokeMock(command, args)
}))

import { useWorktreeLineage } from './useWorktreeLineage'

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: vi.fn((key: string) => values.delete(key))
  }
}

describe('useWorktreeLineage', () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  it('hydrates once from SQLite and renders the persisted map', async () => {
    invokeMock.mockResolvedValue({ '/child': '/parent' })
    const { result } = renderHook(() =>
      useWorktreeLineage({ storage: memoryStorage(), notifyError: vi.fn() })
    )

    await waitFor(() => expect(result.current.hydrationStatus).toBe('ready'))
    expect(result.current.worktreeLineage).toEqual({ '/child': '/parent' })
    expect(invokeMock.mock.calls[0]?.[0]).toBe('get_worktree_lineage')
    expect(invokeMock).toHaveBeenCalledTimes(1)
  })

  it('migrates a legacy localStorage blob when the DB is empty and retires the key', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'get_worktree_lineage') return Promise.resolve({})
      return Promise.resolve(undefined)
    })
    const storage = memoryStorage({
      [LEGACY_WORKTREE_LINEAGE_KEY]: JSON.stringify({ '/legacy': '/parent' })
    })

    const { result } = renderHook(() =>
      useWorktreeLineage({ storage, notifyError: vi.fn() })
    )

    await waitFor(() => expect(result.current.hydrationStatus).toBe('ready'))
    expect(invokeMock).toHaveBeenCalledWith('set_worktree_lineage', {
      childPath: '/legacy',
      parentPath: '/parent'
    })
    expect(storage.removeItem).toHaveBeenCalledWith(LEGACY_WORKTREE_LINEAGE_KEY)
    expect(result.current.worktreeLineage).toEqual({ '/legacy': '/parent' })
  })

  it('keeps the legacy key when the migration write rejects', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'get_worktree_lineage') return Promise.resolve({})
      return Promise.reject(new Error('db locked'))
    })
    const storage = memoryStorage({
      [LEGACY_WORKTREE_LINEAGE_KEY]: JSON.stringify({ '/legacy': '/parent' })
    })

    const { result } = renderHook(() =>
      useWorktreeLineage({ storage, notifyError: vi.fn() })
    )

    await waitFor(() => expect(result.current.hydrationStatus).toBe('ready'))
    expect(storage.removeItem).not.toHaveBeenCalled()
    expect(result.current.worktreeLineage).toEqual({ '/legacy': '/parent' })
  })

  it('rolls back already-migrated edges when a later legacy write rejects', async () => {
    invokeMock.mockImplementation((command: string, args: unknown) => {
      if (command === 'get_worktree_lineage') return Promise.resolve({})
      const change = args as { childPath: string; parentPath: string | null }
      if (change.childPath === '/b') return Promise.reject(new Error('db locked'))
      return Promise.resolve(undefined)
    })
    const storage = memoryStorage({
      [LEGACY_WORKTREE_LINEAGE_KEY]: JSON.stringify({ '/a': '/parent', '/b': '/parent' })
    })

    const { result } = renderHook(() =>
      useWorktreeLineage({ storage, notifyError: vi.fn() })
    )

    await waitFor(() => expect(result.current.hydrationStatus).toBe('ready'))
    const writes = invokeMock.mock.calls.map(([command, args]) => [command, args])
    expect(writes).toContainEqual([
      'set_worktree_lineage',
      { childPath: '/a', parentPath: '/parent' }
    ])
    expect(writes).toContainEqual([
      'set_worktree_lineage',
      { childPath: '/a', parentPath: null }
    ])
    expect(storage.removeItem).not.toHaveBeenCalled()
    expect(result.current.worktreeLineage).toEqual({ '/a': '/parent', '/b': '/parent' })
  })

  it('sets parents optimistically and writes each changed edge', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'get_worktree_lineage') return Promise.resolve({})
      return Promise.resolve(undefined)
    })
    const { result } = renderHook(() =>
      useWorktreeLineage({ storage: memoryStorage(), notifyError: vi.fn() })
    )
    await waitFor(() => expect(result.current.hydrationStatus).toBe('ready'))

    await act(async () => {
      await result.current.setParents(['/a', '/b'], '/parent')
    })

    expect(result.current.worktreeLineage).toEqual({
      '/a': '/parent',
      '/b': '/parent'
    })
    expect(invokeMock).toHaveBeenCalledWith('set_worktree_lineage', {
      childPath: '/a',
      parentPath: '/parent'
    })
    expect(invokeMock).toHaveBeenCalledWith('set_worktree_lineage', {
      childPath: '/b',
      parentPath: '/parent'
    })
  })

  it('clears an edge through the same IPC with parentPath null', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'get_worktree_lineage') {
        return Promise.resolve({ '/child': '/parent', '/kept': '/parent' })
      }
      return Promise.resolve(undefined)
    })
    const { result } = renderHook(() =>
      useWorktreeLineage({ storage: memoryStorage(), notifyError: vi.fn() })
    )
    await waitFor(() => expect(result.current.hydrationStatus).toBe('ready'))

    await act(async () => {
      await result.current.clearParent('/child')
    })

    expect(result.current.worktreeLineage).toEqual({ '/kept': '/parent' })
    expect(invokeMock).toHaveBeenCalledWith('set_worktree_lineage', {
      childPath: '/child',
      parentPath: null
    })
  })

  it('clears a whole unnest batch in one state update', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'get_worktree_lineage') {
        return Promise.resolve({
          '/child-a': '/parent',
          '/child-b': '/parent',
          '/kept': '/parent'
        })
      }
      return Promise.resolve(undefined)
    })
    const { result } = renderHook(() =>
      useWorktreeLineage({ storage: memoryStorage(), notifyError: vi.fn() })
    )
    await waitFor(() => expect(result.current.hydrationStatus).toBe('ready'))

    await act(async () => {
      await result.current.clearParents(['/child-a', '/child-b'])
    })

    expect(result.current.worktreeLineage).toEqual({ '/kept': '/parent' })
    expect(invokeMock).toHaveBeenCalledWith('set_worktree_lineage', {
      childPath: '/child-a',
      parentPath: null
    })
    expect(invokeMock).toHaveBeenCalledWith('set_worktree_lineage', {
      childPath: '/child-b',
      parentPath: null
    })
  })

  it('rolls back only unpersisted edges and reports one toast on rejection', async () => {
    const notifyError = vi.fn()
    invokeMock.mockImplementation((command: string, args: unknown) => {
      if (command === 'get_worktree_lineage') {
        return Promise.resolve({ '/kept': '/parent' })
      }
      const change = args as { childPath: string; parentPath: string | null }
      if (change.childPath === '/rejected') return Promise.reject(new Error('disk full'))
      return Promise.resolve(undefined)
    })
    const { result } = renderHook(() =>
      useWorktreeLineage({ storage: memoryStorage(), notifyError })
    )
    await waitFor(() => expect(result.current.hydrationStatus).toBe('ready'))

    await act(async () => {
      await expect(
        result.current.setParents(['/persisted', '/rejected'], '/new-parent')
      ).rejects.toThrow('disk full')
    })

    expect(result.current.worktreeLineage).toEqual({
      // The edge that landed stays; the rejected one reverts.
      '/persisted': '/new-parent',
      '/kept': '/parent'
    })
    expect(notifyError).toHaveBeenCalledTimes(1)
    expect(notifyError).toHaveBeenCalledWith('Failed to save the workspace hierarchy')
  })
})
