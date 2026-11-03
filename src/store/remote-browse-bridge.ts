// Remote directory listings for the folder picker.
//
// BLOCKED on the backend: `src-tauri/src` exposes no `ssh_browse_dir` (or runtime directory
// browse) command, so both transports reject with an explicit typed error. The picker already
// renders that as its error state, which keeps Save disabled instead of selecting a path it
// never listed. When the command lands, only this module changes.
import { invoke } from '@tauri-apps/api/core'
import type { FilesystemPathFlavor } from '../shared/filesystem-entry-types'

export type RemoteBrowseEntry = {
  name: string
  isDirectory: boolean
}

export type RemoteBrowseResult = {
  resolvedPath: string
  entries: RemoteBrowseEntry[]
  pathFlavor: FilesystemPathFlavor
}

export class RemoteBrowseUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RemoteBrowseUnavailableError'
  }
}

const SSH_BROWSE_UNAVAILABLE =
  'Browsing a remote folder needs `ssh_browse_dir`, which this build does not provide.'

function normalizeEntry(value: unknown): RemoteBrowseEntry | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  if (!('name' in value) || typeof value.name !== 'string' || value.name === '') {
    return null
  }
  if (!('isDirectory' in value) || typeof value.isDirectory !== 'boolean') {
    return null
  }
  return { name: value.name, isDirectory: value.isDirectory }
}

/** IPC payloads are external data: validate the listing before the picker indexes it. */
function normalizeBrowseResult(value: unknown): RemoteBrowseResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Remote directory listing returned no data.')
  }
  const resolvedPath = 'resolvedPath' in value ? value.resolvedPath : undefined
  const entries = 'entries' in value ? value.entries : undefined
  const pathFlavor = 'pathFlavor' in value ? value.pathFlavor : undefined
  if (typeof resolvedPath !== 'string' || !Array.isArray(entries)) {
    throw new Error('Remote directory listing is malformed.')
  }
  return {
    resolvedPath,
    entries: entries
      .map(normalizeEntry)
      .filter((entry): entry is RemoteBrowseEntry => entry !== null),
    pathFlavor: pathFlavor === 'win32' ? 'win32' : 'posix'
  }
}

function isUnknownCommandError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /not found|unknown command|no such command|not allowed/i.test(message)
}

/** Listed children of `dirPath` on one SSH target. `~` resolves to the host's home dir. */
export async function browseSshDirectory(
  targetId: string,
  dirPath: string
): Promise<RemoteBrowseResult> {
  try {
    return normalizeBrowseResult(
      await invoke('ssh_browse_dir', { targetId, dirPath })
    )
  } catch (error) {
    if (isUnknownCommandError(error)) {
      throw new RemoteBrowseUnavailableError(SSH_BROWSE_UNAVAILABLE)
    }
    throw error
  }
}

/** Listed children of `dirPath` on a paired runtime host. Same missing-backend guard. */
export async function browseRuntimeServerDirectory(
  runtimeEnvironmentId: string,
  dirPath: string
): Promise<RemoteBrowseResult> {
  try {
    return normalizeBrowseResult(
      await invoke('runtime_browse_server_directory', { runtimeEnvironmentId, dirPath })
    )
  } catch (error) {
    if (isUnknownCommandError(error)) {
      throw new RemoteBrowseUnavailableError(
        'Browsing a paired server folder needs `runtime_browse_server_directory`, which this build does not provide.'
      )
    }
    throw error
  }
}
