import { describe, expect, it, vi } from 'vitest'
import { createFolderWorkspacesApi } from './orca-api-shim'

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
})
