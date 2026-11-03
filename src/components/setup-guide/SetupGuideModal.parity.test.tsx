// Parity guard for D01-017/D01-036: the setup-guide modal opens from the sidebar
// entry and Help menu, selects the requested (or first incomplete) step, reports
// live progress, and persists the hide-from-sidebar dismissal through the store.
import {
  act,
  fireEvent,
  render,
  screen,
  within,
  type RenderResult
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/store'
import { DEFAULT_HYDRA_SETTINGS, type HydraSettings } from '@/shared/settings-types'
import { SetupGuideModalHost } from './SetupGuideModalHost'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

type SetupGuideStoreProbe = {
  activeModal: string
  setupGuideSidebarDismissed: boolean
}

function readSetupGuideStore(): SetupGuideStoreProbe {
  // Why the cast: the composed UI slice is typed `any` on this branch, so AppState
  // does not name the modal/dismissal fields at compile time.
  return useAppStore.getState() as unknown as SetupGuideStoreProbe
}

function resetStore(): void {
  act(() => {
    useAppStore.setState({
      persistedUIReady: true,
      activeModal: 'none',
      modalData: {},
      featureInteractions: {},
      repos: [],
      worktreesByRepo: {},
      setupGuideSidebarDismissed: false
    })
  })
}

function openSetupGuide(modalData: Record<string, unknown> = {}): void {
  act(() => {
    useAppStore.setState({ activeModal: 'setup-guide', modalData })
  })
}

function renderHost(settings: HydraSettings = DEFAULT_HYDRA_SETTINGS): RenderResult {
  return render(
    <TooltipProvider>
      <SetupGuideModalHost settings={settings} />
    </TooltipProvider>
  )
}

describe('SetupGuideModalHost (D01-017/D01-036)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetStore()
  })

  afterEach(() => {
    resetStore()
  })

  it('mounts nothing until the setup-guide modal is requested', () => {
    const { container } = renderHost()

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the full checklist with the requested step selected', () => {
    openSetupGuide({ setupStepId: 'browser', telemetrySource: 'sidebar' })
    renderHost({ ...DEFAULT_HYDRA_SETTINGS, notification_on_blocked: false })

    expect(screen.getByRole('dialog', { name: 'Getting started' })).toBeInTheDocument()
    const checklist = screen.getByRole('navigation', { name: 'Setup checklist' })
    expect(checklist).toBeInTheDocument()
    expect(screen.getByText('Setup', { selector: 'h4' })).toBeInTheDocument()
    expect(screen.getByText('Milestones', { selector: 'h4' })).toBeInTheDocument()

    expect(within(checklist).getAllByRole('button')).toHaveLength(8)

    const browserStep = within(checklist).getByRole('button', { name: /Use Orca's browser/ })
    expect(browserStep).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Not done yet')).toBeInTheDocument()
    expect(screen.getByLabelText('0 of 8 setup steps complete')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAttribute('data-telemetry-source', 'sidebar')
  })

  it('defaults to the first incomplete step when no step is requested', () => {
    openSetupGuide({ telemetrySource: 'help_menu' })
    renderHost()

    expect(
      within(screen.getByRole('navigation', { name: 'Setup checklist' })).getByRole('button', {
        name: /Choose your default agent/
      })
    ).toHaveAttribute('aria-current', 'step')
    expect(
      screen.getByText('Start new work faster with your preferred agent already selected.')
    ).toBeInTheDocument()
  })

  it('hides the checklist from the sidebar through the persisted writer', () => {
    openSetupGuide()
    renderHost()

    fireEvent.click(screen.getByRole('button', { name: 'Hide checklist from sidebar' }))

    expect(readSetupGuideStore().setupGuideSidebarDismissed).toBe(true)
  })

  it('closes the modal through the store when dismissed', () => {
    openSetupGuide()
    renderHost()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(readSetupGuideStore().activeModal).toBe('none')
  })
})
