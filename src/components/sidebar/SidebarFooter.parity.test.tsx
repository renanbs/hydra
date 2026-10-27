import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarFooter } from './SidebarFooter'

function renderFooter(workspaceBoardOpen: boolean) {
  const onToggleWorkspaceBoard = vi.fn()
  render(
    <TooltipProvider>
      <SidebarFooter
        appVersion={null}
        gitStatus={null}
        onOpenSettings={vi.fn()}
        workspaceBoardOpen={workspaceBoardOpen}
        onToggleWorkspaceBoard={onToggleWorkspaceBoard}
      />
    </TooltipProvider>
  )
  return { onToggleWorkspaceBoard }
}

describe('SidebarFooter workspace board trigger (Orca SidebarToolbar parity)', () => {
  it('exposes the board trigger in the sidebar footer', () => {
    renderFooter(false)

    const trigger = document.querySelector('[data-workspace-board-trigger]')
    expect(trigger).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Workspace board' })).toBe(trigger)
    expect(trigger?.getAttribute('aria-pressed')).toBe('false')
  })

  it('reports the open state through aria-pressed', () => {
    renderFooter(true)

    expect(
      document.querySelector('[data-workspace-board-trigger]')?.getAttribute('aria-pressed')
    ).toBe('true')
  })

  it('toggles the board when clicked', () => {
    const { onToggleWorkspaceBoard } = renderFooter(false)

    fireEvent.click(screen.getByRole('button', { name: 'Workspace board' }))

    expect(onToggleWorkspaceBoard).toHaveBeenCalledTimes(1)
  })
})
