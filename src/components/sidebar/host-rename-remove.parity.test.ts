// Per-host display-name overrides: the rename dialog and the removal dialog both mutate the
// same map, and a persisted blob is untrusted input, so clearing must drop the host entry and
// garbage entries must never become a label.
import { describe, expect, it } from 'vitest'
import type { ExecutionHostId } from '../../shared/execution-host'
import {
  applyHostRename,
  clearHostRename,
  getHostDisplayLabelOverride,
  resolveHostRemoval
} from './host-rename-remove'

const SSH = 'ssh:srv' as ExecutionHostId
const DB = 'ssh:db' as ExecutionHostId

describe('host rename overrides', () => {
  it('reads a persisted override and ignores blank text', () => {
    expect(getHostDisplayLabelOverride({ hostSettingOverrides: { [SSH]: { displayLabel: 'Box' } } }, SSH)).toBe(
      'Box'
    )
    expect(
      getHostDisplayLabelOverride({ hostSettingOverrides: { [SSH]: { displayLabel: '   ' } } }, SSH)
    ).toBeUndefined()
    expect(getHostDisplayLabelOverride(null, SSH)).toBeUndefined()
  })

  it('drops malformed persisted entries instead of trusting them', () => {
    expect(
      getHostDisplayLabelOverride(
        { hostSettingOverrides: { [SSH]: 'not-an-object' } },
        SSH
      )
    ).toBeUndefined()
    expect(
      getHostDisplayLabelOverride({ hostSettingOverrides: { [SSH]: { displayLabel: 7 } } }, SSH)
    ).toBeUndefined()
  })

  it('sets the label and keeps other hosts intact', () => {
    const next = applyHostRename(
      { hostSettingOverrides: { [DB]: { displayLabel: 'DB' } } },
      SSH,
      '  Dev box  '
    )

    expect(next).toEqual({ [DB]: { displayLabel: 'DB' }, [SSH]: { displayLabel: 'Dev box' } })
  })

  it('clears the label and drops the host entry when nothing else remains', () => {
    expect(clearHostRename({ hostSettingOverrides: { [SSH]: { displayLabel: 'Box' } } }, SSH)).toEqual(
      {}
    )
    expect(
      clearHostRename(
        {
          hostSettingOverrides: {
            [SSH]: { displayLabel: 'Box', defaultWorktreeLocation: '/srv' }
          }
        },
        SSH
      )
    ).toEqual({ [SSH]: { defaultWorktreeLocation: '/srv' } })
  })

  it('treats a blank rename as a reset', () => {
    expect(
      applyHostRename({ hostSettingOverrides: { [SSH]: { displayLabel: 'Box' } } }, SSH, '   ')
    ).toEqual({})
  })
})

describe('resolveHostRemoval', () => {
  it('routes SSH and runtime hosts and refuses the local host', () => {
    expect(resolveHostRemoval(SSH)).toEqual({ kind: 'ssh', targetId: 'srv' })
    expect(resolveHostRemoval('runtime:vm-1' as ExecutionHostId)).toEqual({
      kind: 'runtime',
      environmentId: 'vm-1'
    })
    expect(resolveHostRemoval('local' as ExecutionHostId)).toBeNull()
  })
})
