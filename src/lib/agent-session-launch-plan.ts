// Thin Hydra adapter over the ported launch router: the folder composer only
// needs the verdict (route + delivery mode), not Orca's structured settle loop,
// which has no Hydra backend yet.
import type { NativeChatLaunchPromptDelivery } from './native-chat-initial-view-mode'
import { resolveAgentLaunchRoute, type AgentLaunchRoute } from './agent-launch-routing'
import type { TuiAgent } from '../shared/tui-agent'

export type AgentSessionLaunchPlan = {
  route: AgentLaunchRoute
  agent: TuiAgent
  prompt?: string
  promptDelivery?: NativeChatLaunchPromptDelivery
}

export function planAgentSessionLaunch(args: {
  agent: TuiAgent
  executionHostId: string
  workspaceKind: 'folder'
  prompt?: string
  promptDelivery?: NativeChatLaunchPromptDelivery
}): AgentSessionLaunchPlan {
  const route = resolveAgentLaunchRoute({
    agent: args.agent,
    settings: null,
    executionHostId: args.executionHostId,
    hostCapabilities: null,
    workspaceKind: args.workspaceKind,
    promptDelivery: args.promptDelivery,
    launchText: args.prompt,
  })
  return {
    route,
    agent: args.agent,
    ...(args.prompt !== undefined ? { prompt: args.prompt } : {}),
    ...(args.promptDelivery ? { promptDelivery: args.promptDelivery } : {}),
  }
}
