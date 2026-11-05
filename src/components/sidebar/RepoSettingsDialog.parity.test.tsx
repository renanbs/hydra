// Rosetta: the repo settings dialog's local-commands section (D03b-017).
// The dialog is Hydra's repo-scoped surface (Orca's repo pane equivalent);
// this locks the two Orca behaviors that live here: the setup/archive editors
// persist through the repo writer, and the deep-link section id lands on the
// setup editor with autofocus.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RepoSettingsDialog } from './RepoSettingsDialog'
import type { HydraProject } from './types'
import { useAppStore } from '@/store'

const PROJECT: HydraProject = {
  id: 'repo_abc',
  name: 'api',
  displayName: 'api',
  path: '/work/api',
  is_git: true,
  current_branch: 'main'
}

function openDialog(props: Partial<React.ComponentProps<typeof RepoSettingsDialog>> = {}) {
  return render(
    <RepoSettingsDialog open project={PROJECT} onOpenChange={vi.fn()} {...props} />
  )
}

beforeEach(() => {
  useAppStore.setState({
    repos: [
      {
        id: 'repo_abc',
        path: '/work/api',
        displayName: 'api',
        hookSettings: {
          mode: 'auto',
          scripts: { setup: 'pnpm install', archive: '' }
        }
      }
    ]
  } as never)
})

describe('RepoSettingsDialog local commands (D03b-017)', () => {
  it('renders the setup/archive editors seeded from the repo hooks', () => {
    openDialog()

    expect(screen.getByText('Local commands')).toBeInTheDocument()
    expect(screen.getByLabelText('Setup Script')).toHaveValue('pnpm install')
    expect(screen.getByLabelText('Archive Script')).toHaveValue('')
  })

  it('anchors the section id and marks the setup editor for deep-link focus', () => {
    const { container } = openDialog({ initialSectionId: 'repo-local-commands:repo_abc' })

    expect(
      container.querySelector('[data-repo-local-commands-section="repo_abc"]')
    ).not.toBeNull()
    // jsdom does not move focus on .focus(); the anchor contract is the
    // section id reaching the setup editor as its autofocus flag.
    expect(screen.getByLabelText('Setup Script')).toHaveAttribute('data-autofocus-section', 'repo-local-commands:repo_abc')
  })

  it('persists edits through the repo writer', async () => {
    const updateRepo = vi.fn().mockResolvedValue(true)
    useAppStore.setState({ updateRepo } as never)
    openDialog()

    fireEvent.change(screen.getByLabelText('Setup Script'), {
      target: { value: 'pnpm install && pnpm build' }
    })
    fireEvent.blur(screen.getByLabelText('Setup Script'))

    await waitFor(() =>
      expect(updateRepo).toHaveBeenCalledWith(
        'repo_abc',
        expect.objectContaining({
          hookSettings: expect.objectContaining({
            scripts: expect.objectContaining({
              setup: 'pnpm install && pnpm build'
            })
          })
        })
      )
    )
  })
})
