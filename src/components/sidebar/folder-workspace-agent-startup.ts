// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/folder-workspace-agent-startup.ts
//
// D02a-035: a folder workspace launches an agent with the task context already in
// the draft. Platform selection matters because quoting differs: an SSH host with
// a Windows path needs win32 quoting, and a WSL UNC path must launch as Linux.
import type { LinkedWorkItemSummary } from '../../lib/new-workspace'
import { resolveQuickCreateLinkedWorkItemPrompt } from '../../lib/linked-work-item-context'
import {
  buildAgentDraftLaunchPlan,
  buildAgentStartupPlan,
  type AgentStartupPlan
} from '../../lib/tui-agent-startup'
import { isWindowsAbsolutePathLike } from '../../shared/cross-platform-path'
import { isWslUncPath } from '../../shared/wsl-paths'
import type { ProjectGroup } from '../../shared/project-group-types'
import type { TuiAgent } from '../../shared/tui-agent'
import type { AgentStartupShell } from '../../shared/tui-agent-startup-shell'
import type { SessionOptionValue } from '../../shared/native-chat-session-options'

export function getFolderWorkspaceAgentLaunchPlatform(
  projectGroup: Pick<ProjectGroup, 'connectionId' | 'parentPath'>
): NodeJS.Platform {
  const parentPath = projectGroup.parentPath?.trim() ?? ''
  if (projectGroup.connectionId) {
    return isWindowsAbsolutePathLike(parentPath) ? 'win32' : 'linux'
  }
  return parentPath && isWslUncPath(parentPath) ? 'linux' : getClientPlatform()
}

/**
 * Same detection as `lib/new-workspace`'s CLIENT_PLATFORM, duplicated here so the
 * folder composer does not pull the terminal bootstrap chain into its module graph.
 */
function getClientPlatform(): NodeJS.Platform {
  const userAgent =
    typeof navigator === 'undefined' ? '' : `${navigator.userAgent} ${navigator.platform ?? ''}`
  if (userAgent.includes('Windows')) return 'win32'
  if (userAgent.includes('Mac')) return 'darwin'
  return 'linux'
}

/** Context that should appear in the agent input without submitting it. */
export function resolveFolderWorkspaceLaunchDraft(
  linkedWorkItem: LinkedWorkItemSummary,
  note: string
): string | null {
  const { prompt, draftPrompt } = resolveQuickCreateLinkedWorkItemPrompt(linkedWorkItem, note)
  return (draftPrompt ?? prompt.trim()) || null
}

export function buildFolderWorkspaceLinkedStartupPlan(args: {
  agent: TuiAgent
  linkedWorkItem: LinkedWorkItemSummary
  note: string
  agentCmdOverrides: Partial<Record<TuiAgent, string>> | undefined
  agentArgs?: string | null
  agentEnv?: Record<string, string>
  sessionOptions?: Record<string, SessionOptionValue>
  platform: NodeJS.Platform
  shell?: AgentStartupShell
  isRemote: boolean
}): AgentStartupPlan | null {
  const linkedDraftPrompt = resolveFolderWorkspaceLaunchDraft(args.linkedWorkItem, args.note)
  const draftLaunchPlan = linkedDraftPrompt
    ? buildAgentDraftLaunchPlan({
        agent: args.agent,
        draft: linkedDraftPrompt,
        cmdOverrides: args.agentCmdOverrides ?? {},
        agentArgs: args.agentArgs,
        agentEnv: args.agentEnv,
        sessionOptions: args.sessionOptions,
        platform: args.platform,
        shell: args.shell,
        isRemote: args.isRemote
      })
    : null
  if (draftLaunchPlan) {
    return {
      agent: draftLaunchPlan.agent,
      launchCommand: draftLaunchPlan.launchCommand,
      expectedProcess: draftLaunchPlan.expectedProcess,
      followupPrompt: null,
      launchConfig: draftLaunchPlan.launchConfig,
      ...(draftLaunchPlan.sessionOptions ? { sessionOptions: draftLaunchPlan.sessionOptions } : {}),
      ...(draftLaunchPlan.startupCommandDelivery
        ? { startupCommandDelivery: draftLaunchPlan.startupCommandDelivery }
        : {}),
      ...(draftLaunchPlan.env ? { env: draftLaunchPlan.env } : {})
    }
  }

  const startupPlan = buildAgentStartupPlan({
    agent: args.agent,
    // Why: linked context must stay reviewable; launch empty, then paste the draft after readiness.
    prompt: '',
    cmdOverrides: args.agentCmdOverrides ?? {},
    agentArgs: args.agentArgs,
    agentEnv: args.agentEnv,
    sessionOptions: args.sessionOptions,
    platform: args.platform,
    shell: args.shell,
    isRemote: args.isRemote,
    allowEmptyPromptLaunch: true
  })
  if (startupPlan && linkedDraftPrompt) {
    startupPlan.draftPrompt = linkedDraftPrompt
  }
  return startupPlan
}
