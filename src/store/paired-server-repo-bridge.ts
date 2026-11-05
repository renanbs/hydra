// Tauri+E2EE transport for paired-server git commands (`repo.clone`,
// `repo.create` over the browser WebSocket from PR1).
//
// Mirrors `ssh-remote-bridge.ts`: the stored offer resolves the environment,
// the E2EE transport carries the call, and payloads are validated here because
// RPC responses are external data.
import { callPairedServerRpc } from './runtime-environment-bridge'

export type PairedServerCloneResult = { path: string }
export type PairedServerCreateProjectResult = { path: string }

type RawRepoResult = { repo?: { path?: unknown } | null; error?: { message?: unknown } | string | null }

function repoPathFromResult(value: unknown, method: string): string {
  const raw = value as RawRepoResult | null | undefined
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Remote ${method} returned no data.`)
  }
  if (raw.error !== undefined && raw.error !== null) {
    const message =
      typeof raw.error === 'string'
        ? raw.error
        : typeof raw.error === 'object' && typeof raw.error.message === 'string'
          ? raw.error.message
          : `Remote ${method} failed.`
    throw new Error(message)
  }
  const path = raw.repo?.path
  if (typeof path !== 'string' || path === '') {
    throw new Error(`Remote ${method} returned no checkout path.`)
  }
  return path
}

/** Clones `url` into `destination` on the paired server; returns the checkout path. */
export async function clonePairedServerRepository(args: {
  environmentId: string
  url: string
  destination: string
}): Promise<PairedServerCloneResult> {
  const raw = await callPairedServerRpc<unknown>(
    args.environmentId,
    'repo.clone',
    { url: args.url, destination: args.destination },
    10 * 60_000
  )
  return { path: repoPathFromResult(raw, 'repo.clone') }
}

/** Creates (and `git init`s) a project directory on the paired server. */
export async function createPairedServerProject(args: {
  environmentId: string
  path: string
  name: string
}): Promise<PairedServerCreateProjectResult> {
  const raw = await callPairedServerRpc<unknown>(
    args.environmentId,
    'repo.create',
    { parentPath: args.path, name: args.name, kind: 'git' },
    60_000
  )
  return { path: repoPathFromResult(raw, 'repo.create') }
}
