// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: shared/agent-status-child-work-freshness.ts

/** Child work states the freshness rule understands. Hydra's live subagent
 *  snapshots use the narrower `AgentSubagentState`; `done` and `monitoring`
 *  stay in the union so the ported rule keeps Orca's exact branch shape. */
export type AgentChildWorkState =
  | 'working'
  | 'monitoring'
  | 'waiting'
  | 'blocked'
  | 'done'
  | 'idle'
  | 'unverifiable'

export type AgentChildWorkMembership = 'live' | 'settled'

export type AgentChildWorkFreshnessInput = {
  state: AgentChildWorkState
  membership: AgentChildWorkMembership
  parentEvidenceFresh: boolean
  transportObservation: 'live' | 'unverifiable'
}

/** One decay rule for CLI and structured children; freshness never rewrites settled history. */
export function resolveAgentChildWorkFreshness(
  input: AgentChildWorkFreshnessInput
): AgentChildWorkState {
  if (input.membership === 'settled' || input.state === 'idle' || input.state === 'done') {
    return input.state
  }
  return input.parentEvidenceFresh && input.transportObservation === 'live'
    ? input.state
    : 'unverifiable'
}
