// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: lib/agent-trust-preflight.ts
//
// D02a-034: trust-gated agents consume the first bracketed paste as menu input,
// so a folder launch must pre-approve the workspace before delivering a draft.
// The Host bridge is optional here: Hydra ships no trust store yet, and this
// stays a silent best-effort like Orca's own failure path.
import { TUI_AGENT_CONFIG } from '../shared/tui-agent-config'
import type { TuiAgent } from '../shared/tui-agent'

type AgentTrustBridge = {
  markTrusted?: (args: {
    preset: string
    workspacePath: string
    connectionId?: string
  }) => Promise<void>
}

function getAgentTrustBridge(): AgentTrustBridge | undefined {
  if (typeof window === 'undefined' || !('api' in window)) {
    return undefined
  }
  const api: unknown = window.api
  if (!api || typeof api !== 'object' || !('agentTrust' in api)) {
    return undefined
  }
  const agentTrust: unknown = api.agentTrust
  if (!agentTrust || typeof agentTrust !== 'object') {
    return undefined
  }
  return 'markTrusted' in agentTrust && typeof agentTrust.markTrusted === 'function'
    ? (agentTrust as AgentTrustBridge)
    : undefined
}

export async function preflightAgentTrust(args: {
  agent: TuiAgent | null | undefined
  workspacePath: string | null | undefined
  connectionId?: string | null
}): Promise<void> {
  if (!args.agent || !args.workspacePath || typeof window === 'undefined') {
    return
  }
  const bridge = getAgentTrustBridge()
  if (!bridge?.markTrusted) {
    return
  }
  const preset = TUI_AGENT_CONFIG[args.agent].preflightTrust
  if (!preset) {
    return
  }
  try {
    await bridge.markTrusted({
      preset,
      workspacePath: args.workspacePath,
      ...(args.connectionId ? { connectionId: args.connectionId } : {}),
    })
  } catch {
    // Best effort: the user can still dismiss the trust prompt manually.
  }
}
