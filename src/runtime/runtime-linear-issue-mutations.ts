// Adapter over Orca `runtime/runtime-linear-issue-mutations.ts` (no verbatim
// copy: Hydra's `src/runtime/` already owns the Linear RPC pattern; this adds
// the two missing calls in the same shape).
//
// Rosetta D08-044: `linear.getIssue` reads one issue for the sync match;
// `linear.updateIssue` moves it to the resolved workflow state. Environment
// targets go through RPC; local targets through the preload bridge.
import { callRuntimeRpc } from './runtime-rpc-client'
import { getLinearRuntimeTarget, type RuntimeLinearSettings } from './runtime-linear-client'
import type { LinearMutationResult } from './runtime-linear-client'
import type { LinearIssue } from '../shared/linear/issue-types'
import type { LinearIssueUpdate } from '../shared/issue-mutation-types'

export async function linearGetIssue(
  settings: RuntimeLinearSettings,
  id: string,
  workspaceId?: string | null
): Promise<LinearIssue | null> {
  const target = getLinearRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<LinearIssue | null>(
        target,
        'linear.getIssue',
        { id, workspaceId: workspaceId ?? undefined },
        { timeoutMs: 30_000 }
      )
    : window.api.linear.getIssue({ id, workspaceId: workspaceId ?? undefined })
}

export async function linearUpdateIssue(
  settings: RuntimeLinearSettings,
  id: string,
  updates: LinearIssueUpdate,
  workspaceId?: string | null
): Promise<LinearMutationResult> {
  const target = getLinearRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<LinearMutationResult>(
        target,
        'linear.updateIssue',
        { id, updates, workspaceId: workspaceId ?? undefined },
        { timeoutMs: 30_000 }
      )
    : window.api.linear.updateIssue({
        id,
        updates,
        workspaceId: workspaceId ?? undefined
      })
}
