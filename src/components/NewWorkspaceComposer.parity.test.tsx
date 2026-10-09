// D08-030: the workspace board's lane `+` opens this composer with the lane's status
// preselected, and the created worktree is persisted into that lane through the app's single
// status writer. The composer itself is the same modal the sidebar opens — one mechanism.
import { useState, type ComponentProps } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HydraProject } from './sidebar/WorktreeSidebar'
import { NewWorkspaceComposer } from './NewWorkspaceComposer'

const invokeMock = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

const PROJECT: HydraProject = {
  id: 'repo_1',
  name: 'hydra',
  path: '/repo/hydra',
  is_git: true,
  current_branch: 'main',
}

const AGENTS = [{ id: 'claude', name: 'Claude Code', executable: 'claude', is_installed: true }]

const CREATED_PATH = '/repo/hydra/wt-new'

function resolveCreate(command: string): Promise<unknown> {
  return command === 'create_worktree' ? Promise.resolve(CREATED_PATH) : Promise.resolve(undefined)
}

function renderComposer(overrides: Partial<ComponentProps<typeof NewWorkspaceComposer>> = {}) {
  const onCreated = vi.fn()
  const onClose = vi.fn()
  const view = render(
    <NewWorkspaceComposer
      isOpen
      activeProject={PROJECT}
      projects={[PROJECT]}
      availableAgents={AGENTS}
      onClose={onClose}
      onCreated={onCreated}
      {...overrides}
    />
  )
  return { ...view, onCreated, onClose }
}

/** The footer's primary action; the form's submit path is the one under test. */
async function submitComposer(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Create worktree/ }))
  })
}

describe('NewWorkspaceComposer (workspace board lane create)', () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  it('persists the preselected lane status on the workspace it just created', async () => {
    invokeMock.mockImplementation(resolveCreate)
    const { onCreated } = renderComposer({ initialWorkspaceStatus: 'todo' })

    await submitComposer()

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    // The status write lands after the worktree exists and before the app refreshes, so the
    // new workspace paints in the lane it was created from.
    expect(invokeMock.mock.calls.map(([command]) => command)).toEqual([
      'create_worktree',
      'set_worktree_status',
    ])
    expect(invokeMock.mock.calls[1]).toEqual([
      'set_worktree_status',
      { worktreePath: CREATED_PATH, status: 'todo' },
    ])
  })

  it('writes no status when the composer was not opened from a lane', async () => {
    invokeMock.mockImplementation(resolveCreate)
    const { onCreated } = renderComposer()

    await submitComposer()

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(invokeMock.mock.calls.map(([command]) => command)).toEqual(['create_worktree'])
  })

  it('drops the lane seed when it closes, so the next creation does not inherit it', async () => {
    invokeMock.mockImplementation(resolveCreate)
    // The app's own wiring: one modal, `initialWorkspaceStatus` cleared on close. This harness
    // mirrors `closeNewWorkspaceComposer` in `App.tsx` — the composer must not carry a lane
    // seed into a creation that was not launched from that lane.
    function AppLikeHarness(): React.JSX.Element {
      const [open, setOpen] = useState(false)
      const [status, setStatus] = useState<string | null>(null)
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setStatus('todo')
              setOpen(true)
            }}
          >
            Open from lane
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus(null)
              setOpen(true)
            }}
          >
            Open from sidebar
          </button>
          <NewWorkspaceComposer
            isOpen={open}
            activeProject={PROJECT}
            projects={[PROJECT]}
            availableAgents={AGENTS}
            initialWorkspaceStatus={status}
            onClose={() => {
              setOpen(false)
              setStatus(null)
            }}
            onCreated={vi.fn()}
          />
        </>
      )
    }

    render(<AppLikeHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'Open from lane' }))
    await submitComposer()
    await waitFor(() =>
      expect(
        invokeMock.mock.calls.filter(([command]) => command === 'create_worktree')
      ).toHaveLength(1)
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open from sidebar' }))
    await submitComposer()
    await waitFor(() =>
      expect(
        invokeMock.mock.calls.filter(([command]) => command === 'create_worktree')
      ).toHaveLength(2)
    )

    expect(
      invokeMock.mock.calls.filter(([command]) => command === 'set_worktree_status')
    ).toEqual([['set_worktree_status', { worktreePath: CREATED_PATH, status: 'todo' }]])
  })
})
