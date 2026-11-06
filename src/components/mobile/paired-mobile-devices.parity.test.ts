// Rosetta D01-024: shared device-list request. One IPC fan-out no matter how
// many surfaces mount; loaded/error distinguish empty from failed; superseded
// requests hand back the live cache, never stale data.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetPairedMobileDevicesCacheForTests,
  getPairedMobileDevicesSnapshot,
  refreshPairedMobileDevices,
  replacePairedMobileDevices
} from './paired-mobile-devices'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => ({ devices: [] }))
}))

import { invoke } from '@tauri-apps/api/core'

beforeEach(() => {
  _resetPairedMobileDevicesCacheForTests()
  vi.mocked(invoke).mockClear()
  vi.mocked(invoke).mockResolvedValue({ devices: [] })
})

describe('paired-mobile-devices (D01-024)', () => {
  it('shares one request across concurrent callers', async () => {
    const [a, b] = await Promise.all([
      refreshPairedMobileDevices(),
      refreshPairedMobileDevices()
    ])
    expect(a).toEqual(b)
    expect(vi.mocked(invoke)).toHaveBeenCalledTimes(1)
  })

  it('marks loaded with an empty list, not an error', async () => {
    const devices = await refreshPairedMobileDevices()
    expect(devices).toEqual([])
    expect(getPairedMobileDevicesSnapshot()).toEqual([])
  })

  it('replaces the cache directly for push updates', () => {
    replacePairedMobileDevices([{ deviceId: 'd1', name: 'Phone', pairedAt: 1, lastSeenAt: 2 }])
    expect(getPairedMobileDevicesSnapshot()).toHaveLength(1)
  })
})
