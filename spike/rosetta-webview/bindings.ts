// Real bindings for the three groups this spike wires to Hydra: repos, ssh, ui.
// Every other path stays an orphan and is reported to the Rust logger, which is
// the number this spike exists to measure.
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { open } from '@tauri-apps/plugin-dialog'

const HOST = 'local'

const repoPathById = new Map<string, string>()

type HydraWorktree = {
  path: string
  head_commit: string
  branch: string
  is_bare: boolean
  created_at?: number | null
  display_name?: string | null
  is_main?: boolean | null
  is_pinned?: boolean | null
  is_unread?: boolean | null
  status?: string | null
}

/** Hydra's scan row → Orca's Worktree (the shape the sidebar store reads). */
function toOrcaWorktree(repoId: string, row: HydraWorktree) {
  const id = `${repoId}::${row.path}`
  return {
    id,
    repoId,
    projectId: repoId,
    displayName: row.display_name ?? row.branch ?? row.path,
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: row.is_unread ?? false,
    isPinned: row.is_pinned ?? false,
    sortOrder: 0,
    lastActivityAt: row.created_at ?? 0,
    createdAt: row.created_at ?? undefined,
    path: row.path,
    head: row.head_commit,
    branch: row.branch,
    isBare: row.is_bare,
    isMainWorktree: row.is_main ?? row.path === repoPathById.get(repoId),
    workspaceStatus: row.status ?? undefined
  }
}

type CatalogRepo = {
  id: string
  path: string
  display_name: string
  added_at: number
  kind?: string | null
  project_group_id?: string | null
}

async function listCatalogRepos(): Promise<CatalogRepo[]> {
  const catalog = await invoke<{ repos?: CatalogRepo[] }>('catalog_get').catch(() => ({ repos: [] }))
  return catalog.repos ?? []
}

/** Best-effort Orca `Repo[]` from Hydra's project rows. */
function toRepo(project: Record<string, unknown>) {
  const path = String(project.path ?? '')
  return {
    id: String(project.id ?? path),
    path,
    displayName: String(project.name ?? path),
    badgeColor: '#64748b',
    addedAt: 0,
    projectGroupId: null,
    kind: project.is_git === false ? 'folder' : 'git',
    executionHostId: HOST
  }
}

export function createHydraBindings(): Record<string, (...args: any[]) => unknown> {
  return {
    'repos.list': async () =>
      (await listCatalogRepos()).map((repo) => {
        repoPathById.set(repo.id, repo.path)
        return {
          id: repo.id,
          path: repo.path,
          displayName: repo.display_name,
          badgeColor: '#64748b',
          addedAt: repo.added_at,
          projectGroupId: repo.project_group_id ?? null,
          kind: repo.kind === 'folder' ? 'folder' : 'git',
          executionHostId: HOST
        }
      }),
    'repos.pickDirectory': () => open({ directory: true, multiple: false }),
    'repos.pickFolder': () => open({ directory: true, multiple: false }),
    'repos.pickFolders': async () => {
      const picked = await open({ directory: true, multiple: true })
      return Array.isArray(picked) ? picked : picked ? [picked] : []
    },
    'repos.isGitAvailable': async () => {
      const status = await invoke<{ git_installed: boolean }>('check_preflight_tools_cmd')
      return status.git_installed
    },
    'repos.getDefaultCreateProjectParent': async () => {
      const settings = await invoke<{ workspace_dir?: string }>('get_settings')
      return settings.workspace_dir ?? ''
    },
    'repos.add': async (args: { path: string }) => {
      await invoke('catalog_add_folder', { path: args.path })
      return { repo: toRepo({ path: args.path }) }
    },
    'repos.addRemote': async (args: { remotePath: string }) => {
      if (args.remotePath !== HOST) {
        throw new Error('rosetta: remote repos are not bridged yet')
      }
      await invoke('catalog_add_folder', { path: args.remotePath })
      return { repo: toRepo({ path: args.remotePath }) }
    },
    'repos.create': async (args: { parentPath: string; name: string }) => {
      const path = await invoke<string>('create_project', {
        name: args.name,
        parentDir: args.parentPath,
        initGit: true
      })
      return { repo: toRepo({ path }) }
    },
    'repos.clone': async (args: { url: string; destination: string }) => {
      const path = await invoke<string>('clone_project', {
        url: args.url,
        parentDir: args.destination
      })
      return toRepo({ path })
    },
    // Hydra is single-host: no per-host project setups to project. Explicit empty
    // values (not orphans) so the catalog merge can settle instead of rejecting.
    'projects.list': async () => [],
    'projects.listHostSetups': async () => [],
    'worktrees.list': async (args: { repoId: string }) => {
      const repoPath = repoPathById.get(args.repoId) ?? args.repoId
      const rows = await invoke<HydraWorktree[]>('list_worktrees', { repoPath })
      return rows.map((row) => toOrcaWorktree(args.repoId, row))
    },
    'ssh.listTargets': () => invoke('ssh_list_targets'),
    'ssh.listRemovedTargetLabels': () => invoke('ssh_list_removed_target_labels'),
    // Synchronous in Orca's preload; the shim returns binding results unwrapped.
    'preflight.check': async () => {
      const status = await invoke<{ git_installed: boolean; gh_installed: boolean; gh_authenticated: boolean }>(
        'check_preflight_tools_cmd'
      )
      return {
        git: { installed: status.git_installed },
        gh: { installed: status.gh_installed, authenticated: status.gh_authenticated }
      }
    },
    'platform.get': () => ({
      platform: 'linux' as NodeJS.Platform,
      osRelease: '',
      arch: 'x64',
      shell: '',
      displayServer: 'wayland' as const
    }),
    'ui.writeClipboardText': (text: string) => navigator.clipboard.writeText(text),
    'ui.onFileDrop': (callback: (event: unknown) => void) => {
      let unlisten: (() => void) | null = null
      void getCurrentWebview()
        .onDragDropEvent((event) => callback(event.payload))
        .then((dispose) => {
          unlisten = dispose
        })
        .catch(() => {})
      return () => unlisten?.()
    },
    'shell.openUrl': (url: string) => invoke('open_external_url_cmd', { url }),
    'shell.openInFileManager': (path: string) => invoke('open_in_file_manager', { path }),
    'shell.openInExternalEditor': (path: string) => invoke('open_in_external_editor', { path })
  }
}
