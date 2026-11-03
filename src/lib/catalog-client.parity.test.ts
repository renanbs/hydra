// Command contracts for the catalog writes the sidebar performs directly (the
// shim factory routes through these wrappers, so the argument names here are the
// host's ABI).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { addCatalogFolderWorkspace, importNestedCatalogRepos } from './catalog-client'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

describe('catalog client writes', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset()
  })

  it('sends the folder workspace create with explicit nulls for absent stamps', async () => {
    vi.mocked(invoke).mockResolvedValue({
      schemaVersion: 1,
      projectGroups: [],
      folderWorkspaces: [],
      repos: [],
    })

    await addCatalogFolderWorkspace({
      parentPath: '/repo/notes',
      projectGroupId: 'grp_1',
    })

    expect(invoke).toHaveBeenCalledWith('catalog_add_folder_workspace', {
      parentPath: '/repo/notes',
      projectGroupId: 'grp_1',
      name: null,
      connectionId: null,
      executionHostId: null,
    })
  })

  it('imports nested repositories in one call and trims the group name', async () => {
    vi.mocked(invoke).mockResolvedValue({ added: ['/a'], skipped: [] })

    await importNestedCatalogRepos(['/a'], '  Workspace  ')

    expect(invoke).toHaveBeenCalledWith('import_nested_repos', {
      paths: ['/a'],
      groupName: 'Workspace',
    })
  })

  it('sends a null group name for a separate import', async () => {
    vi.mocked(invoke).mockResolvedValue({ added: [], skipped: [] })

    await importNestedCatalogRepos(['/a'], '   ')

    expect(invoke).toHaveBeenCalledWith('import_nested_repos', {
      paths: ['/a'],
      groupName: null,
    })
  })
})
