// Hydra's store slices were ported from Orca, whose renderer reaches host state
// through the preload bridge (`window.api`). Hydra has no preload, so the slice
// calls used to be dead at runtime. This shim maps the slice surfaces the sidebar
// actually uses onto Tauri commands — one group at a time, never a blanket stub.
import { invoke } from '@tauri-apps/api/core'

type FolderWorkspacesApi = {
  delete: (args: { folderWorkspaceId: string }) => Promise<boolean>
}

type ShimDeps = {
  invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>
  dispatch: (event: Event) => void
}

/** Pure factory so the mapping is testable without installing it on a page. */
export function createFolderWorkspacesApi({
  invoke,
  dispatch,
}: ShimDeps): FolderWorkspacesApi {
  return {
    delete: async ({ folderWorkspaceId }) => {
      await invoke('catalog_remove_folder_workspace', { folderWorkspaceId })
      dispatch(new CustomEvent('hydra:refresh-projects'))
      return true
    },
  }
}

let installed = false

export function installOrcaApiShim(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  const target = window as unknown as { api?: Record<string, unknown> }
  const api = target.api ?? {}
  api.folderWorkspaces = {
    ...((api.folderWorkspaces as Record<string, unknown> | undefined) ?? {}),
    ...createFolderWorkspacesApi({
      invoke,
      dispatch: (event) => window.dispatchEvent(event),
    }),
  } satisfies FolderWorkspacesApi
  target.api = api
}
