// D02b-021: the wizard's SSH target row. Orca extracts it so the inline-connect logic is
// testable without the wizard: a status dot, a `username@host` fallback label, row
// selection only while connected, and a Connect action that spins for its own lifetime and
// never doubles as a row click.
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { resetSshConnectInFlightForTests } from '@/ssh/ssh-connect-in-flight'
import type { SshConnectionStatus } from '../../shared/ssh-types'
import { SshTargetRow } from './SshTargetRow'

function renderRow(
  overrides: Partial<Parameters<typeof SshTargetRow>[0]> = {},
  status: SshConnectionStatus = 'disconnected'
) {
  const onSelect = vi.fn()
  const onConnect = vi.fn().mockResolvedValue(true)
  const view = render(
    <SshTargetRow
      target={{ id: 'srv', label: 'Build server', username: 'deploy', host: '10.0.0.2' }}
      status={status}
      isSelected={false}
      onSelect={onSelect}
      onConnect={onConnect}
      {...overrides}
    />
  )
  return { ...view, onSelect, onConnect }
}

afterEach(() => {
  resetSshConnectInFlightForTests()
})

describe('SshTargetRow (D02b-021)', () => {
  it('is a keyboard-activatable row once the target is connected', () => {
    const { onSelect } = renderRow({}, 'connected')

    const row = screen.getByRole('button', { name: 'Build server' })
    expect(row).toHaveAttribute('tabIndex', '0')
    expect(row.className).toContain('cursor-pointer')

    fireEvent.click(row)
    fireEvent.keyDown(row, { key: 'Enter' })
    fireEvent.keyDown(row, { key: ' ' })

    expect(onSelect).toHaveBeenCalledTimes(3)
    expect(onSelect).toHaveBeenCalledWith('srv')
    // A connected row offers no Connect action.
    expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull()
  })

  it('uses username@host when the target has no label', () => {
    renderRow({ target: { id: 'srv', label: '  ', username: 'deploy', host: '10.0.0.2' } })

    expect(screen.getByText('deploy@10.0.0.2')).toBeInTheDocument()
  })

  it('keeps a disconnected row inert and connects inline without selecting', async () => {
    const { onSelect, onConnect } = renderRow()
    // The row itself has no role; only Connect is interactive.
    expect(screen.queryByRole('button', { name: 'Build server' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    expect(onConnect).toHaveBeenCalledWith('srv')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('spins and says Connecting… for the lifetime of the connect request', async () => {
    const { promise, resolve } = Promise.withResolvers<boolean>()
    const onConnect = vi.fn(() => promise)
    const { container } = renderRow({ onConnect })

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    const busy = screen.getByRole('button', { name: /Connecting…/i })
    expect(busy).toBeDisabled()
    expect(container.querySelector('.animate-spin')).not.toBeNull()
    // A second click while in flight must not start another connection.
    fireEvent.click(busy)
    expect(onConnect).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolve(true)
    })

    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
  })
})
