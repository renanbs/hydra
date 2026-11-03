// Local clone transport: the id generated here is the handle `clone_abort`
// kills, so the round trip ids must match and a cancelled clone must be a
// visible outcome rather than a silent no-op.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { abortClone, cloneRepository, createCloneId } from './clone-client'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

beforeEach(() => {
  invokeMock.mockReset()
})

describe('cloneRepository', () => {
  it('registers the clone under the caller id', async () => {
    invokeMock.mockResolvedValue('/work/widgets')

    const path = await cloneRepository('https://github.com/acme/widgets.git', '/work', 'clone-1')

    expect(invokeMock).toHaveBeenCalledWith('clone_project', {
      url: 'https://github.com/acme/widgets.git',
      parentDir: '/work',
      cloneId: 'clone-1'
    })
    expect(path).toBe('/work/widgets')
  })

  it('surfaces the backend failure', async () => {
    invokeMock.mockRejectedValue(new Error('Clone cancelled'))
    await expect(cloneRepository('u', '/work', 'clone-2')).rejects.toThrow('Clone cancelled')
  })
})

describe('abortClone', () => {
  it('reports a confirmed cancellation', async () => {
    invokeMock.mockResolvedValue({ cloneId: 'clone-1', found: true, cancelled: true })
    await expect(abortClone('clone-1')).resolves.toEqual({
      cloneId: 'clone-1',
      found: true,
      cancelled: true
    })
    expect(invokeMock).toHaveBeenCalledWith('clone_abort', { cloneId: 'clone-1' })
  })
})

describe('createCloneId', () => {
  it('produces distinct non-empty ids', () => {
    const first = createCloneId()
    const second = createCloneId()
    expect(first).toMatch(/^clone-\d+-[a-z0-9]+$/)
    expect(first).not.toBe(second)
  })
})
