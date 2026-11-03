import { describe, expect, it, vi } from 'vitest'
import { createFolderWorkspacesApi, createProjectGroupsApi } from './orca-api-shim'

describe('orca api shim (folder workspaces)', () => {
  it('maps delete onto the catalog command and refreshes projects', async () => {
    const invoke = vi.fn().mockResolvedValue({})
    const dispatch = vi.fn()
    const api = createFolderWorkspacesApi({ invoke, dispatch })

    await expect(api.delete({ folderWorkspaceId: 'fw1' })).resolves.toBe(true)
    expect(invoke).toHaveBeenCalledWith('catalog_remove_folder_workspace', {
      folderWorkspaceId: 'fw1',
    })
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect((dispatch.mock.calls[0][0] as Event).type).toBe('hydra:refresh-projects')
  })

  it('propagates a catalog failure instead of reporting success', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('not found'))
    const api = createFolderWorkspacesApi({ invoke, dispatch: vi.fn() })
    await expect(api.delete({ folderWorkspaceId: 'missing' })).rejects.toThrow('not found')
  })

  it('creates the workspace through the catalog and returns the persisted row', async () => {
    const addFolderWorkspace = vi.fn().mockResolvedValue({
      schemaVersion: 1,
      projectGroups: [],
      repos: [],
      folderWorkspaces: [
        {
          id: 'fw_new',
          projectGroupId: 'grp_1',
          name: 'Specs',
          folderPath: '/repo/specs',
          sortOrder: 7,
          createdAt: 100,
          updatedAt: 200,
        },
      ],
    })
    const dispatch = vi.fn()
    const api = createFolderWorkspacesApi({
      invoke: vi.fn(),
      dispatch,
      addFolderWorkspace,
    })

    const workspace = await api.create({
      projectGroupId: 'grp_1',
      folderPath: '/repo/specs/',
      name: 'Specs',
    })

    expect(addFolderWorkspace).toHaveBeenCalledWith({
      parentPath: '/repo/specs/',
      projectGroupId: 'grp_1',
      name: 'Specs',
      connectionId: null,
      executionHostId: null,
    })
    // Renderer-only fields the catalog does not persist start empty.
    expect(workspace).toMatchObject({
      id: 'fw_new',
      projectGroupId: 'grp_1',
      name: 'Specs',
      folderPath: '/repo/specs',
      linkedTask: null,
      comment: '',
      isArchived: false,
      isUnread: false,
      isPinned: false,
      sortOrder: 7,
      createdAt: 100,
      updatedAt: 200,
    })
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('refuses to create without a folder path the host could persist', async () => {
    const addFolderWorkspace = vi.fn()
    const api = createFolderWorkspacesApi({
      invoke: vi.fn(),
      dispatch: vi.fn(),
      addFolderWorkspace,
    })
    await expect(api.create({ projectGroupId: 'grp_1' })).rejects.toThrow(
      'A folder path is required'
    )
    expect(addFolderWorkspace).not.toHaveBeenCalled()
  })

  it('refuses to report a workspace the catalog did not return', async () => {
    const addFolderWorkspace = vi.fn().mockResolvedValue({
      schemaVersion: 1,
      projectGroups: [],
      repos: [],
      folderWorkspaces: [],
    })
    const api = createFolderWorkspacesApi({
      invoke: vi.fn(),
      dispatch: vi.fn(),
      addFolderWorkspace,
    })
    await expect(
      api.create({ projectGroupId: 'grp_1', folderPath: '/repo/specs' })
    ).rejects.toThrow('did not return')
  })
})

describe('orca api shim (nested repository import)', () => {
  it('imports a reviewed selection as one grouped batch', async () => {
    const importNestedRepos = vi.fn().mockResolvedValue({
      group: {
        id: 'grp_9',
        name: 'Workspace',
        parentPath: null,
        parentGroupId: null,
        createdFrom: 'manual',
        tabOrder: 0,
        isCollapsed: false,
        color: null,
        createdAt: 1,
        updatedAt: 1,
      },
      added: ['/repo/a', '/repo/b'],
      skipped: ['/repo/known'],
    })
    const dispatch = vi.fn()
    const api = createProjectGroupsApi({ invoke: vi.fn(), dispatch, importNestedRepos })

    const result = await api.importNested({
      projectPaths: ['/repo/a', '/repo/known', '/repo/b'],
      groupName: 'Workspace',
      mode: 'group',
    })

    expect(importNestedRepos).toHaveBeenCalledWith(
      ['/repo/a', '/repo/known', '/repo/b'],
      'Workspace'
    )
    expect(result.importedCount).toBe(2)
    expect(result.alreadyKnownCount).toBe(1)
    expect(result.failedCount).toBe(0)
    expect(result.projects).toEqual([
      { path: '/repo/a', status: 'imported' },
      { path: '/repo/b', status: 'imported' },
      { path: '/repo/known', status: 'already-known' },
    ])
    expect(result.group?.id).toBe('grp_9')
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('drops the group name for a separate import', async () => {
    const importNestedRepos = vi.fn().mockResolvedValue({ added: ['/repo/a'], skipped: [] })
    const api = createProjectGroupsApi({ invoke: vi.fn(), dispatch: vi.fn(), importNestedRepos })

    const result = await api.importNested({
      projectPaths: ['/repo/a'],
      groupName: 'Ignored',
      mode: 'separate',
    })

    expect(importNestedRepos).toHaveBeenCalledWith(['/repo/a'], null)
    expect(result.group).toBeUndefined()
    expect(result.importedCount).toBe(1)
  })

  it('rejects the batch when the host refuses an invalid path', async () => {
    const importNestedRepos = vi
      .fn()
      .mockRejectedValue(new Error('Not a git repository: /repo/plain'))
    const api = createProjectGroupsApi({ invoke: vi.fn(), dispatch: vi.fn(), importNestedRepos })
    await expect(
      api.importNested({ projectPaths: ['/repo/plain'], mode: 'separate' })
    ).rejects.toThrow('Not a git repository')
  })
})
