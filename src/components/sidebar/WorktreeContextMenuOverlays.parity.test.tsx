// D04a-070/071: menu-owned dialogs are mounted beside the menu and seeded by the
// caller. With nothing pending the overlay must be an empty fragment so every mount
// site can render it unconditionally.
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { WorktreeContextMenuOverlays } from './WorktreeContextMenuOverlays'

describe('worktree context-menu overlays (Orca parity)', () => {
  it('renders nothing when no dialog is pending', () => {
    const { container } = render(<WorktreeContextMenuOverlays />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the card group dialog with the seeded repo name', async () => {
    render(
      <WorktreeContextMenuOverlays
        groupDialog={{
          open: true,
          title: 'New Project Group',
          description: 'Create a group and move this project into it.',
          initialName: 'hydra group',
          confirmLabel: 'Create',
          onOpenChange: vi.fn(),
          onSubmit: vi.fn()
        }}
      />
    )
    expect(await screen.findByRole('heading', { name: 'New Project Group' })).toBeTruthy()
    expect((screen.getByLabelText('Group Name') as HTMLInputElement).value).toBe('hydra group')
  })
})
