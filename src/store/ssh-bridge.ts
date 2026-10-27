import { invoke } from '@tauri-apps/api/core'
import type { SshTarget } from '../shared/ssh-types'
import { useAppStore } from './index'

/**
 * Tauri transport for the SSH host registry the backend exposes
 * (`src-tauri/src/ssh_hosts.rs`). This is the single bridge the live store uses
 * for SSH-target hydration, deliberately scoped to the two commands this boot
 * path needs — the add/update/remove/import dialog PR wires the remaining seven.
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
