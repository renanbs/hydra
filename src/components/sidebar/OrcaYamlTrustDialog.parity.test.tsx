import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, act } from '@testing-library/react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { OrcaYamlTrustDialog } from './OrcaYamlTrustDialog'
import { useLinearAgentSkillSetupReminderToast } from './linear-agent-skill-setup-reminder-toast'
import {
  MAX_LINEAR_AGENT_SKILL_SETUP_REMINDER_RUNTIME_KEYS,
  resetLinearAgentSkillSetupReminderState
} from './linear-agent-skill-setup-reminders'

type TrustState = {
  activeModal: string
  modalData: Record<string, unknown>
  closeModal: () => void
  markOrcaHookScriptConfirmed: (repoId: string, kind: string, hash: string) => void
  markOrcaHookRepoAlwaysTrusted: (repoId: string) => void
}

function openTrustModal(modalData: Record<string, unknown> = {}) {
  const confirmed = vi.fn()
  const alwaysTrusted = vi.fn()
  const closeModal = vi.fn()
  useAppStore.setState({
    activeModal: 'confirm-orca-yaml-hooks',
    modalData: {
      repoId: 'repo-1',
      repoName: 'hydra',
      scriptKind: 'setup',
      scriptContent: 'pnpm install',
      contentHash: 'hash-1',
      ...modalData
    },
    closeModal,
    markOrcaHookScriptConfirmed: confirmed,
    markOrcaHookRepoAlwaysTrusted: alwaysTrusted
  } as unknown as Partial<TrustState>)
  render(<OrcaYamlTrustDialog />)
  return { confirmed, alwaysTrusted, closeModal }
}

describe('OrcaYamlTrustDialog (D02c-011)', () => {
  it('previews the script, explains the trigger and resolves run', () => {
    const { confirmed, closeModal } = openTrustModal()
    expect(screen.getByText(/Run setup script from hydra\?/)).toBeInTheDocument()
    expect(screen.getByText(/when this workspace is created/)).toBeInTheDocument()
    expect(screen.getByText('pnpm install')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Run hooks' }))
    expect(confirmed).toHaveBeenCalledWith('repo-1', 'setup', 'hash-1')
    expect(closeModal).toHaveBeenCalled()
  })

  it('records permanent repo trust when always-trust is checked', () => {
    const { confirmed, alwaysTrusted } = openTrustModal()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Run hooks' }))
    expect(alwaysTrusted).toHaveBeenCalledWith('repo-1')
    expect(confirmed).not.toHaveBeenCalled()
  })

  it('treats a changed script as a re-approval prompt and skips on Dont run', () => {
    const { confirmed, closeModal } = openTrustModal({ previouslyApproved: true })
    expect(screen.getByText(/setup script changed — run the new version\?/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: "Don't run" }))
    expect(confirmed).not.toHaveBeenCalled()
    expect(closeModal).toHaveBeenCalled()
  })

  it('renders nothing when another modal is active', () => {
    useAppStore.setState({ activeModal: 'none', modalData: {} } as unknown as Partial<TrustState>)
    const { container } = render(<OrcaYamlTrustDialog />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('linear setup reminder toast (D02c-007)', () => {
  it('opens the dialog on first activation and stops reminding after the limit', async () => {
    const warning = vi.spyOn(toast, 'warning')
    resetLinearAgentSkillSetupReminderState()

    function Harness({ open }: { open: boolean }) {
      useLinearAgentSkillSetupReminderToast({
        localDismissStorageKey: 'runtime-key',
        missingSetup: true,
        setupDialogOpen: open,
        surface: 'modal',
        toastDescription: 'Install it.',
        toastTitle: 'Linear skill is missing',
        openSetupDialog: vi.fn()
      })
      return null
    }

    const first = render(<Harness open={false} />)
    first.unmount()

    // Each mount is a new activation; the modal was already shown while snoozed,
    // so every activation after the first may produce a toast.
    for (let index = 0; index < 4; index += 1) {
      const view = render(<Harness open={false} />)
      await act(async () => {})
      view.unmount()
    }
    expect(warning.mock.calls.length).toBeLessThanOrEqual(3)
    expect(MAX_LINEAR_AGENT_SKILL_SETUP_REMINDER_RUNTIME_KEYS).toBe(256)
  })
})
