// Remote SSH filesystem/git transport: the renderer must speak the exact command
// names and argument shapes `src-tauri/src/ssh_remote.rs` exposes, and must reject
// malformed IPC payloads instead of feeding the picker a half-parsed listing.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  browseSshDirectory,
  cloneSshRepository,
  createSshProject,
  deleteSshWorktree
} from './ssh-remote-bridge'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

beforeEach(() => {
  invokeMock.mockReset()
})

describe('browseSshDirectory', () => {
  it('lists one level through ssh_browse_dir and keeps entries with sizes', async () => {
    invokeMock.mockResolvedValue({
      resolvedPath: '/home/deploy',
      entries: [
        { name: 'projects', path: '/home/deploy/projects', kind: 'dir' },
        { name: 'notes.md', path: '/home/deploy/notes.md', kind: 'file', size: 12 }
      ]
    })

    const listing = await browseSshDirectory('srv', '~')

    expect(invokeMock).toHaveBeenCalledWith('ssh_browse_dir', {
      connectionId: 'srv',
      path: '~'
    })
    expect(listing.resolvedPath).toBe('/home/deploy')
    expect(listing.entries).toEqual([
      { name: 'projects', path: '/home/deploy/projects', kind: 'dir' },
      { name: 'notes.md', path: '/home/deploy/notes.md', kind: 'file', size: 12 }
    ])
  })

  it('drops entries the picker cannot render and rejects a listing without a directory', async () => {
    invokeMock.mockResolvedValue({
      resolvedPath: '/home/deploy',
      entries: [
        { name: 'ok', path: '/home/deploy/ok', kind: 'file' },
        { name: '', path: '/home/deploy/empty', kind: 'dir' },
        { name: 'weird', path: '/home/deploy/weird', kind: 'socket' }
      ]
    })
    const listing = await browseSshDirectory('srv', '/home/deploy')
    expect(listing.entries.map((entry) => entry.name)).toEqual(['ok'])

    invokeMock.mockResolvedValue({ entries: [] })
    await expect(browseSshDirectory('srv', '~')).rejects.toThrow(
      'Remote directory listing returned no data.'
    )
  })

  it('surfaces the backend error unchanged', async () => {
    invokeMock.mockRejectedValue(new Error('Cannot open directory: /nope'))
    await expect(browseSshDirectory('srv', '/nope')).rejects.toThrow(
      'Cannot open directory: /nope'
    )
  })
})

describe('cloneSshRepository', () => {
  it('clones on the host and returns the created checkout path', async () => {
    invokeMock.mockResolvedValue({ path: '/srv/code/widgets' })

    const result = await cloneSshRepository({
      connectionId: 'srv',
      url: 'https://github.com/acme/widgets.git',
      destination: '/srv/code'
    })

    expect(invokeMock).toHaveBeenCalledWith('ssh_remote_clone', {
      connectionId: 'srv',
      url: 'https://github.com/acme/widgets.git',
      destination: '/srv/code',
      name: null
    })
    expect(result).toEqual({ path: '/srv/code/widgets' })
  })

  it('rejects a success payload without a path', async () => {
    invokeMock.mockResolvedValue({})
    await expect(
      cloneSshRepository({ connectionId: 'srv', url: 'u', destination: '/srv' })
    ).rejects.toThrow('Remote clone returned no checkout path.')
  })
})

describe('createSshProject', () => {
  it('creates and initializes a project directory by default', async () => {
    invokeMock.mockResolvedValue({ path: '/srv/projects/demo' })

    const result = await createSshProject({
      connectionId: 'srv',
      path: '/srv/projects',
      name: 'demo'
    })

    expect(invokeMock).toHaveBeenCalledWith('ssh_remote_create_project', {
      connectionId: 'srv',
      path: '/srv/projects',
      name: 'demo',
      initGit: true
    })
    expect(result.path).toBe('/srv/projects/demo')
  })

  it('keeps an explicit initGit=false', async () => {
    invokeMock.mockResolvedValue({ path: '/srv/plain' })
    await createSshProject({ connectionId: 'srv', path: '/srv/plain', initGit: false })
    expect(invokeMock).toHaveBeenCalledWith('ssh_remote_create_project', {
      connectionId: 'srv',
      path: '/srv/plain',
      name: null,
      initGit: false
    })
  })
})

describe('deleteSshWorktree', () => {
  it('forwards force and reports preserved branches', async () => {
    invokeMock.mockResolvedValue({
      worktreePath: '/srv/wt/login',
      removed: true,
      preservedBranches: [{ branchName: 'feat/login', head: 'abc123' }]
    })

    const result = await deleteSshWorktree({
      connectionId: 'srv',
      repoPath: '/srv/repo',
      worktreePath: '/srv/wt/login',
      force: true
    })

    expect(invokeMock).toHaveBeenCalledWith('ssh_remote_delete_worktree', {
      connectionId: 'srv',
      repoPath: '/srv/repo',
      worktreePath: '/srv/wt/login',
      force: true
    })
    expect(result).toEqual({
      worktreePath: '/srv/wt/login',
      removed: true,
      preservedBranches: [{ branchName: 'feat/login', head: 'abc123' }]
    })
  })

  it('normalizes a payload without branches and a non-boolean removed flag', async () => {
    invokeMock.mockResolvedValue({ worktreePath: '/srv/wt/x', preservedBranches: 'nope' })
    const result = await deleteSshWorktree({
      connectionId: 'srv',
      repoPath: '/srv/repo',
      worktreePath: '/srv/wt/x',
      force: false
    })
    expect(result).toEqual({
      worktreePath: '/srv/wt/x',
      removed: false,
      preservedBranches: []
    })
  })
})
