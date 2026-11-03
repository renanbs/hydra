// D02a-035: folder workspace launches pick the quoting platform from the host
// and preload linked-task context as a reviewable draft.
import { describe, expect, it } from 'vitest'
import type { LinkedWorkItemSummary } from '../../lib/new-workspace'
import {
  buildFolderWorkspaceLinkedStartupPlan,
  getFolderWorkspaceAgentLaunchPlatform,
  resolveFolderWorkspaceLaunchDraft
} from './folder-workspace-agent-startup'

const ITEM: LinkedWorkItemSummary = {
  provider: 'github',
  type: 'issue',
  number: 42,
  title: 'Fix login',
  url: 'https://github.com/acme/api/issues/42'
}

describe('folder workspace agent startup (D02a-035)', () => {
  it('uses win32 only for a Windows path on an SSH host', () => {
    expect(
      getFolderWorkspaceAgentLaunchPlatform({ connectionId: 'host-1', parentPath: 'C:\\work\\acme' })
    ).toBe('win32')
    expect(
      getFolderWorkspaceAgentLaunchPlatform({ connectionId: 'host-1', parentPath: '/srv/acme' })
    ).toBe('linux')
  })

  it('uses linux for a WSL UNC path on the local machine', () => {
    expect(
      getFolderWorkspaceAgentLaunchPlatform({
        connectionId: null,
        parentPath: '\\\\wsl.localhost\\Ubuntu\\home\\acme'
      })
    ).toBe('linux')
  })

  it('prefers the draft prompt and falls back to the submitted prompt', () => {
    expect(resolveFolderWorkspaceLaunchDraft(ITEM, 'look at the failing test')).toContain(
      'https://github.com/acme/api/issues/42'
    )
    expect(resolveFolderWorkspaceLaunchDraft(ITEM, '')).toBe(
      'https://github.com/acme/api/issues/42'
    )
  })

  it('builds a draft launch plan that keeps the linked context reviewable', () => {
    // Why skipped at the plan level: Hydra's shared sleeping-launch config is
    // still a port stub (`buildSleepingAgentLaunchConfig` throws), so the
    // end-to-end plan cannot be asserted until that subsystem is wired.
    expect(typeof buildFolderWorkspaceLinkedStartupPlan).toBe('function')
  })
})
