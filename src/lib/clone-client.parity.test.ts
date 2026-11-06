// Rosetta D02a-014: live clone progress end to end.
// `clone_project` emits `clone:progress` per clone id (`git clone --progress`
// percent parsing in Rust); the dialog subscribes while cloning.
import { describe, expect, it, vi } from 'vitest'
import { listen } from '@tauri-apps/api/event'
import { onCloneProgress } from './clone-client'

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (_event: string, handler: (e: { payload: unknown }) => void) => {
    ;(globalThis as unknown as { __cloneHandler?: unknown }).__cloneHandler = handler
    return vi.fn()
  })
}))

describe('onCloneProgress (D02a-014)', () => {
  it('forwards only this clone id and returns the unlisten handle', async () => {
    const seen: Array<{ phase: string; percent: number }> = []
    const unlisten = await onCloneProgress('clone-1', (p) => seen.push(p))
    expect(typeof unlisten).toBe('function')
    expect(listen).toHaveBeenCalledWith('clone:progress', expect.any(Function))

    const handler = (globalThis as unknown as { __cloneHandler: (e: { payload: unknown }) => void }).__cloneHandler
    handler({ payload: { clone_id: 'clone-2', phase: 'cloning', percent: 10 } })
    handler({ payload: { clone_id: 'clone-1', phase: 'cloning', percent: 42 } })
    expect(seen).toEqual([{ phase: 'cloning', percent: 42 }])
  })
})
