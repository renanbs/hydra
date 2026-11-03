// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/use-worktree-meta-workspace.ts
//
// Resolves the workspace the metadata dialog edits and the link state it seeds
// from. Link state is read from the store rather than threaded through props — a
// call site that forgot a field would otherwise seed an empty value and silently
// destroy the link on save.
import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { findIndexedWorktreeOwner } from '@/lib/worktree-runtime-owner-index'
import type { FolderWorkspace } from '@/shared/folder-workspace-types'
import { folderWorkspaceToWorktree } from '@/shared/folder-workspace-worktree'
import type { ExecutionHostId } from '@/shared/execution-host'
import type { IssueLinkProvider } from '@/shared/issue-link-input'
import { parseWorkspaceKey } from '@/shared/workspace-scope'
import type { Worktree } from '@/shared/worktree/types'

/** The link state as it stands now, for save-time displacement decisions. */
export type WorktreeMetaLiveLinks = {
  linkedPR: number | null
  linkedIssue: number | null
  linkedLinearIssue: string | null
  linkedLinearIssueOrganizationUrlKey: string | null
  linkedWorkItemProvider: string | null
  linkedWorkItemType: string | null
}

export type WorktreeMetaWorkspace = {
  worktree: Worktree | undefined
  linkedIssue: number | null
  linkedLinearIssue: string | null
  /** The persisted value and its provider, from one source so they cannot drift. */
  currentIssue: string
  currentProvider: IssueLinkProvider
  isFolderWorkspace: boolean
  liveLinks: WorktreeMetaLiveLinks
}

const EMPTY_LIVE_LINKS: WorktreeMetaLiveLinks = {
  linkedPR: null,
  linkedIssue: null,
  linkedLinearIssue: null,
  linkedLinearIssueOrganizationUrlKey: null,
  linkedWorkItemProvider: null,
  linkedWorkItemType: null,
}

/**
 * Resolves a workspace by id across the owner repo, the multi-host owner index
 * and the folder-workspace catalog.
 *
 * `ownerRepoId` matters because the same workspace id can exist under two hosts;
 * the owner index reports that as ambiguous rather than guessing, while the row
 * that opened the dialog knows which one it is.
 */
export function useWorktreeMetaWorkspace(args: {
  worktreeId: string
  /** The repo bucket the opening row belongs to, when it knows. */
  ownerRepoId?: string | null
  executionHostId?: ExecutionHostId
}): WorktreeMetaWorkspace {
  const { worktreeId, ownerRepoId, executionHostId } = args
  const workspaceScope = useMemo(() => parseWorkspaceKey(worktreeId), [worktreeId])
  const indexedWorktree = useAppStore((state) => {
    const scoped = ownerRepoId
      ? state.worktreesByRepo[ownerRepoId]?.find(
          (item) => item.id === worktreeId && (!executionHostId || item.hostId === executionHostId)
        )
      : undefined
    if (scoped) {
      return scoped
    }
    const owner = findIndexedWorktreeOwner(state.worktreesByRepo, worktreeId)
    return owner
      ? state.worktreesByRepo[owner.repoId]?.find((item) => item.id === worktreeId)
      : undefined
  })
  // Why: folder workspaces are absent from `worktreesByRepo`, so the lookup above
  // returns undefined and the dialog renders blank for them. The selector returns
  // the stored record — a stable reference — and the projection happens outside
  // it, because a selector that built the object would return a fresh identity on
  // every store write and re-render the dialog continuously.
  const folderWorkspace = useAppStore((state) => {
    if (workspaceScope?.type !== 'folder') {
      return null
    }
    const catalog = (state.folderWorkspaces ?? []) as readonly FolderWorkspace[]
    return catalog.find((item) => item.id === workspaceScope.folderWorkspaceId) ?? null
  })
  const worktree = useMemo(
    () => (folderWorkspace ? folderWorkspaceToWorktree(folderWorkspace) : indexedWorktree),
    [folderWorkspace, indexedWorktree]
  )
  const linkedIssue = worktree?.linkedIssue ?? null
  const linkedLinearIssue = worktree?.linkedLinearIssue ?? null
  // Why: `typeof` rather than a null check — an unhydrated projection can leave
  // linkedIssue undefined, which `!== null` would read as a GitHub link.
  const currentProvider: IssueLinkProvider =
    typeof linkedIssue === 'number' ? 'github' : linkedLinearIssue ? 'linear' : 'github'
  const currentIssue =
    currentProvider === 'linear'
      ? (linkedLinearIssue ?? '')
      : typeof linkedIssue === 'number'
        ? String(linkedIssue)
        : ''
  const liveLinks = useMemo<WorktreeMetaLiveLinks>(
    () =>
      worktree
        ? {
            linkedPR: worktree.linkedPR ?? null,
            linkedIssue,
            linkedLinearIssue,
            linkedLinearIssueOrganizationUrlKey:
              worktree.linkedLinearIssueOrganizationUrlKey ?? null,
            linkedWorkItemProvider: worktree.linkedWorkItem?.provider ?? null,
            linkedWorkItemType: worktree.linkedWorkItem?.type ?? null,
          }
        : EMPTY_LIVE_LINKS,
    [
      linkedIssue,
      linkedLinearIssue,
      worktree,
    ]
  )

  return {
    worktree,
    linkedIssue,
    linkedLinearIssue,
    currentIssue,
    currentProvider,
    // Why: folder workspaces persist links only through their creation-time
    // linkedTask; updateWorktreeMeta drops link keys for them entirely.
    isFolderWorkspace: workspaceScope?.type === 'folder',
    liveLinks,
  }
}
