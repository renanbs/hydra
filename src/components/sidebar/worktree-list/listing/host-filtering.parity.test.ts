// Parity guard for Orca `components/sidebar/worktree-list/listing/use-host-visible-scope.ts`:
// the visible host set (plus the paired-device map) narrows the repo, project-group and
// folder-workspace tiers the sidebar paints. The painted list and the Cmd+1–9 order read
// these same helpers, so a scope filter can never renumber a shortcut onto a hidden card.
import { describe, expect, it } from 'vitest'
import {
  ALL_EXECUTION_HOSTS_SCOPE,
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../shared/execution-host'
import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { ProjectGroup } from '../../../../shared/project-group-types'
import type { Repo } from '../../../../shared/repo-types'
import { filterFolderWorkspacesFromOtherDevices } from '../../workspace-creator-visibility'
import {
  filterFolderWorkspacesForVisibleHosts,
  filterProjectGroupsForVisibleHosts,
  filterReposForVisibleHosts,
  getRepoExecutionHostIdForRows,
  getVisibleSidebarHostIdSet
} from './host-filtering'

const LOCAL_ONLY = new Set<ExecutionHostId>([LOCAL_EXECUTION_HOST_ID])
const SSH_SCOPE: ExecutionHostId = 'ssh:build'
const SSH_ONLY = new Set<ExecutionHostId>([SSH_SCOPE])

function repo(
  id: string,
  host?: { connectionId?: string | null; executionHostId?: ExecutionHostId | null }
): Repo {
  return {
    id,
    path: `/repos/${id}`,
    displayName: id,
    badgeColor: '#64748b',
    addedAt: 0,
    ...host
  }
}

function group(
  id: string,
  host?: { connectionId?: string | null; executionHostId?: string | null }
): ProjectGroup {
  return {
    id,
    name: id,
    parentPath: null,
    parentGroupId: null,
    createdFrom: 'manual',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0,
    ...host
  }
}

function folder(
  id: string,
  projectGroupId: string,
  extra: Partial<FolderWorkspace> = {}
): FolderWorkspace {
  return {
    id,
    projectGroupId,
    name: id,
    folderPath: `/clients/${id}`,
    linkedTask: null,
    comment: '',
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    createdAt: 0,
    updatedAt: 0,
    ...extra
  }
}

describe('sidebar host-visible scope (Orca use-host-visible-scope parity)', () => {
  it('derives no host set when neither a scope nor a visible-id list narrows the list', () => {
    expect(getVisibleSidebarHostIdSet(null, ALL_EXECUTION_HOSTS_SCOPE)).toBeNull()
    // A raw `[]` means "no host visible" — callers normalize it to null first
    // (`normalizeVisibleExecutionHostIds`), so the helper itself keeps the empty set.
    expect(getVisibleSidebarHostIdSet([], ALL_EXECUTION_HOSTS_SCOPE)?.size).toBe(0)
  })

  it('narrows the scope to a single host when the workspace scope names one', () => {
    expect(getVisibleSidebarHostIdSet(null, SSH_SCOPE)).toEqual(SSH_ONLY)
    expect(getVisibleSidebarHostIdSet([LOCAL_EXECUTION_HOST_ID, SSH_SCOPE], ALL_EXECUTION_HOSTS_SCOPE)).toEqual(
      new Set<ExecutionHostId>([LOCAL_EXECUTION_HOST_ID, SSH_SCOPE])
    )
  })

  it('leaves repos untouched without a host filter', () => {
    const repos = [repo('local-repo'), repo('ssh-repo', { executionHostId: SSH_SCOPE })]
    expect(filterReposForVisibleHosts(repos, null, LOCAL_EXECUTION_HOST_ID)).toBe(repos)
  })

  it('excludes a repo whose explicit execution host is outside the visible scope', () => {
    const repos = [repo('local-repo'), repo('ssh-repo', { executionHostId: SSH_SCOPE })]
    expect(
      filterReposForVisibleHosts(repos, LOCAL_ONLY, LOCAL_EXECUTION_HOST_ID).map((r) => r.id)
    ).toEqual(['local-repo'])
    expect(
      filterReposForVisibleHosts(repos, SSH_ONLY, LOCAL_EXECUTION_HOST_ID).map((r) => r.id)
    ).toEqual(['ssh-repo'])
  })

  it('treats an unstamped repo as owned by the focused host', () => {
    const repos = [repo('unstamped')]
    expect(getRepoExecutionHostIdForRows(repos[0]!, SSH_SCOPE)).toBe(SSH_SCOPE)
    // The same repo stays visible under the SSH scope and drops under a local-only one.
    expect(filterReposForVisibleHosts(repos, SSH_ONLY, SSH_SCOPE)).toEqual(repos)
    expect(filterReposForVisibleHosts(repos, LOCAL_ONLY, SSH_SCOPE)).toEqual([])
  })

  it('maps a legacy connectionId repo to its SSH execution host', () => {
    const repos = [repo('legacy', { connectionId: 'build' })]
    expect(getRepoExecutionHostIdForRows(repos[0]!, LOCAL_EXECUTION_HOST_ID)).toBe(SSH_SCOPE)
    expect(
      filterReposForVisibleHosts(repos, LOCAL_ONLY, LOCAL_EXECUTION_HOST_ID)
    ).toEqual([])
  })

  it('excludes project groups owned by a host outside the visible scope', () => {
    const groups = [
      group('local-group'),
      group('ssh-group', { executionHostId: SSH_SCOPE }),
      group('ssh-legacy-group', { connectionId: 'build' })
    ]
    expect(
      filterProjectGroupsForVisibleHosts(groups, LOCAL_ONLY, LOCAL_EXECUTION_HOST_ID).map(
        (g) => g.id
      )
    ).toEqual(['local-group'])
  })

  it('treats an unstamped project group as owned by the focused host', () => {
    const groups = [group('unstamped')]
    expect(filterProjectGroupsForVisibleHosts(groups, SSH_ONLY, SSH_SCOPE)).toEqual(groups)
    expect(filterProjectGroupsForVisibleHosts(groups, LOCAL_ONLY, SSH_SCOPE)).toEqual([])
  })

  it('excludes folder workspaces through their own host or their group host', () => {
    const groups = [group('local-group'), group('ssh-group', { executionHostId: SSH_SCOPE })]
    const folders = [
      folder('local-folder', 'local-group'),
      // The folder inherits the group's host when it carries no stamp of its own.
      folder('group-host-folder', 'ssh-group'),
      // An explicit folder stamp wins over the group's.
      folder('explicit-local-folder', 'ssh-group', { executionHostId: LOCAL_EXECUTION_HOST_ID })
    ]

    expect(
      filterFolderWorkspacesForVisibleHosts(folders, groups, LOCAL_ONLY, LOCAL_EXECUTION_HOST_ID).map(
        (w) => w.id
      )
    ).toEqual(['local-folder', 'explicit-local-folder'])
    expect(
      filterFolderWorkspacesForVisibleHosts(folders, groups, null, LOCAL_EXECUTION_HOST_ID)
    ).toBe(folders)
  })

  it('drops folder workspaces created by another paired device', () => {
    const pairedDeviceIdsByEnvironment = new Map([['env-1', 'device-a']])
    const folders = [
      // Created on this host: hidden by the other-device sweep even though it targets env-1.
      folder('host-created', 'grp_1', {
        executionHostId: 'runtime:env-1',
        creatorProvenance: { kind: 'host' }
      }),
      // Created on the paired device that owns env-1: kept.
      folder('own-device-created', 'grp_1', {
        executionHostId: 'runtime:env-1',
        creatorProvenance: { kind: 'paired-device', deviceId: 'device-a' }
      }),
      // A different paired device: filtered.
      folder('other-device-created', 'grp_1', {
        executionHostId: 'runtime:env-1',
        creatorProvenance: { kind: 'paired-device', deviceId: 'device-b' }
      }),
      // No provenance (legacy record): the sweep never guesses.
      folder('legacy-unknown-origin', 'grp_1', { executionHostId: 'runtime:env-1' })
    ]

    expect(
      filterFolderWorkspacesFromOtherDevices(folders, pairedDeviceIdsByEnvironment).map(
        (workspace) => workspace.id
      )
    ).toEqual(['own-device-created', 'legacy-unknown-origin'])
  })

  it('leaves folder workspaces untouched without a paired-device map', () => {
    const folders = [folder('folder-a', 'grp_1', { executionHostId: 'runtime:env-1' })]
    expect(filterFolderWorkspacesFromOtherDevices(folders, new Map())).toEqual(folders)
  })
})
