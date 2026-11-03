// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/sleep-worktree-activation-race.test.ts
//
// D15a-011: waking a slept workspace must not depend on a VM bridge that Hydra
// does not expose yet. Activation still succeeds, and when a bridge IS present a
// provider failure surfaces the provider message while leaving selection alone.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: toastError } }))

import {
  clearWorktreeSleepIntent,
  markWorktreeSleepIntent
} from '../lib/worktree-sleep-intent'
import {
  getEphemeralVmResumeBridge,
  resumeEphemeralVmOnActivation,
  wakeEphemeralVmForSleptWorktree
} from '../lib/sidebar-worktree-activation'

const WORKTREE = '/w/slept'

function stubBridge(api: unknown): void {
  vi.stubGlobal('window', { api })
}

beforeEach(() => {
  toastError.mockClear()
  stubBridge(undefined)
})

afterEach(() => {
  clearWorktreeSleepIntent(WORKTREE)
  vi.unstubAllGlobals()
})

describe('ephemeral VM wake on sidebar activation (D15a-011)', () => {
  it('does not call a provider for an awake workspace', async () => {
    const resumeWorkspace = vi.fn()
    const result = await resumeEphemeralVmOnActivation({
      worktreeId: WORKTREE,
      hasSleepIntent: false,
      bridge: { resumeWorkspace }
    })

    expect(resumeWorkspace).not.toHaveBeenCalled()
    expect(result).toEqual({ attempted: false, resumed: false })
  })

  it('degrades to a no-op when the VM bridge does not exist', async () => {
    expect(getEphemeralVmResumeBridge()).toBeNull()

    const result = await resumeEphemeralVmOnActivation({
      worktreeId: WORKTREE,
      hasSleepIntent: true,
      bridge: null
    })

    expect(result).toEqual({ attempted: false, resumed: false })
  })

  it('resumes through the bridge and reports the runtime environment', async () => {
    const resumeWorkspace = vi.fn().mockResolvedValue({ runtimeEnvironmentId: 'rt-1' })
    const result = await resumeEphemeralVmOnActivation({
      worktreeId: WORKTREE,
      hasSleepIntent: true,
      bridge: { resumeWorkspace }
    })

    expect(resumeWorkspace).toHaveBeenCalledWith({ workspaceId: WORKTREE })
    expect(result).toEqual({ attempted: true, resumed: true, runtimeEnvironmentId: 'rt-1' })
  })

  it('keeps the workspace usable and reports the provider message on failure', async () => {
    const resumeWorkspace = vi.fn().mockRejectedValue(new Error('provider unavailable'))
    const result = await resumeEphemeralVmOnActivation({
      worktreeId: WORKTREE,
      hasSleepIntent: true,
      bridge: { resumeWorkspace }
    })

    // The caller already selected the workspace; nothing here rolls it back.
    expect(result).toMatchObject({ attempted: true, resumed: false })
    expect(result.errorMessage).toBe('provider unavailable')
  })

  it('only probes the bridge for a workspace with a sleep intent', async () => {
    const resumeWorkspace = vi.fn().mockRejectedValue(new Error('provider unavailable'))
    stubBridge({ ephemeralVm: { resumeWorkspace } })

    await wakeEphemeralVmForSleptWorktree('/w/awake')
    expect(resumeWorkspace).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()

    markWorktreeSleepIntent(WORKTREE)
    await wakeEphemeralVmForSleptWorktree(WORKTREE)
    expect(resumeWorkspace).toHaveBeenCalledWith({ workspaceId: WORKTREE })
    expect(toastError).toHaveBeenCalledWith('Failed to wake ephemeral VM workspace', {
      description: 'provider unavailable'
    })
  })

  it('does not toast when there is no bridge to call', async () => {
    markWorktreeSleepIntent(WORKTREE)
    stubBridge(undefined)

    await wakeEphemeralVmForSleptWorktree(WORKTREE)

    expect(toastError).not.toHaveBeenCalled()
  })
})
