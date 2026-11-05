// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/add-repo-store-upsert.ts
//
// D02a-032: Add Project writes the catalog through IPC, bypassing the repo
// slice action that normally keeps `repos`/`projects`/`projectHostSetups` in
// sync. Host-scoped surfaces (host header removal, project filters) read those
// slices, so the add path must project the catalog row into them atomically.
import { useAppStore } from '../../store'
import { getRepoHostIdentity } from '../../store/slices/repo-host-identity'
import type { Repo } from '../../shared/repo-types'
import { projectHostSetupProjectionFromRepos } from '../../shared/project-host-setup-projection'
import type { CatalogEnvelope } from '../../lib/catalog-types'
import { projectCatalogEnvelope, type CatalogStoreProjection } from '../../lib/catalog-store-projection'
import {
  LOCAL_EXECUTION_HOST_ID,
  toRuntimeExecutionHostId,
  toSshExecutionHostId,
} from '../../shared/execution-host'

export type AddedRepoOwner = {
  runtimeEnvironmentId?: string | null
  sshConnectionId?: string | null
}

/** Applies the owner captured when the add started, never the host that happens
 *  to be focused when its async result lands. */
export function repoWithCapturedOwner(repo: Repo, owner: AddedRepoOwner = {}): Repo {
  const sshConnectionId = owner.sshConnectionId?.trim()
  if (sshConnectionId) {
    return { ...repo, executionHostId: toSshExecutionHostId(sshConnectionId) }
  }
  if (owner.runtimeEnvironmentId !== undefined) {
    const runtimeEnvironmentId = owner.runtimeEnvironmentId?.trim()
    return {
      ...repo,
      executionHostId: runtimeEnvironmentId
        ? toRuntimeExecutionHostId(runtimeEnvironmentId)
        : LOCAL_EXECUTION_HOST_ID,
    }
  }
  return repo
}

export function upsertAddedRepoWithProjectHostSetup(
  repo: Repo,
  owner: AddedRepoOwner = {}
): { alreadyPresent: boolean; repo: Repo } {
  const state = useAppStore.getState()
  const ownedRepo = repoWithCapturedOwner(repo, owner)
  const repoIdentity = getRepoHostIdentity(ownedRepo)
  const alreadyPresent = state.repos.some((entry) => getRepoHostIdentity(entry) === repoIdentity)
  const repos = alreadyPresent
    ? state.repos.map((entry) =>
        getRepoHostIdentity(entry) === repoIdentity ? ownedRepo : entry
      )
    : [...state.repos, ownedRepo]
  const projection = projectHostSetupProjectionFromRepos(repos)

  useAppStore.setState({
    repos,
    projects: projection.projects,
    projectHostSetups: projection.setups,
  })
  return { alreadyPresent, repo: ownedRepo }
}

/** Projects a full catalog read into the three slices at once. */
export function applyCatalogToStore(
  envelope: Pick<CatalogEnvelope, 'repos'> | null | undefined
): CatalogStoreProjection {
  const projection = projectCatalogEnvelope(envelope)
  useAppStore.setState({
    repos: projection.repos,
    projects: projection.projects,
    projectHostSetups: projection.projectHostSetups,
  })
  return projection
}
