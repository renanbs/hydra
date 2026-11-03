// D02a-037: source-repo mapping is scoped to the folder's host and subtree;
// linked work items convert into the composer's normalized shape.
import { describe, expect, it } from 'vitest'
import { toSshExecutionHostId } from '../../shared/execution-host'
import type { ProjectGroup } from '../../shared/project-group-types'
import type { Repo } from '../../shared/repo-types'
import type { GitHubWorkItem } from '../../shared/github/work-item-types'
import {
  getFolderSourceRepos,
  getFolderWorkspacePrimaryActionLabel,
  getLinkedItemDisplayName,
  getSmartNameSelection,
  toFolderWorkspaceLinkedTask,
  toGitHubLinkedWorkItem
} from './folder-workspace-composer-helpers'

function repo(overrides: Partial<Repo> & Pick<Repo, 'id' | 'path'>): Repo {
  return {
    displayName: overrides.id,
    badgeColor: '#000',
    addedAt: 0,
    kind: 'git',
    ...overrides
  } as Repo
}

function group(overrides: Partial<ProjectGroup> & Pick<ProjectGroup, 'id'>): ProjectGroup {
  return {
    name: overrides.id,
    parentPath: null,
    parentGroupId: null,
    createdFrom: 'folder-scan',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  } as ProjectGroup
}

describe('folder workspace composer helpers (D02a-037)', () => {
  const folderGroup = group({
    id: 'group-root',
    parentPath: '/work/acme',
    executionHostId: 'local'
  })
  const nestedGroup = group({
    id: 'group-nested',
    parentGroupId: 'group-root',
    parentPath: '/work/acme/nested'
  })

  it('keeps only git repos on the folder host inside the group subtree', () => {
    const repos = [
      repo({ id: 'repo_api', path: '/work/acme/api', projectGroupId: 'group-root' }),
      repo({ id: 'repo_web', path: '/work/acme/web', projectGroupId: 'group-nested' }),
      repo({ id: 'repo_outside', path: '/work/other/api' }),
      repo({ id: 'repo_remote', path: '/work/acme/remote', connectionId: 'host-1' }),
      repo({ id: 'repo_folder', path: '/work/acme/docs', kind: 'folder' })
    ]
    expect(
      getFolderSourceRepos(repos, [folderGroup, nestedGroup], folderGroup).map((entry) => entry.id)
    ).toEqual(['repo_api', 'repo_web'])
  })

  it('binds the group execution host to its SSH connection', () => {
    const sshGroup = group({
      id: 'group-ssh',
      parentPath: '/srv/acme',
      connectionId: 'host-1'
    })
    const repos = [
      repo({ id: 'repo_ssh', path: '/srv/acme/api', connectionId: 'host-1' }),
      repo({ id: 'repo_local', path: '/srv/acme/api' })
    ]
    expect(getFolderSourceRepos(repos, [sshGroup], sshGroup).map((entry) => entry.id)).toEqual([
      'repo_ssh'
    ])
    expect(toSshExecutionHostId('host-1')).toBe('ssh:host-1')
  })

  it('returns no repos without a folder-backed group', () => {
    expect(getFolderSourceRepos([], [], null)).toEqual([])
  })

  it('converts a GitHub item into a linked summary and a folder linked task', () => {
    const item: GitHubWorkItem = {
      id: 'gh-42',
      type: 'issue',
      number: 42,
      title: 'Fix login',
      state: 'open',
      url: 'https://github.com/acme/api/issues/42',
      labels: [],
      updatedAt: '2026-01-01T00:00:00Z',
      author: null
    }
    const summary = toGitHubLinkedWorkItem(item)
    expect(summary.provider).toBe('github')
    expect(getLinkedItemDisplayName(summary)).toBe('Fix login')
    const selection = getSmartNameSelection(summary)
    expect(selection?.label).toBe('#42 Fix login')
    expect(toFolderWorkspaceLinkedTask(summary)).toMatchObject({
      provider: 'github',
      number: 42,
      title: 'Fix login'
    })
    expect(toFolderWorkspaceLinkedTask(null)).toBeNull()
  })

  it('exposes the stable primary action label', () => {
    expect(getFolderWorkspacePrimaryActionLabel()).toBe('Create workspace')
  })
})
