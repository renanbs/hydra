// Rosetta D04a-098: host-qualified meta save. Same path + different hosts
// write different rows; unknown ids fail closed. Reference:
// `src/reference/store/slices/worktrees/metadata/update-worktree-meta.ts`.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createUpdateWorktreeMeta } from './update-worktree-meta'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => undefined)
}))

import { invoke } from '@tauri-apps/api/core'

const ROW_LOCAL = {
  id: 'wt-1',
  path: '/w/a',
  hostId: 'local',
  comment: 'old',
  linkedIssue: null,
  linkedPR: null,
  linkedLinearIssue: null,
  linkedJiraIssue: null
}
const ROW_SSH = { ...ROW_LOCAL, id: 'wt-1', hostId: 'ssh:1' }

function storeWith(rows: unknown[]) {
  return { worktreesByRepo: { 'r1': rows } }
}

beforeEach(() => {
  vi.mocked(invoke).mockClear()
})

describe('createUpdateWorktreeMeta (D04a-098)', () => {
  it('persists through the host-qualified command', async () => {
    const update = createUpdateWorktreeMeta((() => {}) as never, (() => storeWith([ROW_LOCAL])) as never)
    const result = await update('wt-1', { comment: 'new' }, { executionHostId: 'local' })
    expect(result).toEqual({ ok: true })
    expect(invoke).toHaveBeenCalledWith(
      'save_worktree_metadata',
      expect.objectContaining({ worktreePath: '/w/a', comment: 'new', executionHostId: 'local' })
    )
  })

  it('rejects an unknown worktree id without touching the backend', async () => {
    const update = createUpdateWorktreeMeta((() => {}) as never, (() => storeWith([ROW_LOCAL])) as never)
    const result = await update('wt-ghost', { comment: 'x' })
    expect(result.ok).toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('refuses to write the SSH row through the local owner', async () => {
    const update = createUpdateWorktreeMeta((() => {}) as never, (() => storeWith([ROW_SSH])) as never)
    const result = await update('wt-1', { comment: 'x' }, { executionHostId: 'local' })
    expect(result.ok).toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('carries update failures back in the result contract', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('db locked'))
    const update = createUpdateWorktreeMeta((() => {}) as never, (() => storeWith([ROW_LOCAL])) as never)
    const result = await update('wt-1', { comment: 'x' })
    expect(result).toEqual({ ok: false, error: 'db locked' })
  })
})
