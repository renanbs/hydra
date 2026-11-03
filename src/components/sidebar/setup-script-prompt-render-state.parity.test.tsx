import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  getRenderedSetupScriptPromptState,
  markSetupScriptPromptSaved,
  type SetupScriptPromptState,
} from './setup-script-prompt-render-state'
import { useRenderedSetupScriptPromptState } from './useRenderedSetupScriptPromptState'

function state(
  overrides: Partial<SetupScriptPromptState> = {}
): SetupScriptPromptState {
  return {
    status: 'ok',
    repoId: 'repo_1',
    repoHostIdentity: 'local\0repo_1',
    hasEffectiveSetup: false,
    hasSharedHooks: false,
    candidate: null,
    ...overrides,
  } as SetupScriptPromptState
}

describe('setup script prompt render state (Orca parity)', () => {
  it('renders the live inspection when it belongs to the active repo identity', () => {
    const live = state()
    expect(
      getRenderedSetupScriptPromptState({
        promptState: live,
        activeRepoId: 'repo_1',
        activeRepoHostIdentity: 'local\0repo_1',
        lastVisiblePrompt: null,
      })
    ).toBe(live)
  })

  it('refuses a prompt that belongs to another repo or host', () => {
    const otherHost = state({ repoHostIdentity: 'ssh:box\0repo_1' })
    expect(
      getRenderedSetupScriptPromptState({
        promptState: otherHost,
        activeRepoId: 'repo_1',
        activeRepoHostIdentity: 'local\0repo_1',
        lastVisiblePrompt: null,
      })
    ).toBeNull()
  })

  it('retains the last visible prompt only for the same identity', () => {
    const last = state()
    expect(
      getRenderedSetupScriptPromptState({
        promptState: null,
        activeRepoId: 'repo_1',
        activeRepoHostIdentity: 'local\0repo_1',
        lastVisiblePrompt: { state: last },
      })
    ).toBe(last)
    expect(
      getRenderedSetupScriptPromptState({
        promptState: null,
        activeRepoId: 'repo_1',
        activeRepoHostIdentity: 'ssh:box\0repo_1',
        lastVisiblePrompt: { state: last },
      })
    ).toBeNull()
  })

  it('marks a saved inspection effective so the card stops offering the import', () => {
    expect(markSetupScriptPromptSaved(state(), 'local\0repo_1')?.status).toBe('ok')
    expect(
      markSetupScriptPromptSaved(state(), 'local\0repo_1')?.hasEffectiveSetup
    ).toBe(true)
    expect(markSetupScriptPromptSaved(state(), 'other')).toEqual(state())
  })

  it('retains the visible card across a null inspection round trip (no flicker)', () => {
    const visible = state()
    const { result, rerender } = renderHook(
      ({ promptState }: { promptState: SetupScriptPromptState | null }) =>
        useRenderedSetupScriptPromptState({
          promptState,
          activeRepoId: 'repo_1',
          activeRepoHostIdentity: 'local\0repo_1',
          promptTargetHidden: false,
        }),
      { initialProps: { promptState: visible } }
    )

    expect(result.current).toBe(visible)

    // The card nulls the state for the whole re-inspection round trip.
    rerender({ promptState: null })
    expect(result.current).toBe(visible)

    rerender({ promptState: state({ hasEffectiveSetup: true }) })
    expect(result.current?.hasEffectiveSetup).toBe(true)
  })

  it('never retains a prompt for a hidden target and drops forbidden results', () => {
    const visible = state()
    const { result, rerender } = renderHook(
      ({ promptState, hidden }: { promptState: SetupScriptPromptState | null; hidden: boolean }) =>
        useRenderedSetupScriptPromptState({
          promptState,
          activeRepoId: 'repo_1',
          activeRepoHostIdentity: 'local\0repo_1',
          promptTargetHidden: hidden,
        }),
      { initialProps: { promptState: visible, hidden: false } }
    )
    expect(result.current).toBe(visible)

    act(() => rerender({ promptState: null, hidden: true }))
    expect(result.current).toBeNull()

    rerender({ promptState: state({ status: 'forbidden' }), hidden: false })
    expect(result.current?.status).toBe('forbidden')
  })
})
