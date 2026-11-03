// D04a-020: the secondary-rows prompt only appears for an active, Linear-linked
// workspace whose agent skill is missing; installing it or dismissing the prompt
// removes the row.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const skillState = {
  installed: false,
  loading: false,
  settled: true,
  installedUnverifiable: false,
  error: null,
  skills: [],
  sources: [],
  refresh: vi.fn()
}

vi.mock('../../hooks/useInstalledAgentSkills', () => ({
  useInstalledAgentSkillNames: () => skillState
}))

import { LinearAgentSkillSetupPrompt } from './LinearAgentSkillSetupPrompt'

describe('Linear agent skill setup prompt (Orca parity)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    skillState.installed = false
    skillState.loading = false
  })

  it('renders only for a linked workspace with the skill missing', () => {
    const { rerender } = render(<LinearAgentSkillSetupPrompt linked={false} />)
    expect(screen.queryByText(/Set up Linear agent skill/)).toBeNull()

    rerender(<LinearAgentSkillSetupPrompt linked />)
    expect(screen.getByText(/Set up Linear agent skill/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Copy install command/ })).toBeTruthy()

    skillState.installed = true
    rerender(<LinearAgentSkillSetupPrompt linked />)
    expect(screen.queryByText(/Set up Linear agent skill/)).toBeNull()

    skillState.installed = false
    skillState.loading = true
    rerender(<LinearAgentSkillSetupPrompt linked />)
    expect(screen.queryByText(/Set up Linear agent skill/)).toBeNull()
  })

  it('dismisses permanently through localStorage', () => {
    const { rerender } = render(<LinearAgentSkillSetupPrompt linked />)
    fireEvent.click(screen.getByRole('button', { name: /Dismiss Linear agent skill setup/ }))
    expect(screen.queryByText(/Set up Linear agent skill/)).toBeNull()
    expect(window.localStorage.getItem('hydra.linearTicketsSkill.setupDismissed')).toBe('1')

    rerender(<LinearAgentSkillSetupPrompt linked />)
    expect(screen.queryByText(/Set up Linear agent skill/)).toBeNull()
  })
})
