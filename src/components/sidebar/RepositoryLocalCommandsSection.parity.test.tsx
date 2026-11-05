// Rosetta: the local-commands section contract (Orca
// RepositoryHooksSection shape): two editors (setup/archive), env-var chips,
// shared-script notice, and the section-id anchor for deep-link autofocus.
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  getLocalHookFields,
  RepositoryLocalCommandsSection
} from './RepositoryLocalCommandsSection'

describe('RepositoryLocalCommandsSection (Rosetta D03b-017)', () => {
  it('exposes the setup/archive fields with Orca copy', () => {
    const [setup, archive] = getLocalHookFields()
    expect(setup!.label).toBe('Setup Script')
    expect(archive!.label).toBe('Archive Script')
    expect(setup!.placeholder).toContain('$ORCA_WORKTREE_PATH')
  })

  it('renders both editors and commits on blur', () => {
    const onSetupChange = vi.fn()
    const onArchiveChange = vi.fn()
    const onCommit = vi.fn()
    render(
      <RepositoryLocalCommandsSection
        repoId="repo_1"
        setupScript="pnpm install"
        archiveScript=""
        onSetupChange={onSetupChange}
        onArchiveChange={onArchiveChange}
        onCommit={onCommit}
      />
    )

    expect(screen.getByLabelText('Setup Script')).toHaveValue('pnpm install')
    expect(screen.getAllByText('$ORCA_WORKTREE_PATH').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText('Archive Script'), {
      target: { value: 'echo bye' }
    })
    expect(onArchiveChange).toHaveBeenCalledWith('echo bye')
    fireEvent.blur(screen.getByLabelText('Archive Script'))
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('shows the shared orca.yaml script read-only above the local editor', () => {
    render(
      <RepositoryLocalCommandsSection
        repoId="repo_1"
        setupScript=""
        archiveScript=""
        sharedSetupScript="pnpm dlx shared-setup"
        onSetupChange={vi.fn()}
        onArchiveChange={vi.fn()}
        onCommit={vi.fn()}
      />
    )

    expect(screen.getByText('pnpm dlx shared-setup')).toBeInTheDocument()
    expect(screen.getAllByText('orca.yaml').length).toBeGreaterThan(0)
  })
})
