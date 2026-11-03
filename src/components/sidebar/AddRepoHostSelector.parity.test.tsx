// D02a-003: host picker shows health, hides unselectable hosts and probes SSH
// hosts from the popover.
// D02b-021: SSH entries are the wizard's SshTargetRow (dot + label + inline Connect), so
// the SSH row is only an interactive row once connected; its Connect button is the sole
// affordance while offline.
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
  detail: 'SSH',
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
      detail: 'SSH',
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
    fireEvent.click(screen.getByRole('button', { name: 'ci-box' }))
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
    // The row itself is not an affordance while offline; only Connect is.
    expect(screen.queryByRole('button', { name: 'build-box' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
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
    expect(screen.getByRole('button', { name: /remote-vm/i })).toBeDisabled()
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
    expect(screen.getByRole('button', { name: /connecting…/i })).toBeDisabled()
  })

  it('falls back to username@host for a target without a label', () => {
    const UNLABELED: SidebarHostOption = {
      ...SSH,
      id: 'ssh:host-3',
      label: '',
      connectionStatus: 'connected',
      health: 'available'
    }
    render(
      <AddRepoHostSelector
        hostOptions={[LOCAL, UNLABELED]}
        selectedHostId="local"
        connectingTargetIds={new Set()}
        sshTargetsById={
          new Map([['host-3', { username: 'deploy', host: '10.0.0.9' }]])
        }
        onSelect={vi.fn()}
        onConnect={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /local linux/i }))
    expect(screen.getByText('deploy@10.0.0.9')).toBeInTheDocument()
  })
})
