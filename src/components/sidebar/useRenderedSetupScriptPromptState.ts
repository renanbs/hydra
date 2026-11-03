// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/useRenderedSetupScriptPromptState.ts
import { useEffect, useRef } from 'react'
import {
  getRenderedSetupScriptPromptState,
  type LastVisibleSetupScriptPrompt,
  type SetupScriptPromptState,
} from './setup-script-prompt-render-state'

/**
 * Retains the last visible setup-script prompt while a re-inspection is in
 * flight, but never across a repo/host switch: a prompt retained for the wrong
 * identity would offer to import another repo's setup script.
 */
export function useRenderedSetupScriptPromptState(input: {
  promptState: SetupScriptPromptState | null
  activeRepoId: string | null
  activeRepoHostIdentity: string | null
  promptTargetHidden: boolean
}): SetupScriptPromptState | null {
  const { activeRepoHostIdentity, activeRepoId, promptState, promptTargetHidden } = input
  const lastVisiblePromptRef = useRef<LastVisibleSetupScriptPrompt | null>(null)
  const renderedPromptState =
    !promptTargetHidden && activeRepoId && activeRepoHostIdentity
      ? getRenderedSetupScriptPromptState({
          promptState,
          activeRepoId,
          activeRepoHostIdentity,
          lastVisiblePrompt: lastVisiblePromptRef.current,
        })
      : null

  useEffect(() => {
    if (
      renderedPromptState?.status === 'ok' &&
      !renderedPromptState.hasEffectiveSetup &&
      renderedPromptState.repoHostIdentity === activeRepoHostIdentity
    ) {
      lastVisiblePromptRef.current = { state: renderedPromptState }
      return
    }
    if (
      promptTargetHidden ||
      renderedPromptState?.status === 'forbidden' ||
      (renderedPromptState?.status === 'ok' && renderedPromptState.hasEffectiveSetup)
    ) {
      lastVisiblePromptRef.current = null
    }
  }, [activeRepoHostIdentity, promptTargetHidden, renderedPromptState])

  return renderedPromptState
}
