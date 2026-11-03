// Parity guard for D10-018: Orca composes the destructive sentence with the
// target label, the target's highlight class, and — for a lineage delete — the
// child target label before the shared suffix.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeleteWorktreeDialogDescription } from './DeleteWorktreeDialogDescription'

describe('DeleteWorktreeDialogDescription (D10-018)', () => {
  it('names the single target with the copy module highlight class', () => {
    render(
      <DeleteWorktreeDialogDescription
        targetClassName="break-all font-medium text-foreground"
        targetLabel="feat/orca"
        canDeleteAllLineage={false}
        childTargetLabel=""
        descriptionSuffix="from git and delete its workspace folder."
      />
    )

    const target = screen.getByText('feat/orca')
    expect(target).toHaveClass('break-all', 'font-medium', 'text-foreground')
    expect(document.body.textContent).toContain(
      'Remove feat/orca from git and delete its workspace folder.'
    )
  })

  it('adds the child target label before the lineage suffix', () => {
    render(
      <DeleteWorktreeDialogDescription
        targetClassName="break-all font-medium text-foreground"
        targetLabel="parent"
        canDeleteAllLineage
        childTargetLabel="2 child workspaces"
        descriptionSuffix="from git and delete their workspace folders."
      />
    )

    const child = screen.getByText('2 child workspaces')
    expect(child).toHaveClass('font-medium', 'text-foreground')
    expect(document.body.textContent).toContain(
      'Remove parent and 2 child workspaces from git and delete their workspace folders.'
    )
  })

  it('omits the child clause when the delete is not a lineage delete', () => {
    render(
      <DeleteWorktreeDialogDescription
        targetClassName="font-medium text-foreground"
        targetLabel="3 workspaces"
        canDeleteAllLineage={false}
        childTargetLabel="2 child workspaces"
        descriptionSuffix="from git and delete their workspace folders."
      />
    )

    expect(screen.queryByText('2 child workspaces')).toBeNull()
    expect(document.body.textContent).toContain(
      'Remove 3 workspaces from git and delete their workspace folders.'
    )
  })
})
