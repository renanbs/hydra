// D02a-012: clone step fields, destination picker guard, progress and submit gate.
import { describe, expect, it, vi } from 'vitest'
import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { AddRepoCloneStep } from './AddRepoCloneStep'

function renderClone(overrides: Partial<Parameters<typeof AddRepoCloneStep>[0]> = {}) {
  const handlers = {
    onUrlChange: vi.fn(),
    onDestinationChange: vi.fn(),
    onPickDestination: vi.fn(),
    onClone: vi.fn()
  }
  const view = render(
    <AddRepoCloneStep
      cloneUrl=""
      cloneDestination="/work"
      cloneError={null}
      cloneProgress={null}
      isCloning={false}
      gitUnavailable={false}
      destinationIsRemote={false}
      hostLabel={null}
      {...handlers}
      {...overrides}
    />
  )
  return { ...view, handlers }
}

describe('AddRepoCloneStep (D02a-012)', () => {
  it('disables submit until a URL is typed and submits the form', () => {
    const { handlers, rerender } = renderClone()
    expect(screen.getByRole('button', { name: 'Clone Project' })).toBeDisabled()

    rerender(
      <AddRepoCloneStep
        cloneUrl="https://github.com/acme/widgets.git"
        cloneDestination="/work"
        cloneError={null}
        cloneProgress={null}
        isCloning={false}
        gitUnavailable={false}
        destinationIsRemote={false}
        hostLabel={null}
        {...handlers}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clone Project' }))
    expect(handlers.onClone).toHaveBeenCalledTimes(1)
  })

  it('blocks clone when Git is unavailable', () => {
    renderClone({ cloneUrl: 'https://github.com/acme/widgets.git', gitUnavailable: true })
    expect(screen.getByRole('button', { name: 'Clone Project' })).toBeDisabled()
  })

  it('renders the streamed phase and percentage', () => {
    renderClone({ cloneProgress: { phase: 'Receiving objects', percent: 42 } })
    expect(screen.getByText('Receiving objects')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('shows an indeterminate bar without invented progress', () => {
    const { container } = renderClone({ isCloning: true })
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
    expect(screen.queryByText(/%/)).toBeNull()
  })

  it('disables the native picker for a remote destination and explains why', () => {
    const { handlers } = renderClone({ destinationIsRemote: true })
    const picker = screen.getByRole('button', { name: /Host destination must be typed/i })
    expect(picker).toBeDisabled()
    expect(screen.getByText(/native picker only sees this computer/i)).toBeInTheDocument()
    fireEvent.click(picker)
    expect(handlers.onPickDestination).not.toHaveBeenCalled()
  })

  it('surfaces the clone error', () => {
    renderClone({ cloneError: 'fatal: repository not found' })
    expect(screen.getByRole('alert')).toHaveTextContent('fatal: repository not found')
  })
})
