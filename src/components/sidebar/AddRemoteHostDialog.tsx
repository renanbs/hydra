// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Parity with Orca `components/sidebar/AddRemoteHostDialog.tsx`, reduced to the SSH mode:
// `~/.ssh/config` picker + manual form, with the picker's search generation-guarded so a
// slow response cannot overwrite a newer keystroke or a resolve the user backed out of.
// Orca's `server` mode (Orca-server pairing, D02b-008..010) is a separate PR, so it is
// absent here instead of being a dead branch and an inert prop.
import { useRef, useState } from 'react'
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
import type {
  SshConfigHostListArgs,
  SshConfigHostListResult,
  SshConfigHostResolution,
  SshConfigHostSummary,
  SshTargetCreateInput
} from '../../shared/ssh-types'
import {
  EMPTY_FORM,
  getEditingTargetFromSshConfigHost,
  getSshTargetDraftConnectionFields,
  type EditingTarget
} from '../settings/ssh-target-draft'
import { AddRemoteHostSshConfigPicker } from './AddRemoteHostSshConfigPicker'
import { AddRemoteHostSshFormPanel } from './AddRemoteHostSshFormPanel'

/** Non-null while the dialog is open. Orca's `server` mode joins this union in the
 *  pairing PR; the dialog switches on it there, not here. */
export type AddRemoteHostMode = 'ssh'

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

async function saveNewSshHostFromForm(
  form: EditingTarget
): Promise<'saved' | 'validation-failed' | 'failed'> {
  const { host, configHost, username, port } = getSshTargetDraftConnectionFields(form)
  if (!host) {
    toast.error(
      translate(
        'auto.components.sidebar.AddRemoteHostDialog.sshHostRequired',
        'Host or SSH config alias is required.'
      )
    )
    return 'validation-failed'
  }
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    toast.error(
      translate(
        'auto.components.sidebar.AddRemoteHostDialog.sshPortInvalid',
        'Port must be between 1 and 65535.'
      )
    )
    return 'validation-failed'
  }

  const identityFile = form.identityFile.trim() || undefined
  const target: SshTargetCreateInput = {
    label: form.label.trim() || (username ? `${username}@${host}` : configHost || host),
    configHost,
    host,
    port,
    username,
    ...(identityFile ? { identityFile } : {})
  }

  try {
    await addSshTarget(target)
    // Why: one re-read of the registry, so the new host shows up in the sidebar's
    // Hosts subtree without a reload. Same read the boot path uses.
    await hydrateSshTargets()
    toast.success(
      translate('auto.components.sidebar.AddRemoteHostDialog.sshSaved', 'SSH host added.')
    )
    return 'saved'
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : translate(
            'auto.components.sidebar.AddRemoteHostDialog.sshSaveFailed',
            'Failed to add SSH host.'
          )
    )
    return 'failed'
  }
}

export function AddRemoteHostDialog({
  mode,
  onOpenChange
}: AddRemoteHostDialogProps): React.JSX.Element {
  const open = mode !== null
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
  const configSearchGeneration = useRef(0)
  const configSearchQuery = useRef('')
  const configResolveGeneration = useRef(0)

  const reset = () => {
    setSshForm(EMPTY_FORM)
    setSshView('form')
    setConfigHosts([])
    setConfigHostCount(0)
    setNewConfigHostCount(0)
    setConfigHostMatchesTruncated(false)
    setConfigHostsError(null)
    configSearchQuery.current = ''
    // Why: a pending resolve must never write into a form the dialog has moved on from.
    configResolveGeneration.current += 1
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
    setIsSaving(true)
    try {
      const outcome = await saveNewSshHostFromForm(sshForm)
      if (outcome === 'saved') {
        reset()
        onOpenChange(null)
      }
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
        error instanceof Error
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

  const showSshConfigPicker = sshView === 'config-picker'

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
        {showSshConfigPicker ? (
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
            disabled={isSaving}
            configIdentityAlias={configFilledAlias}
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
