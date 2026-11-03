import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAppStore } from '@/store'
import { NonGitFolderModalHost } from './NonGitFolderModalHost'

type ModalState = {
  activeModal: string
  modalData: Record<string, unknown>
  closeModal: () => void
  addNonGitFolder: (path: string, options?: Record<string, unknown>) => Promise<unknown>
}

function openModal(modalData: Record<string, unknown>) {
  const closeModal = vi.fn()
  const addNonGitFolder = vi.fn().mockResolvedValue(null)
  useAppStore.setState({
    activeModal: 'confirm-non-git-folder',
    modalData,
    closeModal,
    addNonGitFolder
  } as unknown as Partial<ModalState>)
  render(<NonGitFolderModalHost />)
  return { closeModal, addNonGitFolder }
}

describe('NonGitFolderModalHost (D02c-009 / D02c-010)', () => {
  it('opens the confirmed folder through addNonGitFolder with its runtime owner', () => {
    const { addNonGitFolder, closeModal } = openModal({
      folderPath: '/srv/notes',
      displayName: 'Notes',
      runtimeEnvironmentId: 'env-1'
    })
    expect(screen.getByText('/srv/notes')).toBeInTheDocument()
    expect(screen.getByText(/runtime env-1/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open as folder project' }))
    expect(closeModal).toHaveBeenCalledTimes(1)
    expect(addNonGitFolder).toHaveBeenCalledWith('/srv/notes', {
      displayName: 'Notes',
      runtimeEnvironmentId: 'env-1'
    })
  })

  it('renders nothing for another modal or an empty path', () => {
    useAppStore.setState({
      activeModal: 'none',
      modalData: {}
    } as unknown as Partial<ModalState>)
    const { container } = render(<NonGitFolderModalHost />)
    expect(container).toBeEmptyDOMElement()
  })
})
