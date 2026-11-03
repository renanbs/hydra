import { describe, expect, it } from 'vitest'
import { getRenderedSetupScriptPromptState, markSetupScriptPromptSaved } from './setup-script-prompt-render-state'
import type { SetupScriptPromptState } from './setup-script-prompt-render-state'

const prompt = (overrides: Partial<SetupScriptPromptState> = {}): SetupScriptPromptState => ({
  status: 'ok',
  repoId: 'repo-1',
  hasEffectiveSetup: false,
  hasSharedHooks: false,
  candidate: null,
  repoHostIdentity: 'host-a:repo-1',
  ...overrides
})

describe('setup script prompt render state (D02c-025)', () => {
  it('marks only the saved host identity as effective', () => {
    const current = prompt()
    expect(markSetupScriptPromptSaved(current, 'host-b:repo-1')).toBe(current)
    const saved = markSetupScriptPromptSaved(current, 'host-a:repo-1')
    expect(saved).not.toBe(current)
    expect(saved?.status === 'ok' && saved.hasEffectiveSetup).toBe(true)
  })

  it('retains the last visible prompt during a re-inspection round trip', () => {
    const lastVisiblePrompt = { state: prompt() }
    expect(
      getRenderedSetupScriptPromptState({
        promptState: null,
        activeRepoId: 'repo-1',
        activeRepoHostIdentity: 'host-a:repo-1',
        lastVisiblePrompt
      })
    ).toBe(lastVisiblePrompt.state)
  })

  it('does not leak a retained prompt to a different host', () => {
    expect(
      getRenderedSetupScriptPromptState({
        promptState: null,
        activeRepoId: 'repo-1',
        activeRepoHostIdentity: 'host-b:repo-1',
        lastVisiblePrompt: { state: prompt() }
      })
    ).toBeNull()
  })
})
