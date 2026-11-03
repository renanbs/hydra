import { track } from '@/lib/telemetry'
import { buildSetupScriptPromptTelemetry } from '../../shared/setup-script-telemetry'
import type { SetupScriptPromptState } from './setup-script-prompt-render-state'

/**
 * Emit one `setup_script_prompt_shown` per distinct prompt source for a repo.
 * React re-renders the sidebar often; the composite key makes repeated paints
 * of the same prompt deduplicate while a changed provider/file count still
 * reports a genuinely different exposure.
 */
export function trackSetupScriptPromptExposure(input: {
  repoId: string
  repoHostIdentity: string
  promptState: SetupScriptPromptState | null
  trackedPromptKeys: Set<string>
}): void {
  const { promptState, repoHostIdentity, repoId, trackedPromptKeys } = input
  if (
    promptState?.repoId !== repoId ||
    promptState.repoHostIdentity !== repoHostIdentity ||
    promptState.status !== 'ok' ||
    promptState.hasEffectiveSetup
  ) {
    return
  }

  const telemetry = buildSetupScriptPromptTelemetry({
    candidate: promptState.candidate,
    hasSharedHooks: promptState.hasSharedHooks
  })
  const promptKey = [
    repoHostIdentity,
    telemetry.mode,
    telemetry.provider ?? 'none',
    telemetry.file_count_bucket,
    telemetry.unsupported_field_count_bucket,
    String(telemetry.has_shared_hooks)
  ].join(':')
  if (trackedPromptKeys.has(promptKey)) return

  trackedPromptKeys.add(promptKey)
  track('setup_script_prompt_shown', telemetry)
}
