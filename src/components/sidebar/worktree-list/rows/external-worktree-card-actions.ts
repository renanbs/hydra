// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/imported-worktrees-card-actions.ts +
// components/sidebar/new-external-worktrees-inbox-actions.ts
//
// The per-repo state the two discovered-worktree notice rows surface while their
// inline actions run. Hydra's notice surfaces read the repo phase state from props
// (the parent already owns the mutation), so the list only tracks the action's own
// pending/error state and whether a succeeded `Show` is still waiting for the
// authoritative scan to drop the hidden rows (D03a-054).
import type { ImportedWorktreesCardRow } from '../grouping/row-types'

export type ExternalWorktreeCardActionState = {
  pending: boolean
  error: string | null
  /** A succeeded `Show` whose authoritative refresh has not cleared the row yet. */
  forceVisible?: boolean
}

export const IMPORTED_WORKTREES_SHOW_ERROR = 'Could not show discovered worktrees. Try again.'
export const IMPORTED_WORKTREES_KEEP_HIDDEN_ERROR =
  'Could not keep discovered worktrees hidden. Try again.'
export const EXTERNAL_WORKTREES_IMPORT_ERROR = 'Could not import external worktrees. Try again.'
export const EXTERNAL_WORKTREES_SUPPRESS_ERROR =
  'Could not hide external worktrees permanently. Try again.'

/**
 * `Keep hidden` acknowledges the paths into the inbox baseline, so it can only run
 * while the row still lives in its repo section: the pinned fallback has no baseline
 * group of its own to acknowledge, and a row whose `Show` already succeeded must not
 * re-hide the worktrees the action just revealed.
 */
export function canKeepImportedWorktreesHidden(
  row: ImportedWorktreesCardRow,
  actionState: ExternalWorktreeCardActionState | undefined
): boolean {
  return row.placement === 'repo-group' && actionState?.forceVisible !== true
}

/**
 * Run one notice-row action with the list's per-repo state machine.
 *
 * `action` resolves only after the caller's authoritative refresh confirmed the
 * write — the parent's handlers roll back and reject otherwise — so success here is
 * the confirmation; a rejection paints the row error instead of claiming success.
 */
export async function runExternalWorktreeCardAction(args: {
  setState: (state: ExternalWorktreeCardActionState | null) => void
  action: () => Promise<void>
  errorMessage: string
  /** Keep the row pinned open after success until the authoritative scan lands. */
  keepForceVisible?: boolean
}): Promise<boolean> {
  args.setState({ pending: true, error: null })
  try {
    await args.action()
  } catch (error) {
    console.error(error)
    args.setState({ pending: false, error: args.errorMessage })
    return false
  }
  args.setState(
    args.keepForceVisible === true ? { pending: false, error: null, forceVisible: true } : null
  )
  return true
}
