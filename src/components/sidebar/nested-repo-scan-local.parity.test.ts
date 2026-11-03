// D02a-022/023/041: the local nested scan reports real git directories, skips
// vendored trees, honors depth/repo limits and can be stopped by scan id.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }))

import {
  cancelLocalNestedRepoScan,
  getSelectedNestedRepoPathsInScanOrder,
  scanNestedReposLocal
} from './nested-repo-scan-local'

type Entry = { name: string; path: string; is_dir: boolean; is_hidden: boolean }

function dir(name: string, base: string): Entry {
  return { name, path: `${base}/${name}`, is_dir: true, is_hidden: name.startsWith('.') }
}

function fakeTree(): Record<string, Entry[]> {
  return {
    '/root': [dir('repoA', '/root'), dir('node_modules', '/root'), dir('src', '/root')],
    '/root/repoA': [dir('.git', '/root/repoA')],
    '/root/src': [dir('repoB', '/root/src'), dir('nested', '/root/src')],
    '/root/src/repoB': [dir('.git', '/root/src/repoB')],
    '/root/src/nested': [dir('repoC', '/root/src/nested')],
    '/root/src/nested/repoC': [dir('.git', '/root/src/nested/repoC')]
  }
}

beforeEach(() => {
  invokeMock.mockReset()
  invokeMock.mockImplementation((command: string, args: { path: string }) => {
    if (command !== 'list_directory_cmd') return Promise.resolve(undefined)
    const entries = fakeTree()[args.path]
    return entries ? Promise.resolve({ path: args.path, entries }) : Promise.reject(new Error('missing'))
  })
})

describe('scanNestedReposLocal (D02a-022/023)', () => {
  it('finds repositories, skips node_modules and reports depth', async () => {
    const scan = await scanNestedReposLocal({ path: '/root' })
    expect(scan.selectedPathKind).toBe('non_git_folder')
    expect(scan.repos.map((repo) => [repo.path, repo.depth])).toEqual([
      ['/root/repoA', 1],
      ['/root/src/repoB', 2],
      ['/root/src/nested/repoC', 3]
    ])
    expect(invokeMock).not.toHaveBeenCalledWith('list_directory_cmd', {
      path: '/root/node_modules'
    })
  })

  it('returns a git-root result without walking children', async () => {
    invokeMock.mockImplementation((command: string, args: { path: string }) =>
      command === 'list_directory_cmd' && args.path === '/root'
        ? Promise.resolve({ path: '/root', entries: [dir('.git', '/root'), dir('child', '/root')] })
        : Promise.reject(new Error('should not descend'))
    )
    const scan = await scanNestedReposLocal({ path: '/root' })
    expect(scan.selectedPathKind).toBe('git_repo')
    expect(scan.repos).toEqual([])
  })

  it('honors maxDepth and maxRepos limits', async () => {
    const shallow = await scanNestedReposLocal({ path: '/root', options: { maxDepth: 2 } })
    expect(shallow.repos.map((repo) => repo.path)).toEqual([
      '/root/repoA',
      '/root/src/repoB'
    ])

    const capped = await scanNestedReposLocal({ path: '/root', options: { maxRepos: 1 } })
    expect(capped.repos).toHaveLength(1)
    expect(capped.truncated).toBe(true)
  })

  it('stops the traversal when the scan id is cancelled', async () => {
    const scan = await scanNestedReposLocal({
      path: '/root',
      scanId: 'nested-repo-scan-test',
      onProgress: (progress) => {
        if (progress.repos.length === 1) {
          cancelLocalNestedRepoScan('nested-repo-scan-test')
        }
      }
    })
    expect(scan.stopped).toBe(true)
    expect(scan.repos).toHaveLength(1)
  })

  it('keeps selected paths in scan order', async () => {
    const scan = await scanNestedReposLocal({ path: '/root' })
    expect(
      getSelectedNestedRepoPathsInScanOrder(scan, new Set(['/root/src/repoB', '/root/repoA']))
    ).toEqual(['/root/repoA', '/root/src/repoB'])
  })
})
