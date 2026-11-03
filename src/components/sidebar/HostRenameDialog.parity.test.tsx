// Parity guard for the rename dialog. Orca's rename is a client-side label override with a
// blank-means-reset affordance and a "Reset to default" button; it must work for every host
// kind and never write the registry. What it locks out: an override leaking into the next
// open after a cancel, a rename that edits SSH connectivity, and a Reset that stays enabled
// when there is nothing to reset.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAppStore } from '@/store'
import { HostRenameDialog } from './HostRenameDialog'

let updateSettings: ReturnType<typeof vi.fn>

function resetStore(overrides: Record<string, { displayLabel?: string }> = {}): void {
  updateSettings = vi.fn()
  useAppStore.setState({
    settings: { hostSettingOverrides: overrides } as never,
    updateSettings: updateSettings as never
  })
}

function renderDialog(onOpenChange = vi.fn()) {
  render(
    <HostRenameDialog
      open
      onOpenChange={onOpenChange}
      hostId={'ssh:srv' as never}
      derivedLabel="Build server"
    />
  )
  return { onOpenChange }
}

beforeEach(() => {
  resetStore()
})

describe('HostRenameDialog (Orca parity)', () => {
  it('starts blank with the derived label as the placeholder', () => {
    renderDialog()

    const input = screen.getByLabelText('Display name')
    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('placeholder', 'Build server')
  })

  it('seeds the field from the persisted override and enables Reset', () => {
    resetStore({ 'ssh:srv': { displayLabel: 'Nightly box' } })
    renderDialog()

    expect(screen.getByLabelText('Display name')).toHaveValue('Nightly box')
    expect(screen.getByRole('button', { name: 'Reset to default' })).toBeEnabled()
  })

  it('keeps Reset disabled when the host still uses its derived label', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Reset to default' })).toBeDisabled()
  })

  it('submits the trimmed label override on Enter and closes without touching the registry', () => {
    const { onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '  Dev box  ' } })
    fireEvent.keyDown(screen.getByLabelText('Display name'), { key: 'Enter' })

    expect(updateSettings).toHaveBeenCalledWith({
      hostSettingOverrides: { 'ssh:srv': { displayLabel: 'Dev box' } }
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('clears the override when the field is submitted blank', () => {
    resetStore({ 'ssh:srv': { displayLabel: 'Nightly box' } })
    renderDialog()

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(updateSettings).toHaveBeenCalledWith({ hostSettingOverrides: {} })
  })

  it('resets to the derived label from the Reset button', () => {
    resetStore({ 'ssh:srv': { displayLabel: 'Nightly box' }, 'ssh:db': { displayLabel: 'DB' } })
    const { onOpenChange } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }))

    expect(updateSettings).toHaveBeenCalledWith({
      hostSettingOverrides: { 'ssh:db': { displayLabel: 'DB' } }
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
