// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/add-repo-existing-workspaces-telemetry.test.ts
//
// D02a-031 Rosetta: builder unit tests ported 1:1 (field-shape adapter only:
// the Orca `Worktree` row becomes the structural `ExistingWorkspaceTelemetryWorktree`).
import { describe, expect, it } from 'vitest'
import {
  buildAddRepoExistingWorkspacesDetectedEvent,
  buildAddRepoExistingWorkspacesTelemetry,
  shouldTrackAddRepoExistingWorkspacesDetected,
  type ExistingWorkspaceTelemetryWorktree
} from './add-repo-existing-workspaces-telemetry'

function worktree(overrides: Partial<ExistingWorkspaceTelemetryWorktree>): ExistingWorkspaceTelemetryWorktree {
  return {
    path: '/repo',
    branch: 'refs/heads/main',
    isMainWorktree: true,
    displayName: 'main',
    lastActivityAt: 0,
    ...overrides
  }
}

describe('add repo existing workspace telemetry (D02a-031)', () => {
  it('builds count-only payloads without raw workspace names', () => {
    const payload = buildAddRepoExistingWorkspacesTelemetry('local_folder_picker', [
      worktree({ path: '/repo', displayName: 'main', branch: 'refs/heads/main' }),
      worktree({
        path: '/repo-feature',
        displayName: 'Feature With User Text',
        branch: 'refs/heads/feature/private-task',
        isMainWorktree: false,
        isSparse: true
      }),
      worktree({
        path: 'C:\\workspaces\\detached',
        displayName: 'detached',
        branch: '',
        isMainWorktree: false
      })
    ])

    expect(payload).toEqual({
      source: 'local_folder_picker',
      existing_workspace_count: 3,
      existing_linked_workspace_count: 2,
      main_workspace_count: 1,
      branch_named_workspace_count: 2,
      detached_workspace_count: 1,
      custom_named_workspace_count: 1,
      sparse_workspace_count: 1
    })
    expect(JSON.stringify(payload)).not.toContain('private-task')
    expect(JSON.stringify(payload)).not.toContain('Feature With User Text')
  })

  it('tracks detection only for imported linked workspaces', () => {
    expect(buildAddRepoExistingWorkspacesTelemetry(null, [worktree({})])).toBeNull()
    expect(buildAddRepoExistingWorkspacesTelemetry('local_folder_picker', [])).toBeNull()

    const mainOnlyPayload = buildAddRepoExistingWorkspacesTelemetry('local_folder_picker', [
      worktree({})
    ])
    expect(mainOnlyPayload?.existing_linked_workspace_count).toBe(0)
    expect(shouldTrackAddRepoExistingWorkspacesDetected(mainOnlyPayload)).toBe(false)

    const importedLocalPayload = buildAddRepoExistingWorkspacesTelemetry('local_folder_picker', [
      worktree({}),
      worktree({ path: '/repo-existing', isMainWorktree: false })
    ])
    const importedRemotePayload = buildAddRepoExistingWorkspacesTelemetry('ssh_remote_path', [
      worktree({}),
      worktree({ path: '/remote-existing', isMainWorktree: false })
    ])
    const clonePayload = buildAddRepoExistingWorkspacesTelemetry('clone_url', [
      worktree({}),
      worktree({ path: '/clone-existing', isMainWorktree: false })
    ])
    const createPayload = buildAddRepoExistingWorkspacesTelemetry('create_project', [
      worktree({}),
      worktree({ path: '/create-existing', isMainWorktree: false })
    ])

    expect(shouldTrackAddRepoExistingWorkspacesDetected(importedLocalPayload)).toBe(true)
    expect(shouldTrackAddRepoExistingWorkspacesDetected(importedRemotePayload)).toBe(true)
    expect(shouldTrackAddRepoExistingWorkspacesDetected(clonePayload)).toBe(false)
    expect(shouldTrackAddRepoExistingWorkspacesDetected(createPayload)).toBe(false)
  })

  it('derives linked and detached counts before clamping reported values', () => {
    const mainOnlyPayload = buildAddRepoExistingWorkspacesTelemetry(
      'local_folder_picker',
      Array.from({ length: 60 }, (_, index) =>
        worktree({
          path: `/repo-main-${index}`,
          isMainWorktree: true
        })
      )
    )

    expect(mainOnlyPayload).toMatchObject({
      existing_workspace_count: 50,
      existing_linked_workspace_count: 0,
      main_workspace_count: 50,
      detached_workspace_count: 0
    })
    expect(shouldTrackAddRepoExistingWorkspacesDetected(mainOnlyPayload)).toBe(false)
  })

  it('sorts by activity then display name before building the event', () => {
    const event = buildAddRepoExistingWorkspacesDetectedEvent('local_folder_picker', [
      worktree({ path: '/repo', isMainWorktree: true, lastActivityAt: 1 }),
      worktree({ path: '/repo-linked', isMainWorktree: false, displayName: ' zeta', lastActivityAt: 9 })
    ])
    expect(event?.existing_linked_workspace_count).toBe(1)
    expect(event?.source).toBe('local_folder_picker')
  })
})
