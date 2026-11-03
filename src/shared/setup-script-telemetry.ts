import type { EventProps } from './telemetry-events'
import type { SetupScriptImportCandidate } from './setup-script-imports'

type SetupScriptPromptTelemetry = Omit<EventProps<'setup_script_prompt_shown'>, 'nth_repo_added'>
type SetupScriptPromptActionTelemetry = Omit<
  EventProps<'setup_script_prompt_action'>,
  'nth_repo_added'
>

export type SetupScriptPromptAction = SetupScriptPromptActionTelemetry['action']

/** Closed-enum, count-bucketed payload: the prompt must never leak script text. */
export function buildSetupScriptPromptTelemetry({
  candidate,
  hasSharedHooks
}: {
  candidate: SetupScriptImportCandidate | null
  hasSharedHooks: boolean
}): SetupScriptPromptTelemetry {
  const base = {
    // The UI treats package-manager suggestions as detected setup, but the wire
    // value stays `import_available` so historical funnels remain comparable.
    mode: candidate ? ('import_available' as const) : ('configure_needed' as const),
    file_count_bucket: bucketSetupScriptCount(candidate?.files.length ?? 0),
    unsupported_field_count_bucket: bucketSetupScriptCount(
      candidate?.unsupportedFields?.length ?? 0
    ),
    has_shared_hooks: hasSharedHooks
  } satisfies SetupScriptPromptTelemetry

  return candidate ? { ...base, provider: candidate.provider } : base
}

export function buildSetupScriptPromptActionTelemetry({
  action,
  candidate,
  hasSharedHooks,
  editedBeforeSave
}: {
  action: SetupScriptPromptAction
  candidate: SetupScriptImportCandidate | null
  hasSharedHooks: boolean
  editedBeforeSave?: boolean
}): SetupScriptPromptActionTelemetry {
  return {
    ...buildSetupScriptPromptTelemetry({ candidate, hasSharedHooks }),
    action,
    ...(editedBeforeSave !== undefined ? { edited_before_save: editedBeforeSave } : {})
  }
}

function bucketSetupScriptCount(count: number): '0' | '1' | '2-3' | '4+' {
  if (count <= 0) return '0'
  if (count === 1) return '1'
  if (count <= 3) return '2-3'
  return '4+'
}
