// Host-qualified project-group state (D03a-021 / D03a-082 / D03a-087).
// Pins the invariants the App's sidebar-prefs pipeline relies on: legacy flat
// blobs load as the local host, mutations never cross host buckets even when a
// group id repeats, unknown hosts are rejected instead of folding into local
// state, and contained-project removal reports each failed project.
import { describe, expect, it, vi } from 'vitest'
import {
  collectKnownProjectGroupHostIds,
  createProjectGroupInHost,
  deleteProjectGroupInHost,
  flattenProjectGroupHostState,
  mergeProjectGroupCatalogIntoHostState,
  moveProjectToGroupInHost,
  readProjectGroupHostState,
  removeContainedProjectsForGroup,
  renameProjectGroupInHost,
  resolveProjectGroupHost,
  serializeProjectGroupHostState,
  updateProjectGroupOrderInHost
} from './project-group-host-state'
import { LOCAL_EXECUTION_HOST_ID, type ExecutionHostId } from '../shared/execution-host'

const SSH_HOST = 'ssh:build-server' as ExecutionHostId

describe('readProjectGroupHostState', () => {
  it('loads a legacy flat blob into the local host bucket', () => {
    const state = readProjectGroupHostState({
      projectGroups: [
        { id: 'grp_legacy', name: 'Legacy' },
        { id: 'grp_ordered', name: 'Ordered', tabOrder: 10 }
      ],
      projectGroupMap: { repo_a: 'grp_legacy' }
    })

    expect(state.groupsByHost).toEqual({
      local: [
        { id: 'grp_legacy', name: 'Legacy' },
        { id: 'grp_ordered', name: 'Ordered', tabOrder: 10 }
      ]
    })
    expect(state.membershipsByHost).toEqual({ local: { repo_a: 'grp_legacy' } })
  })

  it('keeps buckets keyed by host identity, including the same group id in two buckets', () => {
    const state = readProjectGroupHostState({
      projectGroupsByHost: {
        local: [{ id: 'grp_shared', name: 'Local copy', tabOrder: 1 }],
        [SSH_HOST]: [{ id: 'grp_shared', name: 'Remote copy', tabOrder: 2 }]
      },
      projectGroupMapByHost: {
        local: { repo_local: 'grp_shared' },
        [SSH_HOST]: { repo_remote: 'grp_shared' }
      }
    })

    expect(state.groupsByHost.local?.map((group) => group.name)).toEqual(['Local copy'])
    expect(state.groupsByHost[SSH_HOST]?.map((group) => group.name)).toEqual(['Remote copy'])
    expect(state.membershipsByHost.local).toEqual({ repo_local: 'grp_shared' })
    expect(state.membershipsByHost[SSH_HOST]).toEqual({ repo_remote: 'grp_shared' })
  })

  it('prefers the bucketed local collection over stale flat fields and drops unknown host keys', () => {
    const state = readProjectGroupHostState({
      projectGroups: [{ id: 'grp_stale', name: 'Stale' }],
      projectGroupMap: { repo_stale: 'grp_stale' },
      projectGroupsByHost: {
        local: [{ id: 'grp_fresh', name: 'Fresh' }],
        'not-a-host': [{ id: 'grp_bad', name: 'Bad' }]
      },
      projectGroupMapByHost: {
        local: { repo_fresh: 'grp_fresh' }
      }
    })

    expect(state.groupsByHost.local).toEqual([{ id: 'grp_fresh', name: 'Fresh' }])
    expect(state.groupsByHost['not-a-host']).toBeUndefined()
    expect(state.membershipsByHost.local).toEqual({ repo_fresh: 'grp_fresh' })
  })

  it('prunes memberships that point outside their host bucket', () => {
    const state = readProjectGroupHostState({
      projectGroupsByHost: { local: [{ id: 'grp_local', name: 'Local' }] },
      projectGroupMapByHost: {
        local: { repo_a: 'grp_local', repo_b: 'grp_missing' }
      }
    })

    expect(state.membershipsByHost.local).toEqual({ repo_a: 'grp_local' })
  })

  it('round-trips through the persisted snapshot fields', () => {
    const original = readProjectGroupHostState({
      projectGroupsByHost: {
        local: [{ id: 'grp_local', name: 'Local', tabOrder: 5 }],
        [SSH_HOST]: [{ id: 'grp_remote', name: 'Remote', tabOrder: 6 }]
      },
      projectGroupMapByHost: {
        local: { repo_a: 'grp_local' },
        [SSH_HOST]: { repo_b: 'grp_remote' }
      }
    })
    const persisted = serializeProjectGroupHostState(original)

    expect(readProjectGroupHostState(persisted)).toEqual(original)
  })
})

describe('resolveProjectGroupHost', () => {
  const knownHosts = collectKnownProjectGroupHostIds([{ connectionId: 'build-server' }])

  it('treats an omitted or blank host as the legacy local host', () => {
    expect(resolveProjectGroupHost(undefined, knownHosts)).toEqual({
      ok: true,
      hostId: LOCAL_EXECUTION_HOST_ID
    })
    expect(resolveProjectGroupHost('   ', knownHosts)).toEqual({
      ok: true,
      hostId: LOCAL_EXECUTION_HOST_ID
    })
  })

  it('accepts the local host and a host owned by a repo', () => {
    expect(resolveProjectGroupHost('local', knownHosts)).toEqual({
      ok: true,
      hostId: LOCAL_EXECUTION_HOST_ID
    })
    expect(resolveProjectGroupHost(SSH_HOST, knownHosts)).toEqual({
      ok: true,
      hostId: SSH_HOST
    })
  })

  it('rejects a malformed host id', () => {
    expect(resolveProjectGroupHost('build-server', knownHosts)).toEqual({
      ok: false,
      reason: 'invalid-host'
    })
    expect(resolveProjectGroupHost(42, knownHosts)).toEqual({
      ok: false,
      reason: 'invalid-host'
    })
  })

  it('rejects a remote host Hydra has no repo for instead of touching local state', () => {
    expect(resolveProjectGroupHost('ssh:ghost', knownHosts)).toEqual({
      ok: false,
      reason: 'unknown-host'
    })
  })
})

describe('host-qualified mutations', () => {
  function twoBucketState() {
    return readProjectGroupHostState({
      projectGroupsByHost: {
        local: [
          { id: 'grp_shared', name: 'Local', tabOrder: 10 },
          { id: 'grp_local_two', name: 'Second', tabOrder: 20 }
        ],
        [SSH_HOST]: [
          { id: 'grp_shared', name: 'Remote', tabOrder: 10 },
          { id: 'grp_remote_two', name: 'Remote second', tabOrder: 20 }
        ]
      },
      projectGroupMapByHost: {
        local: { repo_local: 'grp_shared' },
        [SSH_HOST]: { repo_remote: 'grp_shared' }
      }
    })
  }

  it('renames only the addressed host bucket when the id repeats', () => {
    const result = renameProjectGroupInHost(twoBucketState(), {
      hostId: SSH_HOST,
      id: 'grp_shared',
      name: 'Renamed remotely'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.groupsByHost.local?.[0].name).toBe('Local')
    expect(result.state.groupsByHost[SSH_HOST]?.[0].name).toBe('Renamed remotely')
  })

  it('fails the rename when the group belongs to another host bucket', () => {
    const result = renameProjectGroupInHost(twoBucketState(), {
      hostId: LOCAL_EXECUTION_HOST_ID,
      id: 'grp_remote_two',
      name: 'Cross-host rename'
    })

    expect(result).toEqual({ ok: false, reason: 'unknown-group' })
  })

  it('writes the manual tab order inside the addressed bucket and re-sorts only it', () => {
    const before = twoBucketState()
    const result = updateProjectGroupOrderInHost(before, {
      hostId: SSH_HOST,
      id: 'grp_remote_two',
      tabOrder: 5
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.groupsByHost[SSH_HOST]?.map((group) => group.id)).toEqual([
      'grp_remote_two',
      'grp_shared'
    ])
    // The local bucket keeps its own order and the same-named group's rank.
    expect(result.state.groupsByHost.local?.map((group) => group.id)).toEqual([
      'grp_shared',
      'grp_local_two'
    ])
    expect(result.state.groupsByHost.local?.[0].tabOrder).toBe(10)
  })

  it('creates a group in the addressed bucket and maps the project there', () => {
    const result = createProjectGroupInHost(twoBucketState(), {
      hostId: SSH_HOST,
      name: 'New remote group',
      projectId: 'repo_remote_new',
      now: 1234
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.group.id).toBe('grp_1234')
    expect(result.state.groupsByHost[SSH_HOST]?.map((group) => group.id)).toContain('grp_1234')
    expect(result.state.membershipsByHost[SSH_HOST]?.repo_remote_new).toBe('grp_1234')
    expect(result.state.groupsByHost.local?.some((group) => group.id === 'grp_1234')).toBe(false)
  })

  it('moves a project into a group of its own host and deletes only that host group', () => {
    const moved = moveProjectToGroupInHost(twoBucketState(), {
      hostId: SSH_HOST,
      projectId: 'repo_remote_two',
      groupId: 'grp_remote_two'
    })
    expect(moved.ok).toBe(true)
    if (!moved.ok) return
    expect(moved.state.membershipsByHost[SSH_HOST]?.repo_remote_two).toBe('grp_remote_two')
    expect(moved.state.membershipsByHost.local?.repo_remote_two).toBeUndefined()

    const deleted = deleteProjectGroupInHost(moved.state, {
      hostId: SSH_HOST,
      id: 'grp_shared'
    })
    expect(deleted.ok).toBe(true)
    if (!deleted.ok) return
    expect(deleted.deleted).toBe(true)
    expect(deleted.state.groupsByHost[SSH_HOST]?.map((group) => group.id)).toEqual([
      'grp_remote_two'
    ])
    expect(deleted.state.membershipsByHost[SSH_HOST]?.repo_remote).toBeUndefined()
    // Same id on the local host is untouched.
    expect(deleted.state.groupsByHost.local?.map((group) => group.id)).toEqual([
      'grp_shared',
      'grp_local_two'
    ])
    expect(deleted.state.membershipsByHost.local).toEqual({ repo_local: 'grp_shared' })
  })
})

describe('flattenProjectGroupHostState', () => {
  it('stamps every group with its owner host and keeps local memberships first', () => {
    const flat = flattenProjectGroupHostState(
      readProjectGroupHostState({
        projectGroupsByHost: {
          [SSH_HOST]: [{ id: 'grp_remote', name: 'Remote', tabOrder: 0 }],
          local: [{ id: 'grp_local', name: 'Local', tabOrder: 1 }]
        },
        projectGroupMapByHost: {
          [SSH_HOST]: { repo_remote: 'grp_remote', repo_shared: 'grp_remote' },
          local: { repo_shared: 'grp_local' }
        }
      })
    )

    expect(flat.projectGroups.map((group) => `${group.hostId}:${group.id}`)).toEqual([
      `local:grp_local`,
      `${SSH_HOST}:grp_remote`
    ])
    expect(flat.projectGroupMap).toEqual({
      repo_shared: 'grp_local',
      repo_remote: 'grp_remote'
    })
  })
})

describe('mergeProjectGroupCatalogIntoHostState', () => {
  it('keeps App-created groups and the manual order across a catalog refresh', () => {
    const persisted = readProjectGroupHostState({
      projectGroupsByHost: {
        local: [
          { id: 'grp_manual', name: 'Manual', tabOrder: 40 },
          { id: 'grp_folder', name: 'Old folder name', tabOrder: 7 }
        ]
      },
      projectGroupMapByHost: {
        local: { repo_manual: 'grp_manual' }
      }
    })

    const merged = mergeProjectGroupCatalogIntoHostState(persisted, {
      groups: [{ id: 'grp_folder', name: 'Folder scan', tabOrder: 0 }],
      memberships: { repo_folder: 'grp_folder', repo_manual: 'grp_other' }
    })

    expect(merged.groupsByHost.local).toEqual([
      { id: 'grp_folder', name: 'Folder scan', tabOrder: 7 },
      { id: 'grp_manual', name: 'Manual', tabOrder: 40 }
    ])
    // Persisted membership wins; the catalog fills the untouched project.
    expect(merged.membershipsByHost.local).toEqual({
      repo_manual: 'grp_manual',
      repo_folder: 'grp_folder'
    })
  })

  it('places host-stamped catalog rows in their own bucket', () => {
    const merged = mergeProjectGroupCatalogIntoHostState(
      readProjectGroupHostState({}),
      {
        groups: [{ id: 'grp_remote', name: 'Remote catalog', hostId: SSH_HOST }],
        memberships: {}
      }
    )

    expect(merged.groupsByHost[SSH_HOST]).toEqual([{ id: 'grp_remote', name: 'Remote catalog' }])
    expect(merged.groupsByHost.local).toBeUndefined()
  })
})

describe('removeContainedProjectsForGroup', () => {
  it('reports each failed project id and only succeeds when every removal lands', async () => {
    const removeProject = vi.fn(async (project: { id: string; path: string }) => {
      if (project.id === 'repo_b') {
        throw new Error('disk busy')
      }
    })

    const partial = await removeContainedProjectsForGroup({
      hostId: LOCAL_EXECUTION_HOST_ID,
      projects: [
        { id: 'repo_a', path: '/repo/a' },
        { id: 'repo_b', path: '/repo/b' }
      ],
      removeProject
    })

    expect(removeProject).toHaveBeenCalledTimes(2)
    expect(partial).toEqual({
      ok: false,
      removedProjectIds: ['repo_a'],
      failedProjectIds: ['repo_b']
    })

    removeProject.mockImplementation(async () => {})
    const complete = await removeContainedProjectsForGroup({
      hostId: LOCAL_EXECUTION_HOST_ID,
      projects: [{ id: 'repo_a', path: '/repo/a' }],
      removeProject
    })
    expect(complete).toEqual({
      ok: true,
      removedProjectIds: ['repo_a'],
      failedProjectIds: []
    })
  })

  it('fails every project on a remote host instead of running a local removal', async () => {
    const removeProject = vi.fn(async () => {})
    const result = await removeContainedProjectsForGroup({
      hostId: SSH_HOST,
      projects: [
        { id: 'repo_remote_a', path: '/remote/a' },
        { id: 'repo_remote_b', path: '/remote/b' }
      ],
      removeProject
    })

    expect(removeProject).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: false,
      removedProjectIds: [],
      failedProjectIds: ['repo_remote_a', 'repo_remote_b']
    })
  })
})
