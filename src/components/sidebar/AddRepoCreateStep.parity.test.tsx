// D02a-015/016: advanced disclosure, live path preview, Git probe state and the
// manual host-parent field for remote hosts.
import { describe, expect, it, vi } from "vitest"
import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { AddRepoCreateStep } from './AddRepoCreateStep'

function renderCreate(overrides: Partial<Parameters<typeof AddRepoCreateStep>[0]> = {}) {
  const handlers = {
    onNameChange: vi.fn(),
    onParentChange: vi.fn(),
    onPickParent: vi.fn(),
    onBrowseServer: vi.fn(),
    onCreate: vi.fn()
  }
  const view = render(
    <AddRepoCreateStep
      createName=""
      createParent="/work/workspaces"
      createError={null}
      isCreating={false}
      defaultParent="/work/workspaces"
      gitAvailability="available"
      manualParentEntry={false}
      isRemoteHost={false}
      hostLabel={null}
      {...handlers}
      {...overrides}
    />
  )
  return { ...view, handlers }
}

describe('AddRepoCreateStep (D02a-015/016)', () => {
  it('collapses advanced settings for local hosts and previews the target path', () => {
    renderCreate({ createName: 'demo' })
    expect(screen.queryByText('Location')).toBeNull()
    expect(screen.getByText('/work/workspaces/demo')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Git repository in/i }))
    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Change parent folder/i })).toBeInTheDocument()
  })

  it('opens advanced settings by default for remote hosts and exposes manual entry', () => {
    const { handlers } = renderCreate({
      isRemoteHost: true,
      manualParentEntry: true,
      createParent: ''
    })
    const input = screen.getByLabelText('Host parent folder')
    fireEvent.change(input, { target: { value: '/srv/projects' } })
    expect(handlers.onParentChange).toHaveBeenCalledWith('/srv/projects')
    fireEvent.click(screen.getByRole('button', { name: /Browse host filesystem/i }))
    expect(handlers.onBrowseServer).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/host parent folder before creating/i)).toBeInTheDocument()
  })

  it('shows the Git probe states', () => {
    const { rerender } = renderCreate({ gitAvailability: 'checking' })
    expect(screen.getByText('Checking Git on this host...')).toBeInTheDocument()

    rerender(
      <AddRepoCreateStep
        createName="demo"
        createParent="/work"
        createError={null}
        isCreating={false}
        defaultParent="/work"
        gitAvailability="unavailable"
        manualParentEntry={false}
        isRemoteHost={false}
        hostLabel={null}
        onNameChange={vi.fn()}
        onParentChange={vi.fn()}
        onPickParent={vi.fn()}
        onBrowseServer={vi.fn()}
        onCreate={vi.fn()}
      />
    )
    expect(screen.getByText('Git is required to create a project.')).toBeInTheDocument()
  })

  it('blocks creation without a name or with Git unavailable', () => {
    const { rerender } = renderCreate({ createName: '' })
    expect(screen.getByRole('button', { name: /Create Project/i })).toBeDisabled()

    rerender(
      <AddRepoCreateStep
        createName="demo"
        createParent="/work"
        createError={null}
        isCreating={false}
        defaultParent="/work"
        gitAvailability="unavailable"
        manualParentEntry={false}
        isRemoteHost={false}
        hostLabel={null}
        onNameChange={vi.fn()}
        onParentChange={vi.fn()}
        onPickParent={vi.fn()}
        onBrowseServer={vi.fn()}
        onCreate={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /Create Project/i })).toBeDisabled()
  })

  it('shows the create error', () => {
    renderCreate({ createError: 'destination already exists' })
    expect(screen.getByRole('alert')).toHaveTextContent('destination already exists')
  })
})
