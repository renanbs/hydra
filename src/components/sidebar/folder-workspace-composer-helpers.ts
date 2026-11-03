// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/folder-workspace-composer-helpers.ts
//
// D02a-037: source-repository mapping and linked-work-item conversion for a
// folder-workspace composer. A folder's source repos are the Git repos that
// belong to the same execution host and live under the folder or one of its
// descendant project groups.
import type { LinkedWorkItemSummary } from '../../lib/new-workspace'
import {
  buildGitHubWorkspaceSource,
  buildGitLabWorkspaceSource,
  buildLinearWorkspaceSource,
  buildWorkspaceSourceSelection,
  getWorkspaceSourceProvider,
  type WorkspaceSourceSelection
} from '../../shared/new-workspace/workspace-source'
import { isPathInsideOrEqual } from '../../shared/cross-platform-path'
import {
  getRepoExecutionHostId,
  LOCAL_EXECUTION_HOST_ID,
  normalizeExecutionHostId,
  toSshExecutionHostId,
  type ExecutionHostId
} from '../../shared/execution-host'
import { getProjectGroupSubtreeIds } from '../../shared/project-groups'
import { isGitRepoKind } from '../../shared/repo-kind'
import type { FolderWorkspace } from '../../shared/folder-workspace-types'
import type { GitHubWorkItem } from '../../shared/github/work-item-types'
import type { GitLabWorkItem } from '../../shared/gitlab-types'
import type { LinearIssue } from '../../shared/linear/issue-types'
import type { ProjectGroup } from '../../shared/project-group-types'
import type { Repo } from '../../shared/repo-types'

const EMPTY_REPOS: Repo[] = []

function getProjectGroupExecutionHostId(projectGroup: ProjectGroup): ExecutionHostId {
  const executionHostId = normalizeExecutionHostId(projectGroup.executionHostId)
  if (executionHostId) {
    return executionHostId
  }
  return projectGroup.connectionId
    ? toSshExecutionHostId(projectGroup.connectionId)
    : LOCAL_EXECUTION_HOST_ID
}

export function getFolderSourceRepos(
  repos: readonly Repo[],
  projectGroups: readonly ProjectGroup[],
  projectGroup: ProjectGroup | null
): Repo[] {
  if (!projectGroup?.parentPath) {
    return EMPTY_REPOS
  }
  const folderPath = projectGroup.parentPath
  const groupIds = getProjectGroupSubtreeIds(projectGroups, projectGroup.id)
  const projectGroupHostId = getProjectGroupExecutionHostId(projectGroup)
  return repos.filter(
    (repo) =>
      isGitRepoKind(repo) &&
      getRepoExecutionHostId(repo) === projectGroupHostId &&
      ((typeof repo.projectGroupId === 'string' && groupIds.has(repo.projectGroupId)) ||
        isPathInsideOrEqual(folderPath, repo.path))
  )
}

export function toFolderWorkspaceLinkedTask(
  item: LinkedWorkItemSummary | null
): FolderWorkspace['linkedTask'] {
  if (!item) {
    return null
  }
  return {
    provider: getWorkspaceSourceProvider(item),
    type: item.type,
    number: item.number,
    title: item.title,
    url: item.url,
    ...(item.linearIdentifier ? { linearIdentifier: item.linearIdentifier } : {}),
    ...(item.jiraIdentifier ? { jiraIdentifier: item.jiraIdentifier } : {}),
    ...(item.repoId ? { repoId: item.repoId } : {})
  }
}

export function getSmartNameSelection(
  linkedWorkItem: LinkedWorkItemSummary | null
): WorkspaceSourceSelection | null {
  return buildWorkspaceSourceSelection({ linkedWorkItem })
}

export function getLinkedItemDisplayName(item: LinkedWorkItemSummary): string | null {
  // Hydra's workspace-name resolver is still a port stub, so the display name
  // uses the same fallback Orca applies when no resolved name exists.
  return item.title.trim() || null
}

export function toGitHubLinkedWorkItem(item: GitHubWorkItem): LinkedWorkItemSummary {
  return buildGitHubWorkspaceSource(item)
}

export function toGitLabLinkedWorkItem(item: GitLabWorkItem): LinkedWorkItemSummary {
  return buildGitLabWorkspaceSource(item)
}

export function toLinearLinkedWorkItem(issue: LinearIssue): LinkedWorkItemSummary {
  return buildLinearWorkspaceSource(issue)
}

export function getFolderWorkspacePrimaryActionLabel(): string {
  return 'Create workspace'
}
