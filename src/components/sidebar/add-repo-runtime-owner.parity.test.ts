// D02a-033: captured runtime/SSH owner becomes the execution host for the
// authoritative worktree refresh.
import { describe, expect, it } from 'vitest'
import {
  capturedAddRepoExecutionHostId,
  worktreeRefreshOptions
} from './add-repo-runtime-owner'

describe('add-repo runtime owner (D02a-033)', () => {
  it('prefers the SSH connection over a captured runtime owner', () => {
    expect(capturedAddRepoExecutionHostId('env-1', 'host-1')).toBe('ssh:host-1')
  })

  it('maps a captured runtime environment id to a runtime execution host', () => {
    expect(capturedAddRepoExecutionHostId('env-1')).toBe('runtime:env-1')
  })

  it('keeps an explicit local owner local and leaves an uncaptured owner undefined', () => {
    expect(capturedAddRepoExecutionHostId(null)).toBe('local')
    expect(capturedAddRepoExecutionHostId(undefined)).toBeUndefined()
  })

  it('asks for an authoritative refresh scoped to the resolved host', () => {
    expect(worktreeRefreshOptions(null)).toEqual({
      requireAuthoritative: true,
      executionHostId: 'local'
    })
    expect(worktreeRefreshOptions(undefined)).toEqual({ requireAuthoritative: true })
    expect(worktreeRefreshOptions('env-1', 'host-1')).toEqual({
      requireAuthoritative: true,
      executionHostId: 'ssh:host-1'
    })
  })
})
