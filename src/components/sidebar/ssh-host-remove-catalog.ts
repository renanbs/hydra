// Host removal reads workspace ownership from the catalog, not only from the store.
//
// Why: the live store composes no repo ring, so `repos`/`worktreesByRepo` can be empty
// while the sidebar still shows projects on an SSH host. The catalog envelope is the
// projection App renders, so it is the source that can actually name what a host owns;
// store rows (when a projection exists) are merged on top and deduped by path.
import type { CatalogEnvelope } from '../../lib/catalog-types'
import { toSshExecutionHostId } from '../../shared/execution-host'

export type SshHostCatalogRow = {
  /** Catalog row id (repo id or folder-workspace id). */
  id: string
  path: string
  kind: 'repo' | 'folder'
}

/**
 * Rows the catalog assigns to one SSH target.
 *
 * Ownership is the same pair the sidebar scopes on: the legacy `connectionId` stamp and
 * the unified `executionHostId`. A row that carries only the execution stamp still counts,
 * otherwise a host would look empty and its removal would strand the row.
 */
export function selectSshHostCatalogRows(
  envelope: CatalogEnvelope | null,
  targetId: string
): SshHostCatalogRow[] {
  const connectionId = targetId.trim()
  if (!envelope || connectionId === '') {
    return []
  }
  const executionHostId = toSshExecutionHostId(connectionId)
  const rows: SshHostCatalogRow[] = []
  for (const repo of envelope.repos ?? []) {
    const ownsRepo =
      repo.connectionId === connectionId || repo.executionHostId === executionHostId
    if (ownsRepo) {
      rows.push({ id: repo.id, path: repo.path, kind: 'repo' })
    }
  }
  for (const workspace of envelope.folderWorkspaces ?? []) {
    const ownsWorkspace =
      workspace.connectionId === connectionId ||
      workspace.executionHostId === executionHostId
    if (ownsWorkspace) {
      rows.push({ id: workspace.id, path: workspace.folderPath, kind: 'folder' })
    }
  }
  return rows
}

/**
 * Catalog rows not already represented by store rows, so a host with both a store
 * projection and a catalog row is counted and deleted once. Repo roots dedupe by
 * separator-/case-insensitive path against the store repos; folder workspaces and store
 * worktrees are different rows by definition.
 */
export function omitCatalogRowsAlreadyInStore(args: {
  catalogRows: readonly SshHostCatalogRow[]
  storeRepoPaths: readonly string[]
}): SshHostCatalogRow[] {
  const normalize = (path: string): string => {
    let normalized = path.trim().replace(/\\/g, '/').toLowerCase()
    while (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  }
  const repoPaths = new Set(args.storeRepoPaths.map(normalize))
  return args.catalogRows.filter(
    (row) => row.kind !== 'repo' || !repoPaths.has(normalize(row.path))
  )
}
