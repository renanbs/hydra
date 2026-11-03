import { beforeEach, describe, expect, it, vi } from 'vitest'
import { trackSetupScriptPromptExposure } from './setup-script-prompt-exposure-telemetry'
import type { SetupScriptPromptState } from './setup-script-prompt-render-state'

const track = vi.hoisted(() => vi.fn())
vi.mock('@/lib/telemetry', () => ({ track }))

const promptState: SetupScriptPromptState = {
  status: 'ok',
  repoId: 'repo-1',
  hasEffectiveSetup: false,
  hasSharedHooks: true,
  candidate: {
    provider: 'package-manager',
    label: 'pnpm',
    files: ['package.json', 'pnpm-lock.yaml'],
    setup: 'pnpm install'
  },
  repoHostIdentity: 'host-a:repo-1'
}

beforeEach(() => track.mockClear())

describe('setup script prompt exposure telemetry (D02c-024)', () => {
  it('emits once per composite prompt key despite repeated renders', () => {
    const trackedPromptKeys = new Set<string>()
    const input = {
      repoId: 'repo-1',
      repoHostIdentity: 'host-a:repo-1',
      promptState,
      trackedPromptKeys
    }
    trackSetupScriptPromptExposure(input)
    trackSetupScriptPromptExposure(input)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('setup_script_prompt_shown', {
      mode: 'import_available',
      provider: 'package-manager',
      file_count_bucket: '2-3',
      unsupported_field_count_bucket: '0',
      has_shared_hooks: true
    })
  })

  it('emits a new exposure when the candidate source changes', () => {
    const trackedPromptKeys = new Set<string>()
    trackSetupScriptPromptExposure({
      repoId: 'repo-1',
      repoHostIdentity: 'host-a:repo-1',
      promptState,
      trackedPromptKeys
    })
    trackSetupScriptPromptExposure({
      repoId: 'repo-1',
      repoHostIdentity: 'host-a:repo-1',
      promptState: { ...promptState, candidate: null },
      trackedPromptKeys
    })
    expect(track).toHaveBeenCalledTimes(2)
    expect(track.mock.calls[1][1]).toMatchObject({ mode: 'configure_needed' })
  })

  it('never emits for an effective setup or a mismatched host', () => {
    const trackedPromptKeys = new Set<string>()
    trackSetupScriptPromptExposure({
      repoId: 'repo-1',
      repoHostIdentity: 'host-a:repo-1',
      promptState: { ...promptState, hasEffectiveSetup: true },
      trackedPromptKeys
    })
    trackSetupScriptPromptExposure({
      repoId: 'repo-1',
      repoHostIdentity: 'host-b:repo-1',
      promptState,
      trackedPromptKeys
    })
    expect(track).not.toHaveBeenCalled()
  })
})
