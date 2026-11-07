import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { AGENT_CLI_IDS, loadCliInstallStatus } from './cli-install-status'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

describe('cli install status (D02c-003/D02c-004)', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset()
  })

  it('reads the host probe through the registered command', async () => {
    vi.mocked(invoke).mockResolvedValue([
      { id: 'omp', installed: true, version: 'omp 1.2.3' },
      { id: 'claude', installed: false }
    ])

    await expect(loadCliInstallStatus()).resolves.toEqual([
      { id: 'omp', installed: true, version: 'omp 1.2.3' },
      { id: 'claude', installed: false }
    ])
    expect(invoke).toHaveBeenCalledWith('cli_install_status')
  })

  it('keeps the probe order the backend defines', () => {
    expect(AGENT_CLI_IDS).toEqual(['omp', 'claude', 'cursor-agent', 'codex', 'orca'])
  })
})
