// Parity guard for the paired servers pane: lists the persisted registry,
// adds through the same server form the sidebar uses, and removes through an
// explicit confirm that calls the backend and re-reads the list.
import { describe, expect, it, vi, afterAll, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

const { invokeMock, toastError, toastSuccess } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn()
}))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: toastSuccess, error: toastError, info: vi.fn() })
}))

// The pane embeds the sidebar's server form; the dialog pulls the SSH registry
// on mount, so stub every command the pane and its dialog can reach.
function stubCommands(environments: { id: string; name: string }[]) {
  invokeMock.mockImplementation((cmd: string, _args?: Record<string, unknown>) => {
    switch (cmd) {
      case 'runtime_list_environments':
        return Promise.resolve(environments)
      case 'runtime_remove_environment':
        return Promise.resolve(true)
      case 'ssh_list_targets':
        return Promise.resolve([])
      case 'ssh_list_removed_target_labels':
        return Promise.resolve({})
      case 'ssh_list_config_hosts':
        return Promise.resolve({ hosts: [], totalHostCount: 0, newHostCount: 0, matchCount: 0, hasMore: false })
      default:
        return Promise.reject(new Error(`unexpected command: ${cmd}`))
    }
  })
}

import { RuntimeServersPane } from './RuntimeServersPane'

class ResizeObserverNoop {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
const previousResizeObserver = Reflect.get(globalThis, 'ResizeObserver')
Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: ResizeObserverNoop
})
afterAll(() => {
  if (previousResizeObserver === undefined) {
    Reflect.deleteProperty(globalThis, 'ResizeObserver')
  } else {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: previousResizeObserver
    })
  }
})

beforeEach(() => {
  invokeMock.mockReset()
  toastError.mockReset()
  toastSuccess.mockReset()
})

describe('RuntimeServersPane (Orca parity)', () => {
  it('lists the persisted paired servers', async () => {
    stubCommands([{ id: 'env-1', name: 'Dev box' }])
    render(<RuntimeServersPane />)
    await act(async () => {})

    expect(invokeMock).toHaveBeenCalledWith('runtime_list_environments')
    expect(screen.getByText('Dev box')).toBeInTheDocument()
  })

  it('shows an empty state when nothing is paired', async () => {
    stubCommands([])
    render(<RuntimeServersPane />)
    await act(async () => {})

    expect(screen.getByText('No paired servers yet.')).toBeInTheDocument()
  })

  it('removes through a confirm that calls the backend and re-reads', async () => {
    let environments = [{ id: 'env-1', name: 'Dev box' }]
    invokeMock.mockImplementation((cmd: string, args?: Record<string, unknown>) => {
      if (cmd === 'runtime_list_environments') {
        return Promise.resolve(environments)
      }
      if (cmd === 'runtime_remove_environment') {
        expect(args?.['environmentId']).toBe('env-1')
        environments = []
        return Promise.resolve(true)
      }
      if (cmd === 'ssh_list_targets') {
        return Promise.resolve([])
      }
      if (cmd === 'ssh_list_removed_target_labels') {
        return Promise.resolve({})
      }
      if (cmd === 'ssh_list_config_hosts') {
        return Promise.resolve({ hosts: [], totalHostCount: 0, newHostCount: 0, matchCount: 0, hasMore: false })
      }
      return Promise.reject(new Error(`unexpected command: ${cmd}`))
    })
    render(<RuntimeServersPane />)
    await act(async () => {})
    expect(screen.getByText('Dev box')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Dev box' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await act(async () => {})

    expect(invokeMock).toHaveBeenCalledWith('runtime_remove_environment', {
      environmentId: 'env-1'
    })
    expect(toastSuccess).toHaveBeenCalledWith('Removed Dev box.')
    expect(screen.getByText('No paired servers yet.')).toBeInTheDocument()
  })
})
