// Hydra's store slices were ported from Orca, whose renderer reaches host state
// through the preload bridge (`window.api`). Hydra has no preload, so the slice
// calls used to be dead at runtime. This shim maps the slice surfaces the sidebar
// actually uses onto Tauri commands — one group at a time, never a blanket stub.
import { invoke } from '@tauri-apps/api/core'
import type {
  CatalogFolderWorkspace,
  NestedRepoImportResult
} from './catalog-types'
import type { FolderWorkspace } from '../shared/folder-workspace-types'
import type {
  ProjectGroup,
  ProjectGroupImportMode,
  ProjectGroupImportResult
} from '../shared/project-group-types'
import {
  addCatalogFolderWorkspace,
  importNestedCatalogRepos
} from './catalog-client'

type FolderWorkspaceCreateArgs = {
  projectGroupId: string
  folderPath?: string | null
  name?: string | null
  connectionId?: string | null
  executionHostId?: string | null
}

type FolderWorkspacesApi = {
  create: (args: FolderWorkspaceCreateArgs) => Promise<FolderWorkspace>
  delete: (args: { folderWorkspaceId: string }) => Promise<boolean>
}

type NestedImportArgs = {
  projectPaths: readonly string[]
  groupName?: string
  mode: ProjectGroupImportMode
}

type ProjectGroupsApi = {
  importNested: (args: NestedImportArgs) => Promise<ProjectGroupImportResult>
}

type ShimDeps = {
  invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>
  dispatch: (event: Event) => void
  /** Test seam; production uses the typed catalog client. */
  addFolderWorkspace?: typeof addCatalogFolderWorkspace
  /** Test seam; production uses the typed catalog client. */
  importNestedRepos?: typeof importNestedCatalogRepos
}

const REFRESH_EVENT = 'hydra:refresh-projects'

/** Catalog paths compare without trailing/duplicated separators. */
function normalizeCatalogPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '')
}

/** The catalog row is the persisted half; these are the renderer-only defaults. */
function toFolderWorkspace(row: CatalogFolderWorkspace): FolderWorkspace {
  return {
    id: row.id,
    projectGroupId: row.projectGroupId,
    name: row.name,
    folderPath: row.folderPath,
    connectionId: row.connectionId ?? null,
    // The catalog carries the renderer's own stamped id; the browser wrapper
    // cannot re-parse it here, so keep the exact string the host persisted.
    executionHostId: (row.executionHostId as FolderWorkspace['executionHostId']) ?? null,
    linkedTask: null,
    comment: '',
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: row.sortOrder,
    lastActivityAt: row.createdAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Pure factory so the mapping is testable without installing it on a page. */
export function createFolderWorkspacesApi({
  invoke: invokeCommand,
  dispatch,
  addFolderWorkspace = addCatalogFolderWorkspace,
}: ShimDeps): FolderWorkspacesApi {
  return {
    create: async (args) => {
      const folderPath = args.folderPath?.trim()
      if (!folderPath) {
        // Why: the host refuses to invent a directory from a group name alone;
        // say so here instead of surfacing a bare invoke rejection.
        throw new Error('A folder path is required to create a folder workspace.')
      }
      const envelope = await addFolderWorkspace({
        parentPath: folderPath,
        projectGroupId: args.projectGroupId,
        name: args.name ?? null,
        connectionId: args.connectionId ?? null,
        executionHostId: args.executionHostId ?? null,
      })
      dispatch(new CustomEvent(REFRESH_EVENT))
      const normalized = normalizeCatalogPath(folderPath)
      const row = (envelope.folderWorkspaces ?? []).find(
        (workspace) =>
          workspace.projectGroupId === args.projectGroupId &&
          normalizeCatalogPath(workspace.folderPath) === normalized
      )
      if (!row) {
        // Why: reporting a workspace the catalog never persisted would let the
        // optimistic list show a row the next catalog read removes.
        throw new Error('The catalog did not return the created folder workspace.')
      }
      return toFolderWorkspace(row)
    },
    delete: async ({ folderWorkspaceId }) => {
      await invokeCommand('catalog_remove_folder_workspace', { folderWorkspaceId })
      dispatch(new CustomEvent(REFRESH_EVENT))
      return true
    },
  }
}

/**
 * The catalog result → the sidebar's import result. Shared with the Add Project
 * dialog so both callers report the same `imported`/`already-known` split.
 */
export function toProjectGroupImportResult(
  result: NestedRepoImportResult
): ProjectGroupImportResult {
  return {
    // The Rust group is the catalog row (camelCase), which is exactly the
    // ProjectGroup wire shape; createdFrom is a string union there.
    ...(result.group
      ? { group: result.group as unknown as ProjectGroup }
      : {}),
    projects: [
      ...result.added.map((path) => ({ path, status: 'imported' as const })),
      ...result.skipped.map((path) => ({ path, status: 'already-known' as const })),
    ],
    importedCount: result.added.length,
    alreadyKnownCount: result.skipped.length,
    failedCount: 0,
  }
}

export function createProjectGroupsApi({
  dispatch,
  importNestedRepos = importNestedCatalogRepos,
}: ShimDeps): ProjectGroupsApi {
  return {
    importNested: async (args) => {
      const result = await importNestedRepos(
        args.projectPaths,
        args.mode === 'group' ? (args.groupName ?? null) : null
      )
      dispatch(new CustomEvent(REFRESH_EVENT))
      return toProjectGroupImportResult(result)
    },
  }
}

let installed = false

export function installOrcaApiShim(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  const target = window as unknown as { api?: Record<string, unknown> }
  const api = target.api ?? {}
  const deps: ShimDeps = {
    invoke,
    dispatch: (event) => window.dispatchEvent(event),
  }
  api.folderWorkspaces = {
    ...((api.folderWorkspaces as Record<string, unknown> | undefined) ?? {}),
    ...createFolderWorkspacesApi(deps),
  } satisfies FolderWorkspacesApi
  api.projectGroups = {
    ...((api.projectGroups as Record<string, unknown> | undefined) ?? {}),
    ...createProjectGroupsApi(deps),
  } satisfies ProjectGroupsApi
  target.api = api
}
