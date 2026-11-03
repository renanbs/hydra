import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { HydraProject } from '../WorktreeSidebar'
import type { WorkspaceDisplayOptions } from '../WorkspaceOptionsMenu'
import WorkspaceBoardFilterMenu from './WorkspaceBoardFilterMenu'

const PROJECT: HydraProject = {
  id: 'repo_1',
  name: 'hydra',
  path: '/repo/hydra',
  is_git: true,
  current_branch: 'main',
}

const OPTIONS: WorkspaceDisplayOptions = {
  groupBy: 'repo',
  sortBy: 'recent',
  hideSleeping: false,
  hideDefaultBranch: false,
  hideAutomationCreated: false,
  hideCliCreated: false,
  hideDetachedHead: false,
}

describe('WorkspaceBoardFilterMenu (D08-008)', () => {
  it('renders the sidebar filter trigger with the board keep-open hooks', () => {
    render(
      <WorkspaceBoardFilterMenu
        options={OPTIONS}
        projects={[PROJECT]}
        onOptionsChange={vi.fn()}
      />
    )

    const trigger = screen.getByRole('button', { name: 'Workspace display options' })
    expect(trigger).toHaveAttribute('data-workspace-board-trigger')
    expect(trigger).toHaveAttribute('data-workspace-board-preserve-open')
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('reports the menu open state so the board can preserve itself', () => {
    const onMenuOpenChange = vi.fn()
    render(
      <WorkspaceBoardFilterMenu
        options={OPTIONS}
        projects={[PROJECT]}
        onOptionsChange={vi.fn()}
        onMenuOpenChange={onMenuOpenChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Workspace display options' }))
    expect(onMenuOpenChange).toHaveBeenCalledWith(true)
    expect(screen.getByText('Workspace options')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Workspace display options/ }))
    expect(onMenuOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('counts the active filters in the trigger label', () => {
    render(
      <WorkspaceBoardFilterMenu
        options={{ ...OPTIONS, hideSleeping: true, hideDetachedHead: true }}
        projects={[PROJECT]}
        onOptionsChange={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Workspace display options (3 active)' })
    ).toBeInTheDocument()
  })

  it('writes a filter change through the sidebar options writer', () => {
    const onOptionsChange = vi.fn()
    render(
      <WorkspaceBoardFilterMenu
        options={OPTIONS}
        projects={[PROJECT]}
        onOptionsChange={onOptionsChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Workspace display options' }))
    fireEvent.click(screen.getByText('Hide sleeping'))
    expect(onOptionsChange).toHaveBeenCalledWith({ ...OPTIONS, hideSleeping: true })
  })
})
