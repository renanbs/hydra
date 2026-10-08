// Ported from Orca (src/renderer/src/store/slices/ui/ui-slice-activity-actions.ts).
//
// Divergence: Orca collects the affected OS-notification ids here and calls
// `window.api.notifications.dismiss(ids)` after the state update. Hydra's store has no
// notification transport (the renderer dispatches notifications from components), so the
// store owns the unread/acknowledged state only and no dismissal is issued.

import type { UISlice, UISliceGet, UISliceSet } from './ui-slice-contract'
import { latestAgentTurnTimestamp, usableTimestamp } from './ui-slice-agent-notification-acknowledgement'

// The composed slice's `set`/`get` are untyped while `UISlice` is an auto-stub, so this
// local view of the state keeps the port's reads checked instead of silently `any`.
type ActivityState = {
  acknowledgedAgentsByPaneKey: Record<string, number>
  unreadAgentCompletionPanes: Record<string, unknown>
  migrationUnsupportedByPtyId: Record<string, { paneKey: string; updatedAt: unknown }>
  agentStatusByPaneKey: Record<
    string,
    { stateStartedAt?: number; stateHistory?: { startedAt?: number }[] }
  >
  retainedAgentsByPaneKey: Record<
    string,
    { entry: { stateStartedAt?: number; stateHistory?: { startedAt?: number }[] } }
  >
  manuallyUnreadTurnsByPaneKey: Record<string, number>
  activityClearedAtByPaneKey: Record<string, number>
}

type ActivityActions = Pick<
  UISlice,
  | 'acknowledgedAgentsByPaneKey'
  | 'acknowledgeAgents'
  | 'unacknowledgeAgents'
  | 'activityClearedAtByPaneKey'
  | 'applyActivityClearedAt'
  | 'manuallyUnreadTurnsByPaneKey'
  | 'clearManuallyUnreadTurns'
>

export function createUiActivityActions(set: UISliceSet, _get: UISliceGet): ActivityActions {
  return {
    acknowledgedAgentsByPaneKey: {},
    acknowledgeAgents: (paneKeys: string[]) => {
      set((s: ActivityState) => {
        if (paneKeys.length === 0) {
          return s
        }
        const now = Date.now()
        const migrationUnsupported = Object.values(s.migrationUnsupportedByPtyId ?? {})
        let next: Record<string, number> | null = null
        let nextUnreadCompletions: Record<string, unknown> | null = null
        for (const key of paneKeys) {
          if (s.unreadAgentCompletionPanes[key]) {
            nextUnreadCompletions = nextUnreadCompletions ?? { ...s.unreadAgentCompletionPanes }
            delete nextUnreadCompletions[key]
          }
          const prev = s.acknowledgedAgentsByPaneKey[key] ?? 0
          let stamp = now
          const liveEntry = s.agentStatusByPaneKey?.[key]
          if (liveEntry) {
            stamp = Math.max(stamp, latestAgentTurnTimestamp(liveEntry))
          }
          const retained = s.retainedAgentsByPaneKey?.[key]
          if (retained) {
            stamp = Math.max(stamp, latestAgentTurnTimestamp(retained.entry))
          }
          for (const unsupported of migrationUnsupported) {
            if (unsupported.paneKey === key) {
              stamp = Math.max(stamp, usableTimestamp(unsupported.updatedAt))
            }
          }
          if (prev < stamp) {
            next = next ?? { ...s.acknowledgedAgentsByPaneKey }
            next[key] = stamp
          }
        }
        let nextManual: Record<string, number> | null = null
        for (const key of paneKeys) {
          if (s.manuallyUnreadTurnsByPaneKey[key] !== undefined) {
            nextManual = nextManual ?? { ...s.manuallyUnreadTurnsByPaneKey }
            delete nextManual[key]
          }
        }
        if (!next && !nextUnreadCompletions && !nextManual) {
          return s
        }
        return {
          ...(next ? { acknowledgedAgentsByPaneKey: next } : {}),
          ...(nextUnreadCompletions ? { unreadAgentCompletionPanes: nextUnreadCompletions } : {}),
          ...(nextManual ? { manuallyUnreadTurnsByPaneKey: nextManual } : {})
        }
      })
    },
    unacknowledgeAgents: (paneKeys: string[]) =>
      set((s: ActivityState) => {
        if (paneKeys.length === 0) {
          return s
        }
        let next: Record<string, number> | null = null
        let nextManual: Record<string, number> | null = null
        for (const key of paneKeys) {
          if (s.acknowledgedAgentsByPaneKey[key] !== undefined) {
            next = next ?? { ...s.acknowledgedAgentsByPaneKey }
            delete next[key]
          }
          const turnTimestamp =
            s.agentStatusByPaneKey?.[key]?.stateStartedAt ??
            s.retainedAgentsByPaneKey?.[key]?.entry.stateStartedAt
          if (turnTimestamp !== undefined && s.manuallyUnreadTurnsByPaneKey[key] !== turnTimestamp) {
            nextManual = nextManual ?? { ...s.manuallyUnreadTurnsByPaneKey }
            nextManual[key] = turnTimestamp
          }
        }
        if (!next && !nextManual) {
          return s
        }
        return {
          ...(next ? { acknowledgedAgentsByPaneKey: next } : {}),
          ...(nextManual ? { manuallyUnreadTurnsByPaneKey: nextManual } : {})
        }
      }),
    manuallyUnreadTurnsByPaneKey: {},
    clearManuallyUnreadTurns: (paneKeys: string[]) =>
      set((s: ActivityState) => {
        let next: Record<string, number> | null = null
        for (const key of paneKeys) {
          if (s.manuallyUnreadTurnsByPaneKey[key] !== undefined) {
            next = next ?? { ...s.manuallyUnreadTurnsByPaneKey }
            delete next[key]
          }
        }
        return next ? { manuallyUnreadTurnsByPaneKey: next } : s
      }),
    activityClearedAtByPaneKey: {},
    applyActivityClearedAt: (patch: Record<string, number | null>) =>
      set((s: ActivityState) => {
        let next: Record<string, number> | null = null
        for (const [key, value] of Object.entries(patch)) {
          const previous = s.activityClearedAtByPaneKey[key]
          if (value === null ? previous === undefined : previous === value) {
            continue
          }
          next = next ?? { ...s.activityClearedAtByPaneKey }
          if (value === null) {
            delete next[key]
          } else {
            next[key] = value
          }
        }
        return next ? { activityClearedAtByPaneKey: next } : s
      })
  }
}
