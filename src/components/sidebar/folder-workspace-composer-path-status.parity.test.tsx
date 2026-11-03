// D02a-036: missing/stale folder paths block folder-workspace creation, remote
// hosts stay unknown, and the probe is skipped while the composer is closed.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }))

import { useFolderWorkspaceComposerPathStatus } from './folder-workspace-composer-path-status'

beforeEach(() => {
  invokeMock.mockReset()
})

describe('useFolderWorkspaceComposerPathStatus (D02a-036)', () => {
  it('blocks creation for a missing local folder and explains why', async () => {
    invokeMock.mockResolvedValue({ path: '/work/gone', exists: false, reason: 'missing' })
    const { result } = renderHook(() =>
      useFolderWorkspaceComposerPathStatus({ folderPath: '/work/gone', open: true })
    )
    await waitFor(() => expect(result.current.pathStatusBlocksCreate).toBe(true))
    await waitFor(() => expect(result.current.pathStatusProjectError).toMatch(/Folder not found/i))
    expect(invokeMock).toHaveBeenCalledWith('folder_path_status', { path: '/work/gone' })
  })

  it('allows creation when the folder exists', async () => {
    invokeMock.mockResolvedValue({ path: '/work/acme', exists: true })
    const { result } = renderHook(() =>
      useFolderWorkspaceComposerPathStatus({ folderPath: '/work/acme', open: true })
    )
    await waitFor(() => expect(result.current.pathStatus?.exists).toBe(true))
    expect(result.current.pathStatusBlocksCreate).toBe(false)
    expect(result.current.pathStatusProjectError).toBeNull()
  })

  it('treats an ambiguous connection as a block', async () => {
    invokeMock.mockResolvedValue({
      path: '/work/acme',
      exists: false,
      reason: 'ambiguous-connection'
    })
    const { result } = renderHook(() =>
      useFolderWorkspaceComposerPathStatus({ folderPath: '/work/acme', open: true })
    )
    await waitFor(() => expect(result.current.pathStatusBlocksCreate).toBe(true))
    await waitFor(() =>
      expect(result.current.pathStatusProjectError).toMatch(/Cannot determine connection/i)
    )
  })

  it('never probes a remote folder and never blocks on a local answer', () => {
    const { result } = renderHook(() =>
      useFolderWorkspaceComposerPathStatus({
        folderPath: '/srv/acme',
        open: true,
        executionHostId: 'ssh:host-1'
      })
    )
    expect(invokeMock).not.toHaveBeenCalled()
    expect(result.current.pathStatusBlocksCreate).toBe(false)
    expect(result.current.pathStatus).toBeNull()
  })

  it('does nothing while the composer is closed', () => {
    const { result } = renderHook(() =>
      useFolderWorkspaceComposerPathStatus({ folderPath: '/work/acme', open: false })
    )
    expect(invokeMock).not.toHaveBeenCalled()
    expect(result.current.pathStatusBlocksCreate).toBe(false)
  })

  it('does not block when the probe itself fails', async () => {
    invokeMock.mockRejectedValue(new Error('host down'))
    const { result } = renderHook(() =>
      useFolderWorkspaceComposerPathStatus({ folderPath: '/work/acme', open: true })
    )
    await waitFor(() => expect(invokeMock).toHaveBeenCalled())
    await waitFor(() => expect(result.current.pathStatusBlocksCreate).toBe(false))
    expect(result.current.pathStatus).toBeNull()
  })
})
