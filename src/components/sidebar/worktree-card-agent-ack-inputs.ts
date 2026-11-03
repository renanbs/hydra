import type { AppState } from '@/store/types'

type AcknowledgedAgentTimesState = Pick<AppState, 'acknowledgedAgentsByPaneKey'>

/** Projects ONLY the acknowledgement timestamps rendered by one card.
 *
 *  The acknowledgement map is written app-globally on every agent action, so a
 *  card that subscribed to it directly would re-render on unrelated worktrees'
 *  activity. Selecting this card's timestamps — in row order — keeps the value
 *  reference stable across those writes. */
export function selectAcknowledgedAgentTimes(
  state: AcknowledgedAgentTimesState,
  agents: readonly { paneKey: string }[]
): number[] {
  return agents.map((agent) => state.acknowledgedAgentsByPaneKey[agent.paneKey] ?? 0)
}
