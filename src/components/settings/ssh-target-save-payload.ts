// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/settings/ssh-target-save-payload.ts`, reduced to the fields
// the Hydra registry persists today: label, host, port, username, identity file. Orca's
// relay-timeout / GSSAPI / proxy / jump payload fields land with the Advanced PR.
import type { SshTargetCreateInput, SshTargetUpdateInput } from '../../shared/ssh-types'
import { translate } from '@/i18n/i18n'
import { getSshTargetDraftConnectionFields, type EditingTarget } from './ssh-target-draft'

type SshTargetSavePayload = {
  target: SshTargetCreateInput
  updates: SshTargetUpdateInput
}

export type SshTargetSavePayloadResult =
  | { ok: true; payload: SshTargetSavePayload }
  | { ok: false; error: string }

export function buildSshTargetSavePayload(form: EditingTarget): SshTargetSavePayloadResult {
  const { host, configHost, username, port } = getSshTargetDraftConnectionFields(form)
  if (!host) {
    return {
      ok: false,
      error: translate(
        'auto.components.settings.SshPane.0e5aa04161',
        'Host or SSH config alias is required'
      )
    }
  }

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    return {
      ok: false,
      error: translate('auto.components.settings.SshPane.4db9afce1c', 'Port must be between 1 and 65535')
    }
  }

  const identityFile = form.identityFile.trim() || undefined

  const target: SshTargetCreateInput = {
    label: form.label.trim() || (username ? `${username}@${host}` : configHost),
    configHost,
    host,
    port,
    username,
    ...(identityFile ? { identityFile } : {})
  }

  return {
    ok: true,
    payload: {
      target,
      updates: {
        ...target,
        // Why: `ssh_update_target` merges partially, so an explicit undefined is what
        // clears an identity file the user emptied instead of leaving the stored one.
        identityFile,
        source: 'manual'
      }
    }
  }
}
