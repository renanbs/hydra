// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/folder-workspace-composer-submit.ts
//
// D02a-034/035: create a folder workspace with its linked task, then reveal it
// and hand the agent launch plan to the caller. Hydra's terminal transport
// accepts a full launch command, so the ported startup plan is executable
// instead of being display-only.
import { toast } from 'sonner'
import type { LinkedWorkItemSummary } from '../../lib/new-workspace'
import type { FolderWorkspace } from '../../shared/folder-workspace-types'
import type { ProjectGroup } from '../../shared/project-group-types'
import type { SessionOptionValue } from '../../shared/native-chat-session-options'
import type { TaskSourceContext } from '../../shared/task-source-context'
import type { TuiAgent } from '../../shared/tui-agent'
import type { AgentStartupPlan } from '../../lib/tui-agent-startup'
import { buildAgentStartupPlan } from '../../lib/tui-agent-startup'
import { resolveLocalWindowsAgentStartupShell } from '../../shared/windows-terminal-shell'
import { isWorkItemLookupText } from '../../shared/new-workspace/work-item-lookup-text'
import { planAgentSessionLaunch, type AgentSessionLaunchPlan } from '../../lib/agent-session-launch-plan'
import { preflightAgentTrust } from '../../lib/agent-trust-preflight'
import {
  buildFolderWorkspaceLinkedStartupPlan,
  getFolderWorkspaceAgentLaunchPlatform,
  resolveFolderWorkspaceLaunchDraft
} from './folder-workspace-agent-startup'
import {
  getFolderWorkspacePrimaryActionLabel,
  getLinkedItemDisplayName,
  getSmartNameSelection,
  toFolderWorkspaceLinkedTask
} from './folder-workspace-composer-helpers'
import { getNewWorkspaceProjectGroupHostId } from './folder-workspace-composer-helpers'

export type FolderWorkspaceCreateInput = {
  projectGroupId: string
  name: string
  folderPath?: string | null
  connectionId?: string | null
  linkedTask: FolderWorkspace['linkedTask']
  linkedTaskSourceContext?: TaskSourceContext | null
  createdWithAgent?: TuiAgent
  pendingFirstAgentMessageRename?: boolean
}

export type FolderWorkspaceSubmitResult = {
  workspace: FolderWorkspace
  startupPlan: AgentStartupPlan | null
  launchDraftPrompt: string | null
  launchPlan: AgentSessionLaunchPlan | null
}

export type SubmitFolderWorkspaceCreateArgs = {
  projectGroup: Pick<
    ProjectGroup,
    'id' | 'name' | 'parentPath' | 'connectionId' | 'executionHostId'
  >
  name: string
  /** Previous auto-suggested name; a value equal to it counts as auto-managed. */
  lastAutoName: string
  linkedWorkItem: LinkedWorkItemSummary | null
  linkedTaskSourceContext?: TaskSourceContext | null
  note: string
  quickAgent: TuiAgent | null
  autoRenameBranchFromWork: boolean | undefined
  agentCmdOverrides: Partial<Record<TuiAgent, string>> | undefined
  agentArgs?: string | null
  agentEnv?: Record<string, string>
  sessionOptions?: Record<string, SessionOptionValue>
  terminalWindowsShell?: string | null
  runtimeEnvironmentId?: string | null
  createFolderWorkspace: (input: FolderWorkspaceCreateInput) => Promise<FolderWorkspace | null>
  /** Reveals the created workspace; Hydra routes this through App's folder activation. */
  activateFolderWorkspace: (args: {
    workspace: FolderWorkspace
    startupPlan: AgentStartupPlan | null
    launchDraftPrompt: string | null
    launchCanBeStructured: boolean
    runtimeEnvironmentId?: string | null
  }) => void | false
  onOpenChange: (open: boolean) => void
}

/** Orca's primary button copy; exported so the composer never drifts from it. */
export const FOLDER_WORKSPACE_PRIMARY_ACTION_LABEL = getFolderWorkspacePrimaryActionLabel()

/** Linked items name the workspace; a typed custom name always wins. */
export function resolveFolderWorkspaceName(args: {
  name: string
  lastAutoName: string
  linkedWorkItem: LinkedWorkItemSummary | null
  groupName: string
}): string {
  let linkedSelectionLabel: string | null = null
  try {
    linkedSelectionLabel = getSmartNameSelection(args.linkedWorkItem)?.label ?? null
  } catch {
    // Source-selection helpers still import port stubs; the title is enough.
  }
  const linkedName =
    (args.linkedWorkItem ? getLinkedItemDisplayName(args.linkedWorkItem) : null) ??
    linkedSelectionLabel
  let lookupLike = false
  if (args.name.trim() && args.name !== args.lastAutoName) {
    try {
      lookupLike = isWorkItemLookupText(args.name)
    } catch {
      // Parsing helpers still import port stubs; a typed name is simply custom.
    }
  }
  const nameIsAutoManaged = !args.name.trim() || args.name === args.lastAutoName || lookupLike
  if (nameIsAutoManaged && linkedName) {
    return linkedName
  }
  return args.name.trim() || linkedName || `${args.groupName} workspace`
}

export async function submitFolderWorkspaceCreate(
  args: SubmitFolderWorkspaceCreateArgs
): Promise<FolderWorkspaceSubmitResult | null> {
  const workspaceName = resolveFolderWorkspaceName({
    name: args.name,
    lastAutoName: args.lastAutoName,
    linkedWorkItem: args.linkedWorkItem,
    groupName: args.projectGroup.name
  })
  const launchPlatform = getFolderWorkspaceAgentLaunchPlatform(args.projectGroup)
  // Why: an SSH folder group runs the plain relay shim; the Linux-only `orca-ide`
  // rename must not be applied for remote launches.
  const launchIsRemote = Boolean(args.projectGroup.connectionId)
  const launchShell = resolveLocalWindowsAgentStartupShell({
    platform: launchPlatform,
    isRemote: launchIsRemote,
    terminalWindowsShell: args.terminalWindowsShell ?? null
  })
  let startupPlan: AgentStartupPlan | null = null
  try {
    startupPlan =
      args.quickAgent && args.linkedWorkItem
        ? buildFolderWorkspaceLinkedStartupPlan({
            agent: args.quickAgent,
            linkedWorkItem: args.linkedWorkItem,
            note: args.note,
            agentCmdOverrides: args.agentCmdOverrides,
            agentArgs: args.agentArgs,
            agentEnv: args.agentEnv,
            sessionOptions: args.sessionOptions,
            platform: launchPlatform,
            shell: launchShell,
            isRemote: launchIsRemote
          })
        : args.quickAgent
          ? buildAgentStartupPlan({
              agent: args.quickAgent,
              // Why: the prompt is delivered through the launch command, so the
              // plan quotes it for the target platform and shell.
              prompt: args.note,
              cmdOverrides: args.agentCmdOverrides ?? {},
              agentArgs: args.agentArgs,
              agentEnv: args.agentEnv,
              sessionOptions: args.sessionOptions,
              platform: launchPlatform,
              shell: launchShell,
              isRemote: launchIsRemote,
              allowEmptyPromptLaunch: true
            })
          : null
  } catch {
    // `buildAgentStartupPlan` still imports port stubs (quoting/sleeping config);
    // creation must not fail because the launch plan could not be built.
    startupPlan = null
  }
  let launchDraftPrompt: string | null = null
  try {
    launchDraftPrompt =
      args.quickAgent && args.linkedWorkItem
        ? resolveFolderWorkspaceLaunchDraft(args.linkedWorkItem, args.note)
        : null
  } catch {
    launchDraftPrompt = null
  }
  const launchPlan = args.quickAgent
    ? planAgentSessionLaunch({
        agent: args.quickAgent,
        executionHostId: getNewWorkspaceProjectGroupHostId(args.projectGroup),
        workspaceKind: 'folder',
        prompt: launchDraftPrompt ?? args.note,
        promptDelivery: launchDraftPrompt ? 'draft' : 'auto-submit'
      })
    : null
  // Structured native chat has no Hydra backend yet; the terminal plan above is
  // the real launch path, so only its initial-surface flag is suppressed.
  const launchCanBeStructured = launchPlan?.route === 'structured-native-chat'
  const pendingFirstAgentMessageRename =
    args.autoRenameBranchFromWork === true &&
    !args.name.trim() &&
    !args.linkedWorkItem &&
    Boolean(args.quickAgent) &&
    args.note.trim().length > 0

  let workspace: FolderWorkspace | null = null
  try {
    workspace = await args.createFolderWorkspace({
      projectGroupId: args.projectGroup.id,
      name: workspaceName,
      folderPath: args.projectGroup.parentPath ?? null,
      connectionId: args.projectGroup.connectionId ?? null,
      linkedTask: toFolderWorkspaceLinkedTask(args.linkedWorkItem),
      ...(args.linkedTaskSourceContext
        ? { linkedTaskSourceContext: args.linkedTaskSourceContext }
        : {}),
      ...(args.quickAgent ? { createdWithAgent: args.quickAgent } : {}),
      ...(pendingFirstAgentMessageRename ? { pendingFirstAgentMessageRename: true } : {})
    })
  } catch (error) {
    toast.error('Could not create the workspace', {
      description: error instanceof Error ? error.message : String(error)
    })
    return null
  }
  if (!workspace) {
    return null
  }

  await preflightAgentTrust({
    agent: args.quickAgent,
    workspacePath: workspace.folderPath,
    connectionId: workspace.connectionId ?? args.projectGroup.connectionId
  })
  if (startupPlan && launchDraftPrompt && !startupPlan.draftPrompt) {
    startupPlan.draftPrompt = launchDraftPrompt
  }

  args.onOpenChange(false)
  try {
    const activation = args.activateFolderWorkspace({
      workspace,
      startupPlan,
      launchDraftPrompt,
      launchCanBeStructured,
      runtimeEnvironmentId: args.runtimeEnvironmentId ?? null
    })
    if (activation === false) {
      toast.error('Workspace created, but it could not be opened', {
        description: workspace.name
      })
    }
  } catch (error) {
    // Why: creation already succeeded; a failed reveal must not report the
    // workspace as missing or leave the composer looking unsubmitted.
    console.error('Failed to activate folder workspace after create:', error)
    toast.error('Workspace created, but it could not be opened', {
      description: workspace.name
    })
  }
  return { workspace, startupPlan, launchDraftPrompt, launchPlan }
}

