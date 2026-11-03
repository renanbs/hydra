// D02a-003: host picker shows health, hides unselectable hosts and probes SSH
// hosts from the popover.
import { describe, expect, it, vi } from 'vitest'
import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { AddRepoHostSelector } from './AddRepoHostSelector'
import type { SidebarHostOption } from './sidebar-host-options'

const LOCAL: SidebarHostOption = {
  id: 'local',
  label: 'Local Linux',
  detail: 'This computer',
  kind: 'local',
  health: 'local',
  presence: 'local'
}

const SSH: SidebarHostOption = {
  id: 'ssh:host-1',
  label: 'build-box',
  detail: 'acme@build-box',
  kind: 'ssh',
  health: 'disconnected',
  presence: 'configured',
  connectionStatus: 'disconnected'
}

const RUNTIME: SidebarHostOption = {
  id: 'runtime:env-1',
  label: 'remote-vm',
  detail: 'protocol 3',
  kind: 'runtime',
  health: 'blocked',
  presence: 'project',
  compatibility: {
    kind: 'blocked',
    reason: 'server-too-old',
    clientProtocolVersion: 3,
    serverProtocolVersion: 1,
    requiredServerProtocolVersion: 3
  }
}

describe('AddRepoHostSelector (D02a-003)', () => {
  it('renders nothing when only the local host exists', () => {
    const { container } = render(
      <AddRepoHostSelector
        hostOptions={[LOCAL]}
        selectedHostId="local"
        connectingTargetIds={new Set()}
        onSelect={vi.fn()}
        onConnect={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the selected host and swaps to another selectable host", () => {
    const onSelect = vi.fn()
    const AVAILABLE: SidebarHostOption = {
      id: 'ssh:host-2',
      label: 'ci-box',
      detail: 'acme@ci-box',
      kind: 'ssh',
      health: 'available',
      presence: 'configured',
      connectionStatus: 'connected'
    }
    render(
      <AddRepoHostSelector
        hostOptions={[LOCAL, AVAILABLE]}
        selectedHostId="local"
        connectingTargetIds={new Set()}
        onSelect={onSelect}
        onConnect={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /local linux/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /local linux/i }))
    fireEvent.click(screen.getByRole('option', { name: /ci-box/i }))
    expect(onSelect).toHaveBeenCalledWith('ssh:host-2')
  })

  it('leaves a disconnected SSH host unselectable but connectable', () => {
    const onConnect = vi.fn().mockResolvedValue(true)
    render(
      <AddRepoHostSelector
        hostOptions={[LOCAL, SSH]}
        selectedHostId="local"
        connectingTargetIds={new Set()}
        onSelect={vi.fn()}
        onConnect={onConnect}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /local linux/i }))
    expect(screen.getByRole('option', { name: /build-box/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /connect build-box/i }))
    expect(onConnect).toHaveBeenCalledWith('host-1')
  })

  it('explains the update side for an incompatible runtime host', () => {
    render(
      <AddRepoHostSelector
        hostOptions={[LOCAL, RUNTIME]}
        selectedHostId="local"
        connectingTargetIds={new Set()}
        onSelect={vi.fn()}
        onConnect={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /local linux/i }))
    expect(screen.getByText(/Update the host: it must speak protocol 3/i)).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /remote-vm/i })).toBeDisabled()
  })

  it('spins the connect action while a probe is running', () => {
    const { container } = render(
      <AddRepoHostSelector
        hostOptions={[LOCAL, SSH]}
        selectedHostId="local"
        connectingTargetIds={new Set(['host-1'])}
        onSelect={vi.fn()}
        onConnect={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /local linux/i }))
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })
})
