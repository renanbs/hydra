// D04a-055/056: per-entry availability and the preflight that must run before any
// local OS open. Orca labels a blocked entry "Local only" and refuses the IPC; the
// same tests pin both halves here.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const invokeMock = vi.fn()
const toastErrorMock = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }))
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: vi.fn()
  }
}))

import {
  getExternalEditorOpenCapability,
  getLocalFileManagerLabel,
  getOpenWorktreePathFailure,
  isAbsoluteWorkspacePath,
  isLocalPathOpenBlocked,
  openWorktreePath
} from '../../lib/open-in-path-guard'
import {
  getOpenInEntryAvailability,
  getWorktreeOpenInEntries
} from './worktree-open-in-menu'

const APPS = [
  { id: 'vscode', label: 'VS Code', command: 'code' },
  { id: 'zed', label: 'Zed', command: 'zed' }
]

describe('worktree open-in menu (Orca parity)', () => {
  beforeEach(() => {
    invokeMock.mockReset()
    invokeMock.mockResolvedValue(undefined)
    toastErrorMock.mockReset()
  })

  it('lists configured apps then the platform file manager', () => {
    const entries = getWorktreeOpenInEntries(APPS, 'Finder')
    expect(entries.map((entry) => entry.label)).toEqual(['VS Code', 'Zed', 'Finder'])
    expect(entries.at(-1)?.target).toBe('file-manager')
    expect(getLocalFileManagerLabel('Mozilla/5.0 (X11; Linux x86_64)')).toBe('File Manager')
    expect(getLocalFileManagerLabel('Mozilla/5.0 (Macintosh)')).toBe('Finder')
  })

  it('marks remote-only entries and blocks local-only editors on SSH', () => {
    const entries = getWorktreeOpenInEntries(APPS, 'File Manager')
    const [vscode, zed, fileManager] = entries
    expect(getOpenInEntryAvailability(vscode, {}, 'ssh:box')).toEqual({
      disabled: false,
      metadata: 'Remote SSH'
    })
    expect(getOpenInEntryAvailability(zed, {}, 'ssh:box')).toEqual({
      disabled: true,
      metadata: 'Local only'
    })
    expect(getOpenInEntryAvailability(fileManager, {}, 'ssh:box')).toEqual({
      disabled: true,
      metadata: 'Local only'
    })
    expect(getOpenInEntryAvailability(fileManager, {}, null)).toEqual({ disabled: false })
  })

  it('treats a focused remote runtime as local-only for every entry', () => {
    const entries = getWorktreeOpenInEntries(APPS, 'File Manager')
    const settings = { activeRuntimeEnvironmentId: 'runtime:one' }
    expect(getOpenInEntryAvailability(entries[0]!, settings, null)?.disabled).toBe(true)
    expect(isLocalPathOpenBlocked(settings)).toBe(true)
    expect(getExternalEditorOpenCapability(settings, { command: 'code' })).toEqual({
      allowed: false,
      reason: 'remote-runtime'
    })
  })

  it('validates absolute paths and refuses the IPC call when blocked', async () => {
    expect(isAbsoluteWorkspacePath('/work/tree')).toBe(true)
    expect(isAbsoluteWorkspacePath('C:\\work\\tree')).toBe(true)
    expect(isAbsoluteWorkspacePath('relative/tree')).toBe(false)

    expect(
      getOpenWorktreePathFailure({ target: 'file-manager', worktreePath: 'relative' })
    ).toBe('local-path-invalid')
    expect(
      getOpenWorktreePathFailure({
        target: 'file-manager',
        worktreePath: '/work/tree',
        settings: { activeRuntimeEnvironmentId: 'runtime:one' }
      })
    ).toBe('remote-runtime-unsupported')
    expect(
      getOpenWorktreePathFailure({
        target: 'external-editor',
        worktreePath: '/work/tree',
        connectionId: 'ssh:box',
        command: 'zed'
      })
    ).toBe('remote-editor-unsupported')

    await openWorktreePath({
      target: 'file-manager',
      worktreePath: '/work/tree',
      settings: { activeRuntimeEnvironmentId: 'runtime:one' }
    })
    expect(invokeMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalled()

    await openWorktreePath({ target: 'file-manager', worktreePath: '/work/tree' })
    expect(invokeMock).toHaveBeenCalledWith('open_in_file_manager', { path: '/work/tree' })

    await openWorktreePath({
      target: 'external-editor',
      worktreePath: '/work/tree',
      connectionId: 'ssh:box',
      command: 'code'
    })
    expect(invokeMock).toHaveBeenCalledWith('open_in_external_editor', {
      path: '/work/tree',
      command: 'code'
    })
  })
})
