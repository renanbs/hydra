// Rosetta D02c-010: adapter over
// `src/reference/components/sidebar/complete-nested-folder-open.ts`.
// SSH → confirm modal with connectionId; runtime → confirm modal with
// environmentId; local → folder workspace + handoff. Generation guards,
// busy label, and error surface match the reference.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { completeNestedFolderOpen } from './complete-nested-folder-open'
import { useAppStore } from '../../store'

vi.mock('../../lib/catalog-client', () => ({
  addCatalogFolderWorkspace: vi.fn(async () => ({}))
}))
vi.mock('../../lib/telemetry', () => ({
  track: vi.fn()
}))

import { addCatalogFolderWorkspace } from '../../lib/catalog-client'

const SCAN = {
  selectedPath: '/w/nested',
  repos: [{}, {}]
} as never

beforeEach(() => {
  vi.mocked(addCatalogFolderWorkspace).mockClear()
  useAppStore.setState({ openModal: vi.fn() } as never)
})

function base(overrides = {}) {
  return {
    scan: SCAN,
    generation: 1,
    currentGeneration: () => 1,
    attemptId: null,
    hostBranch: { kind: 'local' } as const,
    selectedCount: 2,
    onFolderAdded: vi.fn(),
    closeModal: vi.fn(),
    setIsAdding: vi.fn(),
    setBusyLabel: vi.fn(),
    setError: vi.fn(),
    ...overrides
  }
}

describe('completeNestedFolderOpen (D02c-010)', () => {
  it('routes SSH hosts through the confirm modal with connectionId', async () => {
    const openModal = vi.fn()
    useAppStore.setState({ openModal } as never)
    const setIsAdding = vi.fn()
    await completeNestedFolderOpen(
      base({ hostBranch: { kind: 'ssh', sshTargetId: 'ssh:1' }, setIsAdding })
    )
    expect(openModal).toHaveBeenCalledWith(
      'confirm-non-git-folder',
      expect.objectContaining({ folderPath: '/w/nested', connectionId: 'ssh:1' })
    )
    expect(setIsAdding).toHaveBeenLastCalledWith(false)
  })

  it('creates the folder workspace locally and hands off', async () => {
    const onFolderAdded = vi.fn()
    const closeModal = vi.fn()
    await completeNestedFolderOpen(base({ onFolderAdded, closeModal }))
    expect(addCatalogFolderWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ parentPath: '/w/nested' })
    )
    expect(onFolderAdded).toHaveBeenCalledWith('/w/nested')
    expect(closeModal).toHaveBeenCalledTimes(1)
  })

  it('drops stale generations without finishing the UI', async () => {
    const onFolderAdded = vi.fn()
    const closeModal = vi.fn()
    const setError = vi.fn()
    // The reference sets busy state and clears the error before the async
    // work; staleness only guards the finish (handoff, close, error toast).
    await completeNestedFolderOpen(
      base({ generation: 1, currentGeneration: () => 2, onFolderAdded, closeModal, setError })
    )
    expect(onFolderAdded).not.toHaveBeenCalled()
    expect(closeModal).not.toHaveBeenCalled()
    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError).toHaveBeenCalledWith(null)
  })
})
