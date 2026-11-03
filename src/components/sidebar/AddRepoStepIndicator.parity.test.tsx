// D02a-002: Back appears on every non-start step and is locked during a nested import.
import { describe, expect, it, vi } from 'vitest'
import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { AddRepoStepIndicator } from './AddRepoStepIndicator'

describe('AddRepoStepIndicator (D02a-002)', () => {
  it('hides the indicator on the start step', () => {
    const { container } = render(
      <AddRepoStepIndicator step="add" isAdding={false} onBack={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows Back for clone, remote, server-path, create and nested steps', () => {
    for (const step of ['clone', 'remote', 'server-path', 'create', 'nested'] as const) {
      const { unmount } = render(
        <AddRepoStepIndicator step={step} isAdding={false} onBack={vi.fn()} />
      )
      expect(screen.getByRole('button', { name: /back/i })).toBeEnabled()
      unmount()
    }
  })

  it('disables Back while a nested import is adding', () => {
    render(<AddRepoStepIndicator step="nested" isAdding onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled()
  })

  it('invokes the back handler', () => {
    const onBack = vi.fn()
    render(<AddRepoStepIndicator step="clone" isAdding={false} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
