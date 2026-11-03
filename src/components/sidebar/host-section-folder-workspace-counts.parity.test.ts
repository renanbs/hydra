// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/host-section-folder-workspace-counts.test.ts
//
// D15a-007: a host section header's count must include folder workspaces, both
// when they paint as their own row and when a collapsed lane carries them only
// in its host counts. Missing either path shows a header that undercounts.
import { describe, expect, it } from 'vitest'
import { makeWorktree } from '../../store/slices/store-test-helpers'
import type { FolderWorkspace } from '../../shared/folder-workspace-types'
import type { ProjectGroup } from '../../shared/project-group-types'
import type { Repo } from '../../shared/repo-types'
import type { Row } from './worktree-list/grouping/row-types'
import { addHostSectionRows, type HostSectionOption } from './host-section-rows'

const LOCAL_REPO: Repo = {
  id: 'local-repo',
  path: '/local-repo',
  displayName: 'Local',
  badgeColor: '#000000',
  addedAt: 0
}

const LOCAL_WORKTREE = makeWorktree({
  id: 'local-worktree',
  repoId: LOCAL_REPO.id,
  path: '/local-repo/worktree',
  displayName: 'Local worktree'
})

const HOSTS: HostSectionOption[] = [
  { id: 'local', kind: 'local', label: 'Local', detail: 'This computer', health: 'local' },
  { id: 'ssh:builder', kind: 'ssh', label: 'Builder', detail: 'SSH', health: 'available' }
]

const LOCAL_ROW: Extract<Row, { type: 'item' }> = {
  type: 'item',
  rowKey: 'local-worktree',
  sectionKey: 'all',
  worktree: LOCAL_WORKTREE,
  repo: LOCAL_REPO,
  depth: 0,
  groupDepth: 0,
  lineageTrail: [],
  isLastLineageChild: true,
  lineageChildCount: 0
}

const PROJECT_GROUP: ProjectGroup = {
  id: 'group-1',
  name: 'Remote folder',
  parentPath: '/srv/project',
  connectionId: 'builder',
  parentGroupId: null,
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 1,
  updatedAt: 1
}

const FOLDER_WORKSPACE: FolderWorkspace = {
  id: 'folder-1',
  projectGroupId: PROJECT_GROUP.id,
  name: 'Remote folder workspace',
  folderPath: '/srv/project',
  connectionId: 'builder',
  linkedTask: null,
  comment: '',
  isArchived: false,
  isUnread: false,
  isPinned: false,
  sortOrder: 0,
  lastActivityAt: 1,
  createdAt: 1,
  updatedAt: 1
}

const FOLDER_ROW: Extract<Row, { type: 'folder-workspace' }> = {
  type: 'folder-workspace',
  key: 'folder-workspace:folder-1',
  folderWorkspace: FOLDER_WORKSPACE,
  projectGroup: PROJECT_GROUP,
  depth: 0,
  groupDepth: 0
}

function hostCounts(rows: readonly Row[]) {
  return addHostSectionRows({
    rows,
    hostOptions: HOSTS,
    workspaceHostScope: 'all',
    defaultHostId: 'local'
  })
    .filter((row) => row.type === 'host-header')
    .map(({ hostId, count }) => ({ hostId, count }))
}

describe('folder workspace host counts (D15a-007)', () => {
  it('counts an expanded folder workspace row', () => {
    expect(hostCounts([LOCAL_ROW, FOLDER_ROW])).toEqual([
      { hostId: 'local', count: 1 },
      { hostId: 'ssh:builder', count: 1 }
    ])
  })

  it('counts a collapsed folder-only lane from its header', () => {
    const collapsedLane: Extract<Row, { type: 'header' }> = {
      type: 'header',
      key: 'workspace-status:in-progress',
      label: 'In progress',
      count: 1,
      tone: 'text-foreground',
      hostWorktreeCounts: new Map([['ssh:builder', 1]]),
      hostWorktreeIds: new Map([['ssh:builder', []]])
    }

    expect(hostCounts([collapsedLane, LOCAL_ROW])).toEqual([
      { hostId: 'local', count: 1 },
      { hostId: 'ssh:builder', count: 1 }
    ])
  })
})
