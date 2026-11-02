import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { WorktreeParentPickerCandidate } from './worktree-parent-eligibility'
import { WorktreeParentPickerPopover } from './WorktreeParentPickerPopover'

function candidate(
  path: string,
  overrides: Partial<WorktreeParentPickerCandidate> = {}
): WorktreeParentPickerCandidate {
  return {
    id: `repo::${path}`,
    path,
    displayName: path.split('/').pop() ?? path,
    branch: 'refs/heads/main',
    repoId: 'repo',
    projectId: 'project',
    hostId: 'local',
    isArchived: false,
    repoLabel: 'hydra',
    repoBadgeColor: 'emerald',
    status: 'working',
    isActive: false,
    ...overrides
  }
}

const CHILD = candidate('/repo/child', { displayName: 'child' })
const CANDIDATES = [
  candidate('/repo/main', { displayName: 'main' }),
  candidate('/repo/login', {
    displayName: 'login-fix',
    branch: 'refs/heads/fix/login',
    connectionId: 'build-box',
    isActive: true
  })
]

function renderPicker(overrides: {
  onSelect?: (candidate: WorktreeParentPickerCandidate) => void
  onRemoveParent?: () => void
} = {}) {
  const onOpenChange = vi.fn()
  const onSelect = overrides.onSelect ?? vi.fn()
  const result = render(
    <WorktreeParentPickerPopover
      open
      child={CHILD}
      candidates={CANDIDATES}
      getAnchorRect={() => ({ left: 20, top: 40, width: 220, height: 34 })}
      onOpenChange={onOpenChange}
      onSelect={onSelect}
      onRemoveParent={overrides.onRemoveParent}
      focusRestoreElement={document.body}
    />
  )
  return { ...result, onOpenChange, onSelect }
}

describe('WorktreeParentPickerPopover (D06-025…D06-029)', () => {
  it('anchors beside the measured rect and names the child it edits', () => {
    renderPicker()

    expect(screen.getByText('Set parent for')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    const content = document.querySelector<HTMLElement>('[data-slot="popover-content"]')
    expect(content).not.toBeNull()
  })

  it('filters and ranks candidates from the search box', () => {
    renderPicker()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'login' } })

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('login-fix')
  })

  it('navigates with the keyboard and selects the highlighted candidate on Enter', () => {
    const onSelect = vi.fn()
    const { onOpenChange } = renderPicker({ onSelect })
    const input = screen.getByRole('combobox')

    expect(input.getAttribute('aria-activedescendant')).toContain('option-0')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toContain('option-1')
    fireEvent.keyDown(input, { key: 'Home' })
    expect(input.getAttribute('aria-activedescendant')).toContain('option-0')
    fireEvent.keyDown(input, { key: 'End' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith(CANDIDATES[1])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('ignores Enter while an IME composition owns the key', () => {
    const onSelect = vi.fn()
    renderPicker({ onSelect })
    const input = screen.getByRole('combobox')

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 })

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('selects a candidate on click', () => {
    const onSelect = vi.fn()
    renderPicker({ onSelect })

    fireEvent.click(screen.getAllByRole('option')[0]!)

    expect(onSelect).toHaveBeenCalledWith(CANDIDATES[0])
  })

  it('paints activity, repo badge, host and branch for each row', () => {
    renderPicker()

    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAccessibleName(expect.stringContaining('main'))
    // The status dot's label reaches assistive tech through the row's sr-only text.
    expect(options[0]).toHaveTextContent('Working')
    expect(options[1]).toHaveTextContent('hydra')
    expect(options[1]).toHaveTextContent('fix/login')
    // Remote rows carry the server glyph next to the repo badge.
    expect(options[1]?.querySelector('svg.lucide-server')).not.toBeNull()
    // The active workspace is labelled, not just tinted.
    expect(screen.getByText('Current')).toBeInTheDocument()
  })

  it('removes the parent link from the header when the child has one', () => {
    const onRemoveParent = vi.fn()
    renderPicker({ onRemoveParent })

    fireEvent.click(screen.getByRole('button', { name: 'Remove parent link' }))

    expect(onRemoveParent).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when nothing matches', () => {
    renderPicker()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz-nomatch' } })

    expect(screen.getByText('No matching eligible worktrees.')).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('closes and reopens without leaking the previous query', () => {
    const props = {
      child: CHILD,
      candidates: CANDIDATES,
      getAnchorRect: () => ({ left: 0, top: 0, width: 200, height: 30 }),
      onOpenChange: vi.fn(),
      onSelect: vi.fn()
    }
    const { rerender } = render(<WorktreeParentPickerPopover open {...props} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'login' } })
    rerender(<WorktreeParentPickerPopover open={false} {...props} />)
    rerender(<WorktreeParentPickerPopover open {...props} />)

    expect(screen.getByRole('combobox')).toHaveValue('')
  })
})
