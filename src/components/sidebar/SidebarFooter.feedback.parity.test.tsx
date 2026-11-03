// Parity guard for the feedback entry point: Orca opens the composer from the
// sidebar's settings/help affordance, so the footer's Send Feedback control must
// mount the real dialog (not a dead menu item).
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarFooter } from './SidebarFooter'

function renderFooter() {
  render(
    <TooltipProvider>
      <SidebarFooter
        appVersion={null}
        gitStatus={null}
        onOpenSettings={vi.fn()}
        workspaceBoardOpen={false}
        onToggleWorkspaceBoard={vi.fn()}
      />
    </TooltipProvider>
  )
}

describe('SidebarFooter feedback trigger (D10-078)', () => {
  it('opens the feedback composer from the footer', async () => {
    renderFooter()

    fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }))

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.getByText('Send Feedback', { selector: 'h2' })).toBeInTheDocument()
    expect(screen.getByLabelText('What could we improve?')).toBeInTheDocument()
  })
})
