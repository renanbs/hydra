import { describe, expect, it } from 'vitest'
import { buildSetupScriptPromptActionTelemetry, buildSetupScriptPromptTelemetry } from './setup-script-telemetry'
import type { SetupScriptImportCandidate } from './setup-script-imports'

const candidate: SetupScriptImportCandidate = {
  provider: 'conductor',
  label: 'Conductor',
  files: ['conductor.json'],
  setup: 'pnpm install',
  unsupportedFields: ['a', 'b', 'c', 'd']
}

describe('setup script prompt telemetry builders (D02c-024)', () => {
  it('buckets file and unsupported-field counts without leaking script text', () => {
    const telemetry = buildSetupScriptPromptTelemetry({ candidate, hasSharedHooks: false })
    expect(telemetry).toEqual({
      mode: 'import_available',
      provider: 'conductor',
      file_count_bucket: '1',
      unsupported_field_count_bucket: '4+',
      has_shared_hooks: false
    })
    expect(JSON.stringify(telemetry)).not.toContain('pnpm install')
  })

  it('marks configure-needed with no provider and carries edited_before_save for detected saves', () => {
    expect(
      buildSetupScriptPromptTelemetry({ candidate: null, hasSharedHooks: true })
    ).toMatchObject({ mode: 'configure_needed', has_shared_hooks: true })

    const action = buildSetupScriptPromptActionTelemetry({
      action: 'save_detected_setup_clicked',
      candidate: {
        provider: 'package-manager',
        label: 'pnpm',
        files: ['package.json', 'pnpm-lock.yaml'],
        setup: 'pnpm install'
      },
      hasSharedHooks: true,
      editedBeforeSave: true
    })
    expect(action).toMatchObject({
      action: 'save_detected_setup_clicked',
      provider: 'package-manager',
      edited_before_save: true
    })
  })
})
