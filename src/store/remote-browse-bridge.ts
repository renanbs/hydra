// Remote directory listings for the folder picker.
//
// SSH is backed by `ssh_browse_dir` (`src-tauri/src/ssh_remote.rs`), which lists
// one level through the host's OpenSSH client and resolves `~`. A paired runtime
// server lists through the E2EE `runtime_browse_server_directory` RPC over the
// browser WebSocket transport; when the server does not implement it, that
// rejection renders as the picker's error state and Save stays disabled instead
// of selecting a path it never listed.
import type { FilesystemPathFlavor } from '../shared/filesystem-entry-types'
import { browseSshDirectory as browseRemoteSshDirectory } from './ssh-remote-bridge'
import { callPairedServerRpc } from './runtime-environment-bridge'

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

const RUNTIME_BROWSE_UNAVAILABLE =
  'Browsing a paired server folder needs `runtime_browse_server_directory`, which this build does not provide.'

type RawRuntimeEntry = { name?: unknown; isDirectory?: unknown }
type RawRuntimeBrowse = { resolvedPath?: unknown; entries?: unknown }

function normalizeEntry(value: unknown): RemoteBrowseEntry | null {
  const entry = value as RawRuntimeEntry | null | undefined
  if (!entry || typeof entry !== 'object') return null
  if (typeof entry.name !== 'string' || entry.name === '') return null
  if (typeof entry.isDirectory !== 'boolean') return null
  return { name: entry.name, isDirectory: entry.isDirectory }
}

/** IPC payloads are external data: validate the listing before the picker indexes it. */
function normalizeRuntimeBrowseResult(value: unknown): RemoteBrowseResult {
  const raw = value as RawRuntimeBrowse | null
  if (!raw || typeof raw.resolvedPath !== 'string' || !Array.isArray(raw.entries)) {
    throw new Error('Remote directory listing returned no data.')
  }
  return {
    resolvedPath: raw.resolvedPath,
    entries: raw.entries
      .map(normalizeEntry)
      .filter((entry): entry is RemoteBrowseEntry => entry !== null),
    pathFlavor: 'posix'
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
  const listing = await browseRemoteSshDirectory(targetId, dirPath)
  return {
    resolvedPath: listing.resolvedPath,
    entries: listing.entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.kind === 'dir'
    })),
    // The remote listing runs through a POSIX `sh` script, so separators and
    // breadcrumbs use POSIX semantics even when the host is Windows + OpenSSH.
    pathFlavor: 'posix'
  }
}

/** Listed children of `dirPath` on a paired runtime host. */
export async function browseRuntimeServerDirectory(
  runtimeEnvironmentId: string,
  dirPath: string
): Promise<RemoteBrowseResult> {
  try {
    return normalizeRuntimeBrowseResult(
      await callPairedServerRpc('runtime_browse_server_directory', runtimeEnvironmentId, {
        dirPath
      })
    )
  } catch (error) {
    if (isUnknownCommandError(error)) {
      throw new RemoteBrowseUnavailableError(RUNTIME_BROWSE_UNAVAILABLE)
    }
    throw error
  }
}
