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

vi.mock('./InlineCommandTerminal', () => ({
  InlineCommandTerminal: ({ command }: { command: string }) => (
    <div data-testid="inline-terminal">{command}</div>
  )
}))
vi.mock('../../lib/agent-skill-cli-prerequisite', () => ({
  loadOrcaCliAvailableOnPath: vi.fn(async () => true)
}))

import { LinearAgentSkillSetupPrompt } from './LinearAgentSkillSetupPrompt'

// Radix Dialog measures its content on mount; jsdom has no ResizeObserver.
class ResizeObserverNoop {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: ResizeObserverNoop
})

describe('Linear agent skill setup prompt (Orca parity)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    skillState.installed = false
    skillState.loading = false
  })

  it('renders only for a linked workspace with the skill missing', async () => {
    const { rerender } = render(<LinearAgentSkillSetupPrompt linked={false} />)
    expect(screen.queryByText(/Set up Linear agent skill/)).toBeNull()

    rerender(<LinearAgentSkillSetupPrompt linked />)
    expect(await screen.findByText(/Set up Linear agent skill/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Copy install command/ })).toBeTruthy()

    skillState.installed = true
    rerender(<LinearAgentSkillSetupPrompt linked />)
    expect(screen.queryByText(/Set up Linear agent skill/)).toBeNull()

    skillState.installed = false
    skillState.loading = true
    rerender(<LinearAgentSkillSetupPrompt linked />)
    expect(screen.queryByText(/Set up Linear agent skill/)).toBeNull()
  })


  it('opens the setup dialog with Set up and re-checks on demand', async () => {
    const { unmount } = render(<LinearAgentSkillSetupPrompt linked />)
    expect(await screen.findByRole('button', { name: 'Set up' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Re-check' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Set up' }))
    expect(
      await screen.findByText('Enable agents to read and edit the attached Linear ticket.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy command' })).toBeInTheDocument()
    unmount()
  })

  it('renders nothing inline in modal surface until the reminder opens the dialog', () => {
    const { container, unmount } = render(
      <LinearAgentSkillSetupPrompt linked surface="modal" />
    )
    expect(container.querySelector('[data-linear-agent-skill-setup-prompt]')).toBeNull()
    unmount()
  })

  it('dismisses permanently through localStorage', async () => {
    const { rerender } = render(<LinearAgentSkillSetupPrompt linked />)
    fireEvent.click(await screen.findByRole('button', { name: /Dismiss Linear agent skill setup/ }))
    expect(screen.queryByText(/Set up Linear agent skill/)).toBeNull()
    expect(window.localStorage.getItem('hydra.linearTicketsSkill.setupDismissed')).toBe('1')

    rerender(<LinearAgentSkillSetupPrompt linked />)
    expect(screen.queryByText(/Set up Linear agent skill/)).toBeNull()
  })
})
