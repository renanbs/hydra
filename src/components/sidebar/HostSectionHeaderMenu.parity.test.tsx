// Parity guard for the host-section header menu. Orca puts the trigger inside the header row,
// reveals it on hover/focus like the row's neighbours, and keeps it from folding the section
// when it opens the menu. It also locks the per-kind entries: Rename for every host kind,
// Manage → SSH/General settings, Remove only for an SSH target, and the compatibility
// warning as a real menu item that deep-links to the pane that can fix it. Disconnect is
// locked too: it runs the real backend command and drops the renderer's live state.
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { RuntimeCompatVerdict } from '../../shared/protocol-compat'
import { describeRuntimeCompatBlock } from '../../shared/protocol-compat'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/store'
import type { HostHeaderRow } from './host-section-rows'
import { HostSectionHeaderMenu } from './HostSectionHeaderMenu'

const { invokeMock, toastSuccess } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  toastSuccess: vi.fn()
}))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: toastSuccess, error: vi.fn(), info: vi.fn() })
}))

afterEach(() => {
  useAppStore.setState({ sshConnectionStates: new Map() })
  invokeMock.mockReset()
  toastSuccess.mockReset()
})


const BLOCKED_VERDICT: RuntimeCompatVerdict = {
  kind: 'blocked',
  reason: 'server-too-old',
  clientProtocolVersion: 4,
  serverProtocolVersion: 1,
  requiredServerProtocolVersion: 4
}

function hostRow(overrides: Partial<HostHeaderRow> = {}): HostHeaderRow {
  return {
    type: 'host-header',
    key: 'host:ssh:srv',
    hostId: 'ssh:srv',
    kind: 'ssh',
    label: 'Build server',
    detail: 'SSH',
    health: 'available',
    collapsed: false,
    count: 2,
    ...overrides
  }
}

function renderMenu(row: HostHeaderRow) {
  return render(
    <TooltipProvider>
      <HostSectionHeaderMenu row={row} />
    </TooltipProvider>
  )
}

describe('HostSectionHeaderMenu (Orca parity)', () => {
  it('opens by keyboard and closes on Escape, tracking aria-expanded', () => {
    renderMenu(hostRow())
    const trigger = screen.getByRole('button', { name: 'Host actions for Build server' })

    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menuitem', { name: 'Rename…' })).toBeNull()

    fireEvent.keyDown(trigger, { key: 'Enter' })

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Rename…' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Remove host…' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menuitem', { name: 'Rename…' })).toBeNull()
  })

  it('keeps the menu click from reaching the header row (which toggles collapse)', () => {
    const onRowClick = vi.fn()
    render(
      <TooltipProvider>
        <div onClick={onRowClick}>
          <HostSectionHeaderMenu row={hostRow()} />
        </div>
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Host actions for Build server' }))

    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('offers Rename and Manage but no Remove for the local host', () => {
    renderMenu(hostRow({ hostId: 'local', kind: 'local', label: 'Local Linux' }))

    fireEvent.keyDown(screen.getByRole('button', { name: 'Host actions for Local Linux' }), {
      key: 'Enter'
    })

    expect(screen.getByRole('menuitem', { name: 'Rename…' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Manage host…' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Remove host…' })).toBeNull()
  })

  it('deep-links Manage host… to App as a request for the SSH settings pane', () => {
    const listener = vi.fn()
    window.addEventListener('hydra:open-settings', listener)
    renderMenu(hostRow())

    fireEvent.keyDown(screen.getByRole('button', { name: 'Host actions for Build server' }), {
      key: 'Enter'
    })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Manage host…' }))

    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0]![0] as CustomEvent<{ section: string }>).detail).toEqual({
      section: 'ssh'
    })
    window.removeEventListener('hydra:open-settings', listener)
  })

  it('deep-links a runtime host Manage host… to the servers pane with its environment', () => {
    const listener = vi.fn()
    window.addEventListener('hydra:open-settings', listener)
    renderMenu(
      hostRow({ hostId: 'runtime:vm-1', kind: 'runtime', label: 'VM one', health: 'available' })
    )

    fireEvent.keyDown(screen.getByRole('button', { name: 'Host actions for VM one' }), {
      key: 'Enter'
    })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Manage host…' }))

    expect(listener).toHaveBeenCalledTimes(1)
    expect(
      (listener.mock.calls[0]![0] as CustomEvent<{ section: string; sectionId: string }>).detail
    ).toEqual({ section: 'servers', sectionId: 'vm-1' })
    window.removeEventListener('hydra:open-settings', listener)
  })

  it('routes runtime host removal through the servers pane instead of deleting inline', () => {
    renderMenu(
      hostRow({ hostId: 'runtime:vm-1', kind: 'runtime', label: 'VM one', health: 'available' })
    )

    fireEvent.keyDown(screen.getByRole('button', { name: 'Host actions for VM one' }), {
      key: 'Enter'
    })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove host…' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByText('This opens the paired servers settings where you can remove this server.')
    ).toBeInTheDocument()
    const listener = vi.fn()
    window.addEventListener('hydra:open-settings', listener)
    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(
      (listener.mock.calls[0]![0] as CustomEvent<{ section: string; sectionId: string }>).detail
    ).toEqual({ section: 'servers', sectionId: 'vm-1' })
    window.removeEventListener('hydra:open-settings', listener)
  })

  it('keeps the skew warning for a runtime host and still offers pane-backed removal', () => {
    renderMenu(
      hostRow({
        hostId: 'runtime:vm-1',
        kind: 'runtime',
        label: 'VM one',
        health: 'blocked',
        compatibility: BLOCKED_VERDICT
      })
    )

    fireEvent.keyDown(screen.getByRole('button', { name: 'Host actions for VM one' }), {
      key: 'Enter'
    })

    const warning = screen.getByRole('menuitem', { name: 'Update server required' })
    expect(warning).toBeInTheDocument()
    expect(warning).toHaveAttribute('title', describeRuntimeCompatBlock(BLOCKED_VERDICT))
    expect(screen.getByRole('menuitem', { name: 'Remove host…' })).toBeInTheDocument()
  })

  it('disconnects a connected SSH host and drops its live state', async () => {
    invokeMock.mockResolvedValue({
      connectionId: 'srv',
      status: 'disconnected',
      closedSessions: 0
    })
    useAppStore.setState({
      sshConnectionStates: new Map([
        [
          'srv',
          { targetId: 'srv', status: 'connected', error: null, reconnectAttempt: 1 }
        ]
      ])
    })
    renderMenu(hostRow())

    fireEvent.keyDown(screen.getByRole('button', { name: 'Host actions for Build server' }), {
      key: 'Enter'
    })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Disconnect' }))
    await act(async () => {})

    expect(invokeMock).toHaveBeenCalledWith('ssh_disconnect_target', { connectionId: 'srv' })
    expect(useAppStore.getState().sshConnectionStates.get('srv')?.status).toBe('disconnected')
    expect(toastSuccess).toHaveBeenCalledWith('Disconnected from Build server')
  })

  it('sends a blocked SSH host to the SSH pane through the warning item', () => {
    const listener = vi.fn()
    window.addEventListener('hydra:open-settings', listener)
    renderMenu(hostRow({ health: 'blocked', compatibility: BLOCKED_VERDICT }))

    fireEvent.keyDown(screen.getByRole('button', { name: 'Host actions for Build server' }), {
      key: 'Enter'
    })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Update server required' }))

    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0]![0] as CustomEvent<{ section: string }>).detail).toEqual({
      section: 'ssh'
    })
    window.removeEventListener('hydra:open-settings', listener)
  })
})
