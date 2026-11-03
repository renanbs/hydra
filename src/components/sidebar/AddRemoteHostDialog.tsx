// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/AddRemoteHostDialog.tsx
// Parity with Orca's Add-host dialog: SSH mode (`~/.ssh/config` picker + manual form with an
// Advanced section) and the Orca-server pairing mode (access link + loopback override).
//
// The dialog latches `renderMode` so the last mode keeps rendering while the closing
// animation runs after `mode` goes null, and aggregates its busy state so the close path
// cannot leave a resolve or an import writing into a dismissed form.
//
// Server pairing is BLOCKED on the backend: see `src/store/runtime-environment-bridge.ts`.
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { translate } from '@/i18n/i18n'
import {
  addSshTarget,
  hydrateSshTargets,
  importSshConfig,
  listSshConfigHosts,
  resolveSshConfigHost
} from '@/store/ssh-bridge'
import {
  RuntimePairingUnavailableError,
  listRuntimeEnvironments,
  verifyAndAddRuntimeEnvironmentFromPairingCode
} from '@/store/runtime-environment-bridge'
import { useAppStore } from '@/store'
import type {
  SshConfigHostListArgs,
  SshConfigHostListResult,
  SshConfigHostResolution,
  SshConfigHostSummary
} from '../../shared/ssh-types'
import { parseHostAccessLink, type ParseHostAccessLinkResult } from '../../shared/remote-pairing-address'
import { translateHostAccessLinkError } from '@/lib/remote-pairing-copy'
import {
  EMPTY_FORM,
  getEditingTargetFromSshConfigHost,
  hasAdvancedConnectionValues,
  type EditingTarget
} from '../settings/ssh-target-draft'
import { buildSshTargetSavePayload } from '../settings/ssh-target-save-payload'
import { AddRemoteHostServerFormPanel } from './AddRemoteHostServerFormPanel'
import { AddRemoteHostSshConfigPicker } from './AddRemoteHostSshConfigPicker'
import { AddRemoteHostSshFormPanel } from './AddRemoteHostSshFormPanel'
import { isDuplicateSshTargetAlias } from './ssh-target-duplicate'

export type AddRemoteHostMode = 'ssh' | 'server'

type AddRemoteHostDialogProps = {
  mode: AddRemoteHostMode | null
  onOpenChange: (mode: AddRemoteHostMode | null) => void
}

type SshDialogView = 'form' | 'config-picker'

/** Backend failures arrive as thrown strings; the picker renders them as a retryable line. */
async function loadSshConfigHostsForPicker(
  args: SshConfigHostListArgs
): Promise<{ ok: true; result: SshConfigHostListResult } | { ok: false; error: string }> {
  try {
    return { ok: true, result: await listSshConfigHosts(args) }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : translate(
              'auto.components.sidebar.AddRemoteHostDialog.sshConfigPickerLoadFailed',
              'Failed to read ~/.ssh/config.'
            )
    }
  }
}

/** A preload/IPC surface that predates the picker only recovers on a restart. */
function isStalePreloadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /is not a function|unknown command|not found/i.test(message)
}

export function AddRemoteHostDialog({
  mode,
  onOpenChange
}: AddRemoteHostDialogProps): React.JSX.Element {
  const open = mode !== null
  // Why latch: `mode` goes null when closing, but the exit animation must keep painting the
  // mode the user was in instead of flashing the SSH form.
  const [renderMode, setRenderMode] = useState<AddRemoteHostMode>('ssh')
  const [sshForm, setSshForm] = useState<EditingTarget>(EMPTY_FORM)
  const [sshView, setSshView] = useState<SshDialogView>('form')
  const [configHosts, setConfigHosts] = useState<SshConfigHostSummary[]>([])
  const [configHostCount, setConfigHostCount] = useState(0)
  const [newConfigHostCount, setNewConfigHostCount] = useState(0)
  const [configHostMatchesTruncated, setConfigHostMatchesTruncated] = useState(false)
  const [isLoadingConfigHosts, setIsLoadingConfigHosts] = useState(false)
  const [resolvingConfigAlias, setResolvingConfigAlias] = useState<string | null>(null)
  const [isBulkImporting, setIsBulkImporting] = useState(false)
  const [configHostsError, setConfigHostsError] = useState<string | null>(null)
  const [configFilledAlias, setConfigFilledAlias] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [serverName, setServerName] = useState('')
  const [pairingCode, setPairingCode] = useState('')
  const [allowLoopback, setAllowLoopback] = useState(false)
  const configSearchGeneration = useRef(0)
  const configSearchQuery = useRef('')
  const configResolveGeneration = useRef(0)

  useEffect(() => {
    if (mode !== null) {
      setRenderMode(mode)
    }
  }, [mode])

  const parsedLink: ParseHostAccessLinkResult = parseHostAccessLink(pairingCode)
  const loopbackRequiresOverride =
    parsedLink.ok && parsedLink.value.endpointKind === 'loopback' && !allowLoopback
  const isBusy = isSaving || isBulkImporting || resolvingConfigAlias !== null
  const preferAdvancedOpen = hasAdvancedConnectionValues(sshForm)

  const reset = () => {
    setSshForm(EMPTY_FORM)
    setSshView('form')
    setConfigHosts([])
    setConfigHostCount(0)
    setNewConfigHostCount(0)
    setConfigHostMatchesTruncated(false)
    setConfigHostsError(null)
    setServerName('')
    setPairingCode('')
    setAllowLoopback(false)
    configSearchQuery.current = ''
    // Why: a pending resolve must never write into a form the dialog has moved on from,
    // and a pending search must not repaint a dismissed picker.
    configResolveGeneration.current += 1
    configSearchGeneration.current += 1
    setResolvingConfigAlias(null)
    setConfigFilledAlias(null)
    setIsBulkImporting(false)
  }

  const close = () => {
    // Why: a stuck write must not trap the dialog open — reset() invalidates a pending resolve instead.
    if (isSaving || isBulkImporting) {
      return
    }
    reset()
    onOpenChange(null)
  }

  const saveSshHost = async () => {
    const payload = buildSshTargetSavePayload(sshForm)
    if (!payload.ok) {
      toast.error(payload.error)
      return
    }
    setIsSaving(true)
    try {
      // Why: duplicates have no other guard — `ssh_add_target` accepts them, and two rows
      // for one machine are indistinguishable in the sidebar.
      const existing = await hydrateSshTargets()
      if (isDuplicateSshTargetAlias(payload.payload.target, existing)) {
        toast.error(
          translate(
            'auto.components.sidebar.AddRemoteHostDialog.sshAlreadyExists',
            'That SSH host is already in Orca.'
          )
        )
        return
      }
      await addSshTarget(payload.payload.target)
      // Why: one re-read of the registry, so the new host shows up in the sidebar's Hosts
      // subtree without a reload. Repo readoption (`SshRepoReadoption` → repo rows) needs
      // the repo catalog slice, which the live store does not compose yet.
      await hydrateSshTargets()
      useAppStore.getState().recordFeatureInteraction?.('ssh')
      toast.success(
        translate('auto.components.sidebar.AddRemoteHostDialog.sshSaved', 'SSH host added.')
      )
      reset()
      onOpenChange(null)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : translate(
              'auto.components.sidebar.AddRemoteHostDialog.sshSaveFailed',
              'Failed to add SSH host.'
            )
      )
    } finally {
      setIsSaving(false)
    }
  }

  const saveRemoteServer = async () => {
    if (!serverName.trim() || !pairingCode.trim()) {
      toast.error(
        translate(
          'auto.components.sidebar.AddRemoteHostDialog.serverFieldsRequired',
          'Server name and pairing code are required.'
        )
      )
      return
    }
    if (!parsedLink.ok) {
      toast.error(translateHostAccessLinkError(parsedLink.kind))
      return
    }
    if (loopbackRequiresOverride) {
      toast.error(
        translate(
          'auto.components.sidebar.AddRemoteHostDialog.loopbackBlocked',
          'Enable the SSH tunnel override or create a new link using the other host’s Tailscale or LAN address.'
        )
      )
      return
    }
    setIsSaving(true)
    try {
      await verifyAndAddRuntimeEnvironmentFromPairingCode({
        name: serverName.trim(),
        pairingCode: pairingCode.trim(),
        allowLoopback
      })
      const environments = await listRuntimeEnvironments()
      useAppStore.getState().setRuntimeEnvironments(
        environments.map((environment) => ({
          id: environment.id,
          name: environment.name
        })) as never
      )
      useAppStore.getState().recordFeatureInteraction?.('ssh')
      toast.success(
        translate('auto.components.sidebar.AddRemoteHostDialog.serverSaved', 'Remote server added.')
      )
      reset()
      onOpenChange(null)
    } catch (error) {
      toast.error(
        error instanceof RuntimePairingUnavailableError
          ? error.message
          : error instanceof Error
            ? error.message
            : translate(
                'auto.components.sidebar.AddRemoteHostDialog.serverSaveFailed',
                'Failed to add remote server.'
              )
      )
    } finally {
      setIsSaving(false)
    }
  }

  const loadSshConfigHosts = async (query = '', options?: { refresh?: boolean }) => {
    configSearchQuery.current = query
    const generation = configSearchGeneration.current + 1
    configSearchGeneration.current = generation
    setIsLoadingConfigHosts(true)
    setConfigHostsError(null)
    const result = await loadSshConfigHostsForPicker({
      query,
      ...(options?.refresh ? { refresh: true } : {})
    })
    if (generation !== configSearchGeneration.current) {
      return
    }
    if (result.ok) {
      setConfigHosts(result.result.hosts)
      setConfigHostCount(result.result.totalHostCount)
      setNewConfigHostCount(result.result.newHostCount)
      setConfigHostMatchesTruncated(result.result.hasMore)
    } else {
      setConfigHosts([])
      setConfigHostsError(result.error)
    }
    setIsLoadingConfigHosts(false)
  }

  const openSshConfigPicker = async () => {
    setSshView('config-picker')
    // Why: re-read ~/.ssh/config on open; the filter keystrokes reuse that parse.
    await loadSshConfigHosts('', { refresh: true })
  }

  const leaveSshConfigPicker = () => {
    configResolveGeneration.current += 1
    setResolvingConfigAlias(null)
    setSshView('form')
  }

  const selectSshConfigHost = async (host: SshConfigHostSummary) => {
    const generation = configResolveGeneration.current + 1
    configResolveGeneration.current = generation
    setResolvingConfigAlias(host.alias)
    // Why: a slower earlier pick must not overwrite the host the user settled on.
    const isStale = () => generation !== configResolveGeneration.current
    let resolved: SshConfigHostResolution | null
    try {
      resolved = await resolveSshConfigHost(host.alias)
    } catch (error) {
      if (isStale()) {
        return
      }
      setResolvingConfigAlias(null)
      toast.error(
        isStalePreloadError(error)
          ? translate(
              'auto.components.sidebar.AddRemoteHostDialog.sshConfigPickerRestartRequired',
              'Restart Orca to finish applying the SSH config picker update.'
            )
          : error instanceof Error
            ? error.message
            : translate(
                'auto.components.sidebar.AddRemoteHostDialog.sshConfigPickerResolveFailed',
                'Failed to resolve that SSH config host.'
              )
      )
      return
    }
    if (isStale()) {
      return
    }
    setResolvingConfigAlias(null)
    if (!resolved) {
      toast.error(
        translate(
          'auto.components.sidebar.AddRemoteHostDialog.sshConfigPickerResolveFailed',
          'Failed to resolve that SSH config host.'
        )
      )
      return
    }
    setSshForm(getEditingTargetFromSshConfigHost(resolved))
    setConfigFilledAlias(host.alias)
    setSshView('form')
    toast.success(
      translate(
        'auto.components.sidebar.AddRemoteHostDialog.sshConfigPickerFilled',
        'Filled from {{value0}}. Review and Save.',
        { value0: host.alias }
      )
    )
  }

  const addAllConfigHostsToRegistry = async () => {
    setIsBulkImporting(true)
    try {
      const result = await importSshConfig()
      if (result.targets.length === 0) {
        toast(
          translate(
            'auto.components.sidebar.AddRemoteHostDialog.sshImportAlreadySynced',
            '~/.ssh/config already in sync.'
          )
        )
        // Why: reuse the loader so the refresh keeps the active filter and stays inside the
        // generation guard against an in-flight debounced search.
        await loadSshConfigHosts(configSearchQuery.current)
        return
      }
      await hydrateSshTargets()
      useAppStore.getState().recordFeatureInteraction?.('ssh')
      toast.success(
        translate(
          'auto.components.sidebar.AddRemoteHostDialog.sshImportSynced',
          'Added {{value0}} host{{value1}} to Orca.',
          { value0: result.targets.length, value1: result.targets.length > 1 ? 's' : '' }
        )
      )
      reset()
      onOpenChange(null)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : translate(
              'auto.components.sidebar.AddRemoteHostDialog.sshImportFailed',
              'Failed to import SSH config.'
            )
      )
    } finally {
      setIsBulkImporting(false)
    }
  }

  const showSshConfigPicker = renderMode === 'ssh' && sshView === 'config-picker'

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          close()
        }
      }}
    >
      <DialogContent
        className={
          showSshConfigPicker
            ? 'flex max-h-[min(90vh,560px)] flex-col gap-0 overflow-hidden sm:max-w-xl'
            : 'scrollbar-sleek max-h-[min(90vh,560px)] overflow-y-auto sm:max-w-xl'
        }
      >
        {renderMode === 'server' ? (
          <AddRemoteHostServerFormPanel
            name={serverName}
            pairingCode={pairingCode}
            parsedLink={parsedLink}
            allowLoopback={allowLoopback}
            disabled={isBusy}
            canSubmit={
              serverName.trim() !== '' &&
              parsedLink.ok &&
              !loopbackRequiresOverride &&
              !isBusy
            }
            onNameChange={setServerName}
            onPairingCodeChange={(value) => {
              setPairingCode(value)
              // Why: the override belongs to the specific local address that was pasted; a
              // new link must earn the override again instead of inheriting it.
              setAllowLoopback(false)
            }}
            onAllowLoopbackChange={setAllowLoopback}
            onSubmit={() => void saveRemoteServer()}
            onCancel={close}
          />
        ) : showSshConfigPicker ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <AddRemoteHostSshConfigPicker
              hosts={configHosts}
              totalHostCount={configHostCount}
              newHostCount={newConfigHostCount}
              matchesTruncated={configHostMatchesTruncated}
              isLoading={isLoadingConfigHosts}
              isBulkImporting={isBulkImporting}
              resolvingAlias={resolvingConfigAlias}
              loadError={configHostsError}
              onSelect={(host) => void selectSshConfigHost(host)}
              onQueryChange={(query) => void loadSshConfigHosts(query)}
              onRetry={() => void loadSshConfigHosts(configSearchQuery.current, { refresh: true })}
              onBack={leaveSshConfigPicker}
              onAddAllToOrca={() => void addAllConfigHostsToRegistry()}
            />
          </div>
        ) : (
          <AddRemoteHostSshFormPanel
            form={sshForm}
            disabled={isBusy}
            configIdentityAlias={configFilledAlias}
            preferAdvancedOpen={preferAdvancedOpen}
            onFormChange={setSshForm}
            onSubmit={() => void saveSshHost()}
            onCancel={close}
            onFillFromConfig={() => void openSshConfigPicker()}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
