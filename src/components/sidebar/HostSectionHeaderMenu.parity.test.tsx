// Parity guard for the host-section header menu trigger. Orca puts the trigger inside the
// header row, reveals it on hover/focus like the row's neighbours, and keeps it from
// folding the section when it opens the menu. This port keeps all three, and adds the
// rule the port introduces: a host with neither a registry action nor a compatibility
// warning paints NO trigger at all, so the sidebar never offers a menu that opens empty.
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { RuntimeCompatVerdict } from '../../shared/protocol-compat'
import { describeRuntimeCompatBlock } from '../../shared/protocol-compat'
import type { HostHeaderRow } from './host-section-rows'
import { HostSectionHeaderMenu } from './HostSectionHeaderMenu'

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
  return render(<HostSectionHeaderMenu row={row} />)
}

describe('HostSectionHeaderMenu trigger (Orca parity)', () => {
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
      <div onClick={onRowClick}>
        <HostSectionHeaderMenu row={hostRow()} />
      </div>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Host actions for Build server' }))

    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('paints no trigger for a host with no action and no warning', () => {
    renderMenu(hostRow({ hostId: 'local', kind: 'local', label: 'Local Linux' }))

    expect(screen.queryByRole('button', { name: 'Host actions for Local Linux' })).toBeNull()
  })

  it('keeps the warning reachable for a blocked host that has no action to offer', () => {
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

    const warning = screen.getByText('Update server required')
    expect(warning).toBeInTheDocument()
    expect(warning).toHaveAttribute('title', describeRuntimeCompatBlock(BLOCKED_VERDICT))
    expect(screen.queryByRole('menuitem', { name: 'Remove host…' })).toBeNull()
  })
})
