// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/worktree-issue-displacement.ts
import type { WorktreeMetadataDraft } from './worktree-metadata-types'

function formatLinkLabel(kind: 'github' | 'linear', value: string): string {
  return kind === 'linear' ? `Linear ${value}` : `GitHub #${value}`
}

/** True when the issue slots differ between the open draft and what is persisted. */
export function isIssueFieldDirty(
  draft: Pick<WorktreeMetadataDraft, 'linkedIssue' | 'linkedLinearIssue'>,
  snapshot: Pick<WorktreeMetadataDraft, 'linkedIssue' | 'linkedLinearIssue'>
): boolean {
  return (
    draft.linkedIssue !== snapshot.linkedIssue ||
    (draft.linkedLinearIssue ?? null) !== (snapshot.linkedLinearIssue ?? null)
  )
}

/**
 * Names the persisted links a save would drop.
 *
 * Why: a workspace tracks one issue at a time. Setting the GitHub slot clears the
 * Linear slot and vice versa, so the dialog must say which link the save removes
 * instead of silently replacing it. An untouched field displaces nothing — the
 * dialog opens focused on Notes, and a save from there must leave links alone.
 */
export function getDisplacedLinkLabels(args: {
  draft: Pick<WorktreeMetadataDraft, 'linkedIssue' | 'linkedLinearIssue'>
  snapshot: Pick<WorktreeMetadataDraft, 'linkedIssue' | 'linkedLinearIssue'>
  isFolderWorkspace: boolean
}): string[] | null {
  const { draft, snapshot, isFolderWorkspace } = args
  if (isFolderWorkspace || !isIssueFieldDirty(draft, snapshot)) {
    return null
  }

  const draftHasGitHub = draft.linkedIssue != null
  const draftHasLinear = Boolean(draft.linkedLinearIssue)
  const displaced: string[] = []
  // Keeping one provider's link drops the other's persisted slot.
  if (draftHasGitHub && !draftHasLinear && snapshot.linkedLinearIssue) {
    displaced.push(formatLinkLabel('linear', snapshot.linkedLinearIssue))
  }
  if (draftHasLinear && !draftHasGitHub && typeof snapshot.linkedIssue === 'number') {
    displaced.push(formatLinkLabel('github', String(snapshot.linkedIssue)))
  }
  // Clearing the whole field drops both slots.
  if (!draftHasGitHub && !draftHasLinear) {
    if (snapshot.linkedLinearIssue) {
      displaced.push(formatLinkLabel('linear', snapshot.linkedLinearIssue))
    }
    if (typeof snapshot.linkedIssue === 'number') {
      displaced.push(formatLinkLabel('github', String(snapshot.linkedIssue)))
    }
  }
  return displaced.length > 0 ? displaced : null
}
