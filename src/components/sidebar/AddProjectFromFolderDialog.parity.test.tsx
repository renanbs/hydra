// D02a-026: dropped-folder confirmation shows the path, host and errors.
import { describe, expect, it, vi } from "vitest"
import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { AddProjectFromFolderDialog } from './AddProjectFromFolderDialog'

describe('AddProjectFromFolderDialog (D02a-026)', () => {
  it('formats the folder path and host in a mono block', () => {
    const { container } = render(
      <AddProjectFromFolderDialog
        folderPath="/work/acme/monorepo"
        hostLabel="build-box"
        isSubmitting={false}
        error={null}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByText('/work/acme/monorepo')).toBeInTheDocument()
    expect(screen.getByText(/on build-box/)).toBeInTheDocument()
    expect(container.querySelector('.font-mono')).not.toBeNull()
  })

  it('confirms and cancels', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(
      <AddProjectFromFolderDialog
        folderPath="/work/acme"
        isSubmitting={false}
        error={null}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add Project' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables the confirmation while adding and shows the failure', () => {
    render(
      <AddProjectFromFolderDialog
        folderPath="/work/acme"
        isSubmitting
        error="Not a valid git repository"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Add Project' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Not a valid git repository')
  })
})
