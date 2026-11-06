// Rosetta D04a-010 (Orca `build-rows.ts:111`): mixed-host labels are computed
// over the FULL visible set, not per repo — an install with local + SSH
// worktrees labels every card even when no single repo spans hosts.
import { describe, expect, it } from 'vitest'
import { getMixedWorktreeHostContextLabels } from './host-labels'
import type { Repo } from '../../../types/sidebar'
import type { Worktree } from '../../../types/worktree'

function worktree(id: string, repoId: string, path: string): Worktree {
  return { id, repoId, path } as Worktree
}

describe('getMixedWorktreeHostContextLabels (D04a-010)', () => {
  it('labels SSH cards when the install is mixed but no repo spans hosts', () => {
    const repoMap = new Map<string, Repo>([
      ['local-repo', { id: 'local-repo', executionHostId: 'local' } as Repo],
      ['ssh-repo', { id: 'ssh-repo', executionHostId: 'ssh:nas' } as Repo],
    ])
    const labels = getMixedWorktreeHostContextLabels(
      [worktree('w1', 'local-repo', '/a'), worktree('w2', 'ssh-repo', '/b')],
      repoMap,
      new Map([['ssh:nas', 'NAS']]),
      'local'
    )
    const values = labels ? [...labels.values()] : []
    expect(values).toHaveLength(2)
    expect(values).toContain('NAS')
    expect(values.some((label) => label !== 'NAS')).toBe(true)
  })

  it('returns undefined on a single-host install', () => {
    const repoMap = new Map<string, Repo>([
      ['r1', { id: 'r1', executionHostId: 'local' } as Repo],
    ])
    expect(
      getMixedWorktreeHostContextLabels(
        [worktree('w1', 'r1', '/a')],
        repoMap,
        undefined,
        'local'
      )
    ).toBeUndefined()
  })
})
