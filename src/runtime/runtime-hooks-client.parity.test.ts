import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { checkRuntimeHooks, inspectRuntimeSetupScriptImports } from './runtime-hooks-client'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

describe('runtime hooks client (D02c-019)', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset()
  })

  it('reads local hooks by repository path', async () => {
    vi.mocked(invoke).mockResolvedValue({
      status: 'ok',
      hasHooks: true,
      hooks: { scripts: { setup: 'pnpm install' } },
      mayNeedUpdate: false
    })

    await checkRuntimeHooks(null, '/repo/app')

    expect(invoke).toHaveBeenCalledWith('check_runtime_hooks', { repoPath: '/repo/app' })
  })

  it('carries a direct SSH host so the backend can refuse it explicitly', async () => {
    vi.mocked(invoke).mockResolvedValue([])

    await inspectRuntimeSetupScriptImports(null, '/srv/app', 'ssh:dev-box')

    expect(invoke).toHaveBeenCalledWith('inspect_runtime_setup_script_imports', {
      repoPath: '/srv/app',
      hostId: 'ssh:dev-box'
    })
  })

  it('keeps a local host id on the local invoke', async () => {
    vi.mocked(invoke).mockResolvedValue([])

    await inspectRuntimeSetupScriptImports(null, '/repo/app', 'local')

    expect(invoke).toHaveBeenCalledWith('inspect_runtime_setup_script_imports', {
      repoPath: '/repo/app',
      hostId: 'local'
    })
  })
})
