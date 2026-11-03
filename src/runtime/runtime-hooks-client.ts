// Hooks inspection is still host-owned (Orca preload / remote runtime RPC). Hydra's
// Tauri backend does not expose these commands yet, so the local path goes through
// an explicit invoke and surfaces an error status instead of silently pretending
// the repo has no hooks.
import { invoke } from '@tauri-apps/api/core'
import type { GlobalSettings } from '../shared/global-settings-types'
import type { OrcaHooks } from '../shared/orca-yaml-hook-types'
import { parseExecutionHostId, type ExecutionHostId } from '../shared/execution-host'
import type { SetupScriptImportCandidate } from '../shared/setup-script-imports'
import { callRuntimeRpc, getActiveRuntimeTarget } from './runtime-rpc-client'
import type { RuntimeClientTarget } from './runtime-client-target'

function getHookInspectionTarget(
  settings: Pick<GlobalSettings, 'activeRuntimeEnvironmentId'> | null | undefined,
  hostId?: ExecutionHostId
): RuntimeClientTarget {
  const parsedHost = parseExecutionHostId(hostId)
  if (parsedHost?.kind === 'runtime') {
    return { kind: 'environment', environmentId: parsedHost.environmentId }
  }
  return parsedHost ? { kind: 'local' } : getActiveRuntimeTarget(settings)
}

export type HookCheckResult = {
  status?: 'ok' | 'error'
  hasHooks: boolean
  hooks: OrcaHooks | null
  mayNeedUpdate: boolean
}

export type IssueCommandReadResult = {
  status?: 'ok' | 'error'
  localContent: string | null
  sharedContent: string | null
  effectiveContent: string | null
  localFilePath: string
  source: 'local' | 'shared' | 'none'
}

export async function checkRuntimeHooks(
  settings: Pick<GlobalSettings, 'activeRuntimeEnvironmentId'> | null | undefined,
  repoId: string,
  hostId?: ExecutionHostId
): Promise<HookCheckResult> {
  const target = getHookInspectionTarget(settings, hostId)
  if (target.kind !== 'environment') {
    return invoke<HookCheckResult>('check_runtime_hooks', {
      repoId,
      ...(hostId ? { hostId } : {})
    })
  }
  return callRuntimeRpc<HookCheckResult>(
    target,
    'repo.hooksCheck',
    { repo: repoId },
    { timeoutMs: 15_000 }
  )
}

export async function inspectRuntimeSetupScriptImports(
  settings: Pick<GlobalSettings, 'activeRuntimeEnvironmentId'> | null | undefined,
  repoId: string,
  hostId?: ExecutionHostId
): Promise<SetupScriptImportCandidate[]> {
  const target = getHookInspectionTarget(settings, hostId)
  if (target.kind !== 'environment') {
    return invoke<SetupScriptImportCandidate[]>('inspect_runtime_setup_script_imports', {
      repoId,
      ...(hostId ? { hostId } : {})
    })
  }
  return callRuntimeRpc<SetupScriptImportCandidate[]>(
    target,
    'repo.setupScriptImports',
    { repo: repoId },
    { timeoutMs: 15_000 }
  )
}

export async function readRuntimeIssueCommand(
  settings: Pick<GlobalSettings, 'activeRuntimeEnvironmentId'> | null | undefined,
  repoId: string,
  hostId?: ExecutionHostId
): Promise<IssueCommandReadResult> {
  const target = getActiveRuntimeTarget(settings)
  if (target.kind !== 'environment') {
    return invoke<IssueCommandReadResult>('read_runtime_issue_command', {
      repoId,
      ...(hostId ? { hostId } : {})
    })
  }
  return callRuntimeRpc<IssueCommandReadResult>(
    target,
    'repo.issueCommandRead',
    { repo: repoId },
    { timeoutMs: 15_000 }
  )
}

export async function writeRuntimeIssueCommand(
  settings: Pick<GlobalSettings, 'activeRuntimeEnvironmentId'> | null | undefined,
  repoId: string,
  content: string,
  hostId?: ExecutionHostId
): Promise<void> {
  const target = getActiveRuntimeTarget(settings)
  if (target.kind !== 'environment') {
    await invoke('write_runtime_issue_command', {
      repoId,
      content,
      ...(hostId ? { hostId } : {})
    })
    return
  }
  await callRuntimeRpc(
    target,
    'repo.issueCommandWrite',
    { repo: repoId, content },
    { timeoutMs: 15_000 }
  )
}
