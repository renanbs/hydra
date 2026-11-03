// Catalog → store projection.
//
// `catalog_get` is the authority for projects, but the sidebar's shared store
// slices (host-scoped filters, removal, worktree ownership) read `repos`,
// `projects` and `projectHostSetups`. App keeps the catalog model in local
// state, so without this projection those slices see an empty store and a
// host-scoped removal cannot find the rows it must prune.
import type { CatalogEnvelope, CatalogRepo } from './catalog-types'
import { DEFAULT_REPO_BADGE_COLOR } from '../shared/constants'
import type { Repo } from '../shared/repo-types'
import { projectHostSetupProjectionFromRepos } from '../shared/project-host-setup-projection'
import type { Project, ProjectHostSetup } from '../shared/project-types'

/** Sidebar project ids are `repo_<catalog id>`; store rows must match or a
 *  removal request built from the sidebar cannot resolve them. */
export function catalogRepoToRepo(row: CatalogRepo): Repo {
  const kind = (row.kind ?? 'git') === 'folder' ? 'folder' : 'git'
  const displayName = row.displayName?.trim() || basename(row.path)
  return {
    id: `repo_${row.id}`,
    path: row.path,
    displayName,
    badgeColor: DEFAULT_REPO_BADGE_COLOR,
    addedAt: row.addedAt,
    kind,
    ...(row.worktreeBasePath ? { worktreeBasePath: row.worktreeBasePath } : {}),
    projectGroupId: row.projectGroupId ?? null,
    connectionId: row.connectionId ?? null,
    executionHostId:
      (row.executionHostId as Repo['executionHostId']) ?? null,
    ...(row.repoIcon ? { repoIcon: row.repoIcon as Repo['repoIcon'] } : {}),
    ...(row.importedExternalWorktreePaths
      ? { importedExternalWorktreePaths: row.importedExternalWorktreePaths }
      : {}),
    ...(row.externalWorktreeDiscoverySuppressedAt != null
      ? { externalWorktreeDiscoverySuppressedAt: row.externalWorktreeDiscoverySuppressedAt }
      : {}),
    ...(row.externalWorktreeInboxBaselinePaths
      ? { externalWorktreeInboxBaselinePaths: row.externalWorktreeInboxBaselinePaths }
      : {}),
    ...(row.externalWorktreeVisibilityPromptDismissedAt != null
      ? {
          externalWorktreeVisibilityPromptDismissedAt:
            row.externalWorktreeVisibilityPromptDismissedAt
        }
      : {}),
    ...(row.externalWorktreeVisibility
      ? { externalWorktreeVisibility: row.externalWorktreeVisibility }
      : {}),
    ...(row.externalWorktreeVisibilityLegacy != null
      ? { externalWorktreeVisibilityLegacy: row.externalWorktreeVisibilityLegacy }
      : {}),
    ...(row.agentWorktreeVisibility
      ? { agentWorktreeVisibility: row.agentWorktreeVisibility }
      : {}),
    ...(row.customWorktreeVisibilitySources
      ? {
          customWorktreeVisibilitySources:
            row.customWorktreeVisibilitySources as Repo['customWorktreeVisibilitySources']
        }
      : {}),
    ...(row.worktreeVisibilitySourcePreferences
      ? {
          worktreeVisibilitySourcePreferences:
            row.worktreeVisibilitySourcePreferences as Repo['worktreeVisibilitySourcePreferences']
        }
      : {}),
  }
}

export function catalogEnvelopeToRepos(
  envelope: Pick<CatalogEnvelope, 'repos'> | null | undefined
): Repo[] {
  return (envelope?.repos ?? []).map(catalogRepoToRepo)
}

/**
 * The compatibility projection the sidebar slices expect: one Project and one
 * ProjectHostSetup per repo row, keyed by the repo id the sidebar already uses.
 */
export type CatalogStoreProjection = {
  repos: Repo[]
  projects: readonly Project[]
  projectHostSetups: readonly ProjectHostSetup[]
}

export function projectCatalogEnvelope(
  envelope: Pick<CatalogEnvelope, 'repos'> | null | undefined
): CatalogStoreProjection {
  const repos = catalogEnvelopeToRepos(envelope)
  try {
    const projection = projectHostSetupProjectionFromRepos(repos)
    return {
      repos,
      projects: projection.projects,
      projectHostSetups: projection.setups,
    }
  } catch {
    // The project/setup projection still imports port stubs in this branch.
    // Repo rows are the real half; leaving the other slices untouched is safer
    // than losing the whole catalog read.
    return { repos, projects: [], projectHostSetups: [] }
  }
}

function basename(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '')
  const segment = trimmed.split(/[\\/]/).pop()
  return segment?.trim() || path
}
