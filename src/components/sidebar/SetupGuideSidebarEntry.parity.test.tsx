// Parity guard for D01-017: the sidebar onboarding entry appears only after
// persisted UI hydration, disappears when complete or hidden, exposes the live
// done/total ring, and opens the setup-guide modal seeded with the first
// incomplete step and the sidebar telemetry source.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/store'
import { DEFAULT_HYDRA_SETTINGS, type HydraSettings } from '@/shared/settings-types'
import { SetupGuideSidebarEntry } from './SetupGuideSidebarEntry'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

const ORCHESTRATION_MARKER_KEY = 'orca.orchestration.enabled'

type SetupGuideStoreProbe = {
  activeModal: string
  modalData: Record<string, unknown>
  setupGuideSidebarDismissed: boolean
}

function readSetupGuideStore(): SetupGuideStoreProbe {
  // Why the cast: the composed UI slice is typed `any` on this branch, so AppState
  // does not name the modal/dismissal fields at compile time.
  return useAppStore.getState() as unknown as SetupGuideStoreProbe
}

function settings(overrides: Partial<HydraSettings> = {}): HydraSettings {
  return { ...DEFAULT_HYDRA_SETTINGS, ...overrides }
}

function renderEntry(overrides: Partial<HydraSettings> = {}, ready = true) {
  act(() => {
    useAppStore.setState({ persistedUIReady: ready })
  })
  return render(
    <TooltipProvider>
      <SetupGuideSidebarEntry settings={settings(overrides)} />
    </TooltipProvider>
  )
}

function completeProfile(): void {
  window.localStorage.setItem(ORCHESTRATION_MARKER_KEY, '1')
  act(() => {
    useAppStore.setState({
      persistedUIReady: true,
      featureInteractions: {
        browser: { firstInteractedAt: 1, interactionCount: 1 },
        'github-tasks': { firstInteractedAt: 2, interactionCount: 1 }
      } as never,
      repos: [
        {
          id: 'repo-1',
          kind: 'git',
          hookSettings: { scripts: { setup: 'pnpm install' } }
        },
        { id: 'repo-2', kind: 'git' }
      ] as never,
      worktreesByRepo: {
        'repo-1': [
          { id: 'repo-1::/repo', path: '/repo', isMainWorktree: true },
          { id: 'repo-1::/repo/feature', path: '/repo/feature', isMainWorktree: false }
        ]
      } as never
    })
  })
}

describe('SetupGuideSidebarEntry (D01-017)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    act(() => {
      useAppStore.setState({
        persistedUIReady: false,
        activeModal: 'none',
        modalData: {},
        featureInteractions: {},
        repos: [],
        worktreesByRepo: {},
        setupGuideSidebarDismissed: false
      })
    })
  })

  afterEach(() => {
    window.localStorage.clear()
    act(() => {
      useAppStore.setState({
        persistedUIReady: false,
        activeModal: 'none',
        modalData: {},
        featureInteractions: {},
        repos: [],
        worktreesByRepo: {},
        setupGuideSidebarDismissed: false
      })
    })
  })

  it('does not render before persisted UI hydration is ready', () => {
    renderEntry({}, false)

    expect(screen.queryByRole('button', { name: /Onboarding checklist/ })).toBeNull()
  })

  it('renders the live done/total ring for an incomplete checklist', () => {
    renderEntry({ default_tui_agent: 'claude', notification_on_blocked: true })

    const entry = screen.getByRole('button', { name: /Onboarding checklist/ })
    expect(entry).toHaveAttribute('data-contextual-tour-target', 'setup-guide-entry')
    expect(
      screen.getByLabelText('2 of 8 setup steps complete')
    ).toBeInTheDocument()
  })

  it('does not render once every milestone is complete', () => {
    completeProfile()
    render(
      <TooltipProvider>
        <SetupGuideSidebarEntry
          settings={settings({ default_tui_agent: 'claude', notification_on_blocked: true })}
        />
      </TooltipProvider>
    )

    expect(screen.queryByRole('button', { name: /Onboarding checklist/ })).toBeNull()
  })

  it('does not render when the entry was hidden from the sidebar', () => {
    act(() => {
      useAppStore.setState({ setupGuideSidebarDismissed: true })
    })
    renderEntry()

    expect(screen.queryByRole('button', { name: /Onboarding checklist/ })).toBeNull()
  })

  it('opens the setup-guide modal focused on the first incomplete step', () => {
    renderEntry({ notification_on_blocked: false })

    fireEvent.click(screen.getByRole('button', { name: /Onboarding checklist/ }))

    const state = readSetupGuideStore()
    expect(state.activeModal).toBe('setup-guide')
    // Why 'notifications': the checklist prioritizes the Setup section, and it is
    // the first Setup step still incomplete in this profile.
    expect(state.modalData.setupStepId).toBe('notifications')
    expect(state.modalData.telemetrySource).toBe('sidebar')
  })

  it('hides the entry through the single persisted writer', async () => {
    renderEntry()

    fireEvent.contextMenu(screen.getByRole('button', { name: /Onboarding checklist/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Hide from sidebar' }))

    await waitFor(() => expect(readSetupGuideStore().setupGuideSidebarDismissed).toBe(true))
  })

  it('keeps the visible entry mounted while readiness refreshes', () => {
    renderEntry({ default_tui_agent: 'claude' })
    expect(screen.getByRole('button', { name: /Onboarding checklist/ })).toBeInTheDocument()

    act(() => {
      useAppStore.setState({ persistedUIReady: false })
    })

    expect(screen.getByRole('button', { name: /Onboarding checklist/ })).toBeInTheDocument()
  })
})
