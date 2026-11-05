// Paired-server repo transport: clone/create go through the E2EE
// `runtime_browse_server_directory`-style RPC (`callPairedServerRpc`), and the
// renderer validates the `{ repo }` / `{ error }` envelope because RPC payloads
// are external data.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clonePairedServerRepository, createPairedServerProject } from './paired-server-repo-bridge'
import * as bridge from './runtime-environment-bridge'

vi.mock('./runtime-environment-bridge', () => ({
  callPairedServerRpc: vi.fn()
}))

const callRpc = vi.mocked(bridge.callPairedServerRpc)

beforeEach(() => {
  callRpc.mockReset()
})

describe('clonePairedServerRepository', () => {
  it('calls repo.clone with a 10-minute timeout and returns the path', async () => {
    callRpc.mockResolvedValue({ repo: { path: '/srv/code/widgets' } })

    const result = await clonePairedServerRepository({
      environmentId: 'env-1',
      url: 'https://github.com/acme/widgets.git',
      destination: '/srv/code'
    })

    expect(callRpc).toHaveBeenCalledWith('env-1', 'repo.clone', {
      url: 'https://github.com/acme/widgets.git',
      destination: '/srv/code'
    }, 600_000)
    expect(result).toEqual({ path: '/srv/code/widgets' })
  })

  it('throws the remote error message and rejects a missing path', async () => {
    callRpc.mockResolvedValue({ error: { message: 'no such directory' } })
    await expect(
      clonePairedServerRepository({ environmentId: 'env-1', url: 'u', destination: 'd' })
    ).rejects.toThrow('no such directory')

    callRpc.mockResolvedValue({ repo: {} })
    await expect(
      clonePairedServerRepository({ environmentId: 'env-1', url: 'u', destination: 'd' })
    ).rejects.toThrow('Remote repo.clone returned no checkout path.')
  })
})

describe('createPairedServerProject', () => {
  it('calls repo.create with a 60s timeout and returns the path', async () => {
    callRpc.mockResolvedValue({ repo: { path: '/srv/projects/demo' } })

    const result = await createPairedServerProject({
      environmentId: 'env-1',
      path: '/srv/projects',
      name: 'demo'
    })

    expect(callRpc).toHaveBeenCalledWith('env-1', 'repo.create', {
      parentPath: '/srv/projects',
      name: 'demo',
      kind: 'git'
    }, 60_000)
    expect(result).toEqual({ path: '/srv/projects/demo' })
  })
})
