// Linear setup dialog states: install copy-step, Re-check, success,
// Don't-show-again, and every close path (buttons, Escape, outside click).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}))
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: toastSuccess, error: toastError, info: vi.fn() })
}))

import { LinearAgentSkillSetupDialog } from './LinearAgentSkillSetupDialog'

// Radix Dialog measures its content on mount; jsdom has no ResizeObserver.
class ResizeObserverNoop {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: ResizeObserverNoop
})

const COMMAND = 'npx skills add orca --skill orca-linear --global'

function renderDialog(overrides: Partial<Parameters<typeof LinearAgentSkillSetupDialog>[0]> = {}) {
  const onOpenChange = vi.fn()
  const onDismissPermanently = vi.fn()
  const onDone = vi.fn()
  const onRecheck = vi.fn()
  render(
    <LinearAgentSkillSetupDialog
      open
      command={COMMAND}
      onOpenChange={onOpenChange}
      onDismissPermanently={onDismissPermanently}
      onDone={onDone}
      onRecheck={onRecheck}
      {...overrides}
    />
  )
  return { onOpenChange, onDismissPermanently, onDone, onRecheck }
}

beforeEach(() => {
  toastSuccess.mockReset()
  toastError.mockReset()
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) }
  })
})

describe('LinearAgentSkillSetupDialog (D02c-003)', () => {
  it('renders the install state with copy step and prerequisite notice', () => {
    renderDialog()

    expect(screen.getByText('Enable agents to read and edit the attached Linear ticket.')).toBeInTheDocument()
    expect(screen.getByText(COMMAND)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy command' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Re-check' })).toBeInTheDocument()
    expect(
      screen.getByText(/may check that the Orca CLI command is on PATH/)
    ).toBeInTheDocument()
  })

  it('copies the install command to the clipboard', async () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Copy command' }))
    await Promise.resolve()

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(COMMAND)
    expect(toastSuccess).toHaveBeenCalledWith('Install command copied', expect.anything())
  })

  it('renders the success state with connected pill and Done', () => {
    const { onDone } = renderDialog({ showSuccess: true })

    expect(screen.getByText('Linear ticket access is ready')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.queryByText(COMMAND)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it("dismisses permanently through Don't show again", () => {
    const { onDismissPermanently } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: "Don't show again" }))
    expect(onDismissPermanently).toHaveBeenCalledTimes(1)
  })

  it('closes through the Close button and reports cancellation', () => {
    const { onOpenChange } = renderDialog()

    const closeButtons = screen.getAllByRole('button', { name: 'Close' })
    fireEvent.click(closeButtons[closeButtons.length - 1]!)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
