import { describe, expect, it } from 'vitest'
import {
  getLinearPromptAgentRuntime,
  getLinearPromptSetupCheckIdentity,
  getLinearPromptSkillDiscoveryTarget,
  getLocalDismissStorageKey
} from './linear-agent-skill-runtime'
import { getLinearAgentSkillSetupInlineRuntimeCopy } from './linear-agent-skill-setup-copy'

const settings = {
  localAgentRuntime: 'wsl' as const,
  localAgentWslDistro: 'Ubuntu',
  terminalWindowsShell: 'bash',
  activeRuntimeEnvironmentId: null
}

describe('linear agent skill runtime + copy (D02c-005 / D02c-006)', () => {
  it('keeps the WSL distro in both the runtime and the dismiss key', () => {
    const runtime = getLinearPromptAgentRuntime(settings, 'win32', false)
    expect(runtime).toEqual({ runtime: 'wsl', wslDistro: 'Ubuntu', label: 'WSL Ubuntu' })
    expect(getLocalDismissStorageKey(runtime)).toBe(
      'orca.linearTicketsSkill.setupDismissed.wsl.Ubuntu'
    )
    expect(getLocalDismissStorageKey({ runtime: 'host', label: 'Windows' })).toBe(
      'orca.linearTicketsSkill.setupDismissed.host'
    )
  })

  it('forces the host runtime for remote environments even when local prefers WSL', () => {
    expect(getLinearPromptAgentRuntime(settings, 'win32', true)).toEqual({
      runtime: 'host',
      label: 'Windows'
    })
  })

  it('preserves a repair-required project WSL runtime instead of falling back to host', () => {
    const runtime = getLinearPromptAgentRuntime(settings, 'win32', false, {
      status: 'repair-required',
      repair: {
        projectId: 'repo',
        preferredRuntime: { kind: 'wsl', distro: 'Debian' },
        reason: 'wsl-distro-missing',
        source: 'project-override',
        cacheKey: 'repair:Debian'
      }
    })
    expect(runtime).toEqual({ runtime: 'wsl', wslDistro: 'Debian', label: 'WSL Debian' })
  })

  it('changes the check identity when the runtime target changes', () => {
    const host = { runtime: 'host' as const, label: 'This device' }
    const wsl = { runtime: 'wsl' as const, wslDistro: 'Ubuntu', label: 'WSL Ubuntu' }
    expect(getLinearPromptSetupCheckIdentity({ remote: false, runtime: host })).not.toBe(
      getLinearPromptSetupCheckIdentity({ remote: false, runtime: wsl })
    )
    expect(getLinearPromptSkillDiscoveryTarget(wsl)).toEqual({
      runtime: 'wsl',
      wslDistro: 'Ubuntu'
    })
  })

  it('explains the scope for host, WSL and remote installs', () => {
    expect(getLinearAgentSkillSetupInlineRuntimeCopy(false, { runtime: 'host', label: 'This device' })).toContain(
      'host agent handoffs'
    )
    expect(getLinearAgentSkillSetupInlineRuntimeCopy(false, { runtime: 'wsl', label: 'WSL' })).toContain(
      'WSL agent handoffs'
    )
    expect(getLinearAgentSkillSetupInlineRuntimeCopy(true, { runtime: 'host', label: 'This device' })).toContain(
      'remote agent environments'
    )
  })
})
