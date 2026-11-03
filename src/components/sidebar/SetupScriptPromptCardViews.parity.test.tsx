import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  DetectedSetupPreview,
  InspectionErrorActions,
  PackageManagerActions,
  SetupScriptPromptBody
} from './SetupScriptPromptCardViews'
import { SetupScriptPromptCardShell } from './SetupScriptPromptCardShell'

function renderWithTooltips(node: React.ReactNode) {
  return render(<TooltipProvider>{node}</TooltipProvider>)
}

const shellProps = {
  repoBadgeColor: '#22c55e',
  repoDisplayName: 'hydra',
  isInspectionError: false,
  sharedSetupIgnored: false,
  isPackageManagerSuggestion: true,
  hasCandidate: true,
  candidateSource: 'pnpm (package.json)',
  candidateProvenance: 'pnpm-lock.yaml',
  detectedSetupDraft: 'pnpm install',
  isImporting: false,
  renderedStateOk: true,
  onDismiss: vi.fn(),
  onRetryInspection: vi.fn(),
  onConfigure: vi.fn(),
  onImport: vi.fn(),
  onSetupDraftChange: vi.fn()
}

describe('setup script prompt card (D02c-020 / D02c-021)', () => {
  it('renders the floating shell title, repo identity and dismiss control', () => {
    renderWithTooltips(<SetupScriptPromptCardShell {...shellProps} />)
    expect(screen.getByText('Add a setup script')).toBeInTheDocument()
    expect(screen.getByText('hydra')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss setup scripts' })).toBeInTheDocument()
  })

  it('saves the detected package-manager command and offers manual configuration', () => {
    renderWithTooltips(<SetupScriptPromptCardShell {...shellProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Configure manually' }))
    expect(shellProps.onImport).toHaveBeenCalledTimes(1)
    expect(shellProps.onConfigure).toHaveBeenCalledTimes(1)
  })

  it('keeps the detected command editable and reports its provenance', () => {
    const onSetupDraftChange = vi.fn()
    renderWithTooltips(
      <DetectedSetupPreview
        setup="pnpm install"
        onSetupChange={onSetupDraftChange}
        provenance="pnpm-lock.yaml"
      />
    )
    fireEvent.change(screen.getByRole('textbox', { name: 'Detected setup script' }), {
      target: { value: 'pnpm i' }
    })
    expect(onSetupDraftChange).toHaveBeenCalledWith('pnpm i')
    expect(screen.getByText('pnpm-lock.yaml')).toBeInTheDocument()
  })

  it('offers retry and settings when inspection failed', () => {
    const onRetry = vi.fn()
    const onConfigure = vi.fn()
    renderWithTooltips(<InspectionErrorActions onRetry={onRetry} onConfigure={onConfigure} />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onConfigure).toHaveBeenCalledTimes(1)
  })

  it('explains shared orca.yaml suppression and the package-manager suggestion', () => {
    const { rerender } = render(
      <SetupScriptPromptBody
        isInspectionError={false}
        sharedSetupIgnored
        isPackageManagerSuggestion={false}
        candidateSource={null}
      />
    )
    expect(screen.getByText(/ignores shared/)).toBeInTheDocument()
    rerender(
      <SetupScriptPromptBody
        isInspectionError={false}
        sharedSetupIgnored={false}
        isPackageManagerSuggestion
        candidateSource={null}
      />
    )
    expect(screen.getByText(/Save the detected command/)).toBeInTheDocument()
  })

  it('shows a spinner while saving and disables the save action', () => {
    renderWithTooltips(
      <PackageManagerActions isSaving onSave={vi.fn()} onConfigure={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
