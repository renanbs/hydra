// Tauri transport for the remote SSH filesystem/git commands
// (`src-tauri/src/ssh_remote.rs`).
//
// Every command runs on the host through the user's OpenSSH client with
// `BatchMode` + a connect timeout, so a target without a key fails fast instead
// of blocking the command. Payloads are validated here because IPC responses are
// external data: a malformed listing must fail loudly instead of feeding the
// picker a half-parsed directory.
import { invoke } from '@tauri-apps/api/core'

export type SshRemoteDirEntry = {
  name: string
  path: string
  kind: 'dir' | 'file'
  size?: number
}

export type SshRemoteDirListing = {
  /** Absolute directory the remote shell opened (`~` and relative paths resolve here). */
  resolvedPath: string
  entries: SshRemoteDirEntry[]
}

export type SshRemoteCloneResult = { path: string }
export type SshRemoteCreateProjectResult = { path: string }

export type SshRemotePreservedBranch = { branchName: string; head: string }

export type SshRemoteDeleteWorktreeResult = {
  worktreePath: string
  removed: boolean
  preservedBranches: SshRemotePreservedBranch[]
}

type RawDirEntry = { name?: unknown; path?: unknown; kind?: unknown; size?: unknown }
type RawDirListing = { resolvedPath?: unknown; entries?: unknown }
type RawPathResult = { path?: unknown }
type RawDeleteResult = {
  worktreePath?: unknown
  removed?: unknown
  preservedBranches?: unknown
}
type RawPreservedBranch = { branchName?: unknown; head?: unknown }

function normalizeEntry(value: unknown): SshRemoteDirEntry | null {
  const entry = value as RawDirEntry | null | undefined
  if (!entry || typeof entry !== 'object') return null
  if (typeof entry.name !== 'string' || entry.name === '') return null
  if (typeof entry.path !== 'string' || entry.path === '') return null
  if (entry.kind !== 'dir' && entry.kind !== 'file') return null
  const size =
    typeof entry.size === 'number' && Number.isFinite(entry.size) ? entry.size : undefined
  return size === undefined
    ? { name: entry.name, path: entry.path, kind: entry.kind }
    : { name: entry.name, path: entry.path, kind: entry.kind, size }
}

function normalizePreservedBranch(value: unknown): SshRemotePreservedBranch | null {
  const branch = value as RawPreservedBranch | null | undefined
  if (!branch || typeof branch.branchName !== 'string' || branch.branchName === '') return null
  return { branchName: branch.branchName, head: typeof branch.head === 'string' ? branch.head : '' }
}

/** One directory level on `connectionId`. `~` resolves to the host's home dir. */
export async function browseSshDirectory(
  connectionId: string,
  path: string
): Promise<SshRemoteDirListing> {
  const raw = (await invoke<unknown>('ssh_browse_dir', { connectionId, path })) as
    | RawDirListing
    | null
  if (!raw || typeof raw.resolvedPath !== 'string' || raw.resolvedPath === '' || !Array.isArray(raw.entries)) {
    throw new Error('Remote directory listing returned no data.')
  }
  return {
    resolvedPath: raw.resolvedPath,
    entries: raw.entries
      .map(normalizeEntry)
      .filter((entry): entry is SshRemoteDirEntry => entry !== null)
  }
}

/** Clones `url` on the host into `destination` and returns the created path. */
export async function cloneSshRepository(args: {
  connectionId: string
  url: string
  destination: string
  name?: string
}): Promise<SshRemoteCloneResult> {
  const raw = (await invoke<unknown>('ssh_remote_clone', {
    connectionId: args.connectionId,
    url: args.url,
    destination: args.destination,
    name: args.name ?? null
  })) as RawPathResult | null
  if (!raw || typeof raw.path !== 'string' || raw.path === '') {
    throw new Error('Remote clone returned no checkout path.')
  }
  return { path: raw.path }
}

/** Creates (and by default `git init`s) a project directory on the host. */
export async function createSshProject(args: {
  connectionId: string
  path: string
  name?: string
  initGit?: boolean
}): Promise<SshRemoteCreateProjectResult> {
  const raw = (await invoke<unknown>('ssh_remote_create_project', {
    connectionId: args.connectionId,
    path: args.path,
    name: args.name ?? null,
    initGit: args.initGit ?? true
  })) as RawPathResult | null
  if (!raw || typeof raw.path !== 'string' || raw.path === '') {
    throw new Error('Remote project creation returned no path.')
  }
  return { path: raw.path }
}

/**
 * Removes a worktree on the host. `force` is explicit, exactly like the local
 * delete: without it Git refuses a dirty or locked checkout.
 */
export async function deleteSshWorktree(args: {
  connectionId: string
  repoPath: string
  worktreePath: string
  force: boolean
}): Promise<SshRemoteDeleteWorktreeResult> {
  const raw = (await invoke<unknown>('ssh_remote_delete_worktree', {
    connectionId: args.connectionId,
    repoPath: args.repoPath,
    worktreePath: args.worktreePath,
    force: args.force
  })) as RawDeleteResult | null
  if (!raw || typeof raw.worktreePath !== 'string' || raw.worktreePath === '') {
    throw new Error('Remote worktree removal returned no outcome.')
  }
  const preservedBranches = Array.isArray(raw.preservedBranches)
    ? raw.preservedBranches
        .map(normalizePreservedBranch)
        .filter((branch): branch is SshRemotePreservedBranch => branch !== null)
    : []
  return {
    worktreePath: raw.worktreePath,
    removed: raw.removed === true,
    preservedBranches
  }
}
