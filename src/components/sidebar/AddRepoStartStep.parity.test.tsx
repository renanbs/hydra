// D02a-006/041: roving keyboard selection, the ⏎ chip, the empty-state copy and
// the stop affordance for an in-flight nested scan.
import { describe, expect, it, vi } from 'vitest'
import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { getAddRepoLocalStartActions } from './add-repo-local-start-actions'
import { AddRepoStartStep } from './AddRepoStartStep'

function renderStart(overrides: Partial<Parameters<typeof AddRepoStartStep>[0]> = {}) {
  const handlers = {
    onBrowse: vi.fn(),
    onOpenCloneStep: vi.fn(),
    onOpenRemoteStep: vi.fn(),
    onOpenCreateStep: vi.fn(),
    onStopNestedScan: vi.fn()
  }
  const actions = getAddRepoLocalStartActions({ isSshLikely: false, ...handlers })
  const view = render(
    <AddRepoStartStep
      repoCount={0}
      isAdding={false}
      addProjectBusyLabel={null}
      nestedScanInProgress={false}
      nestedScanId={null}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      onStopNestedScan={handlers.onStopNestedScan}
      {...overrides}
    />
  )
  return { ...view, handlers }
}

describe('AddRepoStartStep (D02a-006/041)', () => {
  it('describes the empty library and shows the action order', () => {
    renderStart()
    expect(screen.getByText('Add a project to get started with Hydra.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /browse folder/i })).toHaveFocus()
    const titles = screen.getAllByRole('button').map((button) => button.textContent)
    expect(titles[1]).toMatch(/Clone from URL/)
    expect(titles[2]).toMatch(/Project on SSH host/)
  })

  it('roves focus between actions with the arrow keys and moves the ⏎ chip', () => {
    renderStart()
    const browse = screen.getByRole('button', { name: /browse folder/i })
    expect(browse.textContent).toContain('⏎')

    fireEvent.keyDown(browse, { key: 'ArrowDown' })
    const clone = screen.getByRole('button', { name: /Clone from URL/ })
    expect(clone).toHaveFocus()
    expect(clone.textContent).toContain('⏎')
    expect(browse.textContent).not.toContain('⏎')

    fireEvent.keyDown(clone, { key: 'ArrowUp' })
    expect(browse).toHaveFocus()
  })

  it('wraps roving focus from the first action to the last', () => {
    renderStart()
    const browse = screen.getByRole('button', { name: /browse folder/i })
    fireEvent.keyDown(browse, { key: 'ArrowUp' })
    expect(screen.getByRole('button', { name: /Create new project/i })).toHaveFocus()
  })

  it('shows the busy notice and stops an active scan', () => {
    const onStopNestedScan = vi.fn()
    renderStart({
      isAdding: true,
      addProjectBusyLabel: 'Scanning for repositories...',
      nestedScanInProgress: true,
      nestedScanId: 'nested-repo-scan-1',
      onStopNestedScan
    })
    expect(screen.getByText('Scanning for repositories...')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stop scan' }))
    expect(onStopNestedScan).toHaveBeenCalledTimes(1)
  })

  it('disables every action while adding', () => {
    renderStart({ isAdding: true, addProjectBusyLabel: null })
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })
})
