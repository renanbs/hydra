import { invoke } from '@tauri-apps/api/core'
import type {
  SshConfigHostListArgs,
  SshConfigHostListResult,
  SshConfigHostResolution,
  SshConfigImportResult,
  SshRemoveTargetResult,
  SshTarget,
  SshTargetAddResult,
  SshTargetCreateInput,
  SshTargetUpdateInput
} from '../shared/ssh-types'
import { useAppStore } from './index'

/**
 * Tauri transport for the SSH host registry the backend exposes
 * (`src-tauri/src/ssh_hosts.rs`). `hydrateSshTargets` is the boot path the live
 * store uses and the single re-read every registry mutation ends with; the
 * functions below are the registry mutations and reads the Add-host dialog and
 * the sidebar host-header menu drive.
 *
 * The `ssh_hosts` commands return serde camelCase payloads that mirror
 * `src/shared/ssh-types.ts`, so no reshaping happens here.
 */

/**
 * Re-read the registry into the store and hand back the full target rows.
 *
 * The store only keeps the label/generation projection (`sshTargetLabels`,
 * `sshTargetGenerations`); the Settings pane needs the whole row (endpoint,
 * config alias, source, generation), so the same read that hydrates the store
 * also returns the list it fetched instead of a second `ssh_list_targets` call.
 */
export async function hydrateSshTargets(): Promise<SshTarget[]> {
  const [targets, removedLabels] = await Promise.all([
    invoke<SshTarget[]>('ssh_list_targets'),
    invoke<Record<string, string>>('ssh_list_removed_target_labels')
  ])
  const { setSshTargetsMetadata, setRemovedSshTargetLabels } = useAppStore.getState()
  // `setSshTargetsMetadata` flips `sshTargetsHydrated` (even for an empty list);
  // `setRemovedSshTargetLabels` carries the re-adoption tombstones for ghost hosts.
  setSshTargetsMetadata(targets)
  setRemovedSshTargetLabels(removedLabels)
  return targets
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
 * Patch one registry target. `null` means main holds no target with that id — the
 * host was removed between the menu opening and the write, so callers must treat
 * it as "nothing to update" rather than as a successful rename.
 */
export async function updateSshTarget(
  targetId: string,
  updates: SshTargetUpdateInput
): Promise<SshTarget | null> {
  return invoke<SshTarget | null>('ssh_update_target', { id: targetId, updates })
}

/**
 * Delete one registry target. Main tombstones it and suppresses its config alias,
 * so re-reading the registry is what makes the host disappear and turns its
 * label into a removed-target label.
 */
export async function removeSshTarget(targetId: string): Promise<SshRemoveTargetResult> {
  return invoke<SshRemoveTargetResult>('ssh_remove_target', { id: targetId })
}

/**
 * Bulk-import the new `~/.ssh/config` hosts. `reAdopt` stays off: the picker's
 * `Add all N` promises only the new hosts it counted, and re-adopting would
 * resurrect aliases the user deleted. Settings → SSH owns the re-adopt path.
 */
export async function importSshConfig(): Promise<SshConfigImportResult> {
  return invoke<SshConfigImportResult>('ssh_import_config', { reAdopt: null })
}
