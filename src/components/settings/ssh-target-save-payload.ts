// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/settings/ssh-target-save-payload.ts
// Parity with Orca `components/settings/ssh-target-save-payload.ts`: label, host, port,
// username, identity file plus the Advanced relay/proxy/jump/reuse fields.
import {
  MAX_SSH_RELAY_GRACE_PERIOD_SECONDS,
  type SshTargetCreateInput,
  type SshTargetUpdateInput
} from '../../shared/ssh-types'
import { translate } from '@/i18n/i18n'
import {
  getSshTargetDraftConnectionFields,
  isRelayGracePeriodValid,
  parseRelayGracePeriodSeconds,
  type EditingTarget
} from './ssh-target-draft'

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

  const graceSeconds = parseRelayGracePeriodSeconds(form)
  if (!isRelayGracePeriodValid(form, graceSeconds)) {
    return {
      ok: false,
      error: translate(
        'auto.components.sidebar.AddRemoteHostDialog.sshRelayGraceInvalid',
        'Terminal timeout must be between 60 and {{value0}} seconds.',
        { value0: MAX_SSH_RELAY_GRACE_PERIOD_SECONDS }
      )
    }
  }

  const identityFile = form.identityFile.trim() || undefined
  const proxyCommand = form.proxyCommand.trim() || undefined
  const jumpHost = form.jumpHost.trim() || undefined

  const target: SshTargetCreateInput = {
    label: form.label.trim() || (username ? `${username}@${host}` : configHost),
    configHost,
    host,
    port,
    username,
    ...(identityFile ? { identityFile } : {}),
    ...(form.gssapiAuthentication ? { gssapiAuthentication: true } : {}),
    ...(proxyCommand ? { proxyCommand } : {}),
    ...(jumpHost ? { jumpHost } : {}),
    // Why: main treats an absent flag as enabled, so only the explicit opt-out is stored.
    ...(form.systemSshConnectionReuse ? {} : { systemSshConnectionReuse: false }),
    relayGracePeriodSeconds: graceSeconds
  }

  return {
    ok: true,
    payload: {
      target,
      updates: {
        ...target,
        // Why: `ssh_update_target` merges partially, so an explicit undefined is what
        // clears a field the user emptied instead of leaving the stored one.
        identityFile,
        proxyCommand,
        jumpHost,
        source: 'manual'
      }
    }
  }
}
