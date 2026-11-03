// Orca parity (D04b-003): the local base ref nudge. Orca's worktree create returns
// `localBaseRefUpdateSuggestion` when the checkout landed current but the local base
// branch still trails its upstream. Hydra's create command does not measure that, so
// the renderer derives the same suggestion from the IPC it does have
// (`get_worktree_upstream_status`) and from its own persisted preferences.
import type {
  LocalBaseRefUpdateSuggestion,
  WorktreeBaseStatusKind
} from '../../shared/worktree/base-ref-drift-types'

/** Settings fields the nudge reads and writes (Orca global-settings shape). */
export type LocalBaseRefSuggestionSettings = {
  refreshLocalBaseRefOnWorktreeCreate?: boolean | null
  localBaseRefSuggestionDismissed?: boolean | null
}

/**
 * The local branch a repo's base ref belongs to, with its upstream and lag.
 * `upstream` is Git's own remote-tracking name (`origin/main`), which is exactly
 * what the toast names as the base ref.
 */
export type LocalBaseRefDrift = {
  localBranch: string
  upstream: string | null
  behind: number
  status?: WorktreeBaseStatusKind
}

/**
 * Builds the toast payload, or `undefined` when the nudge must stay quiet.
 *
 * Why all four gates: the nudge is an opt-in invitation, so it is pointless once
 * the user already opted in (`refreshLocalBaseRefOnWorktreeCreate`), declined it
 * (`localBaseRefSuggestionDismissed`), or when the branch is current/gone — a
 * deleted upstream is a repository problem, not a "keep it fresh" moment.
 */
export function buildLocalBaseRefUpdateSuggestion(
  drift: LocalBaseRefDrift | null | undefined,
  settings: LocalBaseRefSuggestionSettings | null | undefined
): LocalBaseRefUpdateSuggestion | undefined {
  if (!drift || !drift.upstream || drift.behind <= 0) {
    return undefined
  }
  if (drift.localBranch.trim() === '') {
    return undefined
  }
  if (settings?.refreshLocalBaseRefOnWorktreeCreate === true) {
    return undefined
  }
  if (settings?.localBaseRefSuggestionDismissed === true) {
    return undefined
  }
  if (drift.status === 'base_changed' || drift.status === 'unknown') {
    return undefined
  }
  return {
    baseRef: drift.upstream,
    localBranch: drift.localBranch,
    behind: drift.behind
  }
}

/**
 * The local branch whose upstream a repo's comparison base names, from a
 * remote-tracking base ref (`origin/main`, `upstream/release/1.2`) or a short
 * branch name. A base ref that is itself a local branch keeps its own name.
 */
export function localBaseBranchFromBaseRef(baseRef: string, fallbackBranch: string): string {
  const trimmed = baseRef.trim()
  if (trimmed === '') {
    return fallbackBranch.trim()
  }
  const slash = trimmed.indexOf('/')
  return slash === -1 ? trimmed : trimmed.slice(slash + 1)
}
