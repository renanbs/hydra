// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: shared/project-order-manual-default-notice.ts
//
// Why: projects started ordering manually by default. Profiles created after that
// change would see a notice explaining an ordering they never chose, so the notice
// is only for upgraded profiles that had no explicit preference stored yet.

export function resolveProjectOrderManualDefaultNoticeDismissed(args: {
  rawDismissed: unknown
  rawProjectOrderBy: unknown
  isExistingProfile: boolean
}): boolean {
  if (args.rawDismissed === true) {
    return true
  }
  if (!args.isExistingProfile) {
    return true
  }
  // Why: users who already opted into recent ordering keep it without a notice.
  if (args.rawProjectOrderBy === 'recent') {
    return true
  }
  return false
}

export function isExistingPersistedProfile(args: {
  repoCount: number
  onboardingClosedAt?: number | null
  ui: unknown
}): boolean {
  return (
    args.repoCount > 0 ||
    args.onboardingClosedAt != null ||
    (args.ui != null && typeof args.ui === 'object' && Object.keys(args.ui).length > 0)
  )
}
