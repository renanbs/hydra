import { invoke } from '@tauri-apps/api/core'
import type {
  SshConfigHostListArgs,
  SshConfigHostListResult,
  SshConfigHostResolution,
  SshConfigImportResult,
  SshTarget,
  SshTargetAddResult,
  SshTargetCreateInput
} from '../shared/ssh-types'
import { useAppStore } from './index'

/**
 * Tauri transport for the SSH host registry the backend exposes
 * (`src-tauri/src/ssh_hosts.rs`). `hydrateSshTargets` is the boot path the live
 * store uses; the functions below are the registry mutations and reads the
 * Add-host dialog drives. The update/remove commands stay with the Settings
 * pane that owns them.
 *
 * The `ssh_hosts` commands return serde camelCase payloads that mirror
 * `src/shared/ssh-types.ts`, so no reshaping happens here.
 */
export async function hydrateSshTargets(): Promise<void> {
  const [targets, removedLabels] = await Promise.all([
    invoke<SshTarget[]>('ssh_list_targets'),
    invoke<Record<string, string>>('ssh_list_removed_target_labels')
  ])
  const { setSshTargetsMetadata, setRemovedSshTargetLabels } = useAppStore.getState()
  // `setSshTargetsMetadata` flips `sshTargetsHydrated` (even for an empty list);
  // `setRemovedSshTargetLabels` carries the re-adoption tombstones for ghost hosts.
  setSshTargetsMetadata(targets)
  setRemovedSshTargetLabels(removedLabels)
}

/**
 * `~/.ssh/config` hosts for the add-host picker. `refresh` re-reads the file;
 * filter keystrokes reuse that parse, so only the picker's open/retry passes it.
 */
export async function listSshConfigHosts(
  args: SshConfigHostListArgs = {}
): Promise<SshConfigHostListResult> {
  return invoke<SshConfigHostListResult>('ssh_list_config_hosts', {
    query: args.query ?? null,
    refresh: args.refresh ?? null
  })
}

/** Effective OpenSSH values (`ssh -G`) that prefill the manual form for one alias. */
export async function resolveSshConfigHost(alias: string): Promise<SshConfigHostResolution | null> {
  return invoke<SshConfigHostResolution | null>('ssh_resolve_config_host', { alias })
}

/** Persist one renderer-authored target. Main allocates the id and generation. */
export async function addSshTarget(target: SshTargetCreateInput): Promise<SshTargetAddResult> {
  return invoke<SshTargetAddResult>('ssh_add_target', { target })
}

/**
 * Bulk-import the new `~/.ssh/config` hosts. `reAdopt` stays off: the picker's
 * `Add all N` promises only the new hosts it counted, and re-adopting would
 * resurrect aliases the user deleted. Settings → SSH owns the re-adopt path.
 */
export async function importSshConfig(): Promise<SshConfigImportResult> {
  return invoke<SshConfigImportResult>('ssh_import_config', { reAdopt: null })
}
