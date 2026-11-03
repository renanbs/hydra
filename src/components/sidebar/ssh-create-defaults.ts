// D02a-017: a new SSH project lands in `~/orca/projects` on that host, and Git
// availability is probed on the host instead of this machine. The host resolves
// `~`, so the default survives a different remote home layout.
import { invoke } from '@tauri-apps/api/core'
import { getDefaultCreateProjectParent, type GitAvailability } from './create-project-defaults'

export const SSH_DEFAULT_CREATE_PARENT = '~/orca/projects'

type SshDirListing = {
  resolvedPath: string
  entries: Array<{ name: string; path: string; kind: string }>
}

export type SshGitProbe = {
  gitAvailable: boolean
  isGitRepository: boolean
}

export async function resolveSshCreateParentDefault(
  connectionId: string
): Promise<string> {
  try {
    const listing = await invoke<SshDirListing>('ssh_browse_dir', {
      connectionId,
      path: '~',
    })
    const home = listing.resolvedPath?.trim()
    if (!home) {
      return SSH_DEFAULT_CREATE_PARENT
    }
    return getDefaultCreateProjectParent(home) || SSH_DEFAULT_CREATE_PARENT
  } catch {
    // Why fallback: the literal still expands on the host, and refusing to
    // default would force the user to type a path before they can create.
    return SSH_DEFAULT_CREATE_PARENT
  }
}

export async function probeSshGit(
  connectionId: string,
  path: string
): Promise<SshGitProbe> {
  return invoke<SshGitProbe>('ssh_remote_probe_git', {
    connectionId,
    path: path.trim() || SSH_DEFAULT_CREATE_PARENT,
  })
}

/** Renderer-facing probe state; `unknown` keeps create enabled when the host
 *  cannot answer, matching the local probe's fail-open behavior. */
export async function resolveSshGitAvailability(
  connectionId: string,
  path: string
): Promise<GitAvailability> {
  try {
    const probe = await probeSshGit(connectionId, path)
    return probe.gitAvailable ? 'available' : 'unavailable'
  } catch {
    return 'unknown'
  }
}
