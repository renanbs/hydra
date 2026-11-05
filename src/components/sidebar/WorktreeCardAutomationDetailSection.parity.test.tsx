// Rosetta: automation provenance section (D04a-045) — availability check
// (available/missing/unavailable), gated Open automation / Open run actions.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { WorktreeCardAutomationDetailSection } from './WorktreeCardAutomationDetailSection'

const PROVENANCE = {
  automationId: 'auto-1',
  automationNameSnapshot: 'Nightly',
  automationRunId: 'run-1',
  automationRunTitleSnapshot: 'run one'
}

vi.mock('../automations/automation-host-client', () => ({
  getAutomationTargetFromHostId: vi.fn(() => ({ kind: 'local' })),
  listAutomationsForTarget: vi.fn(),
  listAutomationRunsForTarget: vi.fn()
}))

import {
  listAutomationsForTarget,
  listAutomationRunsForTarget
} from '../automations/automation-host-client'

beforeEach(() => {
  vi.mocked(listAutomationsForTarget).mockReset()
  vi.mocked(listAutomationRunsForTarget).mockReset()
})

function renderSection(props: Record<string, unknown> = {}) {
  return render(
    <TooltipProvider>
      <WorktreeCardAutomationDetailSection provenance={PROVENANCE} {...props} />
    </TooltipProvider>
  )
}

describe('WorktreeCardAutomationDetailSection (D04a-045)', () => {
  it('checks availability and gates both open actions on it', async () => {
    vi.mocked(listAutomationsForTarget).mockResolvedValue([{ id: 'auto-1' }] as never)
    vi.mocked(listAutomationRunsForTarget).mockResolvedValue([{ id: 'run-1' }] as never)
    const onOpenAutomation = vi.fn()
    const onOpenAutomationRun = vi.fn()
    renderSection({ onOpenAutomation, onOpenAutomationRun })

    expect(screen.getByText('Checking automation availability...')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open automation' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Open run' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open automation' }))
    expect(onOpenAutomation).toHaveBeenCalledTimes(1)
  })

  it('reports a missing automation and hides the open actions', async () => {
    // Why: with no recorded host the read went to the desktop on no evidence,
    // so the miss carries the provenance hostId (Orca automation-missing).
    vi.mocked(listAutomationsForTarget).mockResolvedValue([])
    render(
      <TooltipProvider>
        <WorktreeCardAutomationDetailSection
          provenance={{ ...PROVENANCE, hostId: 'runtime:env-1' } as never}
          onOpenAutomation={vi.fn()}
          onOpenAutomationRun={vi.fn()}
        />
      </TooltipProvider>
    )

    await waitFor(() =>
      expect(screen.getByText('Automation no longer available.')).toBeInTheDocument()
    )
    expect(screen.queryByRole('button', { name: 'Open automation' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Open run' })).toBeNull()
  })

  it('reports an unreachable host as unavailable', async () => {
    vi.mocked(listAutomationsForTarget).mockRejectedValue(new Error('offline'))
    renderSection({})

    await waitFor(() =>
      expect(screen.getByText('Automation availability could not be checked.')).toBeInTheDocument()
    )
  })
})
