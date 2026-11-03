// D02a-022/024/025/041: nested review copy, selection, group name, stop and the
// open-as-folder fallback.
import { describe, expect, it, vi } from "vitest"
import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import type { NestedRepoScanResult } from "../../shared/project-group-types"
import { AddRepoNestedImportStep } from './AddRepoNestedImportStep'

function scan(overrides: Partial<NestedRepoScanResult> = {}): NestedRepoScanResult {
  return {
    selectedPath: '/work/acme',
    selectedPathKind: 'non_git_folder',
    repos: [
      { path: '/work/acme/api', displayName: 'api', depth: 1 },
      { path: '/work/acme/web', displayName: 'web', depth: 1 }
    ],
    truncated: false,
    timedOut: false,
    stopped: false,
    durationMs: 12,
    maxDepth: 3,
    maxRepos: 100,
    timeoutMs: null,
    ...overrides
  }
}

function renderStep(overrides: Partial<Parameters<typeof AddRepoNestedImportStep>[0]> = {}) {
  const handlers = {
    onGroupNameChange: vi.fn(),
    onSelectedPathsChange: vi.fn(),
    onImport: vi.fn(),
    onOpenAsFolder: vi.fn(),
    onStopScan: vi.fn()
  }
  const view = render(
    <AddRepoNestedImportStep
      scan={scan()}
      groupName="acme"
      selectedPaths={new Set(['/work/acme/api', '/work/acme/web'])}
      isAdding={false}
      scanInProgress={false}
      {...handlers}
      {...overrides}
    />
  )
  return { ...view, handlers }
}

describe('AddRepoNestedImportStep (D02a-022/024/025/041)', () => {
  it('reports the found count and prefilled group name', () => {
    renderStep()
    expect(screen.getByText('Found 2 repositories in /work/acme.')).toBeInTheDocument()
    expect(screen.getByLabelText('Group name')).toHaveValue('acme')
  })

  it('uses the singular count for one repository', () => {
    renderStep({
      scan: scan({ repos: [{ path: '/work/acme/api', displayName: 'api', depth: 1 }] })
    })
    expect(screen.getByText('Found 1 repository in /work/acme.')).toBeInTheDocument()
  })

  it('imports separately or as a group with the edited name', () => {
    const { handlers } = renderStep({ groupName: 'acme-platform' })
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'platform' } })
    expect(handlers.onGroupNameChange).toHaveBeenCalledWith('platform')

    fireEvent.click(screen.getByRole('button', { name: /import separately/i }))
    expect(handlers.onImport).toHaveBeenCalledWith('separate')
    fireEvent.click(screen.getByRole('button', { name: /import as group/i }))
    expect(handlers.onImport).toHaveBeenCalledWith('group')
  })

  it('offers Open as Folder only when nothing is selected', () => {
    const { handlers } = renderStep({ selectedPaths: new Set() })
    const openAsFolder = screen.getByRole('button', { name: /Open as Folder/i })
    expect(screen.getByRole('button', { name: /import separately/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /import as group/i })).toBeDisabled()
    fireEvent.click(openAsFolder)
    expect(handlers.onOpenAsFolder).toHaveBeenCalledTimes(1)
  })

  it('stops an in-flight scan and reports partial results', () => {
    const { handlers } = renderStep({ scanInProgress: true, scan: scan({ stopped: true }) })
    expect(screen.getByText(/Scanning.../)).toBeInTheDocument()
    expect(screen.getByText('Scan stopped early.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stop scan' }))
    expect(handlers.onStopScan).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /import as group/i })).toBeDisabled()
  })
})
