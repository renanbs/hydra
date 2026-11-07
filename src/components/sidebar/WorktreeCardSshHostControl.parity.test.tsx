// Rosetta: SSH host control on the card (D04a-012/D04a-013).
// States: connected glyph, removed tombstone, retry/reconnect pill, connecting
// spinner; in-flight guard; resync on failure.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WorktreeCardSshHostControl } from './WorktreeCardSshHostControl'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '../../store'
import { resetSshConnectInFlightForTests } from '../../ssh/ssh-connect-in-flight'
import { invoke } from '@tauri-apps/api/core'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}))

beforeEach(() => {
  resetSshConnectInFlightForTests()
  vi.mocked(invoke).mockReset()
})

describe('WorktreeCardSshHostControl (D04a-012/D04a-013)', () => {
  it('renders the passive glyph when connected', () => {
    render(
      <TooltipProvider>
        <WorktreeCardSshHostControl
        targetId="ssh:1"
        targetLabel="dev"
        status="connected"
        targetRemoved={false}
        sshOwnerEnvironmentId={null}
        iconOnly={false}
        onPointerDown={vi.fn()}
        />
      </TooltipProvider>
    )
    expect(screen.getByText('Project on SSH host dev')).toBeInTheDocument()
  })

  it('renders the removed tombstone instead of a connect button', () => {
    render(
      <TooltipProvider>
        <WorktreeCardSshHostControl
        targetId="ssh:1"
        targetLabel="dev"
        status="error"
        targetRemoved
        sshOwnerEnvironmentId={null}
        iconOnly={false}
        onPointerDown={vi.fn()}
        />
      </TooltipProvider>
    )
    expect(screen.getByText('SSH host dev was removed')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('offers retry on error and reconnect on auth-failed', () => {
    const { rerender } = render(
      <TooltipProvider>
        <WorktreeCardSshHostControl
        targetId="ssh:1"
        targetLabel="dev"
        status="error"
        targetRemoved={false}
        sshOwnerEnvironmentId={null}
        iconOnly={false}
        onPointerDown={vi.fn()}
        />
      </TooltipProvider>
    )
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()

    rerender(
      <TooltipProvider>
        <WorktreeCardSshHostControl
          targetId="ssh:1"
          targetLabel="dev"
          status="auth-failed"
          targetRemoved={false}
          sshOwnerEnvironmentId={null}
          iconOnly={false}
          onPointerDown={vi.fn()}
        />
      </TooltipProvider>
    )
    expect(screen.getByRole('button', { name: /authentication failed/i })).toBeInTheDocument()
  })

  it('guards double-click and stops propagation to the card', async () => {
    const { invoke } = await import('@tauri-apps/api/core')
    const mockedInvoke = vi.mocked(invoke)
    mockedInvoke.mockResolvedValueOnce({ connectionId: 'ssh:1', status: 'connected', latencyMs: 1, error: null })
    useAppStore.setState({
      sshConnectionStates: new Map(),
      setSshConnectionState: vi.fn(),
      setSshTargetsMetadata: vi.fn(),
      setRemovedSshTargetLabels: vi.fn()
    } as never)
    const onPointerDown = vi.fn()
    render(
      <TooltipProvider>
        <WorktreeCardSshHostControl
          targetId="ssh:1"
          targetLabel="dev"
          status="disconnected"
          targetRemoved={false}
          sshOwnerEnvironmentId={null}
          iconOnly={false}
          onPointerDown={onPointerDown}
        />
      </TooltipProvider>
    )
    const button = screen.getByRole('button', { name: /connect to ssh host/i })
    fireEvent.pointerDown(button)
    expect(onPointerDown).toHaveBeenCalledTimes(1)
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(mockedInvoke).toHaveBeenCalledWith('ssh_connect_target', { connectionId: 'ssh:1' }))
  })

  it('resyncs targets before removed labels on failure', async () => {
    // Rail: local dial via invoke; the resync path still reads the (legacy)
    // preload bridge when present.
    const order: string[] = []
    const { invoke } = await import('@tauri-apps/api/core')
    vi.mocked(invoke).mockRejectedValueOnce(new Error('dial failed'))
    const win = window as unknown as { api: { ssh: Record<string, unknown> } }
    const prevApi = win.api
    win.api = {
      ssh: {
        listTargets: async () => {
          order.push('targets')
          return []
        },
        listRemovedTargetLabels: async () => {
          order.push('removed')
          return {}
        }
      }
    }
    useAppStore.setState({
      setSshTargetsMetadata: vi.fn(),
      setRemovedSshTargetLabels: vi.fn()
    } as never)
    try {
      render(
        <TooltipProvider>
          <WorktreeCardSshHostControl
            targetId="ssh:1"
            targetLabel="dev"
            status="disconnected"
            targetRemoved={false}
            sshOwnerEnvironmentId={null}
            iconOnly={false}
            onPointerDown={vi.fn()}
          />
        </TooltipProvider>
      )
      fireEvent.click(screen.getByRole('button', { name: /connect to ssh host/i }))
      await waitFor(() => expect(order).toEqual(['targets', 'removed']))
    } finally {
      win.api = prevApi
    }
  })
})
