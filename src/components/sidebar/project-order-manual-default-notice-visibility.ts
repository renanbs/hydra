// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/project-order-manual-default-notice-visibility.ts

/**
 * The one-time "projects are ordered manually now" notice.
 *
 * Every term is required: the persisted UI must be hydrated (or the dismissal
 * could flip after the notice painted), the user must not have dismissed it,
 * project grouping is the surface where ordering matters, manual is the new
 * default being explained, and there has to be at least one repo to order.
 */
export function shouldShowProjectOrderManualDefaultNotice(args: {
  persistedUIReady: boolean
  projectOrderManualDefaultNoticeDismissed: boolean
  groupBy: 'none' | 'workspace-status' | 'repo' | 'pr-status'
  projectOrderBy: 'manual' | 'recent'
  repoCount: number
}): boolean {
  return (
    args.persistedUIReady &&
    !args.projectOrderManualDefaultNoticeDismissed &&
    args.groupBy === 'repo' &&
    args.projectOrderBy === 'manual' &&
    args.repoCount > 0
  )
}
