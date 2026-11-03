import { describe, expect, it, vi } from 'vitest'
import {
  createAgentStatusEpochClock,
  getAgentStatusEpochNow,
  resetAgentStatusEpochClockForTests,
} from './agent-status-epoch-clock'

describe('agent status epoch clock (Orca parity)', () => {
  it('samples once per epoch, even when the wall clock moves', () => {
    const readNow = vi.fn(() => 100)
    const clock = createAgentStatusEpochClock(readNow)

    expect(clock(7)).toBe(100)
    expect(clock(7)).toBe(100)
    expect(readNow).toHaveBeenCalledTimes(1)

    readNow.mockReturnValue(250)
    expect(clock(8)).toBe(250)
    expect(readNow).toHaveBeenCalledTimes(2)
  })

  it('resamples when the epoch changes, including revisiting an earlier epoch', () => {
    let now = 10
    const clock = createAgentStatusEpochClock(() => now)
    expect(clock(1)).toBe(10)
    now = 20
    expect(clock(2)).toBe(20)
    now = 30
    expect(clock(1)).toBe(30)
  })

  it('resets the shared sample for suites that rewind the store epoch', () => {
    resetAgentStatusEpochClockForTests()
    const first = getAgentStatusEpochNow(0)
    expect(getAgentStatusEpochNow(0)).toBe(first)
    resetAgentStatusEpochClockForTests()
    expect(getAgentStatusEpochNow(0)).toBeGreaterThan(0)
  })
})
