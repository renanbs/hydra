// Ported from Orca (src/renderer/src/store/slices/ui/ui-slice-agent-notification-acknowledgement.ts).
//
// Orca also exports `resolvePaneKeyWorktreeIdFromTabs` + `collectAcknowledgedAgentNotificationId`
// here, but both exist only to feed the renderer notification dismissal
// (`window.api.notifications.dismiss`) that `createUiActivityActions` performs. Hydra's
// store has no notification transport (see ui-slice-activity-actions.ts), so those two
// are deliberately left out instead of shipping dead helpers.

export function latestAgentTurnTimestamp(entry: {
  stateStartedAt?: number
  stateHistory?: { startedAt?: number }[]
}): number {
  let latest = usableTimestamp(entry.stateStartedAt)
  // Why history too: Activity renders one event per stateHistory entry, each with its own unread check.
  for (const history of entry.stateHistory ?? []) {
    latest = Math.max(latest, usableTimestamp(history.startedAt))
  }
  return latest
}

export function usableTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}
